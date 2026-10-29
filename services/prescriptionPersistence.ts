import { deductMedicineStock, Medicine } from './medicine';
import { getEnabledConsumablesForDeduction } from './consumables';
import { deductInventoryStock } from './inventory';
import { deductStockForTreatments } from './treatmentLinks';
import { materialTransactionService } from './registers';
import { createBill, updateBill, getBillByPrescriptionId, Bill } from './bills';
import { MedicineEntry } from './prescription';
import { TreatmentItem } from '@/components/prescription/PrescriptionProcedureSection';

export async function autoRecordMedicineStock(
  medicines: MedicineEntry[],
  medicineOptions: Medicine[]
): Promise<void> {
  if (!medicines || medicines.length === 0) return;
  try {
    const salePromises = medicines
      .filter((med) => med.name && med.name.trim())
      .map(async (med) => {
        try {
          const detail = medicineOptions.find(
            (m) => m.name.toLowerCase() === med.name.toLowerCase()
          );
          if (!detail || !detail.id) return;
          if (detail.quantity !== undefined && detail.quantity !== null && detail.quantity > 0) {
            const quantity =
              med.quantity && med.quantity > 0
                ? med.quantity
                : (() => {
                    const match = (med.dosage || '').toString().match(/[\d.]+/);
                    return match ? parseFloat(match[0]) : 1;
                  })();
            if (quantity > 0) {
              await deductMedicineStock([{ name: detail.name, quantity }]);
            }
          }
        } catch (err) {
          console.warn(`Stock deduction skipped for ${med.name}:`, err);
        }
      });
    await Promise.allSettled(salePromises);
  } catch (err) {
    console.error('Error during medicine sales recording:', err);
  }
}

export async function deductPrescriptionConsumables(
  patientName: string,
  isEditMode: boolean
): Promise<void> {
  if (isEditMode) return;
  try {
    const consumableItems = await getEnabledConsumablesForDeduction();
    if (!consumableItems || consumableItems.length === 0) return;

    const deductionResults = await deductInventoryStock(consumableItems);
    const today = new Date().toISOString().split('T')[0];

    const usagePromises = consumableItems.map(async (item) => {
      const result = deductionResults.find((r) => r.name === item.name && r.status === 'success');
      if (result) {
        try {
          const itemRate = (result as any).rate || 0;
          await materialTransactionService.record({
            material_name: item.name,
            subdivision: 'Consumable',
            transaction_type: 'USAGE',
            quantity: item.quantity,
            rate: itemRate,
            transaction_date: today,
            notes: `Used during consultation for ${patientName}`,
          });
        } catch (err) {
          console.warn(`Usage log skipped for ${item.name}:`, err);
        }
      }
    });
    await Promise.allSettled(usagePromises);
  } catch (err) {
    console.error('Error deducting consumable items:', err);
  }
}

export async function deductPrescriptionTreatments(
  treatmentItems: TreatmentItem[],
  patientName: string,
  prescriptionId: string,
  prescriptionDate?: string
): Promise<void> {
  if (!treatmentItems || treatmentItems.length === 0) return;
  try {
    const treatmentsToDeduct = treatmentItems
      .filter((t) => t.description && t.description.trim())
      .map((t) => ({
        name: t.description.trim(),
        quantity: Number(t.quantity) || 1,
      }));

    if (treatmentsToDeduct.length > 0) {
      await deductStockForTreatments(
        treatmentsToDeduct,
        patientName,
        prescriptionId,
        prescriptionDate
      );
    }
  } catch (err) {
    console.error('Error auto-deducting treatment inventory materials:', err);
  }
}

export interface SyncPrescriptionBillParams {
  prescriptionId: string;
  patientId?: string;
  referenceNumber: string;
  isNewPatient: boolean;
  applyConsultationCharge: boolean;
  consultationCharge: number;
  treatmentItems: TreatmentItem[];
  medicines: MedicineEntry[];
  medicineOptions: Medicine[];
  treatmentDiscount: number | string;
}

export async function syncPrescriptionBill(params: SyncPrescriptionBillParams): Promise<void> {
  const {
    prescriptionId,
    patientId,
    referenceNumber,
    isNewPatient,
    applyConsultationCharge,
    consultationCharge,
    treatmentItems,
    medicines,
    medicineOptions,
    treatmentDiscount,
  } = params;

  try {
    const fee = applyConsultationCharge ? Number(consultationCharge) || 0 : 0;

    const treatmentDoneItems = treatmentItems.map((item, idx) => ({
      id: idx + 2,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.unitPrice * item.quantity,
      item_type: 'procedure' as const,
      date: item.date,
    }));

    const medicineItems = medicines
      .filter((med) => med.name && med.name.trim())
      .map((med, idx) => {
        const detail = medicineOptions.find((m) => m.name.toLowerCase() === med.name.toLowerCase());
        const unitPrice = detail?.price || 0;
        const qty = med.quantity || 1;
        return {
          id: treatmentItems.length + idx + 2,
          description: `${med.name} (${med.dosage})`,
          quantity: qty,
          unit_price: unitPrice,
          total: unitPrice * qty,
          item_type: 'medicine' as const,
        };
      });

    const treatmentTotal = treatmentDoneItems.reduce((s, i) => s + i.total, 0);
    const medicineTotal = medicineItems.reduce((s, i) => s + i.total, 0);
    const gross = fee + treatmentTotal + medicineTotal;
    const disc = Math.min(Number(treatmentDiscount) || 0, gross);
    const total = Math.max(0, gross - disc);

    const billItems = [
      ...(fee > 0
        ? [
            {
              id: 1,
              description: isNewPatient ? 'New Patient Registration Fee' : 'Consultation Fee',
              quantity: 1,
              unit_price: fee,
              total: fee,
              item_type: 'consultation' as const,
            },
          ]
        : []),
      ...treatmentDoneItems,
      ...medicineItems,
    ];

    let existingBill = null;
    try {
      existingBill = await getBillByPrescriptionId(prescriptionId);
    } catch {}

    if (existingBill && existingBill.id) {
      await updateBill(existingBill.id, {
        total_amount: total,
        discount_amount: disc,
        items: billItems,
      });
    } else {
      const billData: Bill = {
        prescription_id: prescriptionId,
        patient_id: patientId || '',
        reference_number: referenceNumber || '',
        total_amount: total,
        paid_amount: 0,
        payment_status: 'PENDING',
        discount_amount: disc,
        items: billItems,
      };
      await createBill(billData);
    }
  } catch (err) {
    console.error('Failed to auto-create or update bill:', err);
  }
}

export function updateLocalOpdQueue(
  opdVisitId?: string,
  referenceNumber?: string,
  phoneNumber?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('cortex_opd_queue_v1');
    if (!raw) return;
    const q = JSON.parse(raw);
    let matched = false;
    const updated = q.map((item: any) => {
      const isMatch =
        (opdVisitId && item.id === opdVisitId) ||
        (referenceNumber && item.uhid === referenceNumber) ||
        (phoneNumber && item.phone === phoneNumber);
      if (isMatch) {
        matched = true;
        return { ...item, status: 'Completed' };
      }
      return item;
    });
    if (matched) {
      localStorage.setItem('cortex_opd_queue_v1', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('cortex_queue_updated'));
    }
  } catch (err) {
    console.warn('Could not update local OPD queue status to Completed:', err);
  }
}
