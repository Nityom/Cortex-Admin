import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
    doctor: v.optional(v.string()),
    date: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items;

    if (args.date) {
      // Direct indexed lookup using by_registered_at B-tree index
      const startIso = `${args.date}T00:00:00.000Z`;
      const endIso = `${args.date}T23:59:59.999Z`;
      items = await ctx.db
        .query("opd_queue")
        .withIndex("by_registered_at", (q) =>
          q.gte("registeredAt", startIso).lte("registeredAt", endIso)
        )
        .collect();
    } else if (args.status && args.status !== "ALL") {
      const limit = args.limit || 100;
      items = await ctx.db
        .query("opd_queue")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    } else {
      const limit = args.limit || 100;
      items = await ctx.db.query("opd_queue").order("desc").take(limit);
    }

    if (args.doctor && args.doctor !== "ALL") {
      const qDoc = args.doctor.toLowerCase().replace(/l+/g, "l");
      items = items.filter((item) => (item.doctor || "").toLowerCase().replace(/l+/g, "l").includes(qDoc));
    }

    return items.sort((a, b) => {
      const timeA = new Date(a.registeredAt || a._creationTime || 0).getTime();
      const timeB = new Date(b.registeredAt || b._creationTime || 0).getTime();
      return timeB - timeA;
    });
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

    let recordId: any;
    if (existing) {
      // Check if any field actually changed before writing to prevent spurious DB write I/O & subscription invalidations
      const hasChanges = Object.entries(payload).some(([key, val]) => {
        if (key === "updated_at") return false;
        return (existing as any)[key] !== val;
      });
      if (hasChanges) {
        await ctx.db.patch(existing._id, payload);
      }
      recordId = existing._id;
    } else {
      recordId = await ctx.db.insert("opd_queue", {
        ...payload,
        created_at: now,
      });
    }

    // When an active OPD check-in/registration (opd_*) is saved,
    // clean up any corresponding scheduled appointment placeholder (appointment_*)
    // so no patient is duplicated in the database or queue.
    if (args.id.startsWith("opd_")) {
      // 1. Direct O(1) indexed lookup if appointmentId is explicitly provided
      if (args.appointmentId) {
        const placeholder = await ctx.db
          .query("opd_queue")
          .withIndex("by_queue_id", (q) => q.eq("queue_id", `appointment_${args.appointmentId}`))
          .first();
        if (placeholder) {
          await ctx.db.delete(placeholder._id);
        }
      } else {
        const cleanPhone = (args.phone || "").replace(/\D/g, "").slice(-10);
        const cleanName = (args.name || "").trim().toLowerCase();
        const targetDate = (args.registeredAt || "").split("T")[0];

        if (cleanPhone.length === 10) {
          const recentPlaceholders = await ctx.db
            .query("opd_queue")
            .withIndex("by_status", (q) => q.eq("status", "Waiting"))
            .order("desc")
            .take(20);

          for (const item of recentPlaceholders) {
            if (!item.queue_id || !item.queue_id.startsWith("appointment_")) continue;
            const pPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
            const pName = (item.name || "").trim().toLowerCase();
            const pDate = (item.registeredAt || "").split("T")[0];

            if (pPhone === cleanPhone && (cleanName === pName || pDate === targetDate)) {
              await ctx.db.delete(item._id);
            }
          }
        }
      }
    }

    return recordId;
  },
});

