import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://majestic-setter-702.convex.cloud";
const convexClient = new ConvexHttpClient(convexUrl);

const STORAGE_KEY = "cortex_opd_queue_v1";

export interface OPDQueueItem {
  id: string;
  token: string;
  uhid: string;
  patientId?: string;
  appointmentId?: string;
  name: string;
  age: string;
  ageUnit?: string;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address?: string;
  email?: string;
  whatsapp_number?: string;
  doctor: string;
  department: string;
  priority: "Normal" | "Urgent" | "Emergency";
  visitType: "New Registration" | "Routine Follow-up" | "Post-Op Review" | "Emergency" | "Appointment";
  status: "Waiting" | "Ready" | "In Consultation" | "Completed";
  vitals: {
    bp?: string;
    pulse?: string;
    spo2?: string;
    height?: string;
    weight?: string;
    bmi?: string;
    temperature?: string;
  };
  consultationFee?: number;
  paymentMode?: "Cash" | "UPI" | "Card" | "Free / Exempt";
  paymentStatus?: "PAID" | "PENDING" | "PARTIAL";
  registeredAt: string;
  time: string;
}

export const opdQueueService = {
  async list(status?: string, doctor?: string): Promise<OPDQueueItem[]> {
    try {
      const items = await convexClient.query(api.opd_queue.list, {
        status: status || undefined,
        doctor: doctor || undefined,
      });

      if (Array.isArray(items)) {
        // Map Convex items to OPDQueueItem
        const mapped: OPDQueueItem[] = items.map((item: any) => ({
          id: item.queue_id || item._id,
          token: item.token || "01",
          uhid: item.uhid || "",
          patientId: item.patientId,
          appointmentId: item.appointmentId,
          name: item.name || "",
          age: item.age || "",
          ageUnit: item.ageUnit || "years",
          sex: item.sex || "Male",
          phone: item.phone || "",
          address: item.address || "",
          email: item.email,
          whatsapp_number: item.whatsapp_number,
          doctor: item.doctor || "",
          department: item.department || "",
          priority: item.priority || "Normal",
          visitType: item.visitType || "New Registration",
          status: item.status || "Waiting",
          vitals: item.vitals || {},
          consultationFee: item.consultationFee,
          paymentMode: item.paymentMode,
          paymentStatus: item.paymentStatus,
          registeredAt: item.registeredAt || "",
          time: item.time || "",
        }));

        // Cache into localStorage for offline resilience
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
        }
        return mapped;
      }
    } catch (err) {
      console.warn("Could not fetch opd_queue from Convex, using localStorage fallback:", err);
    }

    // Fallback to localStorage
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  },

  async upsert(item: OPDQueueItem): Promise<boolean> {
    // 1. Update localStorage immediately for instantaneous local UI
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list: OPDQueueItem[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((q) => q.id === item.id);
        if (idx >= 0) {
          list[idx] = item;
        } else {
          list.unshift(item);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }

    // 2. Sync to Convex DB so all other devices receive the update
    try {
      await convexClient.mutation(api.opd_queue.upsert, {
        id: item.id,
        token: item.token,
        uhid: item.uhid,
        patientId: item.patientId,
        appointmentId: item.appointmentId,
        name: item.name,
        age: item.age,
        ageUnit: item.ageUnit,
        sex: item.sex,
        phone: item.phone,
        address: item.address,
        email: item.email,
        whatsapp_number: item.whatsapp_number,
        doctor: item.doctor,
        department: item.department,
        priority: item.priority,
        visitType: item.visitType,
        status: item.status,
        vitals: item.vitals,
        consultationFee: item.consultationFee,
        paymentMode: item.paymentMode,
        paymentStatus: item.paymentStatus,
        registeredAt: item.registeredAt,
        time: item.time,
      });
      return true;
    } catch (err) {
      console.error("Error upserting OPD queue item to Convex:", err);
      return false;
    }
  },

  async updateStatus(queue_id: string, status: "Waiting" | "Ready" | "In Consultation" | "Completed"): Promise<boolean> {
    // 1. Update local storage immediately
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: OPDQueueItem[] = JSON.parse(raw);
          const updated = list.map((item) => (item.id === queue_id ? { ...item, status } : item));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {}
    }

    // 2. Update Convex DB
    try {
      await convexClient.mutation(api.opd_queue.updateStatus, {
        queue_id,
        status,
      });
      return true;
    } catch (err) {
      console.error("Error updating status in Convex:", err);
      return false;
    }
  },

  async remove(queue_id: string): Promise<boolean> {
    // 1. Update local storage
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: OPDQueueItem[] = JSON.parse(raw);
          const updated = list.filter((item) => item.id !== queue_id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {}
    }

    // 2. Remove in Convex
    try {
      await convexClient.mutation(api.opd_queue.remove, { queue_id });
      return true;
    } catch (err) {
      console.error("Error removing queue item from Convex:", err);
      return false;
    }
  },

  async syncLocalItems(items: OPDQueueItem[]): Promise<number> {
    if (!items || items.length === 0) return 0;
    try {
      return await convexClient.mutation(api.opd_queue.syncLocalItems, { items });
    } catch (err) {
      console.warn("Could not sync local items to Convex:", err);
      return 0;
    }
  },
};

