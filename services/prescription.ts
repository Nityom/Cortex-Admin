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

export const addPrescription = async (prescription: Prescription) => {
  const data = await convex.mutation(api.prescriptions.create, prescription as any);
  return { ...prescription, id: data } as Prescription;
};

export const getAllPrescriptions = async (searchTerm?: string) => {
  try {
    const data = await convex.query(api.prescriptions.list);
    let results = data.map((item: any) => ({ ...item, id: item._id })) as Prescription[];
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

  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );

  const data = await convex.mutation(api.prescriptions.update, { id: id as any, ...cleanUpdates } as any);
  return { ...data, id: data?._id } as any as Prescription;
};

export const deletePrescription = async (id: string) => {
  // Temporary UI-generated IDs should not be sent to the database
  if (!id || id === 'undefined' || id === 'null' || id.toString().startsWith('TMP-')) {
    return true;
  }
  await convex.mutation(api.prescriptions.remove, { id: id as any });
  return true;
}

export const getPrescriptionWithBill = async (id: string) => {
  if (!id || id === 'undefined' || id === 'null') return null;
  const data = await convex.query(api.prescriptions.getById, { id: id as any });
  return data ? { ...data, id: data._id } as any as Prescription : null;
};

export const getPrescriptionsByPatient = async (patientId: string) => {
  const data = await convex.query(api.prescriptions.listByPatient, { reference_number: patientId });
  return data.map((item: any) => ({ ...item, id: item._id })) as Prescription[];
};

export const getLatestPrescriptionByPhone = async (phoneNumber: string) => {
  if (!phoneNumber) return null;
  const data = await convex.query(api.prescriptions.getLatestByPhone, { phone_number: phoneNumber });
  return data ? ({ ...data, id: data._id } as any as Prescription) : null;
};

export const getAllPrescriptionsForPatient = async (
  referenceNumber?: string | null,
  phoneNumber?: string | null,
  patientName?: string | null
): Promise<Prescription[]> => {
  try {
    let results: any[] = [];
    if (referenceNumber) {
      const byRef = await convex.query(api.prescriptions.listByPatient, { reference_number: referenceNumber });
      if (Array.isArray(byRef) && byRef.length > 0) {
        results = [...byRef];
      }
    }

    const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
    // If empty or to ensure all historical visits are captured
    if (cleanPhone || patientName || referenceNumber) {
      const all = await convex.query(api.prescriptions.list);
      if (Array.isArray(all)) {
        const matched = all.filter((p: any) => {
          const pPhone = (p.phone_number || '').replace(/\D/g, '').slice(-10);
          const matchPhone = cleanPhone && pPhone && cleanPhone === pPhone;
          const matchRef = referenceNumber && p.reference_number && p.reference_number.trim().toUpperCase() === referenceNumber.trim().toUpperCase();
          const matchName = patientName && p.patient_name && p.patient_name.toLowerCase().trim() === patientName.toLowerCase().trim();
          return matchPhone || matchRef || matchName;
        });
        // Merge without duplicates by _id
        const existingIds = new Set(results.map((r: any) => String(r._id || r.id)));
        for (const item of matched) {
          const id = String(item._id || (item as any).id);
          if (!existingIds.has(id)) {
            results.push(item);
            existingIds.add(id);
          }
        }
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