export const updateStatus = mutation({
  args: {
    queue_id: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    let existing: any = await ctx.db
      .query("opd_queue")
      .withIndex("by_queue_id", (q) => q.eq("queue_id", args.queue_id))
      .first();

    if (!existing) {
      try {
        existing = await ctx.db.get(args.queue_id as any);
      } catch {}
    }

    if (!existing) {
      existing = await ctx.db
        .query("opd_queue")
        .filter((q) => q.eq(q.field("appointmentId"), args.queue_id))
        .first();
    }

    if (!existing && !args.queue_id.startsWith("appointment_")) {
      existing = await ctx.db
        .query("opd_queue")
        .withIndex("by_queue_id", (q) => q.eq("queue_id", `appointment_${args.queue_id}`))
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updated_at: Date.now(),
      });

      // If marked Completed, also sync appointment if applicable
      if (args.status === "Completed") {
        const apptId = existing.appointmentId || (existing.queue_id?.startsWith("appointment_") ? existing.queue_id.replace("appointment_", "") : null);
        if (apptId) {
          try {
            const appt: any = await ctx.db.get(apptId as any);
            if (appt && appt.status !== "COMPLETED") {
              await ctx.db.patch(appt._id, { status: "COMPLETED" });
            }
          } catch {}
        }
      }

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
    let existing: any = await ctx.db
      .query("opd_queue")
      .withIndex("by_queue_id", (q) => q.eq("queue_id", args.queue_id))
      .first();

    if (!existing) {
      try {
        existing = await ctx.db.get(args.queue_id as any);
      } catch {}
    }

    if (existing) {
      const apptId =
        existing.appointmentId ||
        (existing.queue_id && existing.queue_id.startsWith("appointment_")
          ? existing.queue_id.replace("appointment_", "")
          : null);

      if (apptId) {
        try {
          const appt: any = await ctx.db.get(apptId as any);
          if (appt) {
            await ctx.db.patch(appt._id, { status: "CANCELLED" });
          }
        } catch {}
      }

      const cleanPhone = (existing.phone || "").replace(/\D/g, "").slice(-10);
      const cleanName = (existing.name || "").trim().toLowerCase();
      const targetDate = (existing.registeredAt || "").split("T")[0];

      const allItems = await ctx.db.query("opd_queue").collect();
      for (const item of allItems) {
        if (item._id === existing._id) continue;
        const matchAppt = apptId && item.appointmentId && item.appointmentId === apptId;
        const pApptId = item.queue_id && item.queue_id.startsWith("appointment_") ? item.queue_id.replace("appointment_", "") : "";
        const matchPlaceholderAppt = apptId && pApptId === apptId;
        const iPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
        const iName = (item.name || "").trim().toLowerCase();
        const iDate = (item.registeredAt || "").split("T")[0];
        const matchPerson = cleanPhone.length === 10 && iPhone === cleanPhone && iName === cleanName && iDate === targetDate;

        if (matchAppt || matchPlaceholderAppt || matchPerson) {
          await ctx.db.delete(item._id);
        }
      }

      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("opd_queue").collect();
    for (const item of items) {
      const apptId =
        item.appointmentId ||
        (item.queue_id && item.queue_id.startsWith("appointment_")
          ? item.queue_id.replace("appointment_", "")
          : null);

      if (apptId) {
        try {
          const appt: any = await ctx.db.get(apptId as any);
          if (appt) {
            await ctx.db.patch(appt._id, { status: "CANCELLED" });
          }
        } catch {}
      }
      await ctx.db.delete(item._id);
    }
    return items.length;
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

export const cleanupDuplicatePlaceholders = mutation({
  args: {},
  handler: async (ctx) => {
    const allItems = await ctx.db.query("opd_queue").collect();
    const opdItems = allItems.filter((i) => i.queue_id && i.queue_id.startsWith("opd_"));
    const appointmentPlaceholders = allItems.filter(
      (i) => i.queue_id && i.queue_id.startsWith("appointment_")
    );

    let deletedCount = 0;
    for (const placeholder of appointmentPlaceholders) {
      const pApptId = placeholder.appointmentId ? String(placeholder.appointmentId) : "";
      const pPhone = (placeholder.phone || "").replace(/\D/g, "").slice(-10);
      const pName = (placeholder.name || "").trim().toLowerCase();
      const pDate = (placeholder.registeredAt || "").split("T")[0];

      const hasMatchingOpd = opdItems.some((opd) => {
        const oApptId = opd.appointmentId ? String(opd.appointmentId) : "";
        const oPhone = (opd.phone || "").replace(/\D/g, "").slice(-10);
        const oName = (opd.name || "").trim().toLowerCase();
        const oDate = (opd.registeredAt || "").split("T")[0];

        if (pApptId && oApptId && pApptId === oApptId) return true;
        if (pPhone && oPhone && pPhone === oPhone && pDate === oDate) return true;
        if (pName && oName && pName === oName && pDate === oDate) return true;
        return false;
      });

      if (hasMatchingOpd) {
        await ctx.db.delete(placeholder._id);
        deletedCount++;
      }
    }

    return deletedCount;
  },
});


