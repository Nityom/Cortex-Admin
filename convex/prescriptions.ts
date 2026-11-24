import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Helper to check if a text contains RCT or Crown keywords
 */
/**
 * Helper to check if a text contains Crown Cutting keywords
 * User requirement: Only take crown cutting on "Crown cutting done" or "Cap cutting done"
 * (Must NOT trigger on generic "RCT started", "Root canal", "BMP", "Obturation", etc.)
 */
export function isCrownCuttingTreatment(text: string): boolean {
    if (!text) return false;
    const s = text.toLowerCase();
    return (
        s.includes("crown cutting done") ||
        s.includes("cap cutting done") ||
        s.includes("crown cutting") ||
        s.includes("cap cutting") ||
        s.includes("crown cut") ||
        s.includes("cap cut") ||
        s.includes("crown preparation") ||
        s.includes("cap preparation") ||
        s.includes("crown prep") ||
        s.includes("cap prep") ||
        s.includes("pfm crown") ||
        s.includes("zirconia crown") ||
        s.includes("dental crown") ||
        s.includes("metal ceramic") ||
        s.includes("metal free") ||
        s.includes("metal-free")
    );
}

/**
 * Helper to check if a text contains Crown Fixed / Cemented keywords
 */
export function isCrownFixedTreatment(text: string): boolean {
    if (!text) return false;
    const s = text.toLowerCase();
    return (
        s.includes("crown fixed") ||
        s.includes("crown fix") ||
        s.includes("crown cemented") ||
        s.includes("crown cementation") ||
        s.includes("crown fitting") ||
        s.includes("crown fitted") ||
        s.includes("cap fixed") ||
        s.includes("cap fix") ||
        s.includes("cap cemented") ||
        s.includes("cap cementation") ||
        s.includes("cap fitting") ||
        s.includes("cap fitted")
    );
}

/**
 * Backwards compatibility helper
 */
export function isRctOrCrownTreatment(text: string): boolean {
    return isCrownCuttingTreatment(text) || isCrownFixedTreatment(text);
}

/**
 * Helper to extract tooth numbers from selected_teeth, treatment description, or diagnosis
 */
