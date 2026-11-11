"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bed,
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
  AlertCircle,
  IndianRupee,
  Stethoscope,
  Receipt,
  Plus,
  Eye,
  LogOut,
  ChevronRight,
  X,
  CreditCard,
  Building2,
  HeartPulse,
  Syringe,
  ClipboardCheck,
  ShieldCheck,
  CalendarDays,
  FileSpreadsheet,
  Trash2,
  Pencil,
  Settings,
  ArrowLeftRight,
  SlidersHorizontal,
  Layers,
  Save,
  Check,
  Sparkles,
} from "lucide-react";
import { createPatient, getPatients, getPatientByPhoneNumber, getPatientById } from "@/services/patients";
import { Patient } from "@/types/patient";
import { createBill, updateBill } from "@/services/bills";
import { hospitalConfig, getDoctorProfile } from "@/config/hospital";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "@/convex/_generated/api";

// ─────────────────────────────────────────────────────────────
// MODULAR SUBCOMPONENTS & TYPES
// ─────────────────────────────────────────────────────────────
import {
  IPDAdmission,
  WardBedConfigItem,
  HospitalChargeItem,
  DEFAULT_WARD_BED_CONFIG,
  BED_CONFIG_STORAGE_KEY,
  STORAGE_KEY,
  DOCTORS,
  DEPARTMENTS,
  COMPLETE_IPD_CHARGES_CATALOG,
  DEFAULT_HOSPITAL_CHARGES,
  QUICK_IPD_SUGGESTIONS,
  calculateStayDays,
  calculateRunningBill,
  numberToWordsINR,
} from "@/components/ipd/types";

import IpdHeaderStats from "@/components/ipd/IpdHeaderStats";
import IpdBedMatrixTab from "@/components/ipd/IpdBedMatrixTab";
import IpdNewAdmissionTab from "@/components/ipd/IpdNewAdmissionTab";
import IpdDischargedArchiveTab from "@/components/ipd/IpdDischargedArchiveTab";
import IpdDischargeModal from "@/components/ipd/IpdDischargeModal";
import IpdEditAdmissionModal from "@/components/ipd/IpdEditAdmissionModal";
import IpdTransferBedModal from "@/components/ipd/IpdTransferBedModal";
import IpdSelectOpdPatientModal from "@/components/ipd/IpdSelectOpdPatientModal";
import IpdBedConfigModal from "@/components/ipd/IpdBedConfigModal";
import IpdPrintBedTicketModal from "@/components/ipd/IpdPrintBedTicketModal";
import IpdPrintDischargeModal from "@/components/ipd/IpdPrintDischargeModal";
import { IpdRecordPaymentModal } from "@/components/ipd/IpdRecordPaymentModal";
import { IpdPrintReceiptModal } from "@/components/ipd/IpdPrintReceiptModal";
import { IpdClinicalStayModal } from "@/components/ipd/IpdClinicalStayModal";
import { IpdRunningBillModal } from "@/components/ipd/IpdRunningBillModal";

const normalizeAppointmentDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const [, year, month, day] = ymd;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
};

