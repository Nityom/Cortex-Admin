import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
    args: {
        bill_id: v.string(),
        patient_id: v.string(),
        amount: v.number(),
        payment_method: v.optional(v.string()),
        payment_date: v.string(),
        receipt_number: v.optional(v.string()),
        notes: v.optional(v.string()),
        created_by: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const transactionId = await ctx.db.insert("payment_transactions", args);

        // Update the bill's paid_amount, balance_amount, and payment_status
        try {
            const bill = await ctx.db.get(args.bill_id as any);
            if (bill) {
                const newPaid = (bill as any).paid_amount + args.amount;
                const newBalance = (bill as any).total_amount - newPaid;
                let newStatus: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
                if (newPaid >= (bill as any).total_amount) {
                    newStatus = "PAID";
                } else if (newPaid > 0) {
                    newStatus = "PARTIAL";
                }
                await ctx.db.patch(args.bill_id as any, {
                    paid_amount: newPaid,
                    balance_amount: Math.max(0, newBalance),
                    payment_status: newStatus,
                });
            }
        } catch (e) {
            // Bill update failed but transaction was recorded
            console.error("Failed to update bill after payment:", e);
        }

        return transactionId;
    },
});

export const recordBillTransactions = mutation({
    args: {
        bill_id: v.string(),
        patient_id: v.string(),
        transactions: v.array(
            v.object({
                amount: v.number(),
                payment_method: v.optional(v.string()),
                payment_date: v.string(),
                receipt_number: v.optional(v.string()),
                notes: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        // Delete existing transactions for this bill to prevent duplicates
        const existing = await ctx.db
            .query("payment_transactions")
            .withIndex("by_bill", (q) => q.eq("bill_id", args.bill_id))
            .collect();
        for (const item of existing) {
            await ctx.db.delete(item._id);
        }

        // Insert fresh transactions
        const ids = [];
        for (const txn of args.transactions) {
            const id = await ctx.db.insert("payment_transactions", {
                bill_id: args.bill_id,
                patient_id: args.patient_id,
                amount: txn.amount,
                payment_method: txn.payment_method,
                payment_date: txn.payment_date,
                receipt_number: txn.receipt_number,
                notes: txn.notes,
            });
            ids.push(id);
        }
        return ids;
    },
});

export const listByBill = query({
    args: { bill_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("payment_transactions")
            .withIndex("by_bill", (q) => q.eq("bill_id", args.bill_id))
            .order("desc")
            .collect();
    },
});