export function extractTeeth(selectedTeeth: any, treatmentDesc?: string, diagnosis?: string, chiefComplaint?: string): string {
    const teethFound: string[] = [];

    if (selectedTeeth) {
        try {
            const teeth = typeof selectedTeeth === "string" ? JSON.parse(selectedTeeth) : selectedTeeth;
            if (Array.isArray(teeth)) {
                teeth.forEach((t: any) => {
                    if (t.id !== undefined && t.id !== null) teethFound.push(String(t.id));
                    else if (t.tooth !== undefined) teethFound.push(String(t.tooth));
                    else if (typeof t === "number" || typeof t === "string") teethFound.push(String(t));
                });
            }
        } catch {
            // fallback
        }
    }

    const scanForNumbers = (str?: string) => {
        if (!str) return;
        const matches = str.match(/(?:wrt|#|tooth|teeth|no\.?)\s*([0-9A-E,\s/]+)/i);
        if (matches && matches[1]) {
            const parts = matches[1].split(/[,/\s]+/).filter((p) => p.trim() && /^[0-9A-E]+$/i.test(p.trim()));
            parts.forEach((p) => {
                if (!teethFound.includes(p)) teethFound.push(p);
            });
        }
        if (teethFound.length === 0) {
            const fdiMatches = str.match(/\b([1-4][1-8])\b/g);
            if (fdiMatches) {
                fdiMatches.forEach((num) => {
                    if (!teethFound.includes(num)) teethFound.push(num);
                });
            }
        }
    };

    scanForNumbers(treatmentDesc);
    scanForNumbers(diagnosis);
    scanForNumbers(chiefComplaint);

    return teethFound.length > 0 ? teethFound.join(", ") : "-";
}

/**
 * Helper to process a prescription and return crown details if applicable.
 * Triggers ONLY if treatment explicitly specifies "crown cutting done", "cap cutting done",
 * or crown fixing/cementation. Plain RCT / RCT started will NOT trigger a crown cutting entry.
 */
function extractCrownInfoFromPrescription(rx: any): { isCrown: boolean; isFixed: boolean; toothStr: string; cost: number; ref: string; crownType: string } {
    let treatments: any[] = [];
    if (rx.treatment_done) {
        treatments = typeof rx.treatment_done === "string" ? JSON.parse(rx.treatment_done) : rx.treatment_done;
    }
    if (!Array.isArray(treatments)) treatments = [];

    // Find any explicit Crown Cutting item in treatment_done
    const crownCuttingDone = treatments.filter((t: any) => isCrownCuttingTreatment((t.description || t.name || "").toString()));
    // Find any explicit Crown Fixed item in treatment_done
    const crownFixedDone = treatments.filter((t: any) => isCrownFixedTreatment((t.description || t.name || "").toString()));

    const diagCutting = isCrownCuttingTreatment(rx.diagnosis || "");
    const diagFixed = isCrownFixedTreatment(rx.diagnosis || "");
    const ccCutting = isCrownCuttingTreatment(rx.chief_complaint || "");
    const ccFixed = isCrownFixedTreatment(rx.chief_complaint || "");

    const hasCutting = crownCuttingDone.length > 0 || diagCutting || ccCutting;
    const hasFixed = crownFixedDone.length > 0 || diagFixed || ccFixed;

    // Plain "RCT started", "Root canal", "BMP", etc. MUST NOT be treated as a crown
    if (!hasCutting && !hasFixed) {
        return { isCrown: false, isFixed: false, toothStr: "", cost: 0, ref: "", crownType: "PFM (Metal Ceramic)" };
    }

    const isFixed = hasFixed;

    // Determine primary description
    let primaryDesc = "";
    if (crownFixedDone.length > 0) {
        primaryDesc = (crownFixedDone[0].description || crownFixedDone[0].name || "Crown Fixed");
    } else if (crownCuttingDone.length > 0) {
        primaryDesc = (crownCuttingDone[0].description || crownCuttingDone[0].name || "Crown Cutting Done");
    } else if (diagFixed) {
        primaryDesc = rx.diagnosis || "Crown Fixed";
    } else if (diagCutting) {
        primaryDesc = rx.diagnosis || "Crown Cutting Done";
    } else {
        primaryDesc = "Crown Cutting Done";
    }

    const toothStr = extractTeeth(rx.selected_teeth, primaryDesc, rx.diagnosis, rx.chief_complaint);

    // Sum matching crown treatment amounts
    let cost = 0;
    const matchingTreatments = [...crownCuttingDone, ...crownFixedDone];
    for (const t of matchingTreatments) {
        const itemTotal = Number(t.total ?? (Number(t.quantity || 1) * Number(t.unit_price || t.price || 0))) || 0;
        cost += itemTotal;
    }
    // If still 0, check all treatments for any crown / pfm / zirconia / ceramic / metal procedure cost
    if (cost === 0) {
        for (const t of treatments) {
            const tDesc = (t.description || t.name || "").toLowerCase();
            if (tDesc.includes("crown") || tDesc.includes("cap") || tDesc.includes("pfm") || tDesc.includes("zirconia") || tDesc.includes("ceramic")) {
                const itemTotal = Number(t.total ?? (Number(t.quantity || 1) * Number(t.unit_price || t.price || 0))) || 0;
                if (itemTotal > 0) {
                    cost = itemTotal;
                    break;
                }
            }
        }
    }
    // If still 0 and only 1 treatment done exists, take that
    if (cost === 0 && treatments.length === 1 && treatments[0].total) {
        cost = Number(treatments[0].total) || 0;
    }

    let crownType = "";
    const allSearchText = `${primaryDesc} ${rx.diagnosis || ""} ${rx.chief_complaint || ""} ${treatments.map((t: any) => t.description || t.name || "").join(" ")}`.toLowerCase();

    // 1. First check explicit keywords in treatment description/notes
    if (allSearchText.includes("metal free") || allSearchText.includes("metal-free") || allSearchText.includes("zirconia")) {
        crownType = "Zirconia (Metal Free)";
    } else if (allSearchText.includes("pfm") || allSearchText.includes("metal ceramic") || allSearchText.includes("metal-ceramic") || allSearchText.includes("ceramic") || allSearchText.includes("metal")) {
        crownType = "PFM (Metal Ceramic)";
    } else if (allSearchText.includes("emax") || allSearchText.includes("e-max")) {
        crownType = "E-Max";
    }

    // 2. If not specified in text, auto-classify by rate/price:
    // PFM rates: 2500, 3500, 5000 (<= 5500)
    // Zirconia rates: 8000, 10000, 15000, 20000, 30000 (>= 6000)
    if (!crownType && cost > 0) {
        if (cost <= 5500) {
            crownType = "PFM (Metal Ceramic)";
        } else {
            crownType = "Zirconia (Metal Free)";
        }
    }

    // 3. Fallback default if cost is 0 and no keywords found
    if (!crownType) {
        crownType = "PFM (Metal Ceramic)";
    }

    let cleanRef = primaryDesc.trim();
    if (isFixed && !cleanRef.toLowerCase().includes("fixed") && !cleanRef.toLowerCase().includes("cement")) {
        cleanRef = `Crown Fixed / ${cleanRef}`;
    } else if (!isFixed && !cleanRef.toLowerCase().includes("cutting")) {
        cleanRef = `Crown Cutting / ${cleanRef}`;
    }

    return {
        isCrown: true,
        isFixed,
        toothStr,
        cost,
        ref: cleanRef,
        crownType,
    };
}

export const create = mutation({
    args: {
        patient_name: v.string(),
        phone_number: v.string(),
        age: v.string(),
        sex: v.union(v.literal("Male"), v.literal("Female"), v.literal("Other")),
        reference_number: v.optional(v.string()),
        email: v.optional(v.string()),
        prescription_date: v.string(),
        chief_complaint: v.optional(v.string()),
        medical_history: v.optional(v.string()),
        investigation: v.optional(v.string()),
        diagnosis: v.optional(v.string()),
        treatment_plan: v.optional(v.any()), // JSON
        findings: v.optional(v.string()),
        oral_exam_notes: v.optional(v.string()),
        selected_teeth: v.optional(v.any()), // JSON
        medicines: v.optional(v.any()), // JSON
        treatment_done: v.optional(v.any()), // JSON
        dr_notes: v.optional(v.string()),
        advice: v.optional(v.string()),
        followup_date: v.optional(v.string()),
        doctor_name: v.optional(v.string()),
        vitals: v.optional(v.any()),
        opd_visit_id: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const newPrescriptionId = await ctx.db.insert("prescriptions", args);

        // Auto-sync Crown Record for RCT or Crown
        try {
            const crownInfo = extractCrownInfoFromPrescription(args);
            if (crownInfo.isCrown) {
                const now = Date.now();

                // If isFixed, check if patient has an existing crown record
                let existingCrown = null;
                if (crownInfo.isFixed) {
                    if (args.reference_number) {
                        existingCrown = await ctx.db
                            .query("crown_cutting_register")
                            .withIndex("by_reference", (q) => q.eq("reference_number", args.reference_number))
                            .first();
                    }
                    if (!existingCrown && args.phone_number) {
                        existingCrown = await ctx.db
                            .query("crown_cutting_register")
                            .withIndex("by_phone", (q) => q.eq("phone_number", args.phone_number))
                            .first();
                    }
                }

                if (existingCrown) {
                    await ctx.db.patch(existingCrown._id, {
                        crown_status: "Crown Fixed",
                        status: "Crown Fixed",
                        fixed_date: args.prescription_date,
                        updated_at: now,
                    });
                } else {
                    await ctx.db.insert("crown_cutting_register", {
                        patient_name: args.patient_name,
                        phone_number: args.phone_number,
                        reference_number: args.reference_number,
                        tooth_numbers: crownInfo.toothStr,
                        crown_type: crownInfo.crownType,
                        cutting_date: args.prescription_date,
                        fixed_date: crownInfo.isFixed ? args.prescription_date : undefined,
                        dentist_name: args.doctor_name || "Dr. Kautilya Swaroop",
                        lab_name: "Dental Lab",
                        treatment_reference: crownInfo.ref,
                        crown_status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        patient_cost: crownInfo.cost,
                        prescription_id: newPrescriptionId,
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        } catch (err) {
            console.error("Auto crown record creation error:", err);
        }

        if (args.diagnosis) {
            await recordDiagnosesToCatalog(ctx, args.diagnosis);
        }
        if (args.chief_complaint) {
            await recordComplaintsToCatalog(ctx, args.chief_complaint);
        }

        // Auto-mark corresponding OPD queue item & appointment as Completed
        await markOpdQueueCompletedForPrescription(ctx, args);

        return newPrescriptionId;
    },
});

export const getById = query({
    args: { id: v.id("prescriptions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const update = mutation({
    args: {
        id: v.id("prescriptions"),
        patient_name: v.optional(v.string()),
        phone_number: v.optional(v.string()),
        age: v.optional(v.string()),
        sex: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"))),
        reference_number: v.optional(v.string()),
        email: v.optional(v.string()),
        prescription_date: v.optional(v.string()),
        chief_complaint: v.optional(v.string()),
        medical_history: v.optional(v.string()),
        investigation: v.optional(v.string()),
        diagnosis: v.optional(v.string()),
        treatment_plan: v.optional(v.any()), // JSON
        findings: v.optional(v.string()),
        oral_exam_notes: v.optional(v.string()),
        selected_teeth: v.optional(v.any()), // JSON
        medicines: v.optional(v.any()), // JSON
        treatment_done: v.optional(v.any()), // JSON
        dr_notes: v.optional(v.string()),
        advice: v.optional(v.string()),
        followup_date: v.optional(v.string()),
        doctor_name: v.optional(v.string()),
        vitals: v.optional(v.any()),
        opd_visit_id: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);

        // Fetch full merged prescription
        const rx = await ctx.db.get(id);
        if (rx) {
            try {
                const crownInfo = extractCrownInfoFromPrescription(rx);
                const existingCrown = await ctx.db
                    .query("crown_cutting_register")
                    .withIndex("by_prescription", (q) => q.eq("prescription_id", id))
                    .first();

                const now = Date.now();
                if (crownInfo.isCrown) {
                    if (existingCrown) {
                        await ctx.db.patch(existingCrown._id, {
                            patient_name: rx.patient_name,
                            phone_number: rx.phone_number,
                            reference_number: rx.reference_number,
                            tooth_numbers: crownInfo.toothStr || existingCrown.tooth_numbers,
                            cutting_date: existingCrown.cutting_date || rx.prescription_date,
                            dentist_name: rx.doctor_name || existingCrown.dentist_name,
                            patient_cost: crownInfo.cost > 0 ? crownInfo.cost : existingCrown.patient_cost,
                            treatment_reference: crownInfo.ref,
                            ...(crownInfo.isFixed ? {
                                crown_status: "Crown Fixed",
                                status: "Crown Fixed",
                                fixed_date: rx.prescription_date,
                            } : {}),
                            updated_at: now,
                        });
                    } else {
                        // Check if patient already has crown cutting record by reference or phone
                        let patientCrown = null;
                        if (rx.reference_number) {
                            patientCrown = await ctx.db
                                .query("crown_cutting_register")
                                .withIndex("by_reference", (q) => q.eq("reference_number", rx.reference_number))
                                .first();
                        }
                        if (!patientCrown && rx.phone_number) {
                            patientCrown = await ctx.db
                                .query("crown_cutting_register")
                                .withIndex("by_phone", (q) => q.eq("phone_number", rx.phone_number))
                                .first();
                        }

                        if (patientCrown && crownInfo.isFixed) {
                            await ctx.db.patch(patientCrown._id, {
                                crown_status: "Crown Fixed",
                                status: "Crown Fixed",
                                fixed_date: rx.prescription_date,
                                updated_at: now,
                            });
                        } else {
                            await ctx.db.insert("crown_cutting_register", {
                                patient_name: rx.patient_name,
                                phone_number: rx.phone_number,
                                reference_number: rx.reference_number,
                                tooth_numbers: crownInfo.toothStr,
                                crown_type: crownInfo.crownType,
                                cutting_date: rx.prescription_date,
                                fixed_date: crownInfo.isFixed ? rx.prescription_date : undefined,
                                dentist_name: rx.doctor_name || "Dr. Kautilya Swaroop",
                                lab_name: "Dental Lab",
                                treatment_reference: crownInfo.ref,
                                crown_status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                                status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                                patient_cost: crownInfo.cost,
                                prescription_id: id,
                                created_at: now,
                                updated_at: now,
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Auto crown record sync error on update:", err);
            }
        }

        if (updates.diagnosis) {
            await recordDiagnosesToCatalog(ctx, updates.diagnosis);
        }
        if (updates.chief_complaint) {
            await recordComplaintsToCatalog(ctx, updates.chief_complaint);
        }

        // Auto-mark corresponding OPD queue item & appointment as Completed
        await markOpdQueueCompletedForPrescription(ctx, rx || updates);

        return { _id: id, id };
    },
});

export const list = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 100;
        return await ctx.db.query("prescriptions").order("desc").take(limit);
    },
});

export const listByPatient = query({
    args: { reference_number: v.string() },
    handler: async (ctx, args) => {
        const rawRef = args.reference_number.trim();
        if (!rawRef) return [];
        const altRef = rawRef.startsWith('CH') ? rawRef.replace(/^CH/i, 'CRX') : rawRef.replace(/^CRX/i, 'CH');

        const [docs1, docs2] = await Promise.all([
            ctx.db.query("prescriptions").withIndex("by_reference", (q) => q.eq("reference_number", rawRef)).collect(),
            rawRef !== altRef
                ? ctx.db.query("prescriptions").withIndex("by_reference", (q) => q.eq("reference_number", altRef)).collect()
                : Promise.resolve([])
        ]);

        const all = [...docs1, ...docs2];
        return all.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));
    },
});

export const listByPhone = query({
    args: { phone_number: v.string() },
    handler: async (ctx, args) => {
        const cleanPhone = args.phone_number.replace(/\D/g, '').slice(-10);
        if (!cleanPhone) return [];
        const docs = await ctx.db.query("prescriptions").withIndex("by_phone", (q) => q.eq("phone_number", cleanPhone)).collect();
        return docs.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));
    },
});

export const listByPatientName = query({
    args: { patient_name: v.string() },
    handler: async (ctx, args) => {
        const name = args.patient_name.trim();
        if (!name || name.length < 2) return [];

        // 1. Try exact match on indexed by_patient_name
        const docs = await ctx.db
            .query("prescriptions")
            .withIndex("by_patient_name", (q) => q.eq("patient_name", name))
            .collect();
        if (docs.length > 0) {
            return docs.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));
        }

        // 2. Also try lowercase version if casing differed
        const docsLower = await ctx.db
            .query("prescriptions")
            .withIndex("by_patient_name", (q) => q.eq("patient_name", name.toLowerCase()))
            .collect();
        if (docsLower.length > 0) {
            return docsLower.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));
        }

        // 3. Try title-cased version (e.g. "Tanuja Wayse")
        const titleCased = name.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        if (titleCased !== name && titleCased !== name.toLowerCase()) {
            const docsTitle = await ctx.db
                .query("prescriptions")
                .withIndex("by_patient_name", (q) => q.eq("patient_name", titleCased))
                .collect();
            if (docsTitle.length > 0) {
                return docsTitle.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));
            }
        }

        // 4. Try without honorific prefix (e.g. "Mr.", "Mrs.", "Dr.", "Smt.")
        const strippedName = name.replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, "").trim();
        if (strippedName && strippedName !== name) {
            const docsStripped = await ctx.db
                .query("prescriptions")
                .withIndex("by_patient_name", (q) => q.eq("patient_name", strippedName))
                .collect();
            if (docsStripped.length > 0) {
                return docsStripped.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));
            }
        }

        // 5. Capped fallback check across recent 80 prescriptions (never whole-table scan)
        const recent = await ctx.db.query("prescriptions").order("desc").take(80);
        const normTarget = name.toLowerCase().replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, "").replace(/[^a-z0-9]/g, "");
        const matched = recent.filter((p) => {
            const pNorm = (p.patient_name || "").toLowerCase().replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, "").replace(/[^a-z0-9]/g, "");
            return pNorm && (pNorm === normTarget || pNorm.includes(normTarget) || normTarget.includes(pNorm));
        });
        return matched.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));
    },
});

