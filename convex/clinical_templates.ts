import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clinical_templates").order("desc").collect();
  },
});

export const getByTemplateId = query({
  args: { template_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinical_templates")
      .withIndex("by_template_id", (q) => q.eq("template_id", args.template_id))
      .first();
  },
});

export const upsert = mutation({
  args: {
    template_id: v.string(),
    name: v.string(),
    category: v.string(),
    doctor_name: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    advice: v.optional(v.string()),
    dr_notes: v.optional(v.string()),
    procedure_advice: v.optional(v.string()),
    diet_exercise: v.optional(v.string()),
    followup_count: v.optional(v.string()),
    followup_unit: v.optional(v.string()),
    medicines: v.optional(v.any()),
    complaints: v.optional(v.any()),
    tests_requested: v.optional(v.any()),
    section_key: v.optional(v.string()),
    is_preset: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("clinical_templates")
      .withIndex("by_template_id", (q) => q.eq("template_id", args.template_id))
      .first();

    const now = Date.now();
    const payload = {
      template_id: args.template_id,
      name: args.name,
      category: args.category,
      doctor_name: args.doctor_name,
      diagnosis: args.diagnosis,
      advice: args.advice,
      dr_notes: args.dr_notes,
      procedure_advice: args.procedure_advice,
      diet_exercise: args.diet_exercise,
      followup_count: args.followup_count,
      followup_unit: args.followup_unit,
      medicines: args.medicines,
      complaints: args.complaints,
      tests_requested: args.tests_requested,
      section_key: args.section_key,
      is_preset: args.is_preset,
      updated_at: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    } else {
      return await ctx.db.insert("clinical_templates", {
        ...payload,
        created_at: now,
      });
    }
  },
});

export const remove = mutation({
  args: { template_id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("clinical_templates")
      .withIndex("by_template_id", (q) => q.eq("template_id", args.template_id))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

export const bulkSync = mutation({
  args: {
    templates: v.array(
      v.object({
        template_id: v.string(),
        name: v.string(),
        category: v.string(),
        doctor_name: v.optional(v.string()),
        diagnosis: v.optional(v.string()),
        advice: v.optional(v.string()),
        dr_notes: v.optional(v.string()),
        procedure_advice: v.optional(v.string()),
        diet_exercise: v.optional(v.string()),
        followup_count: v.optional(v.string()),
        followup_unit: v.optional(v.string()),
        medicines: v.optional(v.any()),
        complaints: v.optional(v.any()),
        tests_requested: v.optional(v.any()),
        section_key: v.optional(v.string()),
        is_preset: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const item of args.templates) {
      const existing = await ctx.db
        .query("clinical_templates")
        .withIndex("by_template_id", (q) => q.eq("template_id", item.template_id))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...item, updated_at: now });
      } else {
        await ctx.db.insert("clinical_templates", { ...item, created_at: now, updated_at: now });
      }
    }
    return true;
  },
});

