import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
    args: {
        prescription_id: v.string(),
        patient_id: v.string(),
        reference_number: v.string(),
        total_amount: v.number(),
        paid_amount: v.number(),
        items: v.any(),
        notes: v.optional(v.string()),
        discount_percent: v.optional(v.number()),
        discount_amount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let payment_status: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
        const balance_amount = args.total_amount - args.paid_amount;

        if (args.paid_amount === 0) {
            payment_status = "PENDING";
        } else if (args.paid_amount < args.total_amount) {
            payment_status = "PARTIAL";
        } else {
            payment_status = "PAID";
        }

        // Generate sequential bill number: CRX-INV-{YEAR}-{SEQ}
        const year = new Date().getFullYear();
        const yearPrefix = `CRX-INV-${year}-`;
        const legacyPrefix1 = `CH-INV-${year}-`;
        const legacyPrefix2 = `KSD-INV-${year}-`;
        const recentBills = await ctx.db.query("bills").order("desc").take(25);
        let maxSeq = 0;
        for (const b of recentBills) {
            if (typeof b.bill_number === "string" && (b.bill_number.startsWith(yearPrefix) || b.bill_number.startsWith(legacyPrefix1) || b.bill_number.startsWith(legacyPrefix2))) {
                const parts = b.bill_number.split("-");
                const num = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(num) && num > maxSeq) {
                    maxSeq = num;
                }
            }
        }
        const seq = (maxSeq + 1).toString().padStart(3, "0");
        const bill_number = `${yearPrefix}${seq}`;

        const newBillId = await ctx.db.insert("bills", {
            prescription_id: args.prescription_id,
            patient_id: args.patient_id,
            reference_number: args.reference_number,
            bill_number,
            total_amount: args.total_amount,
            paid_amount: args.paid_amount,
            balance_amount,
            payment_status,
            items: args.items,
            notes: args.notes,
            discount_percent: args.discount_percent,
            discount_amount: args.discount_amount,
        });
        return { id: newBillId, bill_number };
    },
});

export const getById = query({
    args: { id: v.id("bills") },
    handler: async (ctx, args) => {
        const bill = await ctx.db.get(args.id);
        if (!bill) return null;

        const patient = await ctx.db
            .query("patients")
            .withIndex("by_reference", (q) => q.eq("reference_number", bill.reference_number))
            .first();

        return {
            ...bill,
            patient_name: patient?.name,
            phone_number: patient?.phone_number,
            patient_age: patient?.age,
            patient_sex: patient?.sex,
        };
    },
});

export const getByPrescriptionId = query({
    args: { prescription_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("bills")
            .withIndex("by_prescription", (q) => q.eq("prescription_id", args.prescription_id))
            .first();
    },
});

export const update = mutation({
    args: {
        id: v.id("bills"),
        total_amount: v.optional(v.number()),
        paid_amount: v.optional(v.number()),
        balance_amount: v.optional(v.number()),
        items: v.optional(v.any()),
        notes: v.optional(v.string()),
        payment_status: v.optional(v.union(v.literal("PENDING"), v.literal("PARTIAL"), v.literal("PAID"))),
        discount_percent: v.optional(v.number()),
        discount_amount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        // If amounts are updated, recalculate balance and status
        if (updates.total_amount !== undefined || updates.paid_amount !== undefined) {
            const existingBill = await ctx.db.get(id);
            if (!existingBill) throw new Error("Bill not found");

            const newTotal = updates.total_amount ?? existingBill.total_amount;
            const newPaid = updates.paid_amount ?? existingBill.paid_amount;
            updates.balance_amount = newTotal - newPaid;

            if (!updates.payment_status) {
                if (newPaid === 0) updates.payment_status = "PENDING";
                else if (newPaid < newTotal) updates.payment_status = "PARTIAL";
                else updates.payment_status = "PAID";
            }
        }

        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("bills") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

export const list = query({
    args: {
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let bills: any[] = [];
        const hasDateFilter = Boolean(args.startDate || args.endDate);

        if (hasDateFilter) {
            const startStr = args.startDate || args.endDate!;
            const endStr = args.endDate || args.startDate!;
            const startMs = new Date(`${startStr}T00:00:00+05:30`).getTime();
            const endMs = new Date(`${endStr}T23:59:59.999+05:30`).getTime();
            bills = await ctx.db
                .query("bills")
                .withIndex("by_creation_time", (q) =>
                    q.gte("_creationTime", startMs).lte("_creationTime", endMs)
                )
                .order("desc")
                .collect();
        } else if (args.limit && args.limit > 0) {
            bills = await ctx.db.query("bills").order("desc").take(args.limit);
        } else {
            // Default to safe limit to avoid unbounded full-table scans
            bills = await ctx.db.query("bills").order("desc").take(100);
        }

        // Optimized Batch Lookup for patients: fetch each unique reference_number only once
        const uniqueRefs = Array.from(new Set(bills.map((b) => b.reference_number).filter(Boolean)));
        const patientMap = new Map<string, any>();
        await Promise.all(
            uniqueRefs.map(async (ref) => {
                const p = await ctx.db
                    .query("patients")
                    .withIndex("by_reference", (q) => q.eq("reference_number", ref))
                    .first();
                if (p) patientMap.set(ref, p);
            })
        );

        return bills.map((bill) => {
            const istDate = (bill as any).bill_date || (bill as any).created_at || new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Kolkata",
            }).format(new Date(bill._creationTime));
            const patient = patientMap.get(bill.reference_number);

            return {
                ...bill,
                bill_date: (bill as any).bill_date || istDate,
                created_at: (bill as any).created_at || istDate,
                patient_name: patient?.name,
                phone_number: patient?.phone_number,
            };
        });
    },
});