export const getQueueVisitTracking = query({
    args: {
        uhids: v.array(v.string()),
        phones: v.array(v.string()),
        todayDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const today = args.todayDate || new Date().toISOString().split("T")[0];
        const lastVisitByUhid: Record<string, { date: string; daysAgo: number; doctor?: string; diagnosis?: string }> = {};
        const lastVisitByPhone: Record<string, { date: string; daysAgo: number; doctor?: string; diagnosis?: string }> = {};
        const todayRxByVisitId: Record<string, any> = {};
        const todayRxByUhid: Record<string, any> = {};
        const todayRxByPhone: Record<string, any> = {};

        const calcDaysAgo = (dateStr: string) => {
            const d = new Date(dateStr);
            d.setHours(0, 0, 0, 0);
            const t = new Date(today);
            t.setHours(0, 0, 0, 0);
            return Math.round((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        };

        const uniqueUhids = Array.from(new Set(args.uhids.map((u) => (u || "").trim().toUpperCase()).filter(Boolean)));
        for (const uhid of uniqueUhids) {
            const docs1 = await ctx.db
                .query("prescriptions")
                .withIndex("by_reference", (q) => q.eq("reference_number", uhid))
                .order("desc")
                .take(2);
            let docs2: any[] = [];
            if (docs1.length === 0) {
                const altRef = uhid.startsWith("CH") ? uhid.replace(/^CH/i, "CRX") : uhid.replace(/^CRX/i, "CH");
                if (altRef !== uhid) {
                    docs2 = await ctx.db
                        .query("prescriptions")
                        .withIndex("by_reference", (q) => q.eq("reference_number", altRef))
                        .order("desc")
                        .take(2);
                }
            }
            const allRx = [...docs1, ...docs2].sort(
                (a, b) =>
                    new Date(b.prescription_date || (b as any).created_at || b._creationTime || 0).getTime() -
                    new Date(a.prescription_date || (a as any).created_at || a._creationTime || 0).getTime()
            );

            for (const rx of allRx) {
                const rxDate = rx.prescription_date || new Date(rx._creationTime).toISOString().split("T")[0];
                const lightRx = {
                    _id: rx._id,
                    id: rx._id,
                    prescription_date: rxDate,
                    doctor_name: rx.doctor_name,
                    diagnosis: rx.diagnosis,
                    opd_visit_id: rx.opd_visit_id,
                    reference_number: rx.reference_number,
                };
                if (rx.opd_visit_id && !todayRxByVisitId[rx.opd_visit_id]) {
                    todayRxByVisitId[rx.opd_visit_id] = lightRx;
                }
                if (rxDate === today) {
                    if (!todayRxByUhid[uhid]) todayRxByUhid[uhid] = lightRx;
                } else if (rxDate && rxDate < today) {
                    const diffDays = calcDaysAgo(rxDate);
                    if (diffDays > 0 && !lastVisitByUhid[uhid]) {
                        lastVisitByUhid[uhid] = {
                            date: rxDate,
                            daysAgo: diffDays,
                            doctor: rx.doctor_name,
                            diagnosis: rx.diagnosis,
                        };
                    }
                }
            }
        }

        const cleanPhones = Array.from(new Set(args.phones.map((p) => (p || "").replace(/\D/g, "").slice(-10)).filter((p) => p.length === 10)));
        for (const phone of cleanPhones) {
            const docs = await ctx.db.query("prescriptions").withIndex("by_phone", (q) => q.eq("phone_number", phone)).order("desc").take(2);
            const allRx = docs.sort(
                (a, b) =>
                    new Date(b.prescription_date || b._creationTime || 0).getTime() -
                    new Date(a.prescription_date || a._creationTime || 0).getTime()
            );

            for (const rx of allRx) {
                const rxDate = rx.prescription_date || new Date(rx._creationTime).toISOString().split("T")[0];
                const rxName = (rx.patient_name || "").trim().toLowerCase();
                const safeName = encodeURIComponent(rxName);
                const key = rxName ? `${phone}_${safeName}` : phone;
                const lightRx = {
                    _id: rx._id,
                    id: rx._id,
                    prescription_date: rxDate,
                    doctor_name: rx.doctor_name,
                    diagnosis: rx.diagnosis,
                    opd_visit_id: rx.opd_visit_id,
                    reference_number: rx.reference_number,
                };

                if (rx.opd_visit_id && !todayRxByVisitId[rx.opd_visit_id]) {
                    todayRxByVisitId[rx.opd_visit_id] = lightRx;
                }
                if (rxDate === today) {
                    if (rxName && !todayRxByPhone[key]) todayRxByPhone[key] = lightRx;
                    if (!todayRxByPhone[phone]) todayRxByPhone[phone] = lightRx;
                } else if (rxDate && rxDate < today) {
                    const diffDays = calcDaysAgo(rxDate);
                    if (diffDays > 0) {
                        if (rxName && !lastVisitByPhone[key]) {
                            lastVisitByPhone[key] = {
                                date: rxDate,
                                daysAgo: diffDays,
                                doctor: rx.doctor_name,
                                diagnosis: rx.diagnosis,
                            };
                        }
                        if (!lastVisitByPhone[phone]) {
                            lastVisitByPhone[phone] = {
                                date: rxDate,
                                daysAgo: diffDays,
                                doctor: rx.doctor_name,
                                diagnosis: rx.diagnosis,
                            };
                        }
                    }
                }
            }
        }

        return {
            lastVisitByUhid,
            lastVisitByPhone,
            todayRxByVisitId,
            todayRxByUhid,
            todayRxByPhone,
        };
    },
});

export const getLatestByPhone = query({
    args: { phone_number: v.string(), name: v.optional(v.string()), reference_number: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const cleanPhone = args.phone_number.replace(/\D/g, '').slice(-10);
        const cleanName = args.name ? args.name.trim().toLowerCase().replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, "").replace(/[^a-z0-9]/g, "") : "";
        const targetRef = args.reference_number ? args.reference_number.trim().toUpperCase().replace(/^CH/i, 'CRX') : "";

        let candidates: any[] = [];
        if (targetRef) {
            candidates = await ctx.db.query("prescriptions").withIndex("by_reference", (q) => q.eq("reference_number", targetRef)).collect();
        }
        if (candidates.length === 0 && cleanPhone) {
            candidates = await ctx.db.query("prescriptions").withIndex("by_phone", (q) => q.eq("phone_number", cleanPhone)).collect();
        }
        candidates.sort((a, b) => ((b as any).created_at || b._creationTime) - ((a as any).created_at || a._creationTime));

        return candidates.find((p) => {
            const pRef = (p.reference_number || "").trim().toUpperCase().replace(/^CH/i, 'CRX');
            if (targetRef && pRef) {
                return pRef === targetRef;
            }
            const pPhone = (p.phone_number || "").replace(/\D/g, '').slice(-10);
            if (pPhone !== cleanPhone) return false;
            if (cleanName) {
                const pName = (p.patient_name || "").trim().toLowerCase().replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, "").replace(/[^a-z0-9]/g, "");
                return pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName);
            }
            return true;
        }) || null;
    },
});

