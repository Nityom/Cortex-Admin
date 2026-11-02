import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
    doctor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("opd_queue").collect();

    if (args.status && args.status !== "ALL") {
      items = items.filter((item) => item.status === args.status);
    }

    if (args.doctor && args.doctor !== "ALL") {
      const qDoc = args.doctor.toLowerCase();
      items = items.filter((item) => (item.doctor || "").toLowerCase().includes(qDoc));
    }

    return items.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  },
});

export const upsert = mutation({
  args: {
    id: v.string(), // client queue_id
    token: v.string(),
    uhid: v.string(),
    patientId: v.optional(v.string()),
    appointmentId: v.optional(v.string()),
    name: v.string(),
    age: v.string(),
    ageUnit: v.optional(v.string()),
    sex: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsapp_number: v.optional(v.string()),
    doctor: v.string(),
    department: v.string(),
    priority: v.string(),
    visitType: v.string(),
    status: v.string(),
    vitals: v.optional(v.any()),
    consultationFee: v.optional(v.number()),
    paymentMode: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    registeredAt: v.string(),
    time: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("opd_queue")
      .withIndex("by_queue_id", (q) => q.eq("queue_id", args.id))
      .first();

    const now = Date.now();
    const payload = {
      queue_id: args.id,
      token: args.token,
      uhid: args.uhid,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      name: args.name,
      age: args.age,
      ageUnit: args.ageUnit,
      sex: args.sex,
      phone: args.phone,
      address: args.address,
      email: args.email,
      whatsapp_number: args.whatsapp_number,
      doctor: args.doctor,
      department: args.department,
      priority: args.priority,
      visitType: args.visitType,
      status: args.status,
      vitals: args.vitals,
      consultationFee: args.consultationFee,
      paymentMode: args.paymentMode,
      paymentStatus: args.paymentStatus,
      registeredAt: args.registeredAt,
      time: args.time,
      updated_at: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    } else {
      return await ctx.db.insert("opd_queue", {
        ...payload,
        created_at: now,
      });
    }
  },
});

export const updateStatus = mutation({
  args: {
    queue_id: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("opd_queue")
      .withIndex("by_queue_id", (q) => q.eq("queue_id", args.queue_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updated_at: Date.now(),
      });
      return true;
    }
    return false;
  },
});

export const remove = mutation({
  args: {
    queue_id: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("opd_queue")
      .withIndex("by_queue_id", (q) => q.eq("queue_id", args.queue_id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

export const syncLocalItems = mutation({
  args: {
    items: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let synced = 0;
    for (const item of args.items) {
      if (!item || !item.id) continue;
      const existing = await ctx.db
        .query("opd_queue")
        .withIndex("by_queue_id", (q) => q.eq("queue_id", item.id))
        .first();

      if (!existing) {
        await ctx.db.insert("opd_queue", {
          queue_id: item.id,
          token: item.token || "01",
          uhid: item.uhid || "",
          patientId: item.patientId,
          appointmentId: item.appointmentId,
          name: item.name || "Patient",
          age: String(item.age || ""),
          ageUnit: item.ageUnit,
          sex: item.sex || "Male",
          phone: item.phone || "",
          address: item.address,
          email: item.email,
          whatsapp_number: item.whatsapp_number,
          doctor: item.doctor || "Dr. Vipeen Raut",
          department: item.department || "General",
          priority: item.priority || "Normal",
          visitType: item.visitType || "New Registration",
          status: item.status || "Waiting",
          vitals: item.vitals,
          consultationFee: item.consultationFee,
          paymentMode: item.paymentMode,
          paymentStatus: item.paymentStatus,
          registeredAt: item.registeredAt || new Date().toISOString(),
          time: item.time || "",
          created_at: now,
          updated_at: now,
        });
        synced++;
      }
    }
    return synced;
  },
});

