"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Users,
  Search,
  Printer,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  Phone,
  Calendar,
  CalendarDays,
  AlertCircle,
  IndianRupee,
  Stethoscope,
  Receipt,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { hospitalConfig } from "@/config/hospital";
import { createPatient, getPatients, getPatientByPhoneNumber, getPatientById, getNextPatientReference } from "@/services/patients";
import { Patient } from "@/types/patient";
import PatientSearchInput from "@/components/PatientSearchInput";
import { getPrescriptionsByPatient } from "@/services/prescription";
import { getBillByPrescriptionId } from "@/services/bills";
import { formatDate } from "@/lib/utils";

interface OPDQueueItem {
  id: string;
  token: string;
  uhid: string;
  patientId?: string;
  appointmentId?: string;
  name: string;
  age: string;
  ageUnit: "years" | "months" | "days";
  sex: "Male" | "Female" | "Other";
  phone: string;
  address?: string;
  email?: string;
  whatsapp_number?: string;
  doctor: string;
  department: string;
  priority: "Normal" | "Urgent" | "Emergency";
  visitType: "New Registration" | "Routine Follow-up" | "Post-Op Review" | "Emergency" | "Appointment";
  status: "Waiting" | "Ready" | "In Consultation" | "Completed" | "Cancelled";
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

const DOCTORS = [
  { name: "Dr. Vipeen Raut", specialty: "Orthopaedics & Joint Replacement" },
  { name: "Dr. Shillpa Raut", specialty: "Obstetrics & Gynaecology" },
];

const DEPARTMENTS = [
  "Orthopaedics & Joint Replacement",
  "Obstetrics & Gynaecology",
  "General Medicine",
  "Physiotherapy & Rehabilitation",
];

const getDoctorKey = (docName?: string) => {
  const clean = (docName || "").toLowerCase();
  if (clean.includes("shilpa") || clean.includes("shillpa")) {
    return "shillpa";
  }
  return "vipeen";
};

const getTodayString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getAppointmentDateParts = (dateValue: unknown): [number, number, number] | null => {
  if (typeof dateValue !== "string") return null;
  const value = dateValue.trim();
  const ymd = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) return [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])];
  const dmy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])];
  return null;
};

const getAppointmentDateKey = (dateValue: unknown): string | null => {
  const parts = getAppointmentDateParts(dateValue);
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const getAppointmentRegisteredAt = (dateValue: unknown, timeValue: unknown): string | null => {
  const dateKey = getAppointmentDateKey(dateValue);
  if (!dateKey || typeof timeValue !== "string") return null;

  const time = timeValue.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!time) return null;
  let hours = Number(time[1]);
  const minutes = Number(time[2]);
  const meridiem = time[3]?.toUpperCase();
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (hours > 23 || minutes > 59) return null;

  const registeredAt = new Date(`${dateKey}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return Number.isNaN(registeredAt.getTime()) ? null : registeredAt.toISOString();
};

const getItemLocalDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split("T")[0];
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return (dateStr || "").split("T")[0];
  }
};

const shiftDate = (currentDateStr: string, deltaDays: number) => {
  const parts = currentDateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const STORAGE_KEY = "cortex_opd_queue_v1";

const normalizePatientIdentity = (item: OPDQueueItem): OPDQueueItem => {
  const rawName = (item.name || "").toLowerCase().trim();
  const rawPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
  const rawUhid = (item.uhid || "").trim().toUpperCase();

  const isSamiksha =
    rawUhid === "CRX0069" ||
    rawUhid === "CRX4469" ||
    rawUhid === "CRX7494" ||
    rawPhone === "9665651439" ||
    rawPhone === "966561439" ||
    (rawName.includes("samiksha") && (rawName.includes("varnerkar") || rawName.includes("saurangpate")));

  if (isSamiksha) {
    return {
      ...item,
      name: "samiksha varnerkar",
      uhid: "CRX0069",
      phone: "9665651439",
      age: "21",
      ageUnit: "years",
      sex: "Female",
      address: "waigao",
      doctor: "Dr. Shillpa Raut",
      department: "Obstetrics & Gynaecology",
    };
  }

  return {
    ...item,
    uhid: rawUhid.replace(/^CH/i, "CRX"),
  };
};

const getStatusRank = (status?: string): number => {
  switch (status) {
    case "In Consultation":
      return 5;
    case "Ready":
      return 4;
    case "Waiting":
      return 3;
    case "Completed":
      return 2;
    case "Cancelled":
      return 1;
    default:
      return 0;
  }
};

const deduplicateOpdQueue = (items: OPDQueueItem[]): OPDQueueItem[] => {
  if (!items || !Array.isArray(items)) return [];

  // Step 1: Normalize identity across all items (unifying Samiksha to CRX0069)
  const normalized = items.map(normalizePatientIdentity);

  // Step 2: Group by date and doctor key
  const groups = new Map<string, OPDQueueItem[]>();
  for (const item of normalized) {
    const itemDate = getItemLocalDate(item.registeredAt) || "today";
    const docKey = getDoctorKey(item.doctor);
    const groupKey = `${itemDate}___${docKey}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }

  const dedupedAll: OPDQueueItem[] = [];

  groups.forEach((groupItems) => {
    // Sort chronological first so earlier registrations establish base token
    groupItems.sort(
      (a, b) => new Date(a.registeredAt || 0).getTime() - new Date(b.registeredAt || 0).getTime()
    );

    const patientMap = new Map<string, OPDQueueItem>();
    const apptIdToKey = new Map<string, string>();

    for (const item of groupItems) {
      const cleanPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
      const cleanUhid = (item.uhid || "").trim().toUpperCase();
      const cleanName = (item.name || "").trim().toLowerCase();
      const apptId = item.appointmentId ? String(item.appointmentId) : "";

      // Deduplication identifier:
      // Phone + Name uniquely identifies an individual (while keeping distinct family members separate!)
      // Fall back to non-empty UHID, then Name alone.
      let key = cleanPhone.length === 10
        ? `phone_name:${cleanPhone}_${cleanName}`
        : cleanUhid
        ? `uhid:${cleanUhid}`
        : `name:${cleanName}`;

      // If an existing item already has the same appointmentId, map to that existing item's key
      if (apptId && apptIdToKey.has(apptId)) {
        key = apptIdToKey.get(apptId)!;
      }

      if (!patientMap.has(key)) {
        patientMap.set(key, item);
        if (apptId) apptIdToKey.set(apptId, key);
      } else {
        const existing = patientMap.get(key)!;
        const existingRank = getStatusRank(existing.status);
        const currentRank = getStatusRank(item.status);

        // Merge properties to keep the best data:
        // 1. Prefer non-empty UHID
        const mergedUhid = existing.uhid || item.uhid || "";
        // 2. Prefer non-empty patientId
        const mergedPatientId = existing.patientId || item.patientId;
        // 3. Prefer real token (non-"01" if another exists)
        const existingIsPlaceholder = existing.token === "01" && existing.id.startsWith("appointment_");
        const itemIsPlaceholder = item.token === "01" && item.id.startsWith("appointment_");
        const mergedToken = existingIsPlaceholder && !itemIsPlaceholder
          ? item.token
          : existing.token || item.token;
        // 4. Prefer opd_ ID over appointment_ ID
        const mergedId = existing.id.startsWith("opd_") ? existing.id : item.id;
        // 5. Keep active/higher status
        const mergedStatus = currentRank > existingRank ? item.status : existing.status;

        patientMap.set(key, {
          ...existing,
          ...item,
          id: mergedId,
          uhid: mergedUhid,
          patientId: mergedPatientId,
          token: mergedToken,
          status: mergedStatus,
        });
        if (apptId) apptIdToKey.set(apptId, key);
      }
    }

    patientMap.forEach((dedupedItem) => {
      dedupedAll.push(dedupedItem);
    });
  });

  return dedupedAll;
};