export const remove = mutation({
    args: { id: v.id("prescriptions") },
    handler: async (ctx, args) => {
        // Delete linked crown records if any
        const linkedCrowns = await ctx.db
            .query("crown_cutting_register")
            .withIndex("by_prescription", (q) => q.eq("prescription_id", args.id))
            .collect();
        for (const c of linkedCrowns) {
            await ctx.db.delete(c._id);
        }

        await ctx.db.delete(args.id);
    },
});

/**
 * Mutation to scan all historical prescriptions and backfill/sync crown records for RCT or Crown
 */
export const syncAllPrescriptionsToCrownRegister = mutation({
    args: {},
    handler: async (ctx) => {
        const prescriptions = await ctx.db.query("prescriptions").collect();
        let syncedCount = 0;

        for (const rx of prescriptions) {
            const crownInfo = extractCrownInfoFromPrescription(rx);
            if (crownInfo.isCrown) {
                const existing = await ctx.db
                    .query("crown_cutting_register")
                    .withIndex("by_prescription", (q) => q.eq("prescription_id", rx._id))
                    .first();

                const now = Date.now();
                if (!existing) {
                    await ctx.db.insert("crown_cutting_register", {
                        patient_name: rx.patient_name,
                        phone_number: rx.phone_number,
                        reference_number: rx.reference_number,
                        tooth_numbers: crownInfo.toothStr,
                        crown_type: crownInfo.crownType,
                        cutting_date: rx.prescription_date,
                        fixed_date: crownInfo.isFixed ? rx.prescription_date : undefined,
                        dentist_name: rx.doctor_name || "Dr. Kautilya Swaroop",
                        lab_name: "Dental Lab",
                        treatment_reference: crownInfo.ref,
                        crown_status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        patient_cost: crownInfo.cost,
                        prescription_id: rx._id,
                        created_at: now,
                        updated_at: now,
                    });
                    syncedCount++;
                } else {
                    const currentCost = (existing.patient_cost && existing.patient_cost > 0) ? existing.patient_cost : crownInfo.cost;
                    
                    // Auto-correct crown_type if missing, or if previously defaulted to Zirconia with PFM price
                    let updatedCrownType = existing.crown_type;
                    const isGenericZirconia = !updatedCrownType || updatedCrownType === "Zirconia" || updatedCrownType.toLowerCase() === "zirconia";
                    const isOldPfm = updatedCrownType === "PFM" || updatedCrownType?.toLowerCase() === "pfm";

                    if (isGenericZirconia || isOldPfm) {
                        if (currentCost > 0 && currentCost <= 5500) {
                            updatedCrownType = "PFM (Metal Ceramic)";
                        } else if (currentCost >= 6000) {
                            updatedCrownType = "Zirconia (Metal Free)";
                        } else if (crownInfo.crownType) {
                            updatedCrownType = crownInfo.crownType;
                        }
                    }

                    await ctx.db.patch(existing._id, {
                        patient_name: rx.patient_name,
                        phone_number: rx.phone_number,
                        reference_number: rx.reference_number,
                        tooth_numbers: existing.tooth_numbers || crownInfo.toothStr,
                        patient_cost: currentCost,
                        crown_type: updatedCrownType || crownInfo.crownType,
                        treatment_reference: existing.treatment_reference || crownInfo.ref,
                        ...(crownInfo.isFixed ? {
                            crown_status: "Crown Fixed",
                            status: "Crown Fixed",
                            fixed_date: rx.prescription_date,
                        } : {}),
                        updated_at: now,
                    });
                }
            }
        }

        // Auto-reclassify any standalone records in crown_cutting_register where price matches PFM or Zirconia rates
        const allCrowns = await ctx.db.query("crown_cutting_register").collect();
        for (const c of allCrowns) {
            const cost = c.patient_cost || 0;
            const cType = c.crown_type || "";
            const isGenericZirconia = !cType || cType === "Zirconia" || cType.toLowerCase() === "zirconia";
            const isOldPfm = cType === "PFM" || cType.toLowerCase() === "pfm";

            if (cost > 0 && cost <= 5500 && (isGenericZirconia || isOldPfm)) {
                await ctx.db.patch(c._id, { crown_type: "PFM (Metal Ceramic)", updated_at: Date.now() });
            } else if (cost >= 6000 && (isGenericZirconia || cType === "Zirconia")) {
                await ctx.db.patch(c._id, { crown_type: "Zirconia (Metal Free)", updated_at: Date.now() });
            } else if (isOldPfm) {
                await ctx.db.patch(c._id, { crown_type: "PFM (Metal Ceramic)", updated_at: Date.now() });
            }
        }

        return { success: true, syncedCount };
    },
});

