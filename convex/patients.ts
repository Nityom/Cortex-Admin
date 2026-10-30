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
