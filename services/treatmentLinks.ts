// services/treatmentLinks.ts
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export interface TreatmentInventoryItem {
  inventory_id?: string;
  inventory_name: string;
  quantity: number;
  unit?: string;
  current_stock?: number;
  rate?: number;
  subdivision?: string;
}

export interface TreatmentLink {
  _id?: string;
  id?: string;
  treatment_name: string;
  items: TreatmentInventoryItem[];
  enabled: boolean;
  notes?: string;
  created_at?: number;
  updated_at?: number;
}

export interface DeductionResult {
  treatmentName: string;
  itemName: string;
  deductedQty: number;
  remainingStock: number;
  status: "success" | "warning" | "error";
  message: string;
}

export interface DeductionSummary {
  totalDeductedCount: number;
  results: DeductionResult[];
}

export const getAllTreatmentLinks = async (): Promise<TreatmentLink[]> => {
  const data = await convex.query(api.treatment_links.list, {});
  return data.map((item: any) => ({
    ...item,
    id: item._id,
  }));
};

export const saveTreatmentLink = async (
  link: Omit<TreatmentLink, "_id" | "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<string> => {
  const payload: any = {
    treatment_name: link.treatment_name,
    items: link.items.map((i) => ({
      inventory_id: i.inventory_id,
      inventory_name: i.inventory_name,
      quantity: Number(i.quantity) || 1,
      unit: i.unit || "pcs",
    })),
    enabled: link.enabled !== false,
    notes: link.notes,
  };
  if (link.id) {
    payload.id = link.id as any;
  }
  const id = await convex.mutation(api.treatment_links.save, payload);
  return id;
};

export const deleteTreatmentLink = async (id: string): Promise<void> => {
  await convex.mutation(api.treatment_links.remove, { id: id as any });
};

export const toggleTreatmentLink = async (id: string, enabled: boolean): Promise<void> => {
  await convex.mutation(api.treatment_links.toggleEnabled, { id: id as any, enabled });
};

export const deductStockForTreatments = async (
  treatments: Array<{ name: string; quantity: number }>,
  patientName: string,
  prescriptionId?: string,
  date?: string
): Promise<DeductionSummary> => {
  return await convex.mutation(api.treatment_links.deductForTreatments, {
    treatments,
    patientName,
    prescriptionId,
    date,
  });
};