/**
 * Mutation to clean up erroneous crown cutting records that were created for plain RCT / Root canal prescriptions
 */
export const cleanErronousCrownCuttingRecords = mutation({
    args: {},
    handler: async (ctx) => {
        const records = await ctx.db.query("crown_cutting_register").collect();
        let deletedCount = 0;

        for (const record of records) {
            // If the record has lab work details already filled in (e.g. lab_name is changed, or crown received/fixed manually), keep it
            const hasCustomLab = record.lab_name && record.lab_name !== "Dental Lab" && record.lab_name.trim() !== "";
            const hasLabNotes = !!record.notes;
            const isManualStatus = record.status === "Crown Received" || record.crown_status === "Crown Received" || record.status === "Crown Fixed" || record.crown_status === "Crown Fixed";

            if (hasCustomLab || hasLabNotes || isManualStatus) {
                continue;
            }

            if (record.prescription_id) {
                const rx = await ctx.db.get(record.prescription_id as any);
                if (rx) {
                    const crownInfo = extractCrownInfoFromPrescription(rx);
                    // If the prescription does NOT have explicit Crown Cutting or Crown Fixed, delete the erroneous record
                    if (!crownInfo.isCrown) {
                        await ctx.db.delete(record._id);
                        deletedCount++;
                    }
                }
            } else {
                // If treatment_reference is explicitly "Root Canal" or "RCT started" with no prescription
                const ref = (record.treatment_reference || "").toLowerCase();
                if (ref.includes("root canal") || ref.includes("rct started") || ref === "rct") {
                    await ctx.db.delete(record._id);
                    deletedCount++;
                }
            }
        }

        return { success: true, deletedCount };
    },
});