export default function OPDManagementPage() {
  const router = useRouter();

  // Tab State: OPD queue, waiting queue, billing queue, registration, appointments, and directory
  const [activeTab, setActiveTab] = useState<"queue" | "waitingQueue" | "billingQueue" | "register" | "appointments" | "directory">("queue");

  // Check URL search parameters for initial tab (e.g. ?tab=billingQueue)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "waitingQueue" || tabParam === "billingQueue" || tabParam === "queue" || tabParam === "register" || tabParam === "appointments" || tabParam === "directory") {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // Today & Selected Queue Date (Defaults to Today)
  const todayStr = useMemo(() => getTodayString(), []);
  const [selectedQueueDate, setSelectedQueueDate] = useState<string>(getTodayString());

  // Queue state persisted in localStorage
  const [queue, setQueue] = useState<OPDQueueItem[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cortex_opd_doctor_filter");
        if (saved && (saved.includes("Shilpa") || saved.includes("Shillpa"))) {
          return "Dr. Shillpa Raut";
        }
        if (saved && saved.includes("Vipeen")) {
          return "Dr. Vipeen Raut";
        }
      } catch {}
    }
    return "Dr. Vipeen Raut";
  });
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All");
  const [queueSearch, setQueueSearch] = useState<string>("");

  // Appointments integration
  const [selectedApptDate, setSelectedApptDate] = useState<string>(getTodayString());
  const [apptDoctorFilter, setApptDoctorFilter] = useState<string>("All");
  const [apptSearchQuery, setApptSearchQuery] = useState<string>("");
  const [checkInModalAppt, setCheckInModalAppt] = useState<any | null>(null);
  const [checkInVitals, setCheckInVitals] = useState({
    age: "",
    sex: "Male" as "Male" | "Female" | "Other",
    bp: "",
    pulse: "",
    spo2: "",
    weight: "",
    height: "",
    temperature: "",
  });

  const allAppointments = useQuery(api.appointments.list);
  const convexPatients = useQuery(api.patients.list);
  const allBills = useQuery(api.bills.list, {});
  const allPrescriptions = useQuery(api.prescriptions.list);
  const updateAppointmentMutation = useMutation(api.appointments.update);

  const liveOpdQueue = useQuery(api.opd_queue.list, {});
  const upsertOpdQueueMutation = useMutation(api.opd_queue.upsert);
  const updateOpdQueueStatusMutation = useMutation(api.opd_queue.updateStatus);
  const removeOpdQueueMutation = useMutation(api.opd_queue.remove);
  const syncLocalOpdQueueMutation = useMutation(api.opd_queue.syncLocalItems);
  const clearOpdQueueMutation = useMutation(api.opd_queue.clearAll);
  const syncingAppointmentIds = React.useRef(new Set<string>());

  // Keep scheduled appointments visible in the OPD queue even when they were
  // created by an external channel such as the WhatsApp assistant.
  useEffect(() => {
    if (!allAppointments || !liveOpdQueue) return;

    const queuedAppointmentIds = new Set(
      liveOpdQueue
        .map((item: any) => item.appointmentId)
        .filter((appointmentId: unknown): appointmentId is string => typeof appointmentId === "string")
    );
    const queuedPersonKeys = new Set(
      liveOpdQueue.map((item: any) => {
        const p = (item.phone || "").replace(/\D/g, "").slice(-10);
        const n = (item.name || "").trim().toLowerCase();
        const d = getItemLocalDate(item.registeredAt) || "";
        const doc = getDoctorKey(item.doctor);
        return `${d}___${doc}___${p}___${n}`;
      })
    );
    const nextTokens = new Map<string, number>();

    for (const item of liveOpdQueue) {
      const date = getItemLocalDate(item.registeredAt);
      const doctor = getDoctorKey(item.doctor);
      const key = `${date}___${doctor}`;
      const token = Number.parseInt(item.token, 10);
      if (date && Number.isFinite(token)) {
        nextTokens.set(key, Math.max(nextTokens.get(key) || 0, token));
      }
    }

    const appointmentsToSync = allAppointments.filter((appointment: any) => {
      const appointmentDate = getAppointmentDateKey(appointment.date);
      if (
        !appointment._id ||
        appointment.status === "CANCELLED" ||
        !appointmentDate ||
        appointmentDate < todayStr ||
        !appointment.time ||
        !appointment.name ||
        !appointment.phone
      ) {
        return false;
      }

      const appointmentId = String(appointment._id);
      const cleanPhone = (appointment.phone || "").replace(/\D/g, "").slice(-10);
      const cleanName = (appointment.name || "").trim().toLowerCase();
      const doctorKey = getDoctorKey(appointment.doctor_name || DOCTORS[0].name);
      const personKey = `${appointmentDate}___${doctorKey}___${cleanPhone}___${cleanName}`;

      return (
        !queuedAppointmentIds.has(appointmentId) &&
        !queuedPersonKeys.has(personKey) &&
        !syncingAppointmentIds.current.has(appointmentId)
      );
    });

    if (appointmentsToSync.length === 0) return;

    const queueItems = appointmentsToSync.flatMap((appointment: any) => {
      const doctor = appointment.doctor_name || DOCTORS[0].name;
      const date = getAppointmentDateKey(appointment.date);
      const registeredAt = getAppointmentRegisteredAt(appointment.date, appointment.time);
      if (!date || !registeredAt) return [];
      const doctorKey = getDoctorKey(doctor);
      const tokenKey = `${date}___${doctorKey}`;
      const token = (nextTokens.get(tokenKey) || 0) + 1;
      nextTokens.set(tokenKey, token);

      return {
        id: `appointment_${appointment._id}`,
        token: String(token).padStart(2, "0"),
        uhid: "",
        appointmentId: String(appointment._id),
        name: String(appointment.name),
        age: appointment.age !== undefined && appointment.age !== null ? String(appointment.age) : "—",
        ageUnit: "years",
        sex: doctorKey === "shillpa" ? "Female" : "Male",
        phone: String(appointment.phone),
        address: appointment.address || "",
        doctor,
        department: doctorKey === "shillpa"
          ? "Obstetrics & Gynaecology"
          : "Orthopaedics & Joint Replacement",
        priority: "Normal",
        visitType: "Appointment",
        status: "Waiting",
        vitals: {},
        consultationFee: 0,
        paymentMode: "Free / Exempt",
        registeredAt,
        time: String(appointment.time),
      } satisfies OPDQueueItem;
    });

    for (const item of queueItems) {
      syncingAppointmentIds.current.add(item.appointmentId!);
    }

    void Promise.all(
      queueItems.map(async (item) => {
        try {
          await upsertOpdQueueMutation(item);
        } catch (error) {
          syncingAppointmentIds.current.delete(item.appointmentId!);
          console.error("Could not sync scheduled appointment to OPD queue:", error);
        }
      })
    );
  }, [allAppointments, liveOpdQueue, todayStr, upsertOpdQueueMutation]);

  // Map of opd_visit_id / reference_number / phone to prescription & last visit tracking
  const { prescriptionByVisitId, prescriptionByUhid, prescriptionByPhone, patientLastVisitMap } = useMemo(() => {
    const byVisit = new Map<string, any>();
    const byUhid = new Map<string, any>();
    const byPhone = new Map<string, any>();
    const lastVisit = new Map<string, { date: string; daysAgo: number }>();

    if (allPrescriptions && Array.isArray(allPrescriptions)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Sort chronological descending
      const sorted = [...allPrescriptions].sort((a: any, b: any) => {
        const da = new Date(a.prescription_date || a.created_at || a._creationTime || 0).getTime();
        const db = new Date(b.prescription_date || b.created_at || b._creationTime || 0).getTime();
        return db - da;
      });

      for (const rx of sorted as any[]) {
        if (rx.opd_visit_id && !byVisit.has(rx.opd_visit_id)) {
          byVisit.set(rx.opd_visit_id, rx);
        }
        const uhid = (rx.reference_number || "").trim().toUpperCase();
        if (uhid && !byUhid.has(uhid)) {
          byUhid.set(uhid, rx);
        }
        const rawPhone = (rx.phone_number || rx.phone || "").replace(/\D/g, "").slice(-10);
        const rxName = (rx.patient_name || "").trim().toLowerCase();
        if (rawPhone && rxName && !byPhone.has(`${rawPhone}_${rxName}`)) {
          byPhone.set(`${rawPhone}_${rxName}`, rx);
        }
        if (rawPhone && !byPhone.has(rawPhone)) {
          byPhone.set(rawPhone, rx);
        }

        // For last visit, find the most recent visit before today
        const rxDateStr = rx.prescription_date || (rx.created_at ? String(rx.created_at).split("T")[0] : "");
        if (rxDateStr) {
          const rxDate = new Date(rxDateStr);
          rxDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((today.getTime() - rxDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            if (uhid && !lastVisit.has(uhid)) {
              lastVisit.set(uhid, { date: rxDateStr, daysAgo: diffDays });
            }
            if (rawPhone && rxName && !lastVisit.has(`${rawPhone}_${rxName}`)) {
              lastVisit.set(`${rawPhone}_${rxName}`, { date: rxDateStr, daysAgo: diffDays });
            }
          }
        }
      }
    }

    // Fallback: check past appointments for prior visit records
    if (allAppointments && Array.isArray(allAppointments)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const appt of allAppointments as any[]) {
        if (appt.date) {
          const apptDate = new Date(appt.date);
          apptDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((today.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            const uhid = (appt.uhid || appt.reference_number || "").trim().toUpperCase();
            const rawPhone = (appt.phone || "").replace(/\D/g, "").slice(-10);
            if (uhid && !lastVisit.has(uhid)) {
              lastVisit.set(uhid, { date: appt.date, daysAgo: diffDays });
            }
            if (rawPhone && !lastVisit.has(rawPhone)) {
              lastVisit.set(rawPhone, { date: appt.date, daysAgo: diffDays });
            }
          }
        }
      }
    }

    return {
      prescriptionByVisitId: byVisit,
      prescriptionByUhid: byUhid,
      prescriptionByPhone: byPhone,
      patientLastVisitMap: lastVisit,
    };
  }, [allPrescriptions, allAppointments]);

  const formatVisitDate = (isoStr?: string) => {
    if (!isoStr) return "";
    return formatDate(isoStr);
  };

  // Set of patient UHIDs with confirmed paid bills
  const paidUhidSet = useMemo(() => {
    const set = new Set<string>();
    if (allBills && Array.isArray(allBills)) {
      for (const b of allBills) {
        if (b.payment_status === "PAID" && b.reference_number) {
          set.add(b.reference_number.trim().toUpperCase());
        }
      }
    }
    return set;
  }, [allBills]);

  const todayAppointments = useMemo(() => {
    if (!allAppointments) return [];
    return allAppointments
      .filter((a) => a.date === todayStr)
      .sort((a, b) => (b.time || "").localeCompare(a.time || "") || (b._creationTime || 0) - (a._creationTime || 0));
  }, [allAppointments, todayStr]);

  const appointmentsForSelectedDate = useMemo(() => {
    if (!allAppointments) return [];
    return allAppointments
      .filter((a) => a.date === selectedApptDate)
      .filter((a) => {
        if (apptDoctorFilter === "All") return true;
        return (a.doctor_name || "").toLowerCase() === apptDoctorFilter.toLowerCase();
      })
      .filter((a) => {
        if (!apptSearchQuery.trim()) return true;
        const q = apptSearchQuery.toLowerCase().trim();
        return (
          (a.name || "").toLowerCase().includes(q) ||
          (a.phone || "").includes(q)
        );
      })
      .sort((a, b) => (b.time || "").localeCompare(a.time || "") || (b._creationTime || 0) - (a._creationTime || 0));
  }, [allAppointments, selectedApptDate, apptDoctorFilter, apptSearchQuery]);

  const isApptInQueue = (appt: any) => {
    return queue.find(
      (q) =>
        q.appointmentId === appt._id ||
        (q.phone && appt.phone && q.phone === appt.phone && getItemLocalDate(q.registeredAt) === todayStr)
    );
  };

  // Patient directory cache
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);
  const [directorySearch, setDirectorySearch] = useState<string>("");

  // Real-time combined patient directory for instant autofill & search (like medicines)
  const combinedPatients: Patient[] = useMemo(() => {
    if (convexPatients && convexPatients.length > 0) {
      return convexPatients.map((p: any) => ({
        id: p._id,
        name: p.name,
        age: Number(p.age) || 0,
        sex: p.sex,
        phone_number: p.phone_number,
        reference_number: (p.reference_number || "").replace(/^CH/i, "CRX"),
        address: p.address,
        email: p.email,
        whatsapp_number: p.whatsapp_number,
        created_at: p._creationTime ? new Date(p._creationTime).toISOString() : undefined,
      }));
    }
    return allPatients;
  }, [convexPatients, allPatients]);

  // Registration Form State (Consultation charge moved to Billing per hospital workflow)
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    ageUnit: "years" as "years" | "months" | "days",
    sex: "Male" as "Male" | "Female" | "Other",
    phone: "",
    address: "",
    email: "",
    whatsapp_number: "",
    doctor: DOCTORS[0].name,
    department: DOCTORS[0].specialty,
    priority: "Normal" as "Normal" | "Urgent" | "Emergency",
    visitType: "New Registration" as "New Registration" | "Routine Follow-up" | "Post-Op Review" | "Emergency",
    bp: "",
    pulse: "",
    spo2: "",
    height: "",
    weight: "",
    temperature: "",
  });

  const [existingPatientFound, setExistingPatientFound] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Load Queue & Active Doctor from Local Storage on mount and auto-sync on updates
  useEffect(() => {
    const reloadFromStorage = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Immediate synchronous deduplication so UI never flashes duplicate records
            const rawDeduped = deduplicateOpdQueue(parsed);

            let dbPatients: any[] = [];
            try {
              dbPatients = await getPatients();
            } catch (_) { }

            const phoneToRef = new Map(
              dbPatients.map((p) => [p.phone_number?.trim(), p.reference_number?.replace(/^CH/i, "CRX")])
            );

            let changed = rawDeduped.length !== parsed.length;
            const updated = rawDeduped.map((item: any) => {
              let uhid = (item.uhid || "").replace(/^CH/i, "CRX");
              const cleanPhone = (item.phone || "").trim();

              // Repair UHID from authoritative database record if available
              if (phoneToRef.has(cleanPhone)) {
                const dbRef = phoneToRef.get(cleanPhone);
                if (dbRef && dbRef !== uhid) {
                  uhid = dbRef;
                  changed = true;
                }
              } else if (cleanPhone === "1234567890" && uhid !== "CRX0001") {
                uhid = "CRX0001";
                changed = true;
              } else if (cleanPhone === "1234567899" && uhid !== "CRX0002") {
                uhid = "CRX0002";
                changed = true;
              } else if (cleanPhone === "7796308778" && uhid !== "CRX0003") {
                uhid = "CRX0003";
                changed = true;
              } else if ((cleanPhone === "9665651439" || cleanPhone === "966561439" || (item.name || "").toLowerCase().includes("varnerkar") || (item.name || "").toLowerCase().includes("saurangpate") || uhid === "CRX4469" || uhid === "CRX7494") && uhid !== "CRX0069") {
                uhid = "CRX0069";
                changed = true;
              }

              if (uhid !== item.uhid) changed = true;
              const status = item.status === "Ready" ? "Waiting" : (item.status || "Waiting");
              if (status !== item.status) changed = true;
              return { ...item, uhid, status };
            });

            // Universal deduplication and Samiksha normalization
            const finalQueue = deduplicateOpdQueue(updated);
            if (finalQueue.length !== parsed.length) changed = true;

            // Repair and reassign sequential tokens PER DOCTOR per day
            const doctorDateGroups = new Map<string, any[]>();
            finalQueue.forEach((item: any) => {
              const d = getItemLocalDate(item.registeredAt) || "nodate";
              const docKey = getDoctorKey(item.doctor);
              const groupKey = `${d}_${docKey}`;
              if (!doctorDateGroups.has(groupKey)) doctorDateGroups.set(groupKey, []);
              doctorDateGroups.get(groupKey)!.push(item);
            });

            doctorDateGroups.forEach((items) => {
              // Sort chronologically (earliest first)
              items.sort((a, b) => new Date(a.registeredAt || 0).getTime() - new Date(b.registeredAt || 0).getTime());
              items.forEach((it, idx) => {
                const expectedToken = String(idx + 1).padStart(2, "0");
                if (it.token !== expectedToken) {
                  it.token = expectedToken;
                  changed = true;
                }
              });
            });

            setQueue(finalQueue);
            if (changed) {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(finalQueue));
              } catch (_) { }
            }
          }
        }
        const savedDocFilter = localStorage.getItem("cortex_opd_doctor_filter");
        if (savedDocFilter) {
          setSelectedDoctorFilter(savedDocFilter);
        } else {
          const savedDoc = localStorage.getItem("cortex_active_doctor");
          if (savedDoc) {
            setSelectedDoctorFilter(savedDoc);
          }
        }
        const savedDoc = localStorage.getItem("cortex_active_doctor");
        if (savedDoc) {
          handleDoctorChange(savedDoc);
        }
      } catch (e) {
        console.error("Failed to load OPD queue/doctor from storage:", e);
      }
    };

    reloadFromStorage();

    // Listen to cross-tab and custom events when prescription completes
    window.addEventListener("storage", reloadFromStorage);
    window.addEventListener("cortex_queue_updated", reloadFromStorage);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reloadFromStorage();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("storage", reloadFromStorage);
      window.removeEventListener("cortex_queue_updated", reloadFromStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Real-time synchronization from Convex DB across all devices
  useEffect(() => {
    if (liveOpdQueue && Array.isArray(liveOpdQueue)) {
      const mapped: OPDQueueItem[] = liveOpdQueue.map((item: any) => ({
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
        status: item.status === "Ready" ? "Waiting" : (item.status || "Waiting"),
        vitals: item.vitals || {},
        consultationFee: item.consultationFee,
        paymentMode: item.paymentMode,
        paymentStatus: item.paymentStatus,
        registeredAt: item.registeredAt || "",
        time: item.time || "",
      }));
      const deduped = deduplicateOpdQueue(mapped);
      setQueue(deduped);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
      } catch {}
    }
  }, [liveOpdQueue]);

  // Save Queue to Local Storage
  const saveQueue = (newQueue: OPDQueueItem[]) => {
    const deduped = deduplicateOpdQueue(newQueue);
    setQueue(deduped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
    } catch (e) {
      console.error("Failed to save OPD queue to storage:", e);
    }
  };

  // Fetch registered patients for directory
  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const data = await getPatients();
      setAllPatients(data || []);
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (activeTab === "directory") {
      loadPatients();
    }
  }, [activeTab]);

  // Auto-fill all patient fields when selecting an existing patient (like medicine autofill)
  const handleAutoFillPatient = (existing: Patient) => {
    setExistingPatientFound(existing);
    setFormData((prev) => ({
      ...prev,
      name: existing.name || prev.name,
      phone: existing.phone_number || prev.phone,
      age: existing.age ? String(existing.age) : prev.age,
      sex: (existing.sex as "Male" | "Female" | "Other") || prev.sex,
      address: (existing as any).address || prev.address,
      email: (existing as any).email || prev.email,
      whatsapp_number: (existing as any).whatsapp_number || prev.whatsapp_number,
      visitType: "Routine Follow-up",
    }));
  };

  // Auto BMI calculation
  const calculatedBMI = useMemo(() => {
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    if (h > 0 && w > 0) {
      const heightInMeters = h / 100;
      const bmiVal = w / (heightInMeters * heightInMeters);
      return bmiVal.toFixed(1);
    }
    return "";
  }, [formData.height, formData.weight]);

  // Phone number lookup for quick re-registration
  const handlePhoneBlur = async () => {
    const cleanPhone = formData.phone.trim();
    if (cleanPhone.length >= 10) {
      try {
        const existing = await getPatientByPhoneNumber(cleanPhone, formData.name.trim());
        if (existing) {
          setExistingPatientFound(existing);
          setFormData((prev) => ({
            ...prev,
            name: existing.name || prev.name,
            age: existing.age ? String(existing.age) : prev.age,
            sex: (existing.sex as "Male" | "Female" | "Other") || prev.sex,
            address: (existing as any).address || prev.address,
            email: (existing as any).email || prev.email,
            whatsapp_number: (existing as any).whatsapp_number || prev.whatsapp_number,
            visitType: "Routine Follow-up",
          }));
        } else {
          setExistingPatientFound(null);
        }
      } catch (err) {
        console.error("Error looking up phone:", err);
      }
    }
  };

  // Doctor change handler (syncs department)
  const handleDoctorChange = (doctorName: string) => {
    const docObj = DOCTORS.find((d) => d.name === doctorName);
    setFormData((prev) => ({
      ...prev,
      doctor: doctorName,
      department: docObj ? docObj.specialty : prev.department,
    }));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cortex_active_doctor', doctorName);
      } catch (e) { }
    }
  };

  // Submit OPD Registration
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (!formData.name.trim()) {
      alert("Please enter patient name.");
      return;
    }
    if (!cleanPhone) {
      alert("Please enter patient 10-digit mobile number.");
      return;
    }
    if (cleanPhone.length !== 10) {
      alert(`Mobile number must be exactly 10 digits. You have entered ${cleanPhone.length} digits.`);
      return;
    }

    setSubmitting(true);
    try {
      let uhid = await getNextPatientReference();
      let patientId: string | undefined;

      try {
        const res = await createPatient({
          name: formData.name.trim(),
          age: Number(formData.age) || 0,
          sex: formData.sex,
          phone_number: cleanPhone,
          address: formData.address.trim() || undefined,
          email: formData.email.trim() || undefined,
          whatsapp_number: formData.whatsapp_number.trim() || undefined,
        } as any);

        patientId = res ? String(res) : undefined;
        // Check if patient reference exists in database
        if (existingPatientFound?.reference_number) {
          uhid = existingPatientFound.reference_number.replace(/^CH/i, "CRX");
        } else if (patientId) {
          const pt = await getPatientById(patientId);
          if (pt?.reference_number) {
            uhid = pt.reference_number.replace(/^CH/i, "CRX");
          }
        }
        if (!uhid) {
          const pt = await getPatientByPhoneNumber(cleanPhone, formData.name.trim());
          if (pt?.reference_number) {
            uhid = pt.reference_number.replace(/^CH/i, "CRX");
          } else {
            uhid = await getNextPatientReference();
          }
        }
      } catch (convexErr) {
        console.warn("Could not sync with Convex directly, using token:", convexErr);
        uhid = await getNextPatientReference();
      }

      // 2. Next Token number for the day (guaranteed unique sequential)
      const today = getTodayString();
      let freshQueue = queue;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) freshQueue = deduplicateOpdQueue(parsed);
        }
      } catch {}

      const targetDocKey = getDoctorKey(formData.doctor);
      const doctorTodayItems = freshQueue.filter(
        (q) => getItemLocalDate(q.registeredAt) === today && getDoctorKey(q.doctor) === targetDocKey
      );

      // Check if patient already registered in today's OPD queue for this doctor to prevent duplicate tokens
      const existingInToday = doctorTodayItems.find((q) => {
        const qPhone = (q.phone || "").replace(/\D/g, "").slice(-10);
        const qUhid = (q.uhid || "").trim().toUpperCase();
        const qName = (q.name || "").trim().toLowerCase();
        return (
          (cleanPhone && qPhone === cleanPhone) ||
          (uhid && qUhid === uhid.toUpperCase()) ||
          (qName === formData.name.trim().toLowerCase())
        );
      });

      if (existingInToday) {
        const updatedItem: OPDQueueItem = {
          ...existingInToday,
          priority: formData.priority,
          visitType: formData.visitType,
          vitals: {
            ...existingInToday.vitals,
            bp: formData.bp.trim() || existingInToday.vitals?.bp,
            pulse: formData.pulse.trim() || existingInToday.vitals?.pulse,
            spo2: formData.spo2.trim() || existingInToday.vitals?.spo2,
            height: formData.height.trim() || existingInToday.vitals?.height,
            weight: formData.weight.trim() || existingInToday.vitals?.weight,
            bmi: calculatedBMI || existingInToday.vitals?.bmi,
            temperature: formData.temperature.trim() || existingInToday.vitals?.temperature,
          },
          status: existingInToday.status === "Cancelled" ? "Waiting" : existingInToday.status,
        };
        const updatedQueue = freshQueue.map((q) => (q.id === existingInToday.id ? updatedItem : q));
        saveQueue(updatedQueue);
        try {
          await upsertOpdQueueMutation(updatedItem);
        } catch (_) {}

        setSuccessNotification(`Patient ${existingInToday.name} is already registered in today's queue (Token #${existingInToday.token}). Details updated!`);
        setFormData({
          name: "",
          age: "",
          ageUnit: "years",
          sex: "Male",
          phone: "",
          address: "",
          email: "",
          whatsapp_number: "",
          doctor: formData.doctor,
          department: formData.department,
          priority: "Normal",
          visitType: "New Registration",
          bp: "",
          pulse: "",
          spo2: "",
          height: "",
          weight: "",
          temperature: "",
        });
        setExistingPatientFound(null);
        return;
      }

      const existingTokens = doctorTodayItems
        .map((q) => parseInt(q.token, 10))
        .filter((n) => !isNaN(n) && n > 0);
      const nextToken = existingTokens.length > 0 ? Math.max(...existingTokens) + 1 : 1;
      const tokenNumber = String(nextToken).padStart(2, "0");

      const newItem: OPDQueueItem = {
        id: `opd_${Date.now()}`,
        token: tokenNumber,
        uhid,
        patientId,
        name: formData.name.trim(),
        age: formData.age.trim(),
        ageUnit: formData.ageUnit,
        sex: formData.sex,
        phone: cleanPhone,
        address: formData.address.trim(),
        email: formData.email.trim() || undefined,
        whatsapp_number: formData.whatsapp_number.trim() || undefined,
        doctor: formData.doctor,
        department: formData.department,
        priority: formData.priority,
        visitType: formData.visitType,
        status: "Waiting",
        vitals: {
          bp: formData.bp.trim() || undefined,
          pulse: formData.pulse.trim() || undefined,
          spo2: formData.spo2.trim() || undefined,
          height: formData.height.trim() || undefined,
          weight: formData.weight.trim() || undefined,
          bmi: calculatedBMI || undefined,
          temperature: formData.temperature.trim() || undefined,
        },
        consultationFee: 0,
        paymentMode: "Free / Exempt",
        registeredAt: new Date().toISOString(),
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };

      const updatedQueue = [newItem, ...queue];
      saveQueue(updatedQueue);

      try {
        await upsertOpdQueueMutation(newItem);
      } catch (err) {
        console.warn("Could not sync new registration to Convex:", err);
      }

      // Notification banner and switch directly to queue without popup/slip prompt
      setSuccessNotification(`Patient ${newItem.name} registered with Token #${tokenNumber}! Added to OPD Queue.`);
      // Switch to queue and ensure viewing today
      setSelectedQueueDate(today);
      setActiveTab("queue");

      // Reset form
      setFormData({
        name: "",
        age: "",
        ageUnit: "years",
        sex: "Male",
        phone: "",
        address: "",
        email: "",
        whatsapp_number: "",
        doctor: DOCTORS[0].name,
        department: DOCTORS[0].specialty,
        priority: "Normal",
        visitType: "New Registration",
        bp: "",
        pulse: "",
        spo2: "",
        height: "",
        weight: "",
        temperature: "",
      });
      setExistingPatientFound(null);
    } catch (err: any) {
      console.error("Error registering OPD patient:", err);
      alert("Registration failed: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  // Status changer for queue items
  const updateStatus = async (id: string, newStatus: "Waiting" | "Ready" | "In Consultation" | "Completed" | "Cancelled") => {
    const updated = queue.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
    saveQueue(updated);
    try {
      await updateOpdQueueStatusMutation({ queue_id: id, status: newStatus });
    } catch (err) {
      console.warn("Could not sync status update to Convex:", err);
    }
  };

  // Delete/Remove queue item (e.g. duplicate or mistaken registration)
  const handleDeleteQueueItem = async (id: string, patientName: string) => {
    if (!confirm(`Are you sure you want to remove ${patientName} from today's OPD queue?`)) {
      return;
    }
    const updated = queue.filter((item) => item.id !== id);
    saveQueue(updated);
    try {
      await removeOpdQueueMutation({ queue_id: id });
    } catch (err) {
      console.warn("Could not delete queue item from Convex:", err);
    }
  };

  // Payment status toggle for queue items
  const togglePaymentStatus = async (id: string) => {
    let targetItem: OPDQueueItem | undefined;
    setQueue((prevQueue) => {
      const updated = prevQueue.map((item) => {
        if (item.id === id) {
          const isCurrentlyPaid =
            item.paymentStatus === "PAID" ||
            (item.paymentStatus !== "PENDING" && paidUhidSet.has((item.uhid || "").trim().toUpperCase()));
          const nextStatus = isCurrentlyPaid ? "PENDING" : "PAID";
          const updatedItem = { ...item, paymentStatus: nextStatus as any };
          targetItem = updatedItem;
          return updatedItem;
        }
        return item;
      });
      saveQueue(updated);
      return updated;
    });
    if (targetItem) {
      try {
        await upsertOpdQueueMutation(targetItem);
      } catch (err) {
        console.warn("Could not sync payment status update to Convex:", err);
      }
    }
  };

  // Open Check-In Modal with prefilled patient data
  const openCheckInModal = async (appt: any) => {
    setCheckInModalAppt(appt);
    let age = "";
    let sex: "Male" | "Female" | "Other" = "Male";
    try {
      const pt = await getPatientByPhoneNumber(appt.phone?.trim() || "", appt.name?.trim());
      if (pt) {
        if (pt.age) age = String(pt.age);
        if (pt.sex) sex = pt.sex as any;
      }
    } catch (_) { }
    setCheckInVitals({
      age,
      sex,
      bp: "",
      pulse: "",
      spo2: "",
      weight: "",
      height: "",
      temperature: "",
    });
  };

  // Check In Appointment to OPD Queue
  const handleCheckInAppointment = async (appt: any, customVitals?: any) => {
    setSubmitting(true);
    try {
      const today = getTodayString();
      let uhid = "";
      let patientId: string | undefined = undefined;

      try {
        let pt = await getPatientByPhoneNumber(appt.phone?.trim() || "", appt.name?.trim());
        if (pt) {
          patientId = pt.id;
          uhid = (pt.reference_number || "").replace(/^CH/i, "CRX");
          if (uhid === "CRX0002" && pt.name?.toLowerCase() !== "testing") {
            uhid = "CRX0003";
          }
        } else {
          // If patient does not exist yet, fetch the guaranteed next unique reference
          uhid = await getNextPatientReference();
        }
      } catch (e) {
        uhid = await getNextPatientReference();
      }

      let freshQueue = queue;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) freshQueue = deduplicateOpdQueue(parsed);
        }
      } catch {}

      const docName = appt.doctor_name || DOCTORS[0].name;
      const targetDocKey = getDoctorKey(docName);
      const doctorTodayItems = freshQueue.filter(
        (q) => getItemLocalDate(q.registeredAt) === today && getDoctorKey(q.doctor) === targetDocKey
      );

      // Check if patient already checked into today's queue for this doctor
      const apptCleanPhone = (appt.phone || "").replace(/\D/g, "").slice(-10);
      const apptCleanName = (appt.name || "").trim().toLowerCase();
      const existingInToday = doctorTodayItems.find((q) => {
        const qPhone = (q.phone || "").replace(/\D/g, "").slice(-10);
        const qUhid = (q.uhid || "").trim().toUpperCase();
        const qName = (q.name || "").trim().toLowerCase();

        // 1. Same appointment ID
        if (q.appointmentId && q.appointmentId === appt._id) return true;
        // 2. Same UHID (if non-empty)
        if (uhid && qUhid && qUhid === uhid.toUpperCase()) return true;
        // 3. Same phone AND same name (different family members sharing phone can both check in!)
        if (apptCleanPhone && qPhone === apptCleanPhone && qName === apptCleanName) return true;
        // 4. Same exact full name for today's doctor
        if (qName && apptCleanName && qName === apptCleanName) return true;
        return false;
      });

      if (existingInToday) {
        setSuccessNotification(`${appt.name || "Patient"} is already in today's OPD queue (Token #${existingInToday.token}).`);
        setCheckInModalAppt(null);
        return;
      }

      const existingTokens = doctorTodayItems
        .map((q) => parseInt(q.token, 10))
        .filter((n) => !isNaN(n) && n > 0);
      const nextToken = existingTokens.length > 0 ? Math.max(...existingTokens) + 1 : 1;
      const tokenNumber = String(nextToken).padStart(2, "0");

      const dept = docName.toLowerCase().includes("shillpa")
        ? "Obstetrics & Gynaecology"
        : "Orthopaedics & Joint Replacement";

      const newItem: OPDQueueItem = {
        id: `opd_${Date.now()}`,
        token: tokenNumber,
        uhid,
        patientId,
        appointmentId: appt._id,
        name: appt.name?.trim() || "Appointment Patient",
        age: customVitals?.age?.trim() || (appt.age !== undefined && appt.age !== null ? String(appt.age) : "—"),
        ageUnit: "years",
        sex: customVitals?.sex || "Male",
        phone: appt.phone?.trim() || "",
        address: appt.address?.trim() || "",
        doctor: docName,
        department: dept,
        priority: "Normal",
        visitType: "Appointment",
        status: "Waiting",
        vitals: {
          bp: customVitals?.bp?.trim() || undefined,
          pulse: customVitals?.pulse?.trim() || undefined,
          spo2: customVitals?.spo2?.trim() || undefined,
          height: customVitals?.height?.trim() || undefined,
          weight: customVitals?.weight?.trim() || undefined,
          temperature: customVitals?.temperature?.trim() || undefined,
        },
        consultationFee: 0,
        paymentMode: "Free / Exempt",
        registeredAt: new Date().toISOString(),
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };

      const updatedQueue = [newItem, ...queue];
      saveQueue(updatedQueue);

      try {
        await upsertOpdQueueMutation(newItem);
      } catch (err) {
        console.warn("Could not sync check-in to Convex:", err);
      }

      try {
        await updateAppointmentMutation({
          id: appt._id,
          status: "CONFIRMED",
        });
      } catch (updateErr) {
        console.warn("Could not update appointment status in Convex:", updateErr);
      }

      setSuccessNotification(`Appointment checked in! Token #${tokenNumber} assigned to ${newItem.name}.`);
      setCheckInModalAppt(null);
    } catch (err) {
      console.error("Failed to check in appointment:", err);
      alert("Failed to check in appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Launch Digital Prescription pre-filled
  const startPrescription = (item: OPDQueueItem, prescriptionId?: string) => {
    const params = new URLSearchParams({
      patientName: item.name,
      phoneNumber: item.phone,
      age: item.age,
      sex: item.sex,
      doctorName: item.doctor,
      bp: item.vitals.bp || "",
      pulse: item.vitals.pulse || "",
      spo2: item.vitals.spo2 || "",
      height: item.vitals.height || "",
      weight: item.vitals.weight || "",
    });

    if (item.uhid) {
      params.append("reference_number", item.uhid);
    }

    if (item.token) {
      params.append("token", item.token);
    }

    if (item.id) {
      params.append("opdVisitId", item.id);
    }

    if (prescriptionId) {
      params.append("id", prescriptionId);
    }

    // Mark as In Consultation if currently waiting and creating a new rx
    if (!prescriptionId && (item.status === "Waiting" || item.status === "Ready")) {
      updateStatus(item.id, "In Consultation");
    }

    router.push(`/admin/prescription?${params.toString()}`);
  };

  // Launch Hospital Billing pre-filled from OPD (Consultation charge added in Billing)
  const startBilling = async (item: OPDQueueItem) => {
    let prescriptionId = "";
    let consultationFee = "";
    try {
      const prescriptions = await getPrescriptionsByPatient(item.uhid);
      const linkedPrescription = prescriptions
        .filter((prescription) => prescription.opd_visit_id === item.id)
        .sort((a, b) => new Date(b.prescription_date || b.created_at || 0).getTime() - new Date(a.prescription_date || a.created_at || 0).getTime())[0];
      if (linkedPrescription?.id) {
        prescriptionId = linkedPrescription.id;
        const prescriptionBill = await getBillByPrescriptionId(linkedPrescription.id);
        const feeItem = prescriptionBill?.items?.find((billItem: any) =>
          billItem.item_type === "consultation" || /consultation|registration fee/i.test(billItem.description || "")
        );
        if (feeItem) {
          const fee = Number(feeItem.unit_price ?? feeItem.total ?? 0);
          if (Number.isFinite(fee) && fee > 0) consultationFee = String(fee);
        }
      }
    } catch (error) {
      console.warn("Could not load the prescription consultation fee for billing:", error);
    }

    const params = new URLSearchParams({
      tab: "opd",
      patientName: item.name,
      phoneNumber: item.phone,
      age: item.age,
      sex: item.sex,
      doctorName: item.doctor,
      uhid: item.uhid,
      token: item.token,
      visitType: item.visitType,
      opdVisitId: item.id,
    });
    if (prescriptionId) params.set("prescriptionId", prescriptionId);
    if (consultationFee) params.set("consultationFee", consultationFee);
    router.push(`/admin/billing?${params.toString()}`);
  };

  // Print OPD Card / Slip
  const printOPDCard = (item: OPDQueueItem) => {
    const params = new URLSearchParams({
      token: item.token,
      uhid: item.uhid,
      name: item.name,
      age: item.age,
      sex: item.sex,
      phone: item.phone,
      doctor: item.doctor,
      dept: item.department,
      bp: item.vitals.bp || "",
      pulse: item.vitals.pulse || "",
      spo2: item.vitals.spo2 || "",
      height: item.vitals.height || "",
      weight: item.vitals.weight || "",
      bmi: item.vitals.bmi || "",
      fee: String(item.consultationFee),
      time: item.time,
    });

    window.open(`/print-opd-card?${params.toString()}`, "_blank");
  };

  // Today count
  const todayQueueCount = useMemo(() => {
    return deduplicateOpdQueue(queue).filter((item) => getItemLocalDate(item.registeredAt) === todayStr).length;
  }, [queue, todayStr]);

  const todayQueueSummary = useMemo(() => {
    const todayItems = deduplicateOpdQueue(queue).filter((item) => getItemLocalDate(item.registeredAt) === todayStr);
    return {
      waiting: todayItems.filter((item) => item.status === "Waiting" || item.status === "Ready").length,
      inConsultation: todayItems.filter((item) => item.status === "In Consultation").length,
      completed: todayItems.filter((item) => item.status === "Completed").length,
      cancelled: todayItems.filter((item) => item.status === "Cancelled").length,
    };
  }, [queue, todayStr]);

  // Filtered queue (Filters by selectedQueueDate, doctor, status, search)
  // Ready patients follow active consultations; Waiting and Completed remain below them.
  const filteredQueue = useMemo(() => {
    const dedupedList = deduplicateOpdQueue(queue);
    const list = dedupedList.filter((item) => {
      // 1. Filter by Date (Defaults to Today)
      if (selectedQueueDate) {
        const itemDate = getItemLocalDate(item.registeredAt);
        if (itemDate && itemDate !== selectedQueueDate) return false;
      }
      // 2. Doctor Filter
      if (selectedDoctorFilter !== "All") {
        const itemDoc = (item.doctor || "").toLowerCase().replace(/l+/g, "l");
        const filterDoc = selectedDoctorFilter.toLowerCase().replace(/l+/g, "l");
        if (!itemDoc.includes(filterDoc) && !filterDoc.includes(itemDoc)) {
          return false;
        }
      }
      // 3. Status Filter
      if (activeTab === "waitingQueue") {
        if (item.status === "Completed" || item.status === "Cancelled") return false;
      } else if (activeTab !== "billingQueue" && selectedStatusFilter !== "All" && item.status !== selectedStatusFilter) {
        return false;
      }
      // 4. Search Filter
      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.phone.includes(q) ||
          item.token.includes(q) ||
          item.uhid.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      // Descending order: new records / latest registrations first on top
      const timeA = new Date(a.registeredAt || 0).getTime();
      const timeB = new Date(b.registeredAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;

      const tokenA = parseInt(a.token, 10) || 0;
      const tokenB = parseInt(b.token, 10) || 0;
      return tokenB - tokenA;
    });
  }, [queue, selectedQueueDate, selectedDoctorFilter, selectedStatusFilter, queueSearch, activeTab]);

  const displayedQueue = useMemo(() => {
    if (activeTab === "billingQueue") {
      return filteredQueue.filter((item) => item.status === "Completed");
    }
    if (activeTab === "waitingQueue") {
      return filteredQueue.filter((item) => item.status === "Waiting" || item.status === "Ready" || item.status === "In Consultation");
    }
    return filteredQueue;
  }, [activeTab, filteredQueue]);

  const waitingQueueCount = useMemo(() => {
    return deduplicateOpdQueue(queue).filter((item) => {
      const itemDate = getItemLocalDate(item.registeredAt);
      if (selectedQueueDate && itemDate !== selectedQueueDate) return false;
      if (selectedDoctorFilter !== "All") {
        const itemDoc = (item.doctor || "").toLowerCase().replace(/l+/g, "l");
        const filterDoc = selectedDoctorFilter.toLowerCase().replace(/l+/g, "l");
        if (!itemDoc.includes(filterDoc) && !filterDoc.includes(itemDoc)) {
          return false;
        }
      }
      return item.status === "Waiting" || item.status === "Ready" || item.status === "In Consultation";
    }).length;
  }, [queue, selectedQueueDate, selectedDoctorFilter]);

  // Quick select patient from Directory to Register
  const handleSelectFromDirectory = (pt: Patient) => {
    setFormData((prev) => ({
      ...prev,
      name: pt.name,
      age: pt.age ? String(pt.age) : "",
      sex: (pt.sex as "Male" | "Female" | "Other") || "Male",
      phone: pt.phone_number,
      address: (pt as any).address || "",
      visitType: "Routine Follow-up",
    }));
    setExistingPatientFound(pt);
    setActiveTab("register");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* OPD workspace heading and primary actions */}
      <header className="opd-page-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{new Date().toLocaleDateString("en-US", { weekday: "long" })}, {formatDate(new Date())}</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{activeTab === "waitingQueue" ? "Waiting queue" : activeTab === "queue" ? "Today at a glance" : activeTab === "billingQueue" ? "Billing queue" : activeTab === "appointments" ? "Appointments" : activeTab === "register" ? "Register a patient" : "Patient directory"}</h1>
            <p className="mt-1 text-base text-slate-500">{activeTab === "waitingQueue" ? "Patients currently in clinic awaiting consultation." : activeTab === "queue" ? `${hospitalConfig.legalName} · Your clinic is running smoothly. Here’s today’s OPD snapshot.` : activeTab === "billingQueue" ? "Patients move here automatically after their consultation is completed." : activeTab === "appointments" ? "Review arrivals and check scheduled patients into the OPD queue." : activeTab === "register" ? "Create a patient record and add them to today’s consultation queue." : "Find a patient record and continue their care."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setActiveTab("register")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#176e56] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155944]">
              <UserPlus className="h-4 w-4" />New patient
            </button>
            <Link href="/admin/prescription" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-800">
              <FileText className="h-4 w-4" />Prescription
            </Link>
            <Link href="/admin/billing" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-800">
              <Receipt className="h-4 w-4" />Billing
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {([
              ["queue", <Clock key="queue" className="h-4 w-4" />, `OPD queue${todayQueueCount ? ` · ${todayQueueCount}` : ""}`],
              ["waitingQueue", <Clock key="waitingQueue" className="h-4 w-4 text-amber-600" />, `Waiting queue${waitingQueueCount ? ` · ${waitingQueueCount}` : ""}`],
              ["billingQueue", <Receipt key="billingQueue" className="h-4 w-4" />, `Billing queue${todayQueueSummary.completed ? ` · ${todayQueueSummary.completed}` : ""}`],
              ["appointments", <Calendar key="appointments" className="h-4 w-4" />, `Appointments${todayAppointments.length ? ` · ${todayAppointments.length}` : ""}`],
              ["register", <UserPlus key="register" className="h-4 w-4" />, "Walk-in registration"],
              ["directory", <Users key="directory" className="h-4 w-4" />, "Patient directory"],
            ] as const).map(([tab, icon, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`relative inline-flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-semibold transition ${activeTab === tab ? "text-emerald-800" : "text-slate-500 hover:text-slate-800"}`}>
                {icon}{label}{activeTab === tab && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-700" />}
              </button>
            ))}
          </div>
          {(activeTab === "queue" || activeTab === "waitingQueue" || activeTab === "billingQueue") && (
            <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs">
              <span className="px-2 font-semibold uppercase tracking-wide text-slate-400">Doctor</span>
              {[
                ["Dr. Vipeen Raut", "Dr. Vipeen Raut"],
                ["Dr. Shillpa Raut", "Dr. Shilpa Raut"],
              ].map(([value, label]) => {
                const isSelected = selectedDoctorFilter.toLowerCase().includes(value.toLowerCase().replace(/dr\.?\s*/i, '').slice(0, 5));
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelectedDoctorFilter(value);
                      try {
                        localStorage.setItem("cortex_opd_doctor_filter", value);
                        localStorage.setItem("cortex_active_doctor", value);
                        handleDoctorChange(value);
                      } catch (_) {}
                    }}
                    className={`rounded-md px-2.5 py-1.5 font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-800 shadow-2xs font-bold"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* SUCCESS NOTIFICATION BANNER */}
      {successNotification && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between text-emerald-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">{successNotification}</p>
              <p className="text-xs text-emerald-700">Patient added to queue. Consultation charge will be applied during final Hospital Billing.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotification(null)}
            className="text-xs font-semibold px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: OPD PATIENT QUEUE */}
      {(activeTab === "queue" || activeTab === "waitingQueue" || activeTab === "billingQueue") && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search patient, phone, UHID..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Date Filter & Calendar Picker */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedQueueDate(shiftDate(selectedQueueDate, -1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <input
                    type="date"
                    value={selectedQueueDate}
                    onChange={(e) => setSelectedQueueDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                    title="Choose Date from Calendar"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedQueueDate(shiftDate(selectedQueueDate, 1))}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {selectedQueueDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedQueueDate(todayStr)}
                    className="ml-1 px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 transition"
                  >
                    Today
                  </button>
                )}
              </div>


              {/* Status Filter */}
              {activeTab === "queue" && <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="All">All Status</option>
                  <option value="Waiting">Waiting</option>
                  <option value="In Consultation">In Consultation</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>}

              {/* Clear Queue (For demo / day end) */}
              {activeTab === "queue" && queue.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("Reset OPD Queue? (Patient records in database are preserved)")) {
                      saveQueue([]);
                      try {
                        await clearOpdQueueMutation();
                      } catch (err) {
                        console.error("Failed to clear queue in DB:", err);
                      }
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-red-600 font-medium underline ml-auto"
                >
                  Reset Queue
                </button>
              )}
            </div>
          </div>

          {/* Calendar Filter Notice Banner if not viewing Today */}
          {selectedQueueDate !== todayStr && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>
                  Viewing {activeTab === "waitingQueue" ? "Waiting Queue" : activeTab === "billingQueue" ? "Billing Queue" : "OPD Queue"} for <strong>{selectedQueueDate}</strong> ({displayedQueue.length} {displayedQueue.length === 1 ? 'patient' : 'patients'}). Not showing today.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQueueDate(todayStr)}
                className="font-bold text-emerald-700 hover:underline hover:text-emerald-900"
              >
                Switch to Today&apos;s Queue →
              </button>
            </div>
          )}

          {/* Queue List */}
          {displayedQueue.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {activeTab === "waitingQueue"
                  ? (selectedQueueDate === todayStr ? "No Patients Waiting in Queue Today" : `No Patients Waiting on ${formatDate(selectedQueueDate)}`)
                  : activeTab === "billingQueue"
                  ? (selectedQueueDate === todayStr ? "No Patients in Billing Queue Today" : `No Patients in Billing Queue on ${formatDate(selectedQueueDate)}`)
                  : (selectedQueueDate === todayStr ? "No Patients in Queue Today" : `No Patients in Queue on ${formatDate(selectedQueueDate)}`)}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {activeTab === "waitingQueue"
                  ? "All patients have completed consultation or no patients are waiting."
                  : activeTab === "billingQueue"
                  ? "Completed consultations will appear here for billing."
                  : selectedQueueDate === todayStr
                  ? "There are currently no patients waiting for OPD consultation today."
                  : `No OPD patient registrations found for ${formatDate(selectedQueueDate)}. Choose another date from the calendar or return to today.`}
              </p>
              <div className="flex items-center justify-center gap-2">
                {selectedQueueDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedQueueDate(todayStr)}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    View Today&apos;s Patients
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  + Register Patient
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#e4ece5] bg-white shadow-[0_5px_18px_rgb(27_74_52_/_4%)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div><h2 className="text-lg font-bold text-[#3f5f50]">{activeTab === "waitingQueue" ? "Waiting queue" : activeTab === "billingQueue" ? "Billing queue" : "OPD queue"} <span className="ml-1 font-normal text-slate-500">{activeTab === "waitingQueue" ? "Patients currently waiting for consultation" : activeTab === "billingQueue" ? "Completed consultations ready for billing" : "A live snapshot of your clinic"}</span></h2></div>
                <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600" onClick={() => setSelectedQueueDate(todayStr)}>
                  {selectedQueueDate === todayStr ? "Today" : formatDate(selectedQueueDate)}<Calendar className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left">
                  <thead><tr className="bg-[#f8faf8] text-xs font-semibold uppercase tracking-[0.1em] text-[#64776c]"><th className="px-5 py-3.5 font-semibold">No.</th><th className="px-4 py-3.5 font-semibold">Patient</th><th className="px-4 py-3.5 font-semibold">Details</th><th className="px-4 py-3.5 font-semibold">Last Visit</th><th className="px-4 py-3.5 font-semibold">Doctor</th><th className="px-4 py-3.5 font-semibold">Status</th><th className="px-5 py-3.5 text-right font-semibold">Actions</th></tr></thead>
                  <tbody className="divide-y divide-[#edf2ee]">
                    {displayedQueue.map((item, index) => {
                      const isPaid = item.paymentStatus === "PAID" || (item.paymentStatus !== "PENDING" && paidUhidSet.has((item.uhid || "").trim().toUpperCase()));
                      const statusStyle =
                        item.status === "Waiting" || item.status === "Ready"
                          ? "bg-amber-50 text-amber-800 border-amber-100"
                          : item.status === "Completed"
                          ? "bg-slate-100 text-slate-700 border-slate-200"
                          : item.status === "Cancelled"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-100";

                      const uhidNorm = (item.uhid || "").trim().toUpperCase();
                      const phoneNorm = (item.phone || "").replace(/\D/g, "").slice(-10);
                      const itemCleanName = (item.name || "").trim().toLowerCase();

                      const isNameCompatible = (rxName?: string) => {
                        if (!rxName) return false;
                        const rxClean = rxName.trim().toLowerCase();
                        if (rxClean === itemCleanName) return true;
                        const itemFirst = itemCleanName.split(/\s+/)[0];
                        const rxFirst = rxClean.split(/\s+/)[0];
                        return itemFirst.length >= 3 && itemFirst === rxFirst;
                      };

                      let linkedRx = item.id ? prescriptionByVisitId.get(item.id) : undefined;
                      if (linkedRx && !isNameCompatible(linkedRx.patient_name)) {
                        linkedRx = undefined;
                      }

                      if (!linkedRx && uhidNorm) {
                        const candidate = prescriptionByUhid.get(uhidNorm);
                        if (candidate && isNameCompatible(candidate.patient_name)) {
                          linkedRx = candidate;
                        }
                      }

                      if (!linkedRx && phoneNorm) {
                        const candidate =
                          prescriptionByPhone.get(`${phoneNorm}_${itemCleanName}`) ||
                          prescriptionByPhone.get(phoneNorm);
                        if (candidate && isNameCompatible(candidate.patient_name)) {
                          linkedRx = candidate;
                        }
                      }

                      const hasPrescription = !!linkedRx;
                      const lastVisitInfo =
                        (uhidNorm && patientLastVisitMap.get(uhidNorm)) ||
                        (phoneNorm && patientLastVisitMap.get(`${phoneNorm}_${itemCleanName}`));

                      return <tr key={item.id} className="group transition-colors hover:bg-[#fbfdfb]">
                        <td className="px-5 py-4 text-sm tabular-nums text-[#829188]">{String(displayedQueue.length - index).padStart(2, "0")}</td>
                        <td className="px-4 py-4"><div className="flex min-w-[205px] items-center"><span className="min-w-0"><b className="block truncate text-base font-bold text-[#50675a]">{item.name}</b><span className="mt-1 block text-sm text-slate-500">#{item.token} · {item.uhid}</span>{item.priority !== "Normal" && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase ${item.priority === "Emergency" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{item.priority}</span>}</span></div></td>
                        <td className="px-4 py-4">
                          <span className="block text-sm text-[#65796e]">{item.age ? `${item.age} ${item.ageUnit}` : "Age N/A"} · {item.sex}</span>
                          {(item.vitals?.bp || item.vitals?.pulse) ? (
                            <span className="mt-1 block text-sm text-slate-500">
                              {[item.vitals.bp ? `BP ${item.vitals.bp}` : '', item.vitals.pulse ? `${item.vitals.pulse} bpm` : ''].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {lastVisitInfo ? (
                            <div>
                              <span className="block text-xs font-bold text-slate-700">{formatVisitDate(lastVisitInfo.date)}</span>
                              <span className="text-[11px] text-slate-400">{lastVisitInfo.daysAgo === 1 ? "Yesterday" : `${lastVisitInfo.daysAgo} days ago`}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
                              1st Visit
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4"><span className="block whitespace-nowrap text-sm font-semibold text-[#577464]">{item.doctor}</span><span className="mt-1 block text-sm text-slate-500">{item.department || "General consultation"}</span></td>
                        <td className="px-4 py-4">{activeTab === "billingQueue" ? <span className={`inline-flex rounded-full border px-3 py-2 text-xs font-semibold ${statusStyle}`}>● Completed</span> : <select aria-label={`Status for ${item.name}`} value={item.status === "Ready" ? "Waiting" : item.status} onChange={(e) => updateStatus(item.id, e.target.value as any)} className={`max-w-[165px] rounded-full border px-3 py-2 text-xs font-semibold outline-none ${statusStyle}`}><option value="Waiting">● Waiting</option><option value="In Consultation">● In consultation</option><option value="Completed">● Completed</option><option value="Cancelled">● Cancelled</option></select>}</td>
                        <td className="px-5 py-3.5"><div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => togglePaymentStatus(item.id)} title={isPaid ? "Payment received; click to mark pending" : "Mark payment received"} aria-label={isPaid ? `Payment received for ${item.name}` : `Payment pending for ${item.name}`} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${isPaid ? "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"}`}><CheckCircle2 className="h-4 w-4" /></button>
                          <button type="button" onClick={() => startBilling(item)} title="Open billing" className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#dce9df] bg-white px-3 text-xs font-semibold text-[#4d8063] transition hover:bg-[#f1f8f2]"><Receipt className="h-4 w-4"/>Bill</button>
                          <button type="button" onClick={() => startPrescription(item, linkedRx?._id || linkedRx?.id)} title={hasPrescription ? "View prescription" : "Create prescription"} className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#176e56] px-3 text-xs font-semibold text-white transition hover:bg-[#155944]"><FileText className="h-4 w-4"/>{hasPrescription ? "View Rx" : "Prescription"}</button>
                          <button type="button" onClick={() => handleDeleteQueueItem(item.id, item.name)} title="Remove duplicate/cancelled patient from queue" className="grid h-8 w-8 place-items-center rounded-lg border border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                        </div></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[#edf2ee] bg-[#fbfcfb] px-5 py-3 text-sm text-slate-500"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#62b487] shadow-[0_0_0_3px_#e7f3eb]"/>Updating in real time</span><span>{displayedQueue.length} {displayedQueue.length === 1 ? "patient" : "patients"} shown</span></div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SCHEDULED APPOINTMENTS VIEW */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Date Shortcuts & Input */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedApptDate(todayStr)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${selectedApptDate === todayStr
                      ? "bg-white text-emerald-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    setSelectedApptDate(new Date(d.getTime() - tzOffset).toISOString().split("T")[0]);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${selectedApptDate !== todayStr
                      ? "text-slate-700 hover:text-slate-900"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  Tomorrow
                </button>
              </div>

              <input
                type="date"
                value={selectedApptDate}
                onChange={(e) => setSelectedApptDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />

              {/* Doctor Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-1">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={apptDoctorFilter}
                  onChange={(e) => setApptDoctorFilter(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="All">All Doctors</option>
                  {DOCTORS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={apptSearchQuery}
                onChange={(e) => setApptSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Stats Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Scheduled</span>
                <span className="text-xl font-black text-slate-900">{appointmentsForSelectedDate.length}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Checked In to OPD</span>
                <span className="text-xl font-black text-emerald-700">
                  {appointmentsForSelectedDate.filter((a) => isApptInQueue(a)).length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pending Arrival</span>
                <span className="text-xl font-black text-amber-700">
                  {appointmentsForSelectedDate.filter((a) => !isApptInQueue(a)).length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Appointments List */}
          {appointmentsForSelectedDate.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Appointments Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no scheduled appointments matching the selected date and filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {appointmentsForSelectedDate.map((appt) => {
                const inQueue = isApptInQueue(appt);
                return (
                  <div
                    key={appt._id}
                    className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${inQueue ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200"
                      }`}
                  >
                    {/* Time Slot & Patient Details */}
                    <div className="flex items-start gap-3">
                      <div className="text-center min-w-[70px] bg-slate-900 text-white rounded-xl p-2 shadow-sm">
                        <span className="text-[9px] font-bold block uppercase tracking-wider text-slate-300">TIME</span>
                        <span className="text-sm font-black tracking-tight">{appt.time}</span>
                        {appt.duration_minutes && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{appt.duration_minutes}m</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{appt.name}</h3>
                          <a
                            href={`tel:${appt.phone}`}
                            className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded flex items-center gap-1 transition"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            {appt.phone}
                          </a>
                          {inQueue && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ In Queue (Token #{inQueue.token}) · {inQueue.status}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>
                            Doctor: <strong className="text-slate-800">{appt.doctor_name || DOCTORS[0].name}</strong>
                          </span>
                          {appt.dental_problem && (
                            <span className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <Stethoscope className="w-3 h-3 text-emerald-600" />
                              {appt.dental_problem}
                            </span>
                          )}
                          {(appt as any).address && (
                            <span className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {(appt as any).address}
                            </span>
                          )}
                          {appt.notes && (
                            <span className="text-slate-500 italic max-w-xs truncate" title={appt.notes}>
                              📝 {appt.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Check In Action Buttons */}
                    <div className="flex items-center gap-2 md:justify-end shrink-0">
                      {inQueue ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("queue");
                            setQueueSearch(appt.name || "");
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          View in Queue (Token #{inQueue.token})
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openCheckInModal(appt)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Add BP, Pulse, Weight before checking in"
                          >
                            <Activity className="w-3.5 h-3.5 text-emerald-600" />
                            With Vitals
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleCheckInAppointment(appt)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            + Check In to OPD
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPD PATIENT REGISTRATION FORM */}
      {activeTab === "register" && (
        <form onSubmit={handleRegisterPatient} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Patient Registration & OPD Slip</h2>
                <p className="text-xs text-slate-500">
                  Enter patient details, select consulting doctor, and record initial vitals.
                </p>
              </div>
              <span className="text-xs text-slate-400">Date: {formatDate(new Date())}</span>
            </div>

            {/* Found existing patient alert */}
            {existingPatientFound && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Existing patient found: <strong>{existingPatientFound.name}</strong> ({existingPatientFound.reference_number || "UHID Registered"}). Details pre-filled.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExistingPatientFound(null)}
                  className="text-emerald-700 underline font-semibold"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Section 1: Demographics */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Patient Demographics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono font-medium ${
                        formData.phone.replace(/\D/g, "").length === 10
                          ? "text-emerald-600"
                          : formData.phone.replace(/\D/g, "").length > 0
                          ? "text-amber-600"
                          : "text-slate-400"
                      }`}
                    >
                      {formData.phone.replace(/\D/g, "").length}/10 digits
                    </span>
                  </div>
                  <PatientSearchInput
                    value={formData.phone}
                    searchType="phone"
                    onChange={(val) => setFormData({ ...formData, phone: val.replace(/\D/g, "").slice(0, 10) })}
                    onSelectPatient={handleAutoFillPatient}
                    patients={combinedPatients}
                    placeholder="10-digit mobile number"
                    required
                  />
                  {formData.phone.replace(/\D/g, "").length > 0 && formData.phone.replace(/\D/g, "").length < 10 && (
                    <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">
                      10 digits compulsory ({10 - formData.phone.replace(/\D/g, "").length} more needed)
                    </span>
                  )}
                  {formData.phone.replace(/\D/g, "").length === 10 && (
                    <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block flex items-center gap-1">
                      ✓ Valid 10-digit mobile number
                    </span>
                  )}
                  {formData.phone.replace(/\D/g, "").length === 0 && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">10-digit mobile number compulsory</span>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <PatientSearchInput
                    value={formData.name}
                    searchType="name"
                    onChange={(val) => setFormData({ ...formData, name: val })}
                    onSelectPatient={handleAutoFillPatient}
                    patients={combinedPatients}
                    placeholder="Enter or search patient name..."
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Type letters to search or register new patient</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      min="0"
                      max="125"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Age"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email ID <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. patient@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Address / City <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Shivaji Nagar, Wardha"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Consultation & Doctor Assignment */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                2. Doctor & Consultation Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consulting Doctor</label>
                  <select
                    value={formData.doctor}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none"
                  >
                    {DOCTORS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Specialty</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visit Type</label>
                  <select
                    value={formData.visitType}
                    onChange={(e) => setFormData({ ...formData, visitType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                  >
                    <option value="New Registration">New Registration</option>
                    <option value="Routine Follow-up">Routine Follow-up</option>
                    <option value="Post-Op Review">Post-Op Review</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Clinical Vitals */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  3. Recorded Vitals (Optional)
                </h3>
                <span className="text-[11px] text-slate-400">Auto-transferred to Digital Prescription</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={formData.bp}
                    onChange={(e) => setFormData({ ...formData, bp: e.target.value })}
                    placeholder="e.g. 120/80"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Pulse (bpm)</label>
                  <input
                    type="text"
                    value={formData.pulse}
                    onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                    placeholder="e.g. 72"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">SpO₂ (%)</label>
                  <input
                    type="text"
                    value={formData.spo2}
                    onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                    placeholder="e.g. 98"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    placeholder="e.g. 170"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="e.g. 68"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Calculated BMI</label>
                  <input
                    type="text"
                    readOnly
                    value={calculatedBMI ? `${calculatedBMI} kg/m²` : "—"}
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>
            </div>



            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Generate Token & Add to Queue
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: PATIENT DIRECTORY */}
      {activeTab === "directory" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Patient Directory</h2>
              <p className="text-xs text-slate-500">
                Lookup registered patients to create a repeat visit or review past records.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                placeholder="Search by name, phone, UHID..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {loadingPatients ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading patient directory...
            </div>
          ) : allPatients.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No registered patients found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">UHID</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Age / Sex</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPatients
                    .filter((p) => {
                      if (!directorySearch.trim()) return true;
                      const s = directorySearch.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(s) ||
                        p.phone_number.includes(s) ||
                        (p.reference_number && p.reference_number.toLowerCase().includes(s))
                      );
                    })
                    .map((pt) => (
                      <tr key={pt.id || pt.phone_number} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {pt.reference_number || "—"}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{pt.name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {pt.age ? `${pt.age} Y` : "—"} / {pt.sex || "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          <div>{pt.phone_number}</div>
                          {pt.email && <div className="text-[10px] text-slate-400 font-sans">{pt.email}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleSelectFromDirectory(pt)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs transition"
                          >
                            + OPD Re-Visit
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CHECK-IN WITH VITALS MODAL */}
      {checkInModalAppt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Check In Appointment to OPD Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {checkInModalAppt.name} • {checkInModalAppt.time} • {checkInModalAppt.doctor_name || DOCTORS[0].name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModalAppt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Patient Basic Review */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Age</label>
                  <input
                    type="text"
                    value={checkInVitals.age}
                    onChange={(e) => setCheckInVitals({ ...checkInVitals, age: e.target.value })}
                    placeholder="e.g. 35"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Sex</label>
                  <select
                    value={checkInVitals.sex}
                    onChange={(e) => setCheckInVitals({ ...checkInVitals, sex: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Vitals */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Triage / Vitals (Optional)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">BP (mmHg)</span>
                    <input
                      type="text"
                      placeholder="120/80"
                      value={checkInVitals.bp}
                      onChange={(e) => setCheckInVitals({ ...checkInVitals, bp: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Pulse (bpm)</span>
                    <input
                      type="text"
                      placeholder="72"
                      value={checkInVitals.pulse}
                      onChange={(e) => setCheckInVitals({ ...checkInVitals, pulse: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">SpO2 (%)</span>
                    <input
                      type="text"
                      placeholder="98"
                      value={checkInVitals.spo2}
                      onChange={(e) => setCheckInVitals({ ...checkInVitals, spo2: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Weight (kg)</span>
                    <input
                      type="text"
                      placeholder="68"
                      value={checkInVitals.weight}
                      onChange={(e) => setCheckInVitals({ ...checkInVitals, weight: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Height (cm)</span>
                    <input
                      type="text"
                      placeholder="170"
                      value={checkInVitals.height}
                      onChange={(e) => setCheckInVitals({ ...checkInVitals, height: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Temp (°F)</span>
                    <input
                      type="text"
                      placeholder="98.6"
                      value={checkInVitals.temperature}
                      onChange={(e) => setCheckInVitals({ ...checkInVitals, temperature: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCheckInModalAppt(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleCheckInAppointment(checkInModalAppt, checkInVitals)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? "Assigning Token..." : "Check In & Generate Token"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
