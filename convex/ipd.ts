import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let admissions = await ctx.db.query("ipd_admissions").collect();

    if (args.status && args.status !== "ALL") {
      admissions = admissions.filter((a) => a.status === args.status);
    }

    return admissions.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  },
});

export const getById = query({
  args: { admission_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ipd_admissions")
      .withIndex("by_admission_id", (q) => q.eq("admission_id", args.admission_id))
      .first();
  },
});

export const save = mutation({
  args: {
    admission: v.any(),
  },
  handler: async (ctx, args) => {
    const admission = args.admission;
    if (!admission || !admission.id) {
      throw new Error("Invalid admission data");
    }

    const existing = await ctx.db
      .query("ipd_admissions")
      .withIndex("by_admission_id", (q) => q.eq("admission_id", admission.id))
      .first();

    const now = Date.now();
    const payload = {
      admission_id: admission.id,
      ipdNumber: admission.ipdNumber || "",
      uhid: admission.uhid || "",
      patientId: admission.patientId,
      name: admission.name || "",
      age: String(admission.age || ""),
      sex: admission.sex || "Male",
      phone: admission.phone || "",
      address: admission.address || "",
      email: admission.email,
      whatsapp_number: admission.whatsapp_number,
      medicalHistory: admission.medicalHistory,
      allergies: admission.allergies,
      provisionalDiagnosis: admission.provisionalDiagnosis || "",
      reasonForAdmission: admission.reasonForAdmission || "",
      admissionDate: admission.admissionDate || "",
      admissionTime: admission.admissionTime || "",
      department: admission.department || "",
      consultantDoctor: admission.consultantDoctor || "",
      referredBy: admission.referredBy,
      paymentCategory: admission.paymentCategory || "Cash",
      ward: admission.ward || "",
      bedNumber: admission.bedNumber || "",
      dailyRate: Number(admission.dailyRate) || 0,
      nursingRatePerDay: Number(admission.nursingRatePerDay) || 0,
      doctorRatePerVisit: Number(admission.doctorRatePerVisit) || 0,
      billableDaysOverride: admission.billableDaysOverride,
      bedChargesOverride: admission.bedChargesOverride,
      nursingChargesOverride: admission.nursingChargesOverride,
      doctorVisitsCountOverride: admission.doctorVisitsCountOverride,
      doctorChargesOverride: admission.doctorChargesOverride,
      status: admission.status || "Admitted",
      dischargeDate: admission.dischargeDate,
      dischargeTime: admission.dischargeTime,
      dischargeSummary: admission.dischargeSummary,
      vitals: admission.vitals || [],
      doctorNotes: admission.doctorNotes || [],
      medications: admission.medications || [],
      investigations: admission.investigations || [],
      procedures: admission.procedures || [],
      nursingNotes: admission.nursingNotes || [],
      customCharges: admission.customCharges || [],
      advances: admission.advances || [],
      finalSettlement: admission.finalSettlement,
      updated_at: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    } else {
      return await ctx.db.insert("ipd_admissions", {
        ...payload,
        created_at: now,
      });
    }
  },
});

export const updateStatus = mutation({
  args: {
    admission_id: v.string(),
    status: v.string(),
    dischargeDate: v.optional(v.string()),
    dischargeTime: v.optional(v.string()),
    dischargeSummary: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ipd_admissions")
      .withIndex("by_admission_id", (q) => q.eq("admission_id", args.admission_id))
      .first();

    if (existing) {
      const patch: any = {
        status: args.status,
        updated_at: Date.now(),
      };
      if (args.dischargeDate) patch.dischargeDate = args.dischargeDate;
      if (args.dischargeTime) patch.dischargeTime = args.dischargeTime;
      if (args.dischargeSummary) patch.dischargeSummary = args.dischargeSummary;

      await ctx.db.patch(existing._id, patch);
      return true;
    }
    return false;
  },
});

export const remove = mutation({
  args: {
    admission_id: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ipd_admissions")
      .withIndex("by_admission_id", (q) => q.eq("admission_id", args.admission_id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

export const getBedConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("ipd_bed_config")
      .withIndex("by_config_key", (q) => q.eq("config_key", "default"))
      .first();
    return config ? config.wards : null;
  },
});

export const saveBedConfig = mutation({
  args: {
    wards: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ipd_bed_config")
      .withIndex("by_config_key", (q) => q.eq("config_key", "default"))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        wards: args.wards,
        updated_at: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("ipd_bed_config", {
        config_key: "default",
        wards: args.wards,
        updated_at: now,
      });
    }
  },
});

export const syncLocalAdmissions = mutation({
  args: {
    admissions: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let synced = 0;
    for (const admission of args.admissions) {
      if (!admission || !admission.id) continue;
      const existing = await ctx.db
        .query("ipd_admissions")
        .withIndex("by_admission_id", (q) => q.eq("admission_id", admission.id))
        .first();

      if (!existing) {
        await ctx.db.insert("ipd_admissions", {
          admission_id: admission.id,
          ipdNumber: admission.ipdNumber || "",
          uhid: admission.uhid || "",
          patientId: admission.patientId,
          name: admission.name || "",
          age: String(admission.age || ""),
          sex: admission.sex || "Male",
          phone: admission.phone || "",
          address: admission.address || "",
          email: admission.email,
          whatsapp_number: admission.whatsapp_number,
          medicalHistory: admission.medicalHistory,
          allergies: admission.allergies,
          provisionalDiagnosis: admission.provisionalDiagnosis || "",
          reasonForAdmission: admission.reasonForAdmission || "",
          admissionDate: admission.admissionDate || "",
          admissionTime: admission.admissionTime || "",
          department: admission.department || "",
          consultantDoctor: admission.consultantDoctor || "",
          referredBy: admission.referredBy,
          paymentCategory: admission.paymentCategory || "Cash",
          ward: admission.ward || "",
          bedNumber: admission.bedNumber || "",
          dailyRate: Number(admission.dailyRate) || 0,
          nursingRatePerDay: Number(admission.nursingRatePerDay) || 0,
          doctorRatePerVisit: Number(admission.doctorRatePerVisit) || 0,
          billableDaysOverride: admission.billableDaysOverride,
          bedChargesOverride: admission.bedChargesOverride,
          nursingChargesOverride: admission.nursingChargesOverride,
          doctorVisitsCountOverride: admission.doctorVisitsCountOverride,
          doctorChargesOverride: admission.doctorChargesOverride,
          status: admission.status || "Admitted",
          dischargeDate: admission.dischargeDate,
          dischargeTime: admission.dischargeTime,
          dischargeSummary: admission.dischargeSummary,
          vitals: admission.vitals || [],
          doctorNotes: admission.doctorNotes || [],
          medications: admission.medications || [],
          investigations: admission.investigations || [],
          procedures: admission.procedures || [],
          nursingNotes: admission.nursingNotes || [],
          customCharges: admission.customCharges || [],
          advances: admission.advances || [],
          finalSettlement: admission.finalSettlement,
          created_at: now,
          updated_at: now,
        });
        synced++;
      }
    }
    return synced;
  },
});