/**
 * Automatically marks the corresponding OPD queue item and appointment as Completed
 * when a prescription is created or updated.
 */
async function markOpdQueueCompletedForPrescription(ctx: any, rxArgs: any) {
    try {
        const now = Date.now();
        const rxDate = rxArgs.prescription_date || (rxArgs.created_at ? String(rxArgs.created_at).split("T")[0] : new Date().toISOString().split("T")[0]);
        const cleanPhone = (rxArgs.phone_number || "").replace(/\D/g, "").slice(-10);
        const uhidNorm = (rxArgs.reference_number || "").trim().toUpperCase();

        let matchedInQueue = false;

        // 1. If opd_visit_id is provided, match by queue_id or _id directly
        if (rxArgs.opd_visit_id) {
            let item = await ctx.db
                .query("opd_queue")
                .withIndex("by_queue_id", (q: any) => q.eq("queue_id", rxArgs.opd_visit_id))
                .first();
            if (!item) {
                try {
                    item = await ctx.db.get(rxArgs.opd_visit_id as any);
                } catch {}
            }
            if (item) {
                matchedInQueue = true;
                if (item.status !== "Completed") {
                    await ctx.db.patch(item._id, { status: "Completed", updated_at: now });
                }
            }
        }

        // 2. Only if not already matched, query today's queue items via registeredAt index
        if (!matchedInQueue && (uhidNorm || (cleanPhone && cleanPhone.length === 10))) {
            const startIso = `${rxDate}T00:00:00.000Z`;
            const endIso = `${rxDate}T23:59:59.999Z`;
            const todayQueueItems = await ctx.db
                .query("opd_queue")
                .withIndex("by_registered_at", (q: any) =>
                    q.gte("registeredAt", startIso).lte("registeredAt", endIso)
                )
                .collect();

            for (const item of todayQueueItems) {
                const itemUhid = (item.uhid || "").trim().toUpperCase();
                const itemPhone = (item.phone || "").replace(/\D/g, "").slice(-10);

                const matchUhid = uhidNorm && itemUhid && itemUhid === uhidNorm;
                const matchPhone = cleanPhone && cleanPhone.length === 10 && itemPhone === cleanPhone;

                if (matchUhid || matchPhone) {
                    if (item.status !== "Completed" && item.status !== "Cancelled") {
                        await ctx.db.patch(item._id, { status: "Completed", updated_at: now });
                    }
                }
            }
        }

        // 3. If there is an appointment for this phone & date, mark it COMPLETED
        if (cleanPhone && cleanPhone.length === 10) {
            const appts = await ctx.db
                .query("appointments")
                .withIndex("by_phone", (q: any) => q.eq("phone", cleanPhone))
                .collect();
            for (const appt of appts) {
                const aDate = (appt.date || "").split("T")[0];
                const aPhone = (appt.phone || "").replace(/\D/g, "").slice(-10);
                if (aDate === rxDate && aPhone === cleanPhone && appt.status !== "COMPLETED" && appt.status !== "CANCELLED") {
                    await ctx.db.patch(appt._id, { status: "COMPLETED", updated_at: now });
                }
            }
        }
    } catch (err) {
        console.error("Error marking OPD queue completed for prescription:", err);
    }
}

/**
 * Internal helper to record one or multiple diagnosis items to the `diagnoses` catalog
 */
