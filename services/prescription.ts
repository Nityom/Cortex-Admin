// services/prescription.ts
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export interface DosageSchedule {
  id?: string;
  dosage: string;
  unit?: string;
  time?: string;
  when?: string;
  where?: string;
  frequency?: string;
  duration?: string;
  start_from?: string;
  to_date?: string;
  details?: string;
  notes?: string;
}

export interface MedicineEntry {
  name: string;
  dosage: string;
  duration?: string;
  frequency?: string;
  quantity?: number;
  quantity_manual?: boolean;
  composition?: string;
  timing?: string;
  time?: string;
  freq_duration?: string;
  note?: string;
  unit?: string;
  when?: string;
  where?: string;
  start_from?: string;
  to_date?: string;
  details?: string;
  schedules?: DosageSchedule[];
}

export interface ToothData {
  id: number | string;
  type: string;
  category: string;
  disease?: string;
  name?: string;
}

export interface Bill {
  id: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
}

export interface TreatmentItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Prescription {
  id?: string;
  patient_name: string;
  phone_number: string;
  age: string;
  sex: string;
  prescription_date: string;
  reference_number?: string;
  email?: string;
  chief_complaint?: string;
  medical_history?: string;
  investigation?: string;
  diagnosis?: string;
  treatment_plan?: any; // can be string[] (legacy) or TreatmentPlanItem[]
  findings?: string;
  oral_exam_notes?: string;
  dr_notes?: string;
  selected_teeth?: ToothData[];
  medicines?: MedicineEntry[];
  treatment_done?: TreatmentItem[];
  advice?: string;
  followup_date?: string;
  doctor_name?: string;
  opd_visit_id?: string;
  vitals?: any;
  created_at?: string;
  updated_at?: string;
  bills?: Bill[];
}

const RX_CACHE_KEY = 'cortex_prescriptions_cache_v1';
const RX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export const clearPrescriptionCache = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(RX_CACHE_KEY);
    } catch {}
  }
};

export const addPrescription = async (prescription: Prescription) => {
  clearPrescriptionCache();
  const data = await convex.mutation(api.prescriptions.create, prescription as any);
  return { ...prescription, id: data } as Prescription;
};

export const getAllPrescriptions = async (searchTerm?: string, forceRefresh = false) => {
  try {
    if (!forceRefresh && typeof window !== 'undefined' && !searchTerm) {
      try {
        const cached = localStorage.getItem(RX_CACHE_KEY);
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < RX_CACHE_TTL && Array.isArray(data) && data.length > 0) {
            return data as Prescription[];
          }
        }
      } catch {}
    }

    const data = await convex.query(api.prescriptions.list, {});
    let results = data.map((item: any) => ({ ...item, id: item._id })) as Prescription[];

    if (typeof window !== 'undefined' && !searchTerm) {
      try {
        localStorage.setItem(RX_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: results }));
      } catch {}
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(p => p.patient_name.toLowerCase().includes(term));
    }
    return results;
  } catch (err) {
    console.error('Error in getAllPrescriptions:', err);
    throw err;
  }
};

export const getPrescriptionById = async (id: string) => {
  if (!id || id === 'undefined' || id === 'null') return null;
  const data = await convex.query(api.prescriptions.getById, { id: id as any });
  return data ? { ...data, id: data._id } as any as Prescription : null;
};

export const updatePrescription = async (id: string, updates: Partial<Prescription>) => {
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('Cannot update prescription with invalid ID');
  }

  clearPrescriptionCache();
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );

  const data = await convex.mutation(api.prescriptions.update, { id: id as any, ...cleanUpdates } as any);
  return { ...cleanUpdates, ...data, id: data?._id || id } as any as Prescription;
};

export const deletePrescription = async (id: string) => {
  clearPrescriptionCache();
  // Temporary UI-generated IDs should not be sent to the database
  if (!id || id === 'undefined' || id === 'null' || id.toString().startsWith('TMP-')) {
    return true;
  }
  await convex.mutation(api.prescriptions.remove, { id: id as any });
  return true;
};

export const getPrescriptionWithBill = async (id: string) => {
  if (!id || id === 'undefined' || id === 'null') return null;
  const data = await convex.query(api.prescriptions.getById, { id: id as any });
  return data ? { ...data, id: data._id } as any as Prescription : null;
};

export const getPrescriptionsByPatient = async (patientId: string) => {
  const data = await convex.query(api.prescriptions.listByPatient, { reference_number: patientId });
  return data.map((item: any) => ({ ...item, id: item._id })) as Prescription[];
};

export const getLatestPrescriptionByPhone = async (phoneNumber: string, name?: string, referenceNumber?: string) => {
  if (!phoneNumber) return null;
  const data = await convex.query(api.prescriptions.getLatestByPhone, {
    phone_number: phoneNumber,
    name: name || undefined,
    reference_number: referenceNumber || undefined,
  });
  return data ? ({ ...data, id: data._id } as any as Prescription) : null;
};