const appointmentTimestamp = (date: unknown, time: unknown): string | null => {
  const dateKey = normalizeAppointmentDate(date);
  if (!dateKey || typeof time !== "string") return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (hours > 23 || minutes > 59) return null;
  const parsed = new Date(`${dateKey}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};



export default function IPDManagementPage() {
  const router = useRouter();

  // Convex Real-Time Synchronization Hooks
  const liveAdmissions = useQuery(api.ipd.list, {});
  const liveBedConfig = useQuery(api.ipd.getBedConfig, {});
  const liveOpdQueue = useQuery(api.opd_queue.list, {});
  const liveAppointments = useQuery(api.appointments.list);
  const livePatients = useQuery(api.patients.list);
  const saveIpdMutation = useMutation(api.ipd.save);
  const updateIpdStatusMutation = useMutation(api.ipd.updateStatus);
  const saveBedConfigMutation = useMutation(api.ipd.saveBedConfig);
  const syncLocalAdmissionsMutation = useMutation(api.ipd.syncLocalAdmissions);

  // Tab State: 'dashboard' | 'admit' | 'history'
  const [activeTab, setActiveTab] = useState<"dashboard" | "admit" | "history">("dashboard");

  // Admissions State
  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWardFilter, setSelectedWardFilter] = useState("All");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState("All");

  // Selected patient for interactive modals
  const [activeAdmission, setActiveAdmission] = useState<IPDAdmission | null>(null);
  const [activeModal, setActiveModal] = useState<"none" | "profile" | "billing" | "discharge" | "editAdmission" | "printTicket" | "printReceipt" | "printDischarge" | "recordPayment">("none");
  const [printReceiptData, setPrintReceiptData] = useState<any>(null);
  const [recordPaymentAdmission, setRecordPaymentAdmission] = useState<IPDAdmission | null>(null);
  const [paymentModalReturnTo, setPaymentModalReturnTo] = useState<"none" | "discharge" | "billing">("none");
  const [editingAdvanceId, setEditingAdvanceId] = useState<string | null>(null);
  const [editingReceiptNumber, setEditingReceiptNumber] = useState<string | null>(null);
  const [quickPaymentForm, setQuickPaymentForm] = useState({
    amount: "",
    mode: "Cash" as "Cash" | "UPI" | "Card" | "Bank Transfer" | "Cheque",
    notes: "Interim Stay Payment",
    receivedBy: "Reception Desk",
    date: new Date().toISOString().split("T")[0],
  });
  const [dischargeIncludeSignature, setDischargeIncludeSignature] = useState<boolean>(true);
  const [receiptPageSize, setReceiptPageSize] = useState<"A6" | "A7" | "A4">("A6");

  // Editable Clinical Items & Admission Profile State
  const [editingClinicalItem, setEditingClinicalItem] = useState<{
    type: "vitals" | "doctorNotes" | "meds" | "investigations" | "procedures" | "nursing";
    id: string;
    data: any;
  } | null>(null);
  const [isEditingAdmissionInfo, setIsEditingAdmissionInfo] = useState<boolean>(false);
  const [editAdmissionInfoForm, setEditAdmissionInfoForm] = useState({
    provisionalDiagnosis: "",
    reasonForAdmission: "",
    consultantDoctor: "",
    bedNumber: "",
    ward: "",
  });

  // New Admission Form State (Lean Admission: No mandatory charges at starting)
  const [newAdmissionForm, setNewAdmissionForm] = useState({
    uhid: "",
    ipdNumber: "",
    name: "",
    age: "",
    sex: "Male" as "Male" | "Female" | "Other",
    phone: "",
    address: "",
    email: "",
    whatsapp_number: "",
    medicalHistory: "",
    allergies: "",
    provisionalDiagnosis: "",
    reasonForAdmission: "",
    admissionDate: new Date().toISOString().split("T")[0],
    admissionTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    department: DEPARTMENTS[0],
    consultantDoctor: DOCTORS[0].name,
    referredBy: "",
    paymentCategory: "Cash" as const,
    ward: "Room 101" as any,
    isCustomWard: false,
    customWardName: "",
    bedNumber: "Bed 101-A",
    isCustomBed: false,
    customBedNumber: "",
    dailyRate: 1000,
    nursingRate: 300,
    doctorVisitFee: 300,
    initialAdvance: 0,
    advancePaymentMode: "Cash" as "Cash" | "UPI" | "Card" | "Bank Transfer",
  });

  // Edit Inpatient Admission & Rates State
  const [editAdmissionForm, setEditAdmissionForm] = useState({
    id: "",
    name: "",
    age: "",
    sex: "Male" as "Male" | "Female" | "Other",
    phone: "",
    address: "",
    uhid: "",
    ipdNumber: "",
    department: "",
    consultantDoctor: "",
    ward: "",
    isCustomWard: false,
    bedNumber: "",
    isCustomBed: false,
    dailyRate: 1000,
    nursingRatePerDay: 300,
    doctorRatePerVisit: 300,
    provisionalDiagnosis: "",
    admissionDate: "",
    admissionTime: "",
    paymentCategory: "Cash" as "Cash" | "TPA / Insurance" | "Ayushman Bharat / MJPJAY" | "Corporate",
    status: "Admitted" as "Admitted" | "Discharged",
    dischargeDate: "",
    dischargeTime: "",
    conditionAtDischarge: "Cured / Stable",
    finalDiagnosis: "",
    treatmentGiven: "",
    dischargeMeds: "",
    followupDate: "",
    doctorNotes: "",
  });

  const [existingPatientFound, setExistingPatientFound] = useState<Patient | null>(null);
  const [submittingAdmission, setSubmittingAdmission] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Clinical Profile Sub-tab
  const [profileTab, setProfileTab] = useState<"vitals" | "doctorNotes" | "meds" | "investigations" | "procedures" | "nursing">("vitals");

  // Clinical Profile Inputs
  const [vitalsInput, setVitalsInput] = useState({ bp: "120/80", pulse: "72", temp: "98.6", spo2: "99", weight: "", recordedBy: "Staff Nurse" });
  const [doctorNoteInput, setDoctorNoteInput] = useState({ doctor: DOCTORS[0].name, note: "", plan: "" });
  const [medInput, setMedInput] = useState({ name: "", dosage: "", route: "Oral", frequency: "BD", timing: "Morning & Night" });
  const [investigationInput, setInvestigationInput] = useState({ name: "", cost: 500 });
  const [procedureInput, setProcedureInput] = useState({ name: "", surgeon: DOCTORS[0].name, cost: 5000, notes: "" });
  const [nursingNoteInput, setNursingNoteInput] = useState<{ shift: "Morning" | "Evening" | "Night"; note: string; nurse: string }>({ shift: "Morning", note: "", nurse: "Staff Nurse" });

  // Advance Payment Modal Input
  const [advanceInput, setAdvanceInput] = useState({ amount: 5000, mode: "Cash" as const, notes: "Interim Stay Advance" });

  // Custom Charge Input
  const [chargeInput, setChargeInput] = useState({ description: "", amount: 1000, category: "Procedure / Nursing" });

  // Discharge Form State
  const [dischargeForm, setDischargeForm] = useState({
    dischargeDate: new Date().toISOString().split("T")[0],
    dischargeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    conditionAtDischarge: "Cured / Stable",
    finalDiagnosis: "",
    treatmentGiven: "",
    dischargeMeds: "",
    followupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    doctorNotes: "Review in OPD with reports if fever/pain persists.",
    discount: 0,
    finalPaymentMode: "Cash" as const,
  });
  const [dischargeTab, setDischargeTab] = useState<"settlement" | "clinical">("settlement");
  const [dischargeChargeInput, setDischargeChargeInput] = useState({
    name: "",
    category: "Procedure" as "Procedure" | "Investigation" | "Consultation" | "Nursing" | "Medicine" | "Bed" | "Other",
    unitPrice: "",
    quantity: 1,
  });

  // Auto-Save State & Indicator (Like OPD Billing)
  const [ipdAutoSaved, setIpdAutoSaved] = useState<boolean>(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSaved = () => {
    setIpdAutoSaved(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setIpdAutoSaved(false);
    }, 2000);
  };

  // Shared Procedure Suggestions Catalog (merged with custom saved procedures from localStorage)
  const [procedureCatalog, setProcedureCatalog] = useState(COMPLETE_IPD_CHARGES_CATALOG);
  const [showDischargeChargeSuggestions, setShowDischargeChargeSuggestions] = useState(false);
  const [showBillingChargeSuggestions, setShowBillingChargeSuggestions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedProcs = localStorage.getItem("cortex_custom_procedures_v2");
      if (savedProcs) {
        const parsed = JSON.parse(savedProcs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingKeySet = new Set(parsed.map((p: any) => `${(p.name || "").trim().toLowerCase()}___${p.price}`));
          const filteredDefaults = COMPLETE_IPD_CHARGES_CATALOG.filter(
            (p) => !existingKeySet.has(`${p.name.trim().toLowerCase()}___${p.price}`)
          );
          setProcedureCatalog([...parsed, ...filteredDefaults]);
        }
      }
    } catch (_) { }
  }, []);

  const saveProcedureToCatalog = (name: string, price: number, category: any = "Procedure") => {
    const trimmed = name.trim();
    if (!trimmed || price < 0) return;
    setProcedureCatalog((prev) => {
      const existingIdx = prev.findIndex((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase() && p.price === price);
      let updated: any[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], price, category };
      } else {
        updated = [{ name: trimmed, price, category }, ...prev];
      }
      try {
        localStorage.setItem("cortex_custom_procedures_v2", JSON.stringify(updated));
      } catch (_) { }
      return updated;
    });
  };

  // ── WARD & BED MATRIX STATE (EDITABLE) ──────────────────────
  const [wardBedConfig, setWardBedConfig] = useState<WardBedConfigItem[]>(DEFAULT_WARD_BED_CONFIG);
  const [showBedConfigModal, setShowBedConfigModal] = useState(false);
  const [newBedForm, setNewBedForm] = useState({ ward: "General Ward", bedNumber: "" });
  const [editWardRateForm, setEditWardRateForm] = useState<{ [ward: string]: number }>({});
  const [transferModal, setTransferModal] = useState<{
    isOpen: boolean;
    admission: IPDAdmission | null;
    targetWard: string;
    targetBed: string;
  }>({
    isOpen: false,
    admission: null,
    targetWard: "",
    targetBed: "",
  });

  // ── OPD PATIENT SELECTOR STATE (BY DATE) ───────────────────
  const [opdPatients, setOpdPatients] = useState<any[]>([]);
  const [selectedOpdDate, setSelectedOpdDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [opdSearchQuery, setOpdSearchQuery] = useState<string>("");
  const [showOpdModal, setShowOpdModal] = useState<boolean>(false);
  const [importedFromOpd, setImportedFromOpd] = useState<{ token: string; date: string; name: string } | null>(null);

  // ── CHARGE MANAGEMENT & EDITING STATE ──────────────────────
  const [editingChargeKey, setEditingChargeKey] = useState<"bed" | "nursing" | "doctor" | null>(null);
  const [chargeEditForm, setChargeEditForm] = useState({
    dailyRate: 1000,
    billableDays: 1,
    bedOverride: 0,
    nursingRate: 600,
    nursingOverride: 0,
    doctorRate: 800,
    doctorVisits: 1,
    doctorOverride: 0,
  });
  const [editingInvestigation, setEditingInvestigation] = useState<{ id: string; name: string; cost: number } | null>(null);
  const [newInvBilling, setNewInvBilling] = useState({ name: "", cost: 500 });
  const [editingProcedure, setEditingProcedure] = useState<{ id: string; name: string; cost: number; surgeon: string } | null>(null);
  const [newProcBilling, setNewProcBilling] = useState({ name: "", cost: 5000, surgeon: DOCTORS[0].name });
  const [editingCustomCharge, setEditingCustomCharge] = useState<{ id: string; description: string; amount: number; category: string } | null>(null);

  // Load Admissions, Bed Config, and OPD Patients from Storage
  useEffect(() => {
    // 1. IPD Admissions (Clean load, no fake demo data)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove any fake demo entries
          const realAdmissions = parsed.filter(
            (adm: any) =>
              adm.id !== "ipd_demo_1" &&
              !adm.id?.startsWith("demo") &&
              adm.name !== "Ramesh Sharma" &&
              adm.name !== "Smt. Shardabai Patil"
          );
          setAdmissions(realAdmissions);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(realAdmissions));
        } else {
          setAdmissions([]);
        }
      } else {
        setAdmissions([]);
      }
    } catch (e) {
      console.error("Failed to load IPD admissions:", e);
      setAdmissions([]);
    }

    // 2. Bed Configuration
    try {
      const savedBeds = localStorage.getItem(BED_CONFIG_STORAGE_KEY) || localStorage.getItem("cortex_ipd_bed_config_v1");
      if (savedBeds) {
        const parsedBeds = JSON.parse(savedBeds);
        const hasOld = Array.isArray(parsedBeds) && parsedBeds.some((w: any) => w.ward === "General Ward" || w.ward === "ICU");
        if (!hasOld && Array.isArray(parsedBeds) && parsedBeds.length > 0) {
          setWardBedConfig(parsedBeds);
        } else {
          setWardBedConfig(DEFAULT_WARD_BED_CONFIG);
          localStorage.setItem(BED_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_WARD_BED_CONFIG));
        }
      } else {
        setWardBedConfig(DEFAULT_WARD_BED_CONFIG);
      }
    } catch (e) {
      console.error("Failed to load bed config:", e);
      setWardBedConfig(DEFAULT_WARD_BED_CONFIG);
    }

    // 3. OPD Queue / Patients (Clean load, only real queue entries)
    try {
      const savedOpd = localStorage.getItem("cortex_opd_queue_v1") || localStorage.getItem("cortex_opd_queue");
      if (savedOpd) {
        const parsedOpd = JSON.parse(savedOpd);
        if (Array.isArray(parsedOpd)) {
          // Remove any fake demo OPD patients
          const realOpd = parsedOpd.filter(
            (item: any) =>
              !item.id?.startsWith("opd_d") &&
              item.name !== "Rahul Deshmukh" &&
              item.name !== "Anita Kulkarni" &&
              item.name !== "Prakash Joshi"
          );
          setOpdPatients(realOpd);
          localStorage.setItem("cortex_opd_queue_v1", JSON.stringify(realOpd));
        } else {
          setOpdPatients([]);
        }
      } else {
        setOpdPatients([]);
      }
    } catch (e) {
      console.error("Failed to load OPD patients:", e);
      setOpdPatients([]);
    }
  }, []);

  // Real-time synchronization from Convex DB for IPD Admissions + two-way auto-sync
  useEffect(() => {
    if (liveAdmissions && Array.isArray(liveAdmissions)) {
      // 1. Check if there are local admissions in localStorage that are not in Convex yet
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const localAdmissions = JSON.parse(raw);
          if (Array.isArray(localAdmissions) && localAdmissions.length > 0) {
            const dbIds = new Set(liveAdmissions.map((item: any) => item.admission_id || item._id));
            const unsynced = localAdmissions.filter((item: any) => item?.id && !dbIds.has(item.id));
            if (unsynced.length > 0) {
              syncLocalAdmissionsMutation({ admissions: unsynced });
            }
          }
        }
      } catch { }

      // 2. Map Convex items to local admissions state & real-time cross-device sync
      if (liveAdmissions.length > 0) {
        const mapped: IPDAdmission[] = liveAdmissions.map((item: any, idx: number) => {
          const fallbackIpdNo = item.ipdNumber && item.ipdNumber.trim() ? item.ipdNumber.trim() : String(100 + (idx + 1));
          return {
            ...item,
            id: item.admission_id || item._id,
            ipdNumber: fallbackIpdNo,
          };
        });
        setAdmissions(mapped);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch { }

        // Keep currently open active admission up-to-date across multiple devices
        setActiveAdmission((prevActive) => {
          if (!prevActive) return null;
          const fresh = mapped.find((m) => m.id === prevActive.id);
          return fresh || prevActive;
        });
      }
    }
  }, [liveAdmissions, syncLocalAdmissionsMutation]);

  // Real-time synchronization for Bed Config
  useEffect(() => {
    if (liveBedConfig && Array.isArray(liveBedConfig) && liveBedConfig.length > 0) {
      const hasOld = liveBedConfig.some((w: any) => w.ward === "General Ward" || w.ward === "ICU");
      if (hasOld) {
        setWardBedConfig(DEFAULT_WARD_BED_CONFIG);
        saveWardBedConfig(DEFAULT_WARD_BED_CONFIG);
      } else {
        setWardBedConfig(liveBedConfig);
        try {
          localStorage.setItem(BED_CONFIG_STORAGE_KEY, JSON.stringify(liveBedConfig));
        } catch { }
      }
    } else if (liveBedConfig === null) {
      saveWardBedConfig(DEFAULT_WARD_BED_CONFIG);
    }
  }, [liveBedConfig]);

  // Real-time synchronization for OPD Patients modal in IPD
  useEffect(() => {
    if (!Array.isArray(liveOpdQueue) && !Array.isArray(liveAppointments)) return;

    const mappedOpd = (Array.isArray(liveOpdQueue) ? liveOpdQueue : []).map((item: any) => ({
        ...item,
        id: item.queue_id || item._id,
      }));
    const queuedAppointmentIds = new Set(
      mappedOpd
        .map((item: any) => item.appointmentId)
        .filter((id: unknown): id is string => typeof id === "string")
    );
    const patientByPhoneAndName = new Map(
      (Array.isArray(livePatients) ? livePatients : []).map((patient: any) => [
        `${String(patient.phone_number || "").replace(/\D/g, "").slice(-10)}:${String(patient.name || "").trim().toLowerCase()}`,
        patient,
      ])
    );

    for (const appointment of Array.isArray(liveAppointments) ? liveAppointments : []) {
      if (
        !appointment._id ||
        appointment.status === "CANCELLED" ||
        queuedAppointmentIds.has(String(appointment._id)) ||
        !appointment.name ||
        !appointment.phone
      ) {
        continue;
      }

      const registeredAt = appointmentTimestamp(appointment.date, appointment.time);
      const dateKey = normalizeAppointmentDate(appointment.date);
      if (!registeredAt || !dateKey) continue;

      const doctor = appointment.doctor_name || "Dr. Vipeen Raut";
      const isGynae = /shillpa|gyn/i.test(doctor);
      const patient = patientByPhoneAndName.get(
        `${String(appointment.phone).replace(/\D/g, "").slice(-10)}:${String(appointment.name).trim().toLowerCase()}`
      );
      mappedOpd.push({
        id: `appointment_${appointment._id}`,
        appointmentId: String(appointment._id),
        token: "APPT",
        uhid: String(patient?.reference_number || "").replace(/^CH/i, "CRX"),
        patientId: patient?._id,
        name: String(appointment.name),
        age: appointment.age !== undefined && appointment.age !== null ? String(appointment.age) : "—",
        ageUnit: "years",
        sex: patient?.sex || (isGynae ? "Female" : "Male"),
        phone: String(appointment.phone),
        address: appointment.address || patient?.address || "",
        doctor,
        department: isGynae ? "Obstetrics & Gynaecology" : "Orthopaedics & Joint Replacement",
        priority: "Normal",
        visitType: "Appointment",
        status: "Waiting",
        vitals: {},
        registeredAt,
        time: String(appointment.time),
        appointmentDate: dateKey,
      });
    }

    if (mappedOpd.length > 0) {
      setOpdPatients(mappedOpd);
    } else {
      setOpdPatients([]);
    }
  }, [liveOpdQueue, liveAppointments, livePatients]);

  // Save Admissions to Storage and Convex DB
  const saveAdmissions = (newItems: IPDAdmission[], changedItem?: IPDAdmission) => {
    setAdmissions(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error("Failed to save IPD admissions:", e);
    }
    if (changedItem) {
      saveIpdMutation({ admission: changedItem }).catch((err) => {
        console.warn("Could not sync changed admission to Convex:", err);
      });
    } else {
      // Sync all items in background
      for (const item of newItems) {
        saveIpdMutation({ admission: item }).catch(() => { });
      }
    }
  };

  // Save Ward Bed Config to Storage and Convex DB
  const saveWardBedConfig = (newConfig: WardBedConfigItem[]) => {
    setWardBedConfig(newConfig);
    try {
      localStorage.setItem(BED_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.error("Failed to save bed config:", e);
    }
    saveBedConfigMutation({ wards: newConfig }).catch((err) => {
      console.warn("Could not sync bed config to Convex:", err);
    });
  };

  // Helper to update active admission & list simultaneously and sync to Convex
  const updateActiveAdmission = (updatedAdm: IPDAdmission) => {
    setActiveAdmission(updatedAdm);
    const updated = admissions.map((a) => (a.id === updatedAdm.id ? updatedAdm : a));
    saveAdmissions(updated);
    saveIpdMutation({ admission: updatedAdm }).catch((err) => {
      console.warn("Could not sync updated admission to Convex:", err);
    });
  };

  // Occupied Bed Map
  const occupiedBeds = useMemo(() => {
    const map = new Map<string, IPDAdmission>();
    admissions
      .filter((a) => a.status === "Admitted")
      .forEach((a) => {
        map.set(a.bedNumber, a);
      });
    return map;
  }, [admissions]);

  // Phone lookup for existing patient
  const handlePhoneLookup = async (phone: string) => {
    if (phone.trim().length >= 10) {
      try {
        const found = await getPatientByPhoneNumber(phone.trim(), newAdmissionForm.name?.trim());
        if (found) {
          setExistingPatientFound(found);
          setNewAdmissionForm((prev) => ({
            ...prev,
            uhid: (found.reference_number || "CRX0001").replace(/^CH/i, "CRX"),
            name: found.name || prev.name,
            age: found.age ? String(found.age) : prev.age,
            sex: (found.sex as any) || prev.sex,
            address: (found as any).address || prev.address,
            email: (found as any).email || prev.email,
            whatsapp_number: (found as any).whatsapp_number || prev.whatsapp_number,
          }));
        } else {
          setExistingPatientFound(null);
        }
      } catch (err) {
        console.error("Error looking up phone:", err);
      }
    }
  };

  // Calculate length of stay (days)
  const calculateStayDays = (admissionDate: string, dischargeDate?: string) => {
    const start = new Date(admissionDate).getTime();
    const end = dischargeDate ? new Date(dischargeDate).getTime() : new Date().getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  };

  // Convert numbers to Indian Rupees in words
  const numberToWordsINR = (amount: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const num = Math.floor(Math.abs(amount));
    if (num === 0) return 'Rupees Zero Only';

    function inWords(n: number): string {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
    }
    return 'Rupees ' + inWords(num).trim() + ' Only';
  };

  // Open Quick Record Payment modal directly for this patient
  const handleOpenRecordPayment = (adm: IPDAdmission, returnTo: "none" | "discharge" | "billing" = "none") => {
    setActiveAdmission(adm);
    setRecordPaymentAdmission(adm);
    setPaymentModalReturnTo(returnTo);
    setEditingAdvanceId(null);
    setEditingReceiptNumber(null);
    const hasAdvances = (adm.advances || []).length > 0;
    setQuickPaymentForm({
      amount: "",
      mode: "Cash",
      notes: hasAdvances ? "Stay Installment Payment" : "Admission Advance Deposit",
      receivedBy: "Reception Desk",
      date: new Date().toISOString().split("T")[0],
    });
    setActiveModal("recordPayment");
  };

  // Open Edit Payment Receipt modal
  const handleOpenEditPaymentReceipt = (adm: IPDAdmission, adv: any) => {
    setActiveAdmission(adm);
    setRecordPaymentAdmission(adm);
    setEditingAdvanceId(adv.id);
    setEditingReceiptNumber(adv.receiptNumber);
    setQuickPaymentForm({
      amount: String(adv.amount || ""),
      mode: (adv.mode || "Cash") as any,
      notes: adv.notes || "",
      receivedBy: adv.receivedBy || "Reception Desk",
      date: adv.date || new Date().toISOString().split("T")[0],
    });
    setActiveModal("recordPayment");
  };

  // Save quick payment and show small receipt (Supports both Create and Edit)
  const handleSaveQuickPayment = (printReceiptNow: boolean = true) => {
    if (!recordPaymentAdmission) return;
    const amt = Number(quickPaymentForm.amount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid amount to record payment.");
      return;
    }

    let finalPayment: any;

    if (editingAdvanceId) {
      // EDIT EXISTING RECEIPT
      finalPayment = {
        id: editingAdvanceId,
        receiptNumber: editingReceiptNumber || `CRX-REC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
        date: quickPaymentForm.date || new Date().toISOString().split("T")[0],
        amount: amt,
        mode: quickPaymentForm.mode as any,
        notes: quickPaymentForm.notes.trim() || "Inpatient Stay Payment",
        receivedBy: quickPaymentForm.receivedBy.trim() || "Reception Desk",
      };

      const updated = admissions.map((adm) => {
        if (adm.id === recordPaymentAdmission.id) {
          return {
            ...adm,
            advances: (adm.advances || []).map((a) => (a.id === editingAdvanceId ? finalPayment : a)),
          };
        }
        return adm;
      });

      saveAdmissions(updated);
      const targetAdm = updated.find((a) => a.id === recordPaymentAdmission.id);
      setActiveAdmission(targetAdm || null);

      if (printReceiptNow && targetAdm) {
        setPrintReceiptData({
          patient: targetAdm,
          advance: finalPayment,
        });
        setActiveModal("printReceipt");
      } else if (paymentModalReturnTo === "discharge") {
        setActiveAdmission(targetAdm || null);
        setActiveModal("discharge");
        setPaymentModalReturnTo("none");
      } else if (paymentModalReturnTo === "billing") {
        setActiveAdmission(targetAdm || null);
        setActiveModal("billing");
        setPaymentModalReturnTo("none");
      } else {
        setActiveModal("none");
        setRecordPaymentAdmission(null);
      }
      setEditingAdvanceId(null);
      setEditingReceiptNumber(null);
      showSuccess("Receipt updated successfully!");
      return;
    }

    // CREATE NEW PAYMENT
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-5);
    const receiptNum = `CRX-REC-${year}-${seq}`;

    finalPayment = {
      id: `adv_${Date.now()}`,
      receiptNumber: receiptNum,
      date: quickPaymentForm.date || new Date().toISOString().split("T")[0],
      amount: amt,
      mode: quickPaymentForm.mode as any,
      notes: quickPaymentForm.notes.trim() || "Inpatient Stay Payment",
      receivedBy: quickPaymentForm.receivedBy.trim() || "Reception Desk",
    };

    const updated = admissions.map((adm) => {
      if (adm.id === recordPaymentAdmission.id) {
        return {
          ...adm,
          advances: [...(adm.advances || []), finalPayment],
        };
      }
      return adm;
    });

    saveAdmissions(updated);
    const targetAdm = updated.find((a) => a.id === recordPaymentAdmission.id);
    setActiveAdmission(targetAdm || null);

    if (printReceiptNow && targetAdm) {
      setPrintReceiptData({
        patient: targetAdm,
        advance: finalPayment,
      });
      setActiveModal("printReceipt");
    } else if (paymentModalReturnTo === "discharge") {
      setActiveAdmission(targetAdm || null);
      setActiveModal("discharge");
      setPaymentModalReturnTo("none");
    } else if (paymentModalReturnTo === "billing") {
      setActiveAdmission(targetAdm || null);
      setActiveModal("billing");
      setPaymentModalReturnTo("none");
    } else {
      setActiveModal("none");
      setRecordPaymentAdmission(null);
    }
    showSuccess("Payment recorded & receipt generated!");
  };

  // Open Payment Receipt linked directly to the patient
  const handleOpenPatientReceipt = (adm: IPDAdmission, specificAdvance?: any) => {
    setActiveAdmission(adm);
    const targetAdv = specificAdvance || (adm.advances && adm.advances.length > 0 ? adm.advances[adm.advances.length - 1] : {
      id: `adv_${Date.now()}`,
      receiptNumber: `CRX-REC-${new Date().getFullYear()}-${adm.ipdNumber.replace(/^IPD-\d+-/, '')}`,
      date: new Date().toISOString().split("T")[0],
      amount: adm.advances?.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || 0,
      mode: "Cash",
      notes: "Inpatient Payment / Advance Deposit",
      receivedBy: "Reception Desk",
    });

    setPrintReceiptData({
      patient: adm,
      advance: targetAdv,
    });
    setActiveModal("printReceipt");
  };

  // Calculate running bill for an admission with override support
  const calculateRunningBill = (admission: IPDAdmission, dischargeDateOverride?: string) => {
    const effectiveDischargeDate = dischargeDateOverride !== undefined ? dischargeDateOverride : admission.dischargeDate;
    const rawDays = calculateStayDays(admission.admissionDate, effectiveDischargeDate);
    const days = admission.billableDaysOverride ?? rawDays;
    const dailyRate = admission.dailyRate !== undefined ? Number(admission.dailyRate) : 0;
    const bedCharges = admission.bedChargesOverride !== undefined ? admission.bedChargesOverride : (days * dailyRate);

    const nursingRate = admission.nursingRatePerDay !== undefined ? Number(admission.nursingRatePerDay) : 0;
    const nursingCharges = admission.nursingChargesOverride !== undefined ? admission.nursingChargesOverride : (days * nursingRate);

    const rawDocVisits = Math.max(days, (admission.doctorNotes || []).length);
    const doctorVisitsCount = admission.doctorVisitsCountOverride ?? rawDocVisits;
    const doctorRate = admission.doctorRatePerVisit !== undefined ? Number(admission.doctorRatePerVisit) : 0;
    const doctorCharges = admission.doctorChargesOverride !== undefined ? admission.doctorChargesOverride : (doctorVisitsCount * doctorRate);

    const investigationsTotal = (admission.investigations || []).reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
    const proceduresTotal = (admission.procedures || []).reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const customChargesTotal = (admission.customCharges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const grossTotal = bedCharges + nursingCharges + doctorCharges + investigationsTotal + proceduresTotal + customChargesTotal;
    const totalAdvances = (admission.advances || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const balanceDue = grossTotal - totalAdvances;

    return {
      days,
      rawDays,
      bedCharges,
      nursingCharges,
      doctorVisitsCount,
      rawDocVisits,
      doctorCharges,
      investigationsTotal,
      proceduresTotal,
      customChargesTotal,
      grossTotal,
      totalAdvances,
      balanceDue,
    };
  };

  // Helper to prefill discharge summary from IPD stay details (procedures, active meds, vitals)
  const initDischargeFormForAdmission = (adm: IPDAdmission) => {
    const bill = calculateRunningBill(adm);
    const procSummary = adm.procedures && adm.procedures.length > 0
      ? `Procedures / Surgeries: ${adm.procedures.map((p) => `${p.name} (${p.date}${p.surgeon ? ` by ${p.surgeon}` : ""})`).join("; ")}. `
      : "";
    const medSummary = adm.medications && adm.medications.length > 0
      ? adm.medications
        .filter((m) => m.status === "Active" || !m.status)
        .map((m) => `${m.name} - ${m.dosage || "1-0-1"} - ${m.timing || "5 days"}`)
        .join("\n")
      : "";

    setDischargeForm({
      dischargeDate: adm.dischargeDate || new Date().toISOString().split("T")[0],
      dischargeTime: adm.dischargeTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      conditionAtDischarge: adm.dischargeSummary?.conditionAtDischarge || "Cured / Stable",
      finalDiagnosis: adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || "",
      treatmentGiven: adm.dischargeSummary?.treatmentGiven || `${procSummary}Inpatient care for ${bill.days} days in ${adm.ward}.`.trim(),
      dischargeMeds: adm.dischargeSummary?.dischargeMeds || medSummary || "Continue prescribed oral medications for 5 days.",
      followupDate: adm.dischargeSummary?.followupDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      doctorNotes: adm.dischargeSummary?.doctorNotes || "Review in OPD after 7 days. Report immediately if fever or wound pain/discharge develops.",
      discount: adm.finalSettlement?.discount || 0,
      finalPaymentMode: (adm.finalSettlement?.paymentMode as any) || "Cash",
    });
    setDischargeTab("settlement");
    setDischargeChargeInput({ name: "", category: "Procedure", unitPrice: "", quantity: 1 });
  };

  // ── OPD PATIENT SELECTOR HANDLER ───────────────────────────
  const handleSelectOpdPatient = (opdPt: any) => {
    const targetUhid = (opdPt.uhid || "CRX0001").replace(/^CH/i, "CRX");
    setNewAdmissionForm((prev) => ({
      ...prev,
      uhid: targetUhid,
      name: opdPt.name || "",
      age: String(opdPt.age || ""),
      sex: (opdPt.sex === "Female" ? "Female" : opdPt.sex === "Other" ? "Other" : "Male") as any,
      phone: opdPt.phone || "",
      address: opdPt.address || "",
      consultantDoctor: opdPt.doctor || prev.consultantDoctor,
      department: opdPt.department || prev.department,
      provisionalDiagnosis: opdPt.visitType
        ? `${opdPt.visitType} (Transferred from OPD)`
        : "Inpatient Observation & Care",
      reasonForAdmission: opdPt.priority === "Emergency"
        ? "Emergency Inpatient Admission"
        : "Admitted from OPD Consultation",
      medicalHistory: opdPt.vitals?.bp
        ? `OPD Vitals: BP ${opdPt.vitals.bp}, Pulse ${opdPt.vitals.pulse || "—"}, Temp ${opdPt.vitals.temperature || "98.6"}°F, SpO2 ${opdPt.vitals.spo2 || "—"}%`
        : "",
    }));

    if (opdPt.vitals?.bp) {
      setVitalsInput((prev) => ({
        ...prev,
        bp: opdPt.vitals.bp || prev.bp,
        pulse: opdPt.vitals.pulse || prev.pulse,
        temp: opdPt.vitals.temperature || prev.temp,
        spo2: opdPt.vitals.spo2 || prev.spo2,
        weight: opdPt.vitals.weight || prev.weight,
      }));
    }

    setImportedFromOpd({
      token: opdPt.token || "OPD",
      date: opdPt.registeredAt ? opdPt.registeredAt.slice(0, 10) : selectedOpdDate,
      name: opdPt.name,
    });
    setShowOpdModal(false);
    setActiveTab("admit");
    setSuccessToast(`Patient ${opdPt.name} imported from OPD (Token #${opdPt.token}). Select ward & bed to complete admission.`);
  };

  // ── BED CONFIGURATION HANDLERS ─────────────────────────────
  const handleAddBed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBedForm.bedNumber.trim()) {
      alert("Please enter a bed number (e.g. GW-07, ICU-03).");
      return;
    }
    const cleanBed = newBedForm.bedNumber.trim().toUpperCase();
    const existing = wardBedConfig.some((w) => w.beds.includes(cleanBed));
    if (existing) {
      alert(`Bed ${cleanBed} already exists!`);
      return;
    }
    const updated = wardBedConfig.map((w) => {
      if (w.ward === newBedForm.ward) {
        return { ...w, beds: [...w.beds, cleanBed] };
      }
      return w;
    });
    saveWardBedConfig(updated);
    setNewBedForm({ ...newBedForm, bedNumber: "" });
    setSuccessToast(`Bed ${cleanBed} added to ${newBedForm.ward} successfully.`);
  };

  const handleDeleteBed = (wardName: string, bedId: string) => {
    if (occupiedBeds.has(bedId)) {
      alert(`Cannot delete Bed ${bedId} because it is currently occupied by an admitted patient!`);
      return;
    }
    if (!confirm(`Are you sure you want to remove Bed ${bedId}?`)) return;
    const updated = wardBedConfig.map((w) => {
      if (w.ward === wardName) {
        return { ...w, beds: w.beds.filter((b) => b !== bedId) };
      }
      return w;
    });
    saveWardBedConfig(updated);
    setSuccessToast(`Bed ${bedId} removed successfully.`);
  };

  const handleUpdateWardRate = (wardName: string, newRate: number) => {
    if (newRate <= 0) return;
    const updated = wardBedConfig.map((w) => {
      if (w.ward === wardName) {
        return { ...w, dailyRate: newRate };
      }
      return w;
    });
    saveWardBedConfig(updated);
    setSuccessToast(`Daily room rate for ${wardName} updated to ₹${newRate}/day.`);
  };

  const handleResetBedConfig = () => {
    if (!confirm("Reset all beds and room rates to hospital defaults?")) return;
    saveWardBedConfig(DEFAULT_WARD_BED_CONFIG);
    setSuccessToast("Ward & Bed matrix reset to default configuration.");
  };

  // ── BED TRANSFER HANDLER ───────────────────────────────────
  const handleTransferBed = () => {
    if (!transferModal.admission || !transferModal.targetBed) {
      alert("Please select a target vacant bed.");
      return;
    }
    const adm = transferModal.admission;
    const targetWardConfig = wardBedConfig.find((w) => w.ward === transferModal.targetWard);
    const newDailyRate = targetWardConfig?.dailyRate || adm.dailyRate;

    const updated = admissions.map((item) => {
      if (item.id === adm.id) {
        return {
          ...item,
          ward: transferModal.targetWard,
          bedNumber: transferModal.targetBed,
          dailyRate: newDailyRate,
          doctorNotes: [
            ...item.doctorNotes,
            {
              id: `dn_${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              doctor: item.consultantDoctor,
              note: `Patient transferred from Bed ${adm.bedNumber} (${adm.ward}) to Bed ${transferModal.targetBed} (${transferModal.targetWard}).`,
              plan: `Continue treatment plan in ${transferModal.targetWard}. Room rate: ₹${newDailyRate}/day.`,
            },
          ],
        };
      }
      return item;
    });

    saveAdmissions(updated);
    setTransferModal({ isOpen: false, admission: null, targetWard: "", targetBed: "" });
    setSuccessToast(`Patient transferred from ${adm.bedNumber} to ${transferModal.targetBed} (${transferModal.targetWard}) successfully.`);
  };

  // ── CHARGE EDITING & MANAGEMENT HANDLERS ───────────────────
  const handleSaveChargeOverrides = (admId: string) => {
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updatedAdm: IPDAdmission = {
      ...adm,
      dailyRate: chargeEditForm.dailyRate,
      billableDaysOverride: chargeEditForm.billableDays > 0 ? chargeEditForm.billableDays : undefined,
      bedChargesOverride: chargeEditForm.bedOverride > 0 ? chargeEditForm.bedOverride : undefined,
      nursingRatePerDay: chargeEditForm.nursingRate,
      nursingChargesOverride: chargeEditForm.nursingOverride > 0 ? chargeEditForm.nursingOverride : undefined,
      doctorRatePerVisit: chargeEditForm.doctorRate,
      doctorVisitsCountOverride: chargeEditForm.doctorVisits > 0 ? chargeEditForm.doctorVisits : undefined,
      doctorChargesOverride: chargeEditForm.doctorOverride > 0 ? chargeEditForm.doctorOverride : undefined,
    };

    updateActiveAdmission(updatedAdm);
    setEditingChargeKey(null);
    setSuccessToast("Rates and charge overrides updated successfully.");
  };

  const handleUpdateInvestigation = (admId: string) => {
    if (!editingInvestigation) return;
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updated = {
      ...adm,
      investigations: adm.investigations.map((inv) =>
        inv.id === editingInvestigation.id
          ? { ...inv, name: editingInvestigation.name, cost: Number(editingInvestigation.cost) }
          : inv
      ),
    };
    updateActiveAdmission(updated);
    setEditingInvestigation(null);
    setSuccessToast("Investigation charge updated.");
  };

  const handleDeleteInvestigation = (admId: string, invId: string) => {
    if (!confirm("Remove this investigation charge from the bill?")) return;
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updated = {
      ...adm,
      investigations: adm.investigations.filter((inv) => inv.id !== invId),
    };
    updateActiveAdmission(updated);
    setSuccessToast("Investigation charge removed.");
  };

  const handleAddInvestigationCharge = (admId: string) => {
    if (!newInvBilling.name.trim() || newInvBilling.cost <= 0) {
      alert("Please enter investigation name and valid charge amount.");
      return;
    }
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const newInv = {
      id: `inv_${Date.now()}`,
      name: newInvBilling.name.trim(),
      date: new Date().toISOString().split("T")[0],
      status: "Completed" as const,
      cost: Number(newInvBilling.cost),
    };
    const updated = {
      ...adm,
      investigations: [...adm.investigations, newInv],
    };
    updateActiveAdmission(updated);
    setNewInvBilling({ name: "", cost: 500 });
    setSuccessToast(`Added investigation charge: ${newInv.name} (₹${newInv.cost})`);
  };

  const handleUpdateProcedure = (admId: string) => {
    if (!editingProcedure) return;
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updated = {
      ...adm,
      procedures: adm.procedures.map((p) =>
        p.id === editingProcedure.id
          ? { ...p, name: editingProcedure.name, cost: Number(editingProcedure.cost), surgeon: editingProcedure.surgeon }
          : p
      ),
    };
    updateActiveAdmission(updated);
    setEditingProcedure(null);
    setSuccessToast("Procedure charge updated.");
  };

  const handleDeleteProcedure = (admId: string, procId: string) => {
    if (!confirm("Remove this procedure / surgery charge from the bill?")) return;
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updated = {
      ...adm,
      procedures: adm.procedures.filter((p) => p.id !== procId),
    };
    updateActiveAdmission(updated);
    setSuccessToast("Procedure charge removed.");
  };

  const handleAddProcedureCharge = (admId: string) => {
    if (!newProcBilling.name.trim() || newProcBilling.cost <= 0) {
      alert("Please enter procedure name and valid charge amount.");
      return;
    }
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const newProc = {
      id: `proc_${Date.now()}`,
      name: newProcBilling.name.trim(),
      surgeon: newProcBilling.surgeon || adm.consultantDoctor,
      date: new Date().toISOString().split("T")[0],
      cost: Number(newProcBilling.cost),
    };
    const updated = {
      ...adm,
      procedures: [...adm.procedures, newProc],
    };
    updateActiveAdmission(updated);
    setNewProcBilling({ name: "", cost: 5000, surgeon: DOCTORS[0].name });
    setSuccessToast(`Added procedure charge: ${newProc.name} (₹${newProc.cost})`);
  };

  const handleUpdateCustomCharge = (admId: string) => {
    if (!editingCustomCharge) return;
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updated = {
      ...adm,
      customCharges: adm.customCharges.map((cc) =>
        cc.id === editingCustomCharge.id
          ? {
            ...cc,
            description: editingCustomCharge.description,
            amount: Number(editingCustomCharge.amount),
            category: editingCustomCharge.category,
          }
          : cc
      ),
    };
    updateActiveAdmission(updated);
    setEditingCustomCharge(null);
    setSuccessToast("Service charge updated.");
  };

  const handleDeleteCustomCharge = (admId: string, ccId: string) => {
    if (!confirm("Delete this charge item?")) return;
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updated = {
      ...adm,
      customCharges: adm.customCharges.filter((cc) => cc.id !== ccId),
    };
    updateActiveAdmission(updated);
    setSuccessToast("Charge item deleted.");
  };

  const handleDeleteAdvance = (admId: string, advId: string) => {
    if (!confirm("Remove this advance payment entry from the ledger?")) return;
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const updated = {
      ...adm,
      advances: adm.advances.filter((adv) => adv.id !== advId),
    };
    updateActiveAdmission(updated);
    setSuccessToast("Advance deposit record removed.");
  };

  // Submit New IPD Admission
  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newAdmissionForm.phone.replace(/\D/g, "");
    if (!newAdmissionForm.name.trim()) {
      alert("Please provide patient name.");
      return;
    }
    if (!cleanPhone) {
      alert("Please provide patient contact number.");
      return;
    }
    if (cleanPhone.length !== 10) {
      alert(`Mobile number must be exactly 10 digits. You have entered ${cleanPhone.length} digits.`);
      return;
    }

    const effectiveWard = newAdmissionForm.isCustomWard && newAdmissionForm.customWardName.trim()
      ? newAdmissionForm.customWardName.trim()
      : newAdmissionForm.ward;
    const effectiveBed = newAdmissionForm.isCustomBed && newAdmissionForm.customBedNumber.trim()
      ? newAdmissionForm.customBedNumber.trim()
      : newAdmissionForm.bedNumber;

    if (!effectiveBed.trim()) {
      alert("Please select or enter a bed number.");
      return;
    }

    if (occupiedBeds.has(effectiveBed)) {
      if (!confirm(`Bed ${effectiveBed} is currently recorded as occupied. Do you still want to proceed with assigning this bed?`)) {
        return;
      }
    }

    setSubmittingAdmission(true);
    try {
      // 1. Sync or create patient in Convex
      let uhid = newAdmissionForm.uhid.trim() || "CRX0001";
      let patientId: string | undefined;

      try {
        const res = await createPatient({
          name: newAdmissionForm.name.trim(),
          age: Number(newAdmissionForm.age) || 0,
          sex: newAdmissionForm.sex,
          phone_number: newAdmissionForm.phone.trim(),
          address: newAdmissionForm.address.trim() || undefined,
          email: newAdmissionForm.email.trim() || undefined,
          whatsapp_number: newAdmissionForm.whatsapp_number.trim() || undefined,
        } as any);

        patientId = res ? String(res) : undefined;
        if (existingPatientFound?.reference_number) {
          uhid = existingPatientFound.reference_number.replace(/^CH/i, "CRX");
        } else if (patientId) {
          const pt = await getPatientById(patientId);
          if (pt?.reference_number) uhid = pt.reference_number.replace(/^CH/i, "CRX");
        }
      } catch (e) {
        console.warn("Could not sync patient with Convex directly:", e);
      }

      // Next IPD Number (Sequential e.g. 119)
      const year = new Date().getFullYear();
      const autoSeq = String(100 + admissions.length + 1);
      const ipdNumber = newAdmissionForm.ipdNumber?.trim() || autoSeq;

      const dailyRate = Number(newAdmissionForm.dailyRate) || 0;
      const nursingRate = Number(newAdmissionForm.nursingRate) || 0;
      const doctorVisitFee = Number(newAdmissionForm.doctorVisitFee) || 0;

      // Initial Advance Receipt if paid
      const initialAdvances: any[] = [];
      if (Number(newAdmissionForm.initialAdvance) > 0) {
        initialAdvances.push({
          id: `adv_${Date.now()}`,
          receiptNumber: `CRX-ADV-${year}-${autoSeq}`,
          date: newAdmissionForm.admissionDate,
          amount: Number(newAdmissionForm.initialAdvance),
          mode: newAdmissionForm.advancePaymentMode,
          notes: "Initial IPD Admission Advance",
          receivedBy: "Reception Desk",
        });
      }

      const newAdmission: IPDAdmission = {
        id: `ipd_${Date.now()}`,
        ipdNumber,
        uhid,
        patientId,
        name: newAdmissionForm.name.trim(),
        age: newAdmissionForm.age.trim(),
        sex: newAdmissionForm.sex,
        phone: newAdmissionForm.phone.trim(),
        address: newAdmissionForm.address.trim(),
        email: newAdmissionForm.email.trim() || undefined,
        whatsapp_number: newAdmissionForm.whatsapp_number.trim() || undefined,
        medicalHistory: newAdmissionForm.medicalHistory.trim(),
        allergies: newAdmissionForm.allergies.trim(),
        provisionalDiagnosis: newAdmissionForm.provisionalDiagnosis.trim() || "Under Observation",
        reasonForAdmission: newAdmissionForm.reasonForAdmission.trim() || "Inpatient Care",
        admissionDate: newAdmissionForm.admissionDate,
        admissionTime: newAdmissionForm.admissionTime,
        department: newAdmissionForm.department,
        consultantDoctor: newAdmissionForm.consultantDoctor,
        referredBy: newAdmissionForm.referredBy.trim(),
        paymentCategory: newAdmissionForm.paymentCategory,
        ward: effectiveWard,
        bedNumber: effectiveBed,
        dailyRate,
        nursingRatePerDay: nursingRate,
        doctorRatePerVisit: doctorVisitFee,
        status: "Admitted",
        vitals: [
          {
            id: `v_${Date.now()}`,
            date: newAdmissionForm.admissionDate,
            time: newAdmissionForm.admissionTime,
            bp: "120/80",
            pulse: "74",
            temp: "98.6",
            spo2: "99",
            recordedBy: "Admitting Nurse",
          },
        ],
        doctorNotes: [
          {
            id: `dn_${Date.now()}`,
            date: newAdmissionForm.admissionDate,
            time: newAdmissionForm.admissionTime,
            doctor: newAdmissionForm.consultantDoctor,
            note: `Admitted under ${newAdmissionForm.consultantDoctor}. Diagnosis: ${newAdmissionForm.provisionalDiagnosis || "Clinical evaluation"}.`,
            plan: "Baseline vitals, start conservative/pre-op workup.",
          },
        ],
        medications: [],
        investigations: [],
        procedures: [],
        nursingNotes: [
          {
            id: `nn_${Date.now()}`,
            date: newAdmissionForm.admissionDate,
            shift: "Morning",
            note: `Patient admitted to Bed ${effectiveBed} in stable condition.`,
            nurse: "Duty Staff",
          },
        ],
        customCharges: [],
        advances: initialAdvances,
      };

      const updated = [newAdmission, ...admissions];
      saveAdmissions(updated, newAdmission);

      setSuccessToast(`Patient ${newAdmission.name} admitted successfully to Bed ${newAdmission.bedNumber} (IPD No: ${newAdmission.ipdNumber})!`);
      setActiveTab("dashboard");

      // Reset form
      const nextConf = wardBedConfig[0];
      const nextVacantBed = nextConf?.beds.find((b) => !occupiedBeds.has(b)) || "GW-01";
      setNewAdmissionForm({
        uhid: "",
        ipdNumber: "",
        name: "",
        age: "",
        sex: "Male",
        phone: "",
        address: "",
        email: "",
        whatsapp_number: "",
        medicalHistory: "",
        allergies: "",
        provisionalDiagnosis: "",
        reasonForAdmission: "",
        admissionDate: new Date().toISOString().split("T")[0],
        admissionTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        department: DEPARTMENTS[0],
        consultantDoctor: DOCTORS[0].name,
        referredBy: "",
        paymentCategory: "Cash",
        ward: "General Ward",
        isCustomWard: false,
        customWardName: "",
        bedNumber: nextVacantBed,
        isCustomBed: false,
        customBedNumber: "",
        dailyRate: 0,
        nursingRate: 0,
        doctorVisitFee: 0,
        initialAdvance: 0,
        advancePaymentMode: "Cash",
      });
      setExistingPatientFound(null);
    } catch (err: any) {
      console.error("Admission error:", err);
      alert("Failed to admit patient: " + (err.message || "Unknown error"));
    } finally {
      setSubmittingAdmission(false);
    }
  };

  // Open Edit Admission Modal with complete patient, clinical and discharge details
  const handleOpenEditAdmission = (adm: IPDAdmission) => {
    setActiveAdmission(adm);
    setEditAdmissionForm({
      id: adm.id,
      name: adm.name,
      age: adm.age,
      sex: adm.sex,
      phone: adm.phone,
      address: adm.address || "",
      uhid: adm.uhid,
      ipdNumber: adm.ipdNumber,
      department: adm.department,
      consultantDoctor: adm.consultantDoctor,
      ward: adm.ward,
      isCustomWard: false,
      bedNumber: adm.bedNumber,
      isCustomBed: false,
      dailyRate: adm.dailyRate,
      nursingRatePerDay: adm.nursingRatePerDay,
      doctorRatePerVisit: adm.doctorRatePerVisit,
      provisionalDiagnosis: adm.provisionalDiagnosis,
      admissionDate: adm.admissionDate,
      admissionTime: adm.admissionTime,
      paymentCategory: adm.paymentCategory,
      status: adm.status,
      dischargeDate: adm.dischargeDate || new Date().toISOString().split("T")[0],
      dischargeTime: adm.dischargeTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      conditionAtDischarge: adm.dischargeSummary?.conditionAtDischarge || "Cured / Stable",
      finalDiagnosis: adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || "",
      treatmentGiven: adm.dischargeSummary?.treatmentGiven || "",
      dischargeMeds: adm.dischargeSummary?.dischargeMeds || "",
      followupDate: adm.dischargeSummary?.followupDate || "",
      doctorNotes: adm.dischargeSummary?.doctorNotes || "",
    });
    setActiveModal("editAdmission");
  };

  // Save Edited Inpatient Details & Rates (Editable by Admin)
  const handleSaveEditAdmission = () => {
    if (!editAdmissionForm.name.trim() || !editAdmissionForm.phone.trim()) {
      alert("Patient name and contact number are required.");
      return;
    }

    const effectiveWard = editAdmissionForm.isCustomWard && editAdmissionForm.ward.trim()
      ? editAdmissionForm.ward.trim()
      : editAdmissionForm.ward;
    const effectiveBed = editAdmissionForm.isCustomBed && editAdmissionForm.bedNumber.trim()
      ? editAdmissionForm.bedNumber.trim()
      : editAdmissionForm.bedNumber;

    if (!effectiveBed.trim()) {
      alert("Please specify a bed number.");
      return;
    }

    const updated = admissions.map((adm) => {
      if (adm.id === editAdmissionForm.id) {
        const isDischarged = editAdmissionForm.status === "Discharged";
        return {
          ...adm,
          name: editAdmissionForm.name.trim(),
          age: editAdmissionForm.age.trim(),
          sex: editAdmissionForm.sex,
          phone: editAdmissionForm.phone.trim(),
          address: editAdmissionForm.address.trim(),
          uhid: editAdmissionForm.uhid.trim() || adm.uhid,
          ipdNumber: editAdmissionForm.ipdNumber.trim() || adm.ipdNumber,
          department: editAdmissionForm.department,
          consultantDoctor: editAdmissionForm.consultantDoctor,
          ward: effectiveWard,
          bedNumber: effectiveBed,
          dailyRate: Number(editAdmissionForm.dailyRate) || adm.dailyRate,
          nursingRatePerDay: Number(editAdmissionForm.nursingRatePerDay) || adm.nursingRatePerDay,
          doctorRatePerVisit: Number(editAdmissionForm.doctorRatePerVisit) || adm.doctorRatePerVisit,
          provisionalDiagnosis: editAdmissionForm.provisionalDiagnosis.trim() || adm.provisionalDiagnosis,
          admissionDate: editAdmissionForm.admissionDate,
          admissionTime: editAdmissionForm.admissionTime,
          paymentCategory: editAdmissionForm.paymentCategory as any,
          status: editAdmissionForm.status,
          dischargeDate: isDischarged ? (editAdmissionForm.dischargeDate || adm.dischargeDate) : adm.dischargeDate,
          dischargeTime: isDischarged ? (editAdmissionForm.dischargeTime || adm.dischargeTime) : adm.dischargeTime,
          dischargeSummary: isDischarged ? {
            conditionAtDischarge: editAdmissionForm.conditionAtDischarge || adm.dischargeSummary?.conditionAtDischarge || "Cured / Stable",
            finalDiagnosis: editAdmissionForm.finalDiagnosis || adm.dischargeSummary?.finalDiagnosis || editAdmissionForm.provisionalDiagnosis,
            treatmentGiven: editAdmissionForm.treatmentGiven || adm.dischargeSummary?.treatmentGiven || "",
            dischargeMeds: editAdmissionForm.dischargeMeds || adm.dischargeSummary?.dischargeMeds || "",
            followupDate: editAdmissionForm.followupDate || adm.dischargeSummary?.followupDate || "",
            doctorNotes: editAdmissionForm.doctorNotes || adm.dischargeSummary?.doctorNotes || "",
          } : adm.dischargeSummary,
        };
      }
      return adm;
    });

    const changed = updated.find((a) => a.id === editAdmissionForm.id);
    saveAdmissions(updated, changed);
    if (activeAdmission?.id === editAdmissionForm.id) {
      if (changed) setActiveAdmission(changed);
    }
    setActiveModal("none");
    setSuccessToast(`Inpatient details, bed, rates & discharge info updated for ${editAdmissionForm.name}!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Add Vitals Record
  const handleAddVitals = (admissionId: string) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        const newVitals = [
          ...adm.vitals,
          {
            id: `v_${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            bp: vitalsInput.bp,
            pulse: vitalsInput.pulse,
            temp: vitalsInput.temp,
            spo2: vitalsInput.spo2,
            weight: vitalsInput.weight,
            recordedBy: vitalsInput.recordedBy,
          },
        ];
        return { ...adm, vitals: newVitals };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
  };

  // Add Doctor Progress Note
  const handleAddDoctorNote = (admissionId: string) => {
    if (!doctorNoteInput.note.trim()) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        const newNotes = [
          ...adm.doctorNotes,
          {
            id: `dn_${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            doctor: doctorNoteInput.doctor,
            note: doctorNoteInput.note.trim(),
            plan: doctorNoteInput.plan.trim(),
          },
        ];
        return { ...adm, doctorNotes: newNotes };
      }
      return adm;
    });
    saveAdmissions(updated);
    setDoctorNoteInput((p) => ({ ...p, note: "", plan: "" }));
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
  };

  // Add Medication Order
  const handleAddMedication = (admissionId: string) => {
    if (!medInput.name.trim()) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        const newMeds = [
          ...adm.medications,
          {
            id: `m_${Date.now()}`,
            name: medInput.name.trim(),
            dosage: medInput.dosage.trim() || "As directed",
            route: medInput.route,
            frequency: medInput.frequency,
            timing: medInput.timing,
            status: "Active" as const,
          },
        ];
        return { ...adm, medications: newMeds };
      }
      return adm;
    });
    saveAdmissions(updated);
    setMedInput({ name: "", dosage: "", route: "Oral", frequency: "BD", timing: "Morning & Night" });
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
  };

  // Add Investigation Order
  const handleAddInvestigation = (admissionId: string) => {
    if (!investigationInput.name.trim()) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        const newInvs = [
          ...adm.investigations,
          {
            id: `inv_${Date.now()}`,
            name: investigationInput.name.trim(),
            date: new Date().toISOString().split("T")[0],
            status: "Ordered" as const,
            cost: Number(investigationInput.cost) || 0,
          },
        ];
        return { ...adm, investigations: newInvs };
      }
      return adm;
    });
    saveAdmissions(updated);
    setInvestigationInput({ name: "", cost: 500 });
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
  };

  // Add Procedure
  const handleAddProcedure = (admissionId: string) => {
    if (!procedureInput.name.trim()) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        const newProcs = [
          ...adm.procedures,
          {
            id: `proc_${Date.now()}`,
            name: procedureInput.name.trim(),
            date: new Date().toISOString().split("T")[0],
            surgeon: procedureInput.surgeon,
            notes: procedureInput.notes.trim(),
            cost: Number(procedureInput.cost) || 0,
          },
        ];
        return { ...adm, procedures: newProcs };
      }
      return adm;
    });
    saveAdmissions(updated);
    setProcedureInput({ name: "", surgeon: DOCTORS[0].name, cost: 5000, notes: "" });
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
  };

  // Add Nursing Note
  const handleAddNursingNote = (admissionId: string) => {
    if (!nursingNoteInput.note.trim()) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        const newNN = [
          ...adm.nursingNotes,
          {
            id: `nn_${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            shift: nursingNoteInput.shift,
            note: nursingNoteInput.note.trim(),
            nurse: nursingNoteInput.nurse,
          },
        ];
        return { ...adm, nursingNotes: newNN };
      }
      return adm;
    });
    saveAdmissions(updated);
    setNursingNoteInput((p) => ({ ...p, note: "" }));
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
  };

  // ── CLINICAL SHEET EDIT & DELETE HANDLERS ─────────────────────
  const handleUpdateVitals = (admissionId: string, vitalsId: string, data: any) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          vitals: adm.vitals.map((v) => (v.id === vitalsId ? { ...v, ...data } : v)),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    setEditingClinicalItem(null);
    showSuccess("Vitals entry updated!");
  };

  const handleDeleteVitals = (admissionId: string, vitalsId: string) => {
    if (!confirm("Are you sure you want to remove this vitals entry?")) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          vitals: adm.vitals.filter((v) => v.id !== vitalsId),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    showSuccess("Vitals entry deleted");
  };

  const handleUpdateDoctorNote = (admissionId: string, noteId: string, data: any) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          doctorNotes: adm.doctorNotes.map((dn) => (dn.id === noteId ? { ...dn, ...data } : dn)),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    setEditingClinicalItem(null);
    showSuccess("Doctor round note updated!");
  };

  const handleDeleteDoctorNote = (admissionId: string, noteId: string) => {
    if (!confirm("Are you sure you want to remove this doctor note?")) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          doctorNotes: adm.doctorNotes.filter((dn) => dn.id !== noteId),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    showSuccess("Doctor note deleted");
  };

  const handleUpdateMedication = (admissionId: string, medId: string, data: any) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          medications: adm.medications.map((m) => (m.id === medId ? { ...m, ...data } : m)),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    setEditingClinicalItem(null);
    showSuccess("Medication updated!");
  };

  const handleDeleteMedication = (admissionId: string, medId: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          medications: adm.medications.filter((m) => m.id !== medId),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    showSuccess("Medication removed");
  };

  const handleUpdateClinicalInvestigation = (admissionId: string, invId: string, data: any) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          investigations: adm.investigations.map((inv) => (inv.id === invId ? { ...inv, ...data } : inv)),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    setEditingClinicalItem(null);
    showSuccess("Investigation updated!");
  };

  const handleDeleteClinicalInvestigation = (admissionId: string, invId: string) => {
    if (!confirm("Are you sure you want to delete this investigation?")) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          investigations: adm.investigations.filter((inv) => inv.id !== invId),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    showSuccess("Investigation deleted");
  };

  const handleUpdateClinicalProcedure = (admissionId: string, procId: string, data: any) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          procedures: adm.procedures.map((p) => (p.id === procId ? { ...p, ...data } : p)),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    setEditingClinicalItem(null);
    showSuccess("Procedure record updated!");
  };

  const handleDeleteClinicalProcedure = (admissionId: string, procId: string) => {
    if (!confirm("Are you sure you want to remove this procedure?")) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          procedures: adm.procedures.filter((p) => p.id !== procId),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    showSuccess("Procedure removed");
  };

  const handleUpdateNursingNote = (admissionId: string, noteId: string, data: any) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          nursingNotes: adm.nursingNotes.map((nn) => (nn.id === noteId ? { ...nn, ...data } : nn)),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    setEditingClinicalItem(null);
    showSuccess("Nursing note updated!");
  };

  const handleDeleteNursingNote = (admissionId: string, noteId: string) => {
    if (!confirm("Are you sure you want to remove this nursing note?")) return;
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          nursingNotes: adm.nursingNotes.filter((nn) => nn.id !== noteId),
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
    showSuccess("Nursing note deleted");
  };

  const handleUpdateAdmissionInfo = (admissionId: string) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          provisionalDiagnosis: editAdmissionInfoForm.provisionalDiagnosis.trim() || adm.provisionalDiagnosis,
          reasonForAdmission: editAdmissionInfoForm.reasonForAdmission.trim() || adm.reasonForAdmission,
          consultantDoctor: editAdmissionInfoForm.consultantDoctor || adm.consultantDoctor,
          ward: editAdmissionInfoForm.ward || adm.ward,
          bedNumber: editAdmissionInfoForm.bedNumber || adm.bedNumber,
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    const targetAdm = updated.find((a) => a.id === admissionId) || null;
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(targetAdm);
    }
    setIsEditingAdmissionInfo(false);
    showSuccess("Admission diagnosis & details updated!");
  };

  // Record Advance Deposit
  const handleRecordAdvance = (admissionId: string) => {
    if (Number(advanceInput.amount) <= 0) return;
    const receiptNum = `CRX-ADV-${Date.now().toString().slice(-6)}`;
    const newAdv = {
      id: `adv_${Date.now()}`,
      receiptNumber: receiptNum,
      date: new Date().toISOString().split("T")[0],
      amount: Number(advanceInput.amount),
      mode: advanceInput.mode,
      notes: advanceInput.notes.trim(),
      receivedBy: "Billing Staff",
    };

    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          advances: [...adm.advances, newAdv],
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    const target = updated.find((a) => a.id === admissionId);
    if (target) {
      setActiveAdmission(target);
      setPrintReceiptData({
        patient: target,
        advance: newAdv,
      });
      setActiveModal("printReceipt");
    }
    setAdvanceInput({ amount: 5000, mode: "Cash", notes: "Interim Stay Advance" });
  };

  // Add Custom Charge
  const handleAddCustomCharge = (admissionId: string) => {
    if (!chargeInput.description.trim() || Number(chargeInput.amount) < 0) return;
    const newCharge = {
      id: `cc_${Date.now()}`,
      description: chargeInput.description.trim(),
      date: new Date().toISOString().split("T")[0],
      amount: Number(chargeInput.amount),
      category: chargeInput.category,
    };

    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          customCharges: [...adm.customCharges, newCharge],
        };
      }
      return adm;
    });
    saveAdmissions(updated);
    setChargeInput({ description: "", amount: 1000, category: "Procedure / Nursing" });
    if (activeAdmission?.id === admissionId) {
      setActiveAdmission(updated.find((a) => a.id === admissionId) || null);
    }
  };

  // Add Charge inside Discharge & Settle Modal (Like OPD Billing)
  const handleAddChargeInDischarge = (admissionId: string) => {
    const name = dischargeChargeInput.name.trim();
    const price = Number(dischargeChargeInput.unitPrice) || 0;
    const qty = Number(dischargeChargeInput.quantity) || 1;
    if (!name || isNaN(price) || price < 0) return;

    const total = price * qty;
    const newCharge = {
      id: `cc_${Date.now()}`,
      description: qty > 1 ? `${name} (${qty} x ₹${price})` : name,
      date: new Date().toISOString().split("T")[0],
      amount: total,
      category: dischargeChargeInput.category,
    };

    saveProcedureToCatalog(name, price, dischargeChargeInput.category);

    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          customCharges: [...(adm.customCharges || []), newCharge],
        };
      }
      return adm;
    });

    const updatedAdm = updated.find((a) => a.id === admissionId);
    saveAdmissions(updated, updatedAdm);
    if (updatedAdm) setActiveAdmission(updatedAdm);
    setDischargeChargeInput({ name: "", category: "Procedure", unitPrice: "", quantity: 1 });
    triggerAutoSaved();
    setSuccessToast(`Added "${name}" (₹${total}) to patient charges.`);
  };

  // Quick 1-click apply suggestion preset (Like OPD Billing)
  const handleQuickAddPreset = (admissionId: string, preset: { name: string; category: any; price: number }) => {
    const newCharge = {
      id: `cc_${Date.now()}`,
      description: preset.name,
      date: new Date().toISOString().split("T")[0],
      amount: preset.price,
      category: preset.category,
    };

    saveProcedureToCatalog(preset.name, preset.price, preset.category);

    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          customCharges: [...(adm.customCharges || []), newCharge],
        };
      }
      return adm;
    });

    const updatedAdm = updated.find((a) => a.id === admissionId);
    saveAdmissions(updated, updatedAdm);
    if (updatedAdm) setActiveAdmission(updatedAdm);
    triggerAutoSaved();
    setSuccessToast(`Added "${preset.name}" (₹${preset.price}) to bill.`);
  };

  // Inline update custom charge inside table (Like OPD Billing)
  const handleUpdateCustomChargeInDischarge = (admissionId: string, chargeId: string, newDescription: string, newAmount: number) => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          customCharges: (adm.customCharges || []).map((c) =>
            c.id === chargeId ? { ...c, description: newDescription, amount: Math.max(0, newAmount) } : c
          ),
        };
      }
      return adm;
    });
    const updatedAdm = updated.find((a) => a.id === admissionId);
    saveAdmissions(updated, updatedAdm);
    if (updatedAdm) setActiveAdmission(updatedAdm);
    triggerAutoSaved();
  };

  // Auto-save discount & settlement update (Like OPD Billing)
  const handleDischargeDiscountChange = (admissionId: string, newDiscount: number) => {
    setDischargeForm((prev) => ({ ...prev, discount: newDiscount }));
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        return {
          ...adm,
          finalSettlement: adm.finalSettlement
            ? { ...adm.finalSettlement, discount: newDiscount }
            : {
              billNumber: "",
              date: new Date().toISOString().split("T")[0],
              grossTotal: 0,
              discount: newDiscount,
              netTotal: 0,
              advanceAdjusted: 0,
              balancePaid: 0,
              paymentMode: dischargeForm.finalPaymentMode || "Cash",
              status: "PARTIAL" as const,
            },
        };
      }
      return adm;
    });
    const updatedAdm = updated.find((a) => a.id === admissionId);
    saveAdmissions(updated, updatedAdm);
    if (updatedAdm) setActiveAdmission(updatedAdm);
    triggerAutoSaved();
  };

  // Remove Charge inside Discharge & Settle Modal
  const handleDeleteChargeInDischarge = (admissionId: string, chargeId: string, type: "custom" | "inv" | "proc") => {
    const updated = admissions.map((adm) => {
      if (adm.id === admissionId) {
        if (type === "custom") {
          return {
            ...adm,
            customCharges: (adm.customCharges || []).filter((c) => c.id !== chargeId),
          };
        } else if (type === "inv") {
          return {
            ...adm,
            investigations: (adm.investigations || []).filter((i) => i.id !== chargeId),
          };
        } else if (type === "proc") {
          return {
            ...adm,
            procedures: (adm.procedures || []).filter((p) => p.id !== chargeId),
          };
        }
      }
      return adm;
    });

    const updatedAdm = updated.find((a) => a.id === admissionId);
    saveAdmissions(updated, updatedAdm);
    if (updatedAdm) setActiveAdmission(updatedAdm);
    triggerAutoSaved();
    setSuccessToast("Charge removed from patient bill.");
  };

  // Finalize Discharge & Settlement
  const handleFinalizeDischarge = (admissionId: string) => {
    const adm = admissions.find((a) => a.id === admissionId);
    if (!adm) return;

    const billing = calculateRunningBill(adm, dischargeForm.dischargeDate);
    const discount = Number(dischargeForm.discount) || 0;
    const netTotal = Math.max(0, billing.grossTotal - discount);
    const finalBalance = netTotal - billing.totalAdvances;

    const finalBillNumber = adm.finalSettlement?.billNumber || `CRX-IPD-${Date.now().toString().slice(-5)}`;

    const updated = admissions.map((item) => {
      if (item.id === admissionId) {
        return {
          ...item,
          status: "Discharged" as const,
          dischargeDate: dischargeForm.dischargeDate,
          dischargeTime: dischargeForm.dischargeTime,
          dischargeSummary: {
            conditionAtDischarge: dischargeForm.conditionAtDischarge,
            finalDiagnosis: dischargeForm.finalDiagnosis.trim() || item.provisionalDiagnosis,
            treatmentGiven: dischargeForm.treatmentGiven.trim() || `Inpatient care for ${billing.days} days in ${item.ward}.`,
            dischargeMeds: dischargeForm.dischargeMeds.trim() || "Continue prescribed oral medications for 5 days.",
            followupDate: dischargeForm.followupDate,
            doctorNotes: dischargeForm.doctorNotes.trim(),
          },
          finalSettlement: {
            billNumber: finalBillNumber,
            date: dischargeForm.dischargeDate,
            grossTotal: billing.grossTotal,
            discount,
            netTotal,
            advanceAdjusted: billing.totalAdvances,
            balancePaid: finalBalance,
            paymentMode: dischargeForm.finalPaymentMode,
            status: (finalBalance <= 0 ? "PAID" : "PARTIAL") as "PAID" | "PARTIAL",
          },
        };
      }
      return item;
    });

    const dischargedAdm = updated.find((a) => a.id === admissionId);
    saveAdmissions(updated, dischargedAdm);
    setActiveAdmission(dischargedAdm || null);
    setActiveModal("printDischarge");
    if (adm.status === "Discharged") {
      setSuccessToast(`Discharge details and settlement updated for ${adm.name}! All changes saved to DB.`);
    } else {
      setSuccessToast(`Patient ${adm.name} discharged successfully! Bed ${adm.bedNumber} is now released and vacant.`);
    }
  };

  // Generate & Save Final Hospital Bill for IPD
  const handleGenerateFinalBill = async (admission: IPDAdmission) => {
    try {
      const billing = calculateRunningBill(admission);
      const discount = Number(dischargeForm.discount) || (admission.finalSettlement?.discount || 0);
      const netTotal = Math.max(0, billing.grossTotal - discount);
      const finalBalance = Math.max(0, netTotal - billing.totalAdvances);

      const dischDateStr = `${dischargeForm.dischargeDate || admission.dischargeDate || new Date().toISOString().split("T")[0]} ${dischargeForm.dischargeTime || admission.dischargeTime || ""}`.trim();
      const admitDateStr = `${admission.admissionDate} ${admission.admissionTime || ""}`.trim();
      const wardStr = `${admission.ward} ${admission.bedNumber}`.trim();

      const billItems: any[] = [];
      let itemIdx = 1;

      if (billing.bedCharges > 0) {
        billItems.push({
          id: itemIdx++,
          description: `Bed Charges ( ${admission.ward} ${admission.bedNumber} )`,
          quantity: billing.days,
          unit_price: Math.round(billing.bedCharges / Math.max(1, billing.days)),
          total: billing.bedCharges,
          item_type: "procedure",
        });
      }

      if (billing.nursingCharges > 0) {
        billItems.push({
          id: itemIdx++,
          description: `Nursing Charges ( ${admission.ward} ${admission.bedNumber} )`,
          quantity: billing.days,
          unit_price: Math.round(billing.nursingCharges / Math.max(1, billing.days)),
          total: billing.nursingCharges,
          item_type: "procedure",
        });
      }

      if (billing.doctorCharges > 0) {
        billItems.push({
          id: itemIdx++,
          description: `Consultant Charges ( ${admission.consultantDoctor} )`,
          quantity: billing.doctorVisitsCount,
          unit_price: Math.round(billing.doctorCharges / Math.max(1, billing.doctorVisitsCount)),
          total: billing.doctorCharges,
          item_type: "consultation",
        });
      }

      (admission.investigations || []).forEach((inv) => {
        if (Number(inv.cost) > 0) {
          billItems.push({
            id: itemIdx++,
            description: inv.name.toUpperCase(),
            quantity: 1,
            unit_price: Number(inv.cost),
            total: Number(inv.cost),
            item_type: "procedure",
          });
        }
      });

      (admission.procedures || []).forEach((proc) => {
        if (Number(proc.cost) > 0) {
          billItems.push({
            id: itemIdx++,
            description: proc.name.toUpperCase(),
            quantity: 1,
            unit_price: Number(proc.cost),
            total: Number(proc.cost),
            item_type: "procedure",
          });
        }
      });

      (admission.customCharges || []).forEach((cc) => {
        if (Number(cc.amount) > 0) {
          billItems.push({
            id: itemIdx++,
            description: cc.description.toUpperCase(),
            quantity: 1,
            unit_price: Number(cc.amount),
            total: Number(cc.amount),
            item_type: "procedure",
          });
        }
      });

      // Save to Hospital Bills database via createBill
      const billPayload: any = {
        prescription_id: "IPD_DIRECT",
        patient_id: admission.patientId || "WALKIN",
        reference_number: admission.uhid,
        total_amount: netTotal,
        paid_amount: Math.min(netTotal, billing.totalAdvances),
        balance_amount: finalBalance,
        payment_status: finalBalance <= 0 ? "PAID" : "PARTIAL",
        discount_amount: discount,
        notes: `IPD Final Bill • ${admission.ipdNumber} • Bed: ${admission.bedNumber} (${admission.ward}) • Doctor: ${admission.consultantDoctor}`,
        items: billItems,
      };

      const savedBill = admission.finalSettlement?.billId
        ? await updateBill(String(admission.finalSettlement.billId), billPayload)
        : await createBill(billPayload);
      const activeBillId = savedBill?.id || (savedBill as any)?._id;

      // Update admission with final settlement and billId
      const updated = admissions.map((item) => {
        if (item.id === admission.id) {
          return {
            ...item,
            finalSettlement: {
              billNumber: savedBill?.bill_number || `CRX-IPD-${Date.now().toString().slice(-5)}`,
              billId: String(activeBillId || ""),
              date: new Date().toISOString().split("T")[0],
              grossTotal: billing.grossTotal,
              discount,
              netTotal,
              advanceAdjusted: billing.totalAdvances,
              balancePaid: finalBalance,
              paymentMode: dischargeForm.finalPaymentMode || "Cash",
              status: (finalBalance <= 0 ? "PAID" : "PARTIAL") as any,
            },
          };
        }
        return item;
      });

      const updatedAdm = updated.find((a) => a.id === admission.id);
      saveAdmissions(updated, updatedAdm);
      if (updatedAdm) setActiveAdmission(updatedAdm);

      // Directly open print window for the final bill in A4 matching hospital format
      if (activeBillId && typeof window !== "undefined") {
        const isGynoDoc = /shillpa|shilpa|gyn/i.test(admission.consultantDoctor || "");
        const queryParams = new URLSearchParams({
          billId: String(activeBillId),
          type: "ipd",
          pageSize: "A4",
          autoPrint: "true",
          signature: isGynoDoc ? "sign1.png" : "sign.png",
          doctorName: admission.consultantDoctor,
          patientName: admission.name,
          patientPhone: admission.phone,
          patientAge: String(admission.age),
          patientSex: admission.sex,
          address: admission.address || "",
          uhid: admission.uhid,
          ipdNumber: admission.ipdNumber,
          admitDate: admitDateStr,
          dischDate: dischDateStr,
          wardName: wardStr,
          paymentCategory: admission.paymentCategory || "General",
          deposit: String(billing.totalAdvances),
          balance: String(finalBalance),
        });
        window.open(`/print-bill?${queryParams.toString()}`, "_blank");
      }
      setSuccessToast("Final IPD Bill generated, saved to database, and sent to printer!");
    } catch (err: any) {
      console.error("Failed to generate final bill:", err);
      alert("Error generating final bill: " + (err.message || "Unknown error"));
    }
  };

  // Filtered Admitted & Discharged patients
  const activeAdmissions = useMemo(() => {
    return admissions
      .filter((a) => a.status === "Admitted")
      .filter((a) => {
        if (selectedWardFilter !== "All" && a.ward !== selectedWardFilter) return false;
        if (selectedDoctorFilter !== "All" && a.consultantDoctor !== selectedDoctorFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            a.name.toLowerCase().includes(q) ||
            a.phone.includes(q) ||
            a.uhid.toLowerCase().includes(q) ||
            a.ipdNumber.toLowerCase().includes(q) ||
            a.bedNumber.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [admissions, selectedWardFilter, selectedDoctorFilter, searchQuery]);

  const dischargedAdmissions = useMemo(() => {
    return admissions
      .filter((a) => a.status === "Discharged")
      .filter((a) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            a.name.toLowerCase().includes(q) ||
            a.phone.includes(q) ||
            a.uhid.toLowerCase().includes(q) ||
            a.ipdNumber.toLowerCase().includes(q) ||
            a.bedNumber.toLowerCase().includes(q) ||
            a.ward.toLowerCase().includes(q) ||
            a.consultantDoctor.toLowerCase().includes(q) ||
            (a.dischargeSummary?.finalDiagnosis || "").toLowerCase().includes(q) ||
            (a.provisionalDiagnosis || "").toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [admissions, searchQuery]);

  // Total summary statistics
  const stats = useMemo(() => {
    const admittedCount = admissions.filter((a) => a.status === "Admitted").length;
    const totalBeds = wardBedConfig.reduce((sum, w) => sum + w.beds.length, 0);
    const availableBeds = Math.max(0, totalBeds - admittedCount);
    const dischargedCount = admissions.filter((a) => a.status === "Discharged").length;

    let totalActiveRevenue = 0;
    let totalAdvances = 0;

    admissions
      .filter((a) => a.status === "Admitted")
      .forEach((a) => {
        const b = calculateRunningBill(a);
        totalActiveRevenue += b.grossTotal;
        totalAdvances += b.totalAdvances;
      });

    return {
      admittedCount,
      availableBeds,
      totalBeds,
      dischargedCount,
      totalActiveRevenue,
      totalAdvances,
      occupancyPercent: totalBeds > 0 ? Math.round((admittedCount / totalBeds) * 100) : 0,
    };
  }, [admissions, wardBedConfig]);

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER BANNER & STATS */}
      <IpdHeaderStats
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        successToast={successToast}
        setSuccessToast={setSuccessToast}
        onOpenOpdModal={() => setShowOpdModal(true)}
      />

      {/* TAB 1: INPATIENT MATRIX & ACTIVE PATIENTS */}
      {activeTab === "dashboard" && (
        <IpdBedMatrixTab
          wardBedConfig={wardBedConfig}
          occupiedBeds={occupiedBeds}
          activeAdmissions={activeAdmissions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedWardFilter={selectedWardFilter}
          setSelectedWardFilter={setSelectedWardFilter}
          selectedDoctorFilter={selectedDoctorFilter}
          setSelectedDoctorFilter={setSelectedDoctorFilter}
          onOpenBedConfigModal={() => setShowBedConfigModal(true)}
          onSelectBedForAdmit={(ward, bed) => {
            const wardConf = wardBedConfig.find((w) => w.ward === ward);
            setNewAdmissionForm({
              ...newAdmissionForm,
              ward: ward as any,
              bedNumber: bed,
              dailyRate: wardConf?.dailyRate || 1000,
            });
            setActiveTab("admit");
          }}
          onOpenProfile={(adm) => {
            setActiveAdmission(adm);
            setActiveModal("profile");
          }}
          onOpenBilling={(adm) => {
            setActiveAdmission(adm);
            setActiveModal("billing");
          }}
          onOpenRecordPayment={(adm) => handleOpenRecordPayment(adm)}
          onOpenPatientReceipt={(adm) => handleOpenPatientReceipt(adm)}
          onOpenEditAdmission={(adm) => handleOpenEditAdmission(adm)}
          onOpenDischarge={(adm) => {
            initDischargeFormForAdmission(adm);
            setActiveModal("discharge");
          }}
          onOpenPrintTicket={(adm) => {
            setActiveAdmission(adm);
            setActiveModal("printTicket");
          }}
          onOpenTransferBed={(adm) => {
            const firstVacantBed =
              wardBedConfig.find((w) => w.ward === adm.ward)?.beds.find((b) => !occupiedBeds.has(b)) || "";
            setTransferModal({
              isOpen: true,
              admission: adm,
              targetWard: adm.ward,
              targetBed: firstVacantBed,
            });
          }}
          onSwitchToAdmitTab={() => setActiveTab("admit")}
        />
      )}

      {/* TAB 2: NEW ADMISSION FORM */}
      {activeTab === "admit" && (
        <IpdNewAdmissionTab
          newAdmissionForm={newAdmissionForm}
          setNewAdmissionForm={setNewAdmissionForm}
          admissions={admissions}
          wardBedConfig={wardBedConfig}
          occupiedBeds={occupiedBeds}
          opdPatients={opdPatients}
          selectedOpdDate={selectedOpdDate}
          setSelectedOpdDate={setSelectedOpdDate}
          importedFromOpd={importedFromOpd}
          setImportedFromOpd={setImportedFromOpd}
          existingPatientFound={existingPatientFound}
          setExistingPatientFound={setExistingPatientFound}
          handlePhoneLookup={handlePhoneLookup}
          handleSelectOpdPatient={handleSelectOpdPatient}
          handleCreateAdmission={handleCreateAdmission}
          submittingAdmission={submittingAdmission}
          onCancel={() => setActiveTab("dashboard")}
        />
      )}

      {/* TAB 3: DISCHARGED PATIENTS ARCHIVE */}
      {activeTab === "history" && (
        <IpdDischargedArchiveTab
          dischargedAdmissions={dischargedAdmissions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenEditAdmission={(adm) => handleOpenEditAdmission(adm)}
          onOpenDischargeModal={(adm) => {
            setActiveAdmission(adm);
            initDischargeFormForAdmission(adm);
            setActiveModal("discharge");
          }}
          onGenerateFinalBill={(adm) => handleGenerateFinalBill(adm)}
          onOpenPatientReceipt={(adm) => handleOpenPatientReceipt(adm)}
          onOpenPrintDischarge={(adm) => {
            setActiveAdmission(adm);
            setActiveModal("printDischarge");
          }}
        />
      )}

      {/* MODAL 0: EDIT ADMISSION & RATES */}
      <IpdEditAdmissionModal
        isOpen={activeModal === "editAdmission"}
        onClose={() => {
          setActiveModal("none");
          setActiveAdmission(null);
        }}
        editAdmissionForm={editAdmissionForm}
        setEditAdmissionForm={setEditAdmissionForm}
        wardBedConfig={wardBedConfig}
        occupiedBeds={occupiedBeds}
        onSave={handleSaveEditAdmission}
      />

      {/* MODAL 1: CLINICAL STAY & MAR */}
      {activeModal === "profile" && activeAdmission && (
        <IpdClinicalStayModal
          admission={activeAdmission}
          onClose={() => {
            setActiveModal("none");
            setActiveAdmission(null);
            setEditingClinicalItem(null);
            setIsEditingAdmissionInfo(false);
          }}
          isEditingAdmissionInfo={isEditingAdmissionInfo}
          setIsEditingAdmissionInfo={setIsEditingAdmissionInfo}
          editAdmissionInfoForm={editAdmissionInfoForm}
          setEditAdmissionInfoForm={setEditAdmissionInfoForm}
          onUpdateAdmissionInfo={handleUpdateAdmissionInfo}
          profileTab={profileTab}
          setProfileTab={setProfileTab}
          editingClinicalItem={editingClinicalItem}
          setEditingClinicalItem={setEditingClinicalItem}
          vitalsInput={vitalsInput}
          setVitalsInput={setVitalsInput}
          onAddVitals={handleAddVitals}
          onUpdateVitals={handleUpdateVitals}
          onDeleteVitals={handleDeleteVitals}
          doctorNoteInput={doctorNoteInput}
          setDoctorNoteInput={setDoctorNoteInput}
          onAddDoctorNote={handleAddDoctorNote}
          onUpdateDoctorNote={handleUpdateDoctorNote}
          onDeleteDoctorNote={handleDeleteDoctorNote}
          medInput={medInput}
          setMedInput={setMedInput}
          onAddMedication={handleAddMedication}
          onUpdateMedication={handleUpdateMedication}
          onDeleteMedication={handleDeleteMedication}
          investigationInput={investigationInput}
          setInvestigationInput={setInvestigationInput}
          onAddInvestigation={handleAddInvestigation}
          onUpdateClinicalInvestigation={handleUpdateClinicalInvestigation}
          onDeleteClinicalInvestigation={handleDeleteClinicalInvestigation}
          procedureInput={procedureInput}
          setProcedureInput={setProcedureInput}
          onAddProcedure={handleAddProcedure}
          onUpdateClinicalProcedure={handleUpdateClinicalProcedure}
          onDeleteClinicalProcedure={handleDeleteClinicalProcedure}
          nursingNoteInput={nursingNoteInput}
          setNursingNoteInput={setNursingNoteInput}
          onAddNursingNote={handleAddNursingNote}
          onUpdateNursingNote={handleUpdateNursingNote}
          onDeleteNursingNote={handleDeleteNursingNote}
        />
      )}

      {/* MODAL 2: RUNNING BILLING & ADVANCES */}
      {activeModal === "billing" && activeAdmission && (
        <IpdRunningBillModal
          admission={activeAdmission}
          onClose={() => {
            setActiveModal("none");
            setActiveAdmission(null);
          }}
          onGenerateFinalBill={handleGenerateFinalBill}
          onOpenRecordPayment={handleOpenRecordPayment}
          onOpenPatientReceipt={handleOpenPatientReceipt}
          onProceedToDischarge={(adm) => {
            initDischargeFormForAdmission(adm);
            setActiveModal("discharge");
          }}
          editingChargeKey={editingChargeKey}
          setEditingChargeKey={setEditingChargeKey}
          chargeEditForm={chargeEditForm}
          setChargeEditForm={setChargeEditForm}
          onSaveChargeOverrides={handleSaveChargeOverrides}
          editingInvestigation={editingInvestigation}
          setEditingInvestigation={setEditingInvestigation}
          onUpdateInvestigation={handleUpdateInvestigation}
          onDeleteInvestigation={handleDeleteInvestigation}
          editingProcedure={editingProcedure}
          setEditingProcedure={setEditingProcedure}
          onUpdateProcedure={handleUpdateProcedure}
          onDeleteProcedure={handleDeleteProcedure}
          editingCustomCharge={editingCustomCharge}
          setEditingCustomCharge={setEditingCustomCharge}
          onUpdateCustomCharge={handleUpdateCustomCharge}
          onDeleteCustomCharge={handleDeleteCustomCharge}
          newInvBilling={newInvBilling}
          setNewInvBilling={setNewInvBilling}
          onAddInvestigationCharge={handleAddInvestigationCharge}
          newProcBilling={newProcBilling}
          setNewProcBilling={setNewProcBilling}
          onAddProcedureCharge={handleAddProcedureCharge}
          chargeInput={chargeInput}
          setChargeInput={setChargeInput}
          onAddCustomCharge={handleAddCustomCharge}
          onPrintReceiptSlip={(adm, adv) => {
            setPrintReceiptData({ patient: adm, advance: adv });
            setActiveModal("printReceipt");
          }}
          onOpenEditPaymentReceipt={(adm, adv) => handleOpenEditPaymentReceipt(adm, adv)}
          onDeleteAdvance={handleDeleteAdvance}
          advanceInput={advanceInput}
          setAdvanceInput={setAdvanceInput}
          onRecordAdvance={handleRecordAdvance}
        />
      )}

      {/* MODAL 3: DISCHARGE & FINANCIAL SETTLEMENT */}
      <IpdDischargeModal
        isOpen={activeModal === "discharge"}
        admission={activeAdmission}
        onClose={() => {
          setActiveModal("none");
          setActiveAdmission(null);
        }}
        procedureCatalog={procedureCatalog}
        dischargeForm={dischargeForm}
        setDischargeForm={setDischargeForm}
        dischargeTab={dischargeTab}
        setDischargeTab={setDischargeTab}
        dischargeChargeInput={dischargeChargeInput}
        setDischargeChargeInput={setDischargeChargeInput}
        showDischargeChargeSuggestions={showDischargeChargeSuggestions}
        setShowDischargeChargeSuggestions={setShowDischargeChargeSuggestions}
        ipdAutoSaved={ipdAutoSaved}
        onDischargeDiscountChange={handleDischargeDiscountChange}
        onAddChargeInDischarge={handleAddChargeInDischarge}
        onDeleteChargeInDischarge={handleDeleteChargeInDischarge}
        onUpdateCustomChargeInDischarge={handleUpdateCustomChargeInDischarge}
        onOpenRecordPayment={handleOpenRecordPayment}
        onFinalizeDischarge={handleFinalizeDischarge}
        onGenerateFinalBill={handleGenerateFinalBill}
      />

      {/* MODAL 4: RECORD INPATIENT PAYMENT */}
      {activeModal === "recordPayment" && recordPaymentAdmission && (
        <IpdRecordPaymentModal
          admission={recordPaymentAdmission}
          editingAdvanceId={editingAdvanceId}
          editingReceiptNumber={editingReceiptNumber || ""}
          quickPaymentForm={quickPaymentForm}
          setQuickPaymentForm={setQuickPaymentForm}
          onClose={() => {
            if (paymentModalReturnTo === "discharge") {
              setActiveModal("discharge");
            } else if (paymentModalReturnTo === "billing") {
              setActiveModal("billing");
            } else {
              setActiveModal("none");
              setRecordPaymentAdmission(null);
            }
            setPaymentModalReturnTo("none");
          }}
          onSave={handleSaveQuickPayment}
        />
      )}

      {/* MODAL 5: PRINT INPATIENT PAYMENT RECEIPT */}
      {activeModal === "printReceipt" && printReceiptData && (
        <IpdPrintReceiptModal
          data={printReceiptData}
          setData={setPrintReceiptData}
          receiptPageSize={receiptPageSize}
          setReceiptPageSize={setReceiptPageSize}
          hospitalConfig={hospitalConfig}
          onClose={() => {
            if (paymentModalReturnTo === "discharge") {
              setActiveAdmission(printReceiptData.patient);
              setActiveModal("discharge");
            } else if (paymentModalReturnTo === "billing") {
              setActiveAdmission(printReceiptData.patient);
              setActiveModal("billing");
            } else {
              setActiveModal("none");
              setPrintReceiptData(null);
            }
            setPaymentModalReturnTo("none");
          }}
          onOpenEditReceipt={handleOpenEditPaymentReceipt}
          onOpenRecordPayment={handleOpenRecordPayment}
        />
      )}

      {/* MODAL 6: PRINT BED TICKET */}
      <IpdPrintBedTicketModal
        isOpen={activeModal === "printTicket"}
        admission={activeAdmission}
        onClose={() => {
          setActiveModal("none");
          setActiveAdmission(null);
        }}
      />

      {/* MODAL 7: PRINT DISCHARGE SUMMARY */}
      <IpdPrintDischargeModal
        isOpen={activeModal === "printDischarge"}
        admission={activeAdmission}
        onClose={() => {
          setActiveModal("none");
          setActiveAdmission(null);
        }}
        dischargeIncludeSignature={dischargeIncludeSignature}
        setDischargeIncludeSignature={setDischargeIncludeSignature}
      />

      {/* MODAL 8: TRANSFER BED */}
      <IpdTransferBedModal
        isOpen={transferModal.isOpen}
        admission={transferModal.admission}
        targetWard={transferModal.targetWard}
        targetBed={transferModal.targetBed}
        wardBedConfig={wardBedConfig}
        occupiedBeds={occupiedBeds}
        onClose={() =>
          setTransferModal({
            isOpen: false,
            admission: null,
            targetWard: "",
            targetBed: "",
          })
        }
        onUpdateTargetWard={(wName, firstVacant) =>
          setTransferModal({
            ...transferModal,
            targetWard: wName,
            targetBed: firstVacant,
          })
        }
        onUpdateTargetBed={(bed) =>
          setTransferModal({
            ...transferModal,
            targetBed: bed,
          })
        }
        onConfirmTransfer={handleTransferBed}
      />

      {/* MODAL 9: SELECT OPD PATIENT */}
      <IpdSelectOpdPatientModal
        isOpen={showOpdModal}
        onClose={() => setShowOpdModal(false)}
        opdPatients={opdPatients}
        selectedOpdDate={selectedOpdDate}
        setSelectedOpdDate={setSelectedOpdDate}
        opdSearchQuery={opdSearchQuery}
        setOpdSearchQuery={setOpdSearchQuery}
        onSelectOpdPatient={handleSelectOpdPatient}
      />

      {/* MODAL 10: WARD & BED CONFIGURATION */}
      <IpdBedConfigModal
        isOpen={showBedConfigModal}
        onClose={() => setShowBedConfigModal(false)}
        wardBedConfig={wardBedConfig}
        occupiedBeds={occupiedBeds}
        newBedForm={newBedForm}
        setNewBedForm={setNewBedForm}
        onUpdateWardRate={handleUpdateWardRate}
        onAddBed={handleAddBed}
        onDeleteBed={handleDeleteBed}
        onResetBedConfig={handleResetBedConfig}
      />
    </div>
  );
}