async function recordDiagnosesToCatalog(ctx: any, diagnosisText?: string) {
    if (!diagnosisText) return;
    const parts = diagnosisText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);
    if (parts.length === 0) return;

    try {
        const now = Date.now();
        for (const part of parts) {
            const existing = await ctx.db
                .query("diagnoses")
                .withIndex("by_name", (q: any) => q.eq("name", part))
                .first();
            if (existing) {
                await ctx.db.patch(existing._id, {
                    count: (existing.count || 1) + 1,
                    last_used_at: now,
                });
            } else {
                await ctx.db.insert("diagnoses", {
                    name: part,
                    count: 1,
                    last_used_at: now,
                    created_at: now,
                });
            }
        }
    } catch (err) {
        console.error("Error auto-recording diagnosis:", err);
    }
}

/**
 * Internal helper to record one or multiple complaint items to the `complaints` catalog
 */
async function recordComplaintsToCatalog(ctx: any, complaintText?: string) {
    if (!complaintText) return;
    const parts = complaintText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);
    if (parts.length === 0) return;

    try {
        const now = Date.now();
        for (const part of parts) {
            const existing = await ctx.db
                .query("complaints")
                .withIndex("by_name", (q: any) => q.eq("name", part))
                .first();
            if (existing) {
                await ctx.db.patch(existing._id, {
                    count: (existing.count || 1) + 1,
                    last_used_at: now,
                });
            } else {
                await ctx.db.insert("complaints", {
                    name: part,
                    count: 1,
                    last_used_at: now,
                    created_at: now,
                });
            }
        }
    } catch (err) {
        console.error("Error auto-recording complaint:", err);
    }
}

/**
 * Auto-save a diagnosis into the diagnoses catalog
 */
export const saveDiagnosis = mutation({
    args: {
        name: v.string(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const trimmed = args.name.trim();
        if (!trimmed || trimmed.length < 2) return null;

        const now = Date.now();
        const existing = await ctx.db
            .query("diagnoses")
            .withIndex("by_name", (q) => q.eq("name", trimmed))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                count: (existing.count || 1) + 1,
                last_used_at: now,
                category: args.category || existing.category,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("diagnoses", {
                name: trimmed,
                count: 1,
                last_used_at: now,
                created_at: now,
                category: args.category,
            });
        }
    },
});

/**
 * Auto-save multiple diagnoses (e.g. parsed from multiline or comma separated text)
 */
export const saveMultipleDiagnoses = mutation({
    args: {
        names: v.array(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const savedIds: any[] = [];

        for (const raw of args.names) {
            const trimmed = raw.trim();
            if (!trimmed || trimmed.length < 2) continue;

            const existing = await ctx.db
                .query("diagnoses")
                .withIndex("by_name", (q) => q.eq("name", trimmed))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    count: (existing.count || 1) + 1,
                    last_used_at: now,
                });
                savedIds.push(existing._id);
            } else {
                const newId = await ctx.db.insert("diagnoses", {
                    name: trimmed,
                    count: 1,
                    last_used_at: now,
                    created_at: now,
                    category: args.category,
                });
                savedIds.push(newId);
            }
        }
        return savedIds;
    },
});

/**
 * Query autocomplete suggestions for diagnoses.
 * Merges diagnoses table + past prescriptions' diagnoses + built-in common presets.
 */
export const getDiagnosisSuggestions = query({
    args: {
        query: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxLimit = args.limit || 30;
        const q = (args.query || "").trim().toLowerCase();

        // 1. Fetch from diagnoses catalog table (lightweight, zero prescription overhead)
        const savedDiagnoses = await ctx.db.query("diagnoses").order("desc").take(60);

        // 2. Fetch past diagnoses from recent prescriptions so active clinic diagnoses auto-suggest immediately
        const recentPrescriptions = await ctx.db.query("prescriptions").order("desc").take(30);

        const map = new Map<string, { name: string; count: number; lastUsed: number }>();

        // Populate from saved diagnoses table
        for (const item of savedDiagnoses) {
            if (!item.name || !item.name.trim()) continue;
            const key = item.name.trim().toLowerCase();
            map.set(key, {
                name: item.name.trim(),
                count: item.count || 1,
                lastUsed: item.last_used_at || item.created_at || 0,
            });
        }

        // Populate from recent prescriptions
        for (const rx of recentPrescriptions) {
            if (!rx.diagnosis) continue;
            const parts = rx.diagnosis.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
            for (const part of parts) {
                const key = part.toLowerCase();
                const existing = map.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    map.set(key, {
                        name: part,
                        count: 1,
                        lastUsed: rx._creationTime || 0,
                    });
                }
            }
        }

        // Add standard common presets as fallback if not present
        const defaultPresets = [
            "Dental Caries",
            "Dental Caries involving pulp",
            "Acute Pulpitis",
            "Chronic Irreversible Pulpitis",
            "Periapical Abscess",
            "Root Stump",
            "Grossly Decayed",
            "Gingivitis",
            "Periodontitis",
            "Pericoronitis",
            "Mobility",
            "Stain and Calculus",
            "Malocclusion",
            "Impacted Third Molar",
            "Closed Fracture",
            "Knee Osteoarthritis",
            "Lumbar Spondylosis",
            "Cervical Spondylosis",
            "ACL Tear",
            "Ankle Sprain",
            "Multiple Abrasions",
            "Soft Tissue Injury",
        ];

        for (const preset of defaultPresets) {
            const key = preset.toLowerCase();
            if (!map.has(key)) {
                map.set(key, {
                    name: preset,
                    count: 0,
                    lastUsed: 0,
                });
            }
        }

        const allItems = Array.from(map.values());

        // Filter based on search query
        let filtered = allItems;
        if (q) {
            filtered = allItems.filter((item) =>
                item.name.toLowerCase().includes(q)
            );
            // Sort: exact match first, startsWith second, contains third, then by count / recency
            filtered.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aExact = aName === q;
                const bExact = bName === q;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                const aStarts = aName.startsWith(q);
                const bStarts = bName.startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                if ((b.count || 0) !== (a.count || 0)) {
                    return (b.count || 0) - (a.count || 0);
                }
                return (b.lastUsed || 0) - (a.lastUsed || 0);
            });
        } else {
            // No query: sort by most used and recent
            filtered.sort((a, b) => {
                if ((b.count || 0) !== (a.count || 0)) {
                    return (b.count || 0) - (a.count || 0);
                }
                return (b.lastUsed || 0) - (a.lastUsed || 0);
            });
        }

        return filtered.slice(0, maxLimit).map((item) => item.name);
    },
});

