import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export type Bill = {
  id?: string;
  prescription_id: string;
  patient_id: string;
  reference_number: string;
  bill_number?: string;
  bill_date?: string;
  total_amount: number;
  paid_amount: number;
  balance_amount?: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  payment_method?: string;
  discount_percent?: number;
  discount_amount?: number;
  items: any[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient_name?: string;
  phone_number?: string;
};

const validateBillData = (bill: Bill) => {
  const errors: string[] = [];

  if (!bill.prescription_id) {
    bill.prescription_id = 'DIRECT_BILL';
  }
  if (!bill.patient_id) errors.push('Patient ID is required');
  if (!bill.reference_number) errors.push('Reference number is required');
  if (typeof bill.total_amount !== 'number' || bill.total_amount < 0) {
    errors.push('Total amount must be a non-negative number');
  }
  if (typeof bill.paid_amount !== 'number' || bill.paid_amount < 0) {
    errors.push('Paid amount must be a non-negative number');
  }
  if (!Array.isArray(bill.items)) {
    errors.push('Bill items must be an array');
  }
  if (bill.paid_amount > bill.total_amount) {
    errors.push('Paid amount cannot exceed total amount');
  }

  return errors;
};

export const createBill = async (bill: Bill) => {
  try {
    const validationErrors = validateBillData(bill);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid bill data: ${validationErrors.join(', ')}`);
    }

    const billData = {
      prescription_id: String(bill.prescription_id),
      patient_id: String(bill.patient_id),
      reference_number: String(bill.reference_number),
      total_amount: Number(bill.total_amount),
      paid_amount: Number(bill.paid_amount),
      items: bill.items,
      notes: bill.notes,
    };

    const result = await convex.mutation(api.bills.create, billData);
    const newBillId = result.id;
    const bill_number = result.bill_number;
    return { ...bill, id: newBillId, bill_number } as Bill;
  } catch (e) {
    console.error('Exception in createBill:', e);
    throw e;
  }
};

export const updateBill = async (id: string, bill: Partial<Bill>) => {
  try {
    // Only pass fields accepted by the Convex bills.update mutation
    const validUpdate: Record<string, any> = { id: id as any };
    if (bill.total_amount !== undefined) validUpdate.total_amount = bill.total_amount;
    if (bill.paid_amount !== undefined) validUpdate.paid_amount = bill.paid_amount;
    if (bill.balance_amount !== undefined) validUpdate.balance_amount = bill.balance_amount;
    if (bill.items !== undefined) validUpdate.items = bill.items;
    if (bill.notes !== undefined) validUpdate.notes = bill.notes;
    if (bill.payment_status !== undefined) validUpdate.payment_status = bill.payment_status;
    if (bill.discount_percent !== undefined) validUpdate.discount_percent = bill.discount_percent;
    if (bill.discount_amount !== undefined) validUpdate.discount_amount = bill.discount_amount;

    const data = await convex.mutation(api.bills.update, validUpdate as any);
    return { ...data, id: data?._id } as any as Bill;
  } catch (e) {
    console.error('Exception in updateBill:', e);
    throw e;
  }
};

export const getBillByPrescriptionId = async (prescriptionId: string) => {
  try {
    if (!prescriptionId || typeof prescriptionId !== 'string') {
      throw new Error('Invalid prescription ID provided');
    }

    const data = await convex.query(api.bills.getByPrescriptionId, { prescription_id: prescriptionId });
    if (!data) return null;

    // Filter out prescription medicines so only consultation & treatment charges carry over
    let items = data.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    if (Array.isArray(items)) {
      const nonMedicineItems = filterNonMedicineBillItems(items);
      if (nonMedicineItems.length !== items.length) {
        const rawItemsTotal = nonMedicineItems.reduce((sum: number, it: any) => {
          return sum + (Number(it.total) || (Number(it.unit_price) || 0) * (Number(it.quantity) || 1));
        }, 0);
        const disc = Number(data.discount_amount) || 0;
        const adjustedTotal = Math.max(0, rawItemsTotal - disc);
        const paid = Number(data.paid_amount) || 0;
        return {
          ...data,
          id: data._id,
          items: nonMedicineItems,
          total_amount: adjustedTotal,
          balance_amount: Math.max(0, adjustedTotal - paid),
        } as any as Bill;
      }
    }

    return { ...data, id: data._id } as any as Bill;
  } catch (e) {
    console.error('Exception in getBillByPrescriptionId:', e);
    throw e;
  }
};

export const getPatientByReferenceNumber = async (referenceNumber: string) => {
  if (!referenceNumber || typeof referenceNumber !== 'string' || !referenceNumber.trim()) {
    throw new Error('Valid reference number is required');
  }

  try {
    const data = await convex.query(api.patients.getByReference, { reference_number: referenceNumber.trim() });

    if (!data || !data._id) {
      throw new Error(`No patient found with reference number "${referenceNumber}"`);
    }

    return { ...data, id: data._id };
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw new Error('Failed to fetch patient data');
  }
};

export const getAll = async () => {
  try {
    const data = await convex.query(api.bills.list, {});
    return data.map((b: any) => ({ ...b, id: b._id })) as any as Bill[];
  } catch (e) {
    console.error('Exception in getAll bills:', e);
    throw e;
  }
};

/**
 * Detects whether a bill line item represents a prescription medicine
 * (as opposed to consultations, procedures, investigations, dressings, etc.)
 */
export const isPrescriptionMedicineItem = (item: any): boolean => {
  if (!item) return false;

  const itemType = String(item.item_type || item.itemType || '').toLowerCase().trim();
  const category = String(item.category || '').toLowerCase().trim();
  const desc = String(item.description || item.name || '').toLowerCase().trim();

  // If explicit type/category says medicine, exclude it
  if (itemType === 'medicine' || category === 'medicine') {
    return true;
  }

  // Explicit consultation or registration is NEVER a medicine
  if (
    itemType === 'consultation' ||
    category === 'consultation' ||
    category === 'registration' ||
    /consultation|registration fee|follow-?up/i.test(desc)
  ) {
    return false;
  }

  // Treatment / Procedure / Investigation keywords that must NOT be excluded
  if (
    category === 'procedure' ||
    category === 'investigation' ||
    /dressing|stitching|suture|removal|plaster|cast|x-ray|xray|ecg|blood test|injection charge|root canal|extraction|cleaning|scaling|filling|debridement|physiotherapy|nebulization|bed charge|room charge/i.test(desc)
  ) {
    return false;
  }

  // Medicine dosage forms prefixes or keywords
  if (
    /^(tab|tab\.|tablet|cap|cap\.|capsule|syr|syr\.|syrup|inj|inj\.|injection|oint|ointment|gel|drop|drops|eye drops|ear drops|cream|lotion|susp|susp\.|suspension|sachet|powder|respule|respules|inhaler)\b/i.test(desc)
  ) {
    return true;
  }

  // Prescription dosage timing patterns e.g. "(1-0-1)", "(0-0-1)", "(1-1-1)"
  if (/\(\s*\d\s*-\s*\d\s*-\s*\d(\s*-\s*\d)?\s*\)/.test(desc)) {
    return true;
  }

  // Strength suffix patterns commonly on medicine names e.g. "Rapicalv 625", "Paracetamol 500mg"
  if (/\b\d+\s*(mg|ml|gm|mcg|iu)\b/i.test(desc)) {
    return true;
  }

  // Common medicine formulation names
  if (
    desc.includes('mouthwash') ||
    desc.includes('gargle') ||
    desc.includes('paracetamol') ||
    desc.includes('amoxicillin') ||
    desc.includes('antibiotic')
  ) {
    return true;
  }

  return false;
};

/**
 * Filters an array of bill items to exclude prescription medicines,
 * preserving only consultations and treatments/procedures.
 */
export const filterNonMedicineBillItems = <T = any>(items: T[]): T[] => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isPrescriptionMedicineItem(item));
};

export const billService = {
  create: createBill,
  update: updateBill,
  getByPrescriptionId: getBillByPrescriptionId,
  getAll: getAll,
  isPrescriptionMedicineItem,
  filterNonMedicineBillItems,
};