function normalizePatientName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export const getAllPrescriptionsForPatient = async (
  referenceNumber?: string | null,
  phoneNumber?: string | null,
  patientName?: string | null
): Promise<Prescription[]> => {
  try {
    const targetRef = referenceNumber ? referenceNumber.trim().toUpperCase().replace(/^CH/i, 'CRX') : null;
    const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
    const targetNormName = normalizePatientName(patientName);

    let results: any[] = [];

    // 1. If referenceNumber is provided, fetch direct matches using index 'by_reference'
    if (targetRef) {
      const byRef = await convex.query(api.prescriptions.listByPatient, { reference_number: targetRef });
      if (Array.isArray(byRef) && byRef.length > 0) {
        results = [...byRef];
      }
    }

    // 2. If phone is provided, fetch targeted matches using index 'by_phone'
    if (cleanPhone) {
      const byPhone = await convex.query(api.prescriptions.listByPhone, { phone_number: cleanPhone });
      if (Array.isArray(byPhone)) {
        const existingIds = new Set(results.map((r: any) => String(r._id || r.id)));
        for (const item of byPhone) {
          const id = String(item._id || (item as any).id);
          if (!existingIds.has(id)) {
            if (targetNormName) {
              const pNormName = normalizePatientName(item.patient_name);
              if (pNormName && (targetNormName === pNormName || targetNormName.includes(pNormName) || pNormName.includes(targetNormName))) {
                results.push(item);
                existingIds.add(id);
              }
            } else {
              results.push(item);
              existingIds.add(id);
            }
          }
        }
      }
    }

    // 3. Fallback: If 0 results found by UHID/Phone, search by Patient Name
    // (fixes cases where phone had a typo e.g. 9 digits, or patient was given a new UHID like CRX0770 instead of CRX0125)
    if (results.length === 0 && patientName && targetNormName && targetNormName.length >= 3) {
      const byName = await convex.query(api.prescriptions.listByPatientName, { patient_name: patientName });
      if (Array.isArray(byName) && byName.length > 0) {
        results = [...byName];
      }
    }

    results.sort((a: any, b: any) => {
      const tA = new Date(a.prescription_date || a._creationTime || 0).getTime();
      const tB = new Date(b.prescription_date || b._creationTime || 0).getTime();
      return tB - tA;
    });

    return results.map((item: any) => ({ ...item, id: item._id })) as Prescription[];
  } catch (err) {
    console.warn('Error fetching all prescriptions for patient:', err);
    return [];
  }
};

export const saveDiagnosis = async (name: string, category?: string) => {
  try {
    return await convex.mutation(api.prescriptions.saveDiagnosis, { name, category });
  } catch (err) {
    console.error('Error saving diagnosis:', err);
    return null;
  }
};

export const saveMultipleDiagnoses = async (names: string[], category?: string) => {
  try {
    return await convex.mutation(api.prescriptions.saveMultipleDiagnoses, { names, category });
  } catch (err) {
    console.error('Error saving multiple diagnoses:', err);
    return [];
  }
};

export const getDiagnosisSuggestions = async (query?: string, limit?: number): Promise<string[]> => {
  try {
    return await convex.query(api.prescriptions.getDiagnosisSuggestions, { query, limit });
  } catch (err) {
    console.error('Error fetching diagnosis suggestions:', err);
    return [];
  }
};

export const saveMultipleComplaints = async (names: string[], category?: string) => {
  try {
    return await (convex as any).mutation(api.prescriptions.saveMultipleComplaints, { names, category });
  } catch (err) {
    console.error('Error saving multiple complaints:', err);
    return [];
  }
};

export const getComplaintSuggestions = async (query?: string, limit?: number): Promise<string[]> => {
  try {
    return await (convex as any).query(api.prescriptions.getComplaintSuggestions, { query, limit });
  } catch (err) {
    console.error('Error fetching complaint suggestions:', err);
    return [];
  }
};

export const autoSavePrescriptionComplaint = async (id: string, chief_complaint: string) => {
  try {
    return await (convex as any).mutation(api.prescriptions.autoSavePrescriptionComplaint, {
      id: id as any,
      chief_complaint,
    });
  } catch (err) {
    console.error('Error auto-saving prescription complaint:', err);
    return null;
  }
};

export const autoSavePrescriptionDiagnosis = async (id: string, diagnosis: string) => {
  if (!id || id === 'undefined' || id === 'null' || id.toString().startsWith('TMP-')) {
    return false;
  }
  try {
    await convex.mutation(api.prescriptions.autoSavePrescriptionDiagnosis, { id: id as any, diagnosis });
    return true;
  } catch (err) {
    console.error('Error auto-saving prescription diagnosis:', err);
    return false;
  }
};