/**
 * Auto-save diagnosis directly to an existing prescription document and to the catalog
 */
export const autoSavePrescriptionDiagnosis = mutation({
    args: {
        id: v.string(),
        diagnosis: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            let existing: any = null;
            try {
                existing = await ctx.db.get(args.id as any);
            } catch {}
            if (existing) {
                await ctx.db.patch(existing._id, {
                    diagnosis: args.diagnosis,
                });
            }
        } catch (err) {
            console.error("autoSavePrescriptionDiagnosis doc patch error:", err);
        }

        await recordDiagnosesToCatalog(ctx, args.diagnosis);
        return { success: true };
    },
});

/**
 * Auto-save single complaint to master catalog
 */
export const saveComplaint = mutation({
    args: {
        name: v.string(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const trimmed = args.name.trim();
        if (!trimmed || trimmed.length < 2) return null;

        const now = Date.now();
        const existing = await ctx.db
            .query("complaints")
            .withIndex("by_name", (q) => q.eq("name", trimmed))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                count: (existing.count || 1) + 1,
                last_used_at: now,
                category: args.category || existing.category,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("complaints", {
                name: trimmed,
                count: 1,
                last_used_at: now,
                created_at: now,
                category: args.category,
            });
        }
    },
});

/**
 * Auto-save multiple complaints (e.g. parsed from multiline or comma separated text)
 */
export const saveMultipleComplaints = mutation({
    args: {
        names: v.array(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const savedIds: any[] = [];

        for (const raw of args.names) {
            const trimmed = raw.trim();
            if (!trimmed || trimmed.length < 2) continue;

            const existing = await ctx.db
                .query("complaints")
                .withIndex("by_name", (q) => q.eq("name", trimmed))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    count: (existing.count || 1) + 1,
                    last_used_at: now,
                });
                savedIds.push(existing._id);
            } else {
                const newId = await ctx.db.insert("complaints", {
                    name: trimmed,
                    count: 1,
                    last_used_at: now,
                    created_at: now,
                    category: args.category,
                });
                savedIds.push(newId);
            }
        }
        return savedIds;
    },
});

/**
 * Query autocomplete suggestions for chief complaints.
 * Merges complaints table + past prescriptions' chief complaints + standard Ortho/Gynae presets.
 */
export const getComplaintSuggestions = query({
    args: {
        query: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxLimit = args.limit || 30;
        const q = (args.query || "").trim().toLowerCase();

        // 1. Fetch from complaints table
        const savedComplaints = await ctx.db.query("complaints").take(60);

        // 2. Fetch past chief complaints from recent prescriptions (limited to prevent heavy I/O)
        const recentPrescriptions = await ctx.db.query("prescriptions").order("desc").take(25);

        const map = new Map<string, { name: string; count: number; lastUsed: number }>();

        // Populate from saved complaints table
        for (const item of savedComplaints) {
            if (!item.name || !item.name.trim()) continue;
            const key = item.name.trim().toLowerCase();
            map.set(key, {
                name: item.name.trim(),
                count: item.count || 1,
                lastUsed: item.last_used_at || item.created_at || 0,
            });
        }

        // Populate from past prescriptions
        for (const rx of recentPrescriptions) {
            if (!rx.chief_complaint) continue;
            const parts = rx.chief_complaint.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
            for (const part of parts) {
                const key = part.toLowerCase();
                const existing = map.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    map.set(key, {
                        name: part,
                        count: 1,
                        lastUsed: 0,
                    });
                }
            }
        }

        const allItems = Array.from(map.values());

        // Filter based on query
        let filtered = allItems;
        if (q) {
            filtered = allItems.filter((item) =>
                item.name.toLowerCase().includes(q)
            );
            filtered.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aExact = aName === q;
                const bExact = bName === q;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                const aStarts = aName.startsWith(q);
                const bStarts = bName.startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                if ((b.count || 0) !== (a.count || 0)) {
                    return (b.count || 0) - (a.count || 0);
                }
                return (b.lastUsed || 0) - (a.lastUsed || 0);
            });
        } else {
            filtered.sort((a, b) => {
                if ((b.count || 0) !== (a.count || 0)) {
                    return (b.count || 0) - (a.count || 0);
                }
                return (b.lastUsed || 0) - (a.lastUsed || 0);
            });
        }

        return filtered.slice(0, maxLimit).map((item) => item.name);
    },
});

/**
 * Auto-save chief complaint directly to an active prescription document and catalog
 */
export const autoSavePrescriptionComplaint = mutation({
    args: {
        id: v.string(),
        chief_complaint: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            let existing: any = null;
            try {
                existing = await ctx.db.get(args.id as any);
            } catch {}
            if (existing) {
                await ctx.db.patch(existing._id, {
                    chief_complaint: args.chief_complaint,
                });
            }
        } catch (err) {
            console.error("autoSavePrescriptionComplaint doc patch error:", err);
        }

        await recordComplaintsToCatalog(ctx, args.chief_complaint);
        return { success: true };
    },
});

export const repairMismatchedVisitIds = mutation({
    args: {},
    handler: async (ctx) => {
        const allRx = await ctx.db.query("prescriptions").collect();
        let unlinked = 0;
        const unlinkedQueueIds: string[] = [];

        for (const rx of allRx) {
            if (!rx.opd_visit_id) continue;
            const match = rx.opd_visit_id.match(/opd_(\d+)/);
            if (!match) continue;
            const visitTs = Number(match[1]);
            const visitDate = new Date(visitTs).toISOString().split("T")[0];
            if (visitDate !== rx.prescription_date) {
                unlinkedQueueIds.push(rx.opd_visit_id);
                await ctx.db.patch(rx._id, {
                    opd_visit_id: undefined,
                });
                unlinked++;
            }
        }

        let queueReset = 0;
        for (const qId of unlinkedQueueIds) {
            const queueItem = await ctx.db
                .query("opd_queue")
                .withIndex("by_queue_id", (q) => q.eq("queue_id", qId))
                .first();
            if (queueItem && queueItem.status === "Completed") {
                await ctx.db.patch(queueItem._id, {
                    status: "Waiting",
                });
                queueReset++;
            }
        }

        return { unlinked, queueReset };
    },
});

