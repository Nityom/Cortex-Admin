import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new patient
export const create = mutation({
    args: {
        name: v.string(),
        age: v.string(),
        sex: v.union(v.literal("Male"), v.literal("Female"), v.literal("Other")),
        phone_number: v.string(),
        address: v.optional(v.string()),
        email: v.optional(v.string()),
        whatsapp_number: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if patient exists with this phone number
        const existingPatient = await ctx.db
            .query("patients")
            .withIndex("by_phone", (q) => q.eq("phone_number", args.phone_number))
            .first();

        if (existingPatient) {
            if (args.email && args.email.trim() && args.email.trim() !== existingPatient.email) {
                await ctx.db.patch(existingPatient._id, { email: args.email.trim() });
            }
            return existingPatient._id;
        }

        // Check all existing patients to determine the absolute highest reference number
        const allPatients = await ctx.db.query("patients").collect();
        let maxExisting = 2; // System already has CRX0001 (Test) and CRX0002 (Testing)
        for (const p of allPatients) {
            if (p.reference_number) {
                const match = p.reference_number.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxExisting) maxExisting = num;
                }
            }
        }

        let counter = await ctx.db
            .query("reference_counter")
            .withIndex("by_counter_id", (q) => q.eq("counter_id", 1))
            .first();
        
        let nextNumber = maxExisting + 1;
        if (counter) {
            if (counter.current_number >= nextNumber) {
                nextNumber = counter.current_number + 1;
            }
            await ctx.db.patch(counter._id, { current_number: nextNumber });
        } else {
            await ctx.db.insert("reference_counter", { counter_id: 1, current_number: nextNumber });
        }
        const reference_number = `CRX${String(nextNumber).padStart(4, "0")}`;  

        const newPatientId = await ctx.db.insert("patients", {
            reference_number,
            name: args.name,
            age: args.age,
            sex: args.sex,
            phone_number: args.phone_number,
            address: args.address,
            email: args.email,
            whatsapp_number: args.whatsapp_number,
        });
        return newPatientId;
    },
});

export const getNextReferenceNumber = query({
    args: {},
    handler: async (ctx) => {
        const allPatients = await ctx.db.query("patients").collect();
        let maxExisting = 2; // Base minimum since CRX0001 and CRX0002 already exist
        for (const p of allPatients) {
            if (p.reference_number) {
                const match = p.reference_number.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxExisting) maxExisting = num;
                }
            }
        }
        let counter = await ctx.db
            .query("reference_counter")
            .withIndex("by_counter_id", (q) => q.eq("counter_id", 1))
            .first();
        let next = maxExisting + 1;
        if (counter && counter.current_number >= next) {
            next = counter.current_number + 1;
        }
        return `CRX${String(next).padStart(4, "0")}`;
    },
});

export const migratePrefixToCRX = mutation({
    args: {},
    handler: async (ctx) => {
        const patients = await ctx.db.query("patients").collect();
        for (const p of patients) {
            if (p.reference_number && p.reference_number.startsWith("CH")) {
                const newRef = p.reference_number.replace(/^CH/i, "CRX");
                await ctx.db.patch(p._id, { reference_number: newRef });
            }
        }
        return true;
    },
});

export const getByPhoneNumber = query({
    args: { phone_number: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("patients")
            .withIndex("by_phone", (q) => q.eq("phone_number", args.phone_number))
            .first();
    },
});

