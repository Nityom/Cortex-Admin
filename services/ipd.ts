import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://majestic-setter-702.convex.cloud";
const convexClient = new ConvexHttpClient(convexUrl);

const STORAGE_KEY = "cortex_ipd_admissions_v1";
const BED_CONFIG_STORAGE_KEY = "cortex_ipd_bed_config_v1";

export const ipdService = {
  async list(status?: string): Promise<any[]> {
    try {
      const items = await convexClient.query(api.ipd.list, {
        status: status || undefined,
      });

      if (Array.isArray(items)) {
        const mapped = items.map((item: any) => ({
          ...item,
          id: item.admission_id || item._id,
        }));

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
        }
        return mapped;
      }
    } catch (err) {
      console.warn("Could not fetch IPD admissions from Convex:", err);
    }

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  },

  async getById(admission_id: string): Promise<any> {
    try {
      const item = await convexClient.query(api.ipd.getById, { admission_id });
      if (item) {
        return {
          ...item,
          id: item.admission_id || item._id,
        };
      }
    } catch (err) {
      console.warn("Could not fetch IPD admission by id from Convex:", err);
    }

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: any[] = JSON.parse(raw);
          return list.find((a) => a.id === admission_id || a.ipdNumber === admission_id) || null;
        }
      } catch {}
    }
    return null;
  },

  async save(admission: any): Promise<boolean> {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list: any[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((a) => a.id === admission.id);
        if (idx >= 0) {
          list[idx] = admission;
        } else {
          list.unshift(admission);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }

    try {
      await convexClient.mutation(api.ipd.save, { admission });
      return true;
    } catch (err) {
      console.error("Error saving IPD admission to Convex:", err);
      return false;
    }
  },

  async updateStatus(
    admission_id: string,
    status: string,
    dischargeDate?: string,
    dischargeTime?: string,
    dischargeSummary?: any
  ): Promise<boolean> {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: any[] = JSON.parse(raw);
          const updated = list.map((a) =>
            a.id === admission_id
              ? {
                  ...a,
                  status,
                  ...(dischargeDate ? { dischargeDate } : {}),
                  ...(dischargeTime ? { dischargeTime } : {}),
                  ...(dischargeSummary ? { dischargeSummary } : {}),
                }
              : a
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {}
    }

    try {
      await convexClient.mutation(api.ipd.updateStatus, {
        admission_id,
        status,
        dischargeDate,
        dischargeTime,
        dischargeSummary,
      });
      return true;
    } catch (err) {
      console.error("Error updating IPD status in Convex:", err);
      return false;
    }
  },

  async remove(admission_id: string): Promise<boolean> {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: any[] = JSON.parse(raw);
          const updated = list.filter((a) => a.id !== admission_id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {}
    }

    try {
      await convexClient.mutation(api.ipd.remove, { admission_id });
      return true;
    } catch (err) {
      console.error("Error removing IPD admission from Convex:", err);
      return false;
    }
  },

  async getBedConfig(): Promise<any> {
    try {
      const wards = await convexClient.query(api.ipd.getBedConfig, {});
      if (wards) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BED_CONFIG_STORAGE_KEY, JSON.stringify(wards));
          } catch {}
        }
        return wards;
      }
    } catch (err) {
      console.warn("Could not fetch IPD bed config from Convex:", err);
    }

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(BED_CONFIG_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  },

  async saveBedConfig(wards: any): Promise<boolean> {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(BED_CONFIG_STORAGE_KEY, JSON.stringify(wards));
      } catch {}
    }

    try {
      await convexClient.mutation(api.ipd.saveBedConfig, { wards });
      return true;
    } catch (err) {
      console.error("Error saving IPD bed config to Convex:", err);
      return false;
    }
  },

  async syncLocalAdmissions(admissions: any[]): Promise<number> {
    if (!admissions || admissions.length === 0) return 0;
    try {
      return await convexClient.mutation(api.ipd.syncLocalAdmissions, { admissions });
    } catch (err) {
      console.warn("Could not sync local admissions to Convex:", err);
      return 0;
    }
  },
};