export const getById = query({
    args: { id: v.id("patients") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getByReference = query({
    args: { reference_number: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("patients")
            .withIndex("by_reference", (q) => q.eq("reference_number", args.reference_number))
            .first();
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("patients").order("desc").collect();
    },
});

export const search = query({
    args: { searchTerm: v.string() },
    handler: async (ctx, args) => {
        const term = args.searchTerm.toLowerCase();
        const allPatients = await ctx.db.query("patients").collect();
        // In-memory search is okay for small db, but normally we'd use full text search
        return allPatients.filter((p) =>
            p.name.toLowerCase().includes(term) ||
            p.phone_number.includes(term) ||
            p.reference_number.toLowerCase().includes(term)
        );
    },
});

export const update = mutation({
    args: {
        id: v.id("patients"),
        name: v.optional(v.string()),
        age: v.optional(v.string()),
        sex: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"))),
        phone_number: v.optional(v.string()),
        address: v.optional(v.string()),
        email: v.optional(v.string()),
        whatsapp_number: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("patients") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const mergeSamikshaToCRX0069 = mutation({
    args: {},
    handler: async (ctx) => {
        const isSamikshaMatch = (name?: string, phone?: string, ref?: string) => {
            const n = (name || "").toLowerCase();
            const p = (phone || "").replace(/\D/g, "");
            const r = (ref || "").trim().toUpperCase();
            return (
                n.includes("samiksha") ||
                p === "9665651439" ||
                p === "966561439" ||
                p === "9822349198" ||
                p.includes("96656") ||
                r === "CRX0069" ||
                r === "CRX0099" ||
                r === "CRX4469" ||
                r === "CRX7494"
            );
        };

        // 1. Merge Patients table
        const allPatients = await ctx.db.query("patients").collect();
        const samikshaMatches = allPatients.filter((p) =>
            isSamikshaMatch(p.name, p.phone_number, p.reference_number)
        );

        let targetPatientId: any = null;
        if (samikshaMatches.length > 0) {
            // Pick CRX0069 doc if present, else first match
            const primaryDoc = samikshaMatches.find(p => p.reference_number === "CRX0069") || samikshaMatches[0];
            targetPatientId = primaryDoc._id;
            await ctx.db.patch(targetPatientId, {
                reference_number: "CRX0069",
                name: "samiksha varnerkar",
                age: "21",
                sex: "Female",
                phone_number: "9665651439",
                address: "waigao",
            });
            for (const doc of samikshaMatches) {
                if (doc._id !== targetPatientId) {
                    await ctx.db.delete(doc._id);
                }
            }
        } else {
            targetPatientId = await ctx.db.insert("patients", {
                reference_number: "CRX0069",
                name: "samiksha varnerkar",
                age: "21",
                sex: "Female",
                phone_number: "9665651439",
                address: "waigao",
            });
        }

        // 2. Update all Prescriptions
        const allRx = await ctx.db.query("prescriptions").collect();
        const rxMatches = allRx.filter((r) =>
            isSamikshaMatch(r.patient_name, r.phone_number, r.reference_number)
        );
        for (const rx of rxMatches) {
            await ctx.db.patch(rx._id, {
                patient_name: "samiksha varnerkar",
                reference_number: "CRX0069",
                phone_number: "9665651439",
                age: "21",
                sex: "Female",
            });
        }

        // 3. Update all Bills
        const allBills = await ctx.db.query("bills").collect();
        const billMatches = allBills.filter((b) =>
            isSamikshaMatch(undefined, undefined, b.reference_number) || b.patient_id === targetPatientId
        );
        for (const bill of billMatches) {
            await ctx.db.patch(bill._id, {
                reference_number: "CRX0069",
                patient_id: targetPatientId,
            });
        }

        // 4. Update and Deduplicate Appointments
        const allAppts = await ctx.db.query("appointments").collect();
        const apptMatches = allAppts.filter((a) =>
            isSamikshaMatch(a.name, a.phone)
        );
        // Group appointments by date
        const apptByDate = new Map<string, any[]>();
        for (const a of apptMatches) {
            const d = a.date || "nodate";
            if (!apptByDate.has(d)) apptByDate.set(d, []);
            apptByDate.get(d)!.push(a);
        }
        for (const [_, items] of apptByDate.entries()) {
            if (items.length > 0) {
                await ctx.db.patch(items[0]._id, {
                    name: "samiksha varnerkar",
                    phone: "9665651439",
                    address: "waigao",
                    age: 21,
                    doctor_name: "Dr. Shillpa Raut",
                });
                for (let i = 1; i < items.length; i++) {
                    await ctx.db.delete(items[i]._id);
                }
            }
        }

        // 5. Update / Merge any opd_queue items
        const allOpd = await ctx.db.query("opd_queue").collect();
        const opdMatches = allOpd.filter((o) =>
            isSamikshaMatch(o.name, o.phone, o.uhid)
        );
        if (opdMatches.length > 0) {
            await ctx.db.patch(opdMatches[0]._id, {
                name: "samiksha varnerkar",
                uhid: "CRX0069",
                phone: "9665651439",
                age: "21",
                sex: "Female",
                address: "waigao",
                doctor: "Dr. Shillpa Raut",
                department: "Obstetrics & Gynaecology",
            });
            for (let i = 1; i < opdMatches.length; i++) {
                await ctx.db.delete(opdMatches[i]._id);
            }
        }

        return targetPatientId;
    },
});
