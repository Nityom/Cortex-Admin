"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { createPatient, getPatients, getPatientByPhoneNumber, getPatientById } from "@/services/patients";
import { Patient } from "@/types/patient";

// ─────────────────────────────────────────────────────────────
// TYPES & DEFINITIONS
// ─────────────────────────────────────────────────────────────

interface IPDAdmission {
  id: string;
  ipdNumber: string;
  uhid: string;
  patientId?: string;
  name: string;
  age: string;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  medicalHistory?: string;
  allergies?: string;
  provisionalDiagnosis: string;
  reasonForAdmission: string;
  admissionDate: string; // YYYY-MM-DD
  admissionTime: string; // HH:MM AM/PM
  department: string;
  consultantDoctor: string;
  referredBy?: string;
  paymentCategory: "Cash" | "TPA / Insurance" | "Ayushman Bharat / MJPJAY" | "Corporate";
  ward: string;
  bedNumber: string;
  dailyRate: number;
  nursingRatePerDay: number;
  doctorRatePerVisit: number;
  billableDaysOverride?: number;
  bedChargesOverride?: number;
  nursingChargesOverride?: number;
  doctorVisitsCountOverride?: number;
  doctorChargesOverride?: number;
  status: "Admitted" | "Discharged";
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeSummary?: {
    conditionAtDischarge: string;
    finalDiagnosis: string;
    treatmentGiven: string;
    dischargeMeds: string;
    followupDate: string;
    doctorNotes: string;
  };
  vitals: Array<{
    id: string;
    date: string;
    time: string;
    bp: string;
    pulse: string;
    temp: string;
    spo2: string;
    respRate?: string;
    weight?: string;
    recordedBy: string;
  }>;
  doctorNotes: Array<{
    id: string;
    date: string;
    time: string;
    doctor: string;
    note: string;
    plan: string;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    route: string;
    frequency: string;
    timing: string;
    status: "Active" | "Stopped";
  }>;
  investigations: Array<{
    id: string;
    name: string;
    date: string;
    status: "Ordered" | "Completed";
    result?: string;
    cost: number;
  }>;
  procedures: Array<{
    id: string;
    name: string;
    date: string;
    surgeon: string;
    notes?: string;
    cost: number;
  }>;
  nursingNotes: Array<{
    id: string;
    date: string;
    shift: "Morning" | "Evening" | "Night";
    note: string;
    nurse: string;
  }>;
  customCharges: Array<{
    id: string;
    description: string;
    date: string;
    amount: number;
    category: string;
  }>;
  advances: Array<{
    id: string;
    receiptNumber: string;
    date: string;
    amount: number;
    mode: "Cash" | "UPI" | "Card" | "Bank Transfer";
    notes?: string;
    receivedBy: string;
  }>;
  finalSettlement?: {
    billNumber: string;
    date: string;
    grossTotal: number;
    discount: number;
    netTotal: number;
    advanceAdjusted: number;
    balancePaid: number;
    paymentMode: string;
    status: "PAID" | "PARTIAL" | "CLAIM_PENDING";
  };
}

interface WardBedConfigItem {
  ward: string;
  dailyRate: number;
  beds: string[];
}

const DEFAULT_WARD_BED_CONFIG: WardBedConfigItem[] = [
  {
    ward: "General Ward",
    dailyRate: 800,
    beds: ["GW-01", "GW-02", "GW-03", "GW-04", "GW-05", "GW-06"],
  },
  {
    ward: "Semi-Special",
    dailyRate: 1400,
    beds: ["SS-01", "SS-02", "SS-03", "SS-04"],
  },
  {
    ward: "Special Deluxe",
    dailyRate: 2200,
    beds: ["SP-01", "SP-02", "SP-03", "SP-04"],
  },
  {
    ward: "ICU",
    dailyRate: 4000,
    beds: ["ICU-01", "ICU-02"],
  },
];

const BED_CONFIG_STORAGE_KEY = "cortex_ipd_bed_config_v1";

const DOCTORS = [
  { name: "Dr. Vipeen Raut", specialty: "Orthopaedics & Joint Replacement" },
  { name: "Dr. Shillpa Raut", specialty: "Obstetrics & Gynaecology" },
  { name: "Visiting Consultant", specialty: "General & Laparoscopic Surgery" },
];

const DEPARTMENTS = [
  "Orthopaedics & Joint Replacement",
  "Obstetrics & Gynaecology",
  "General Medicine",
  "General Surgery",
  "Physiotherapy & Rehabilitation",
];

const STORAGE_KEY = "cortex_ipd_admissions_v1";



export default function IPDManagementPage() {
  const router = useRouter();

  // Tab State: 'dashboard' | 'admit' | 'history'
  const [activeTab, setActiveTab] = useState<"dashboard" | "admit" | "history">("dashboard");

  // Admissions State
  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWardFilter, setSelectedWardFilter] = useState("All");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState("All");

  // Selected patient for interactive modals
  const [activeAdmission, setActiveAdmission] = useState<IPDAdmission | null>(null);
  const [activeModal, setActiveModal] = useState<"none" | "profile" | "billing" | "discharge" | "editAdmission" | "printTicket" | "printReceipt" | "printDischarge">("none");
  const [printReceiptData, setPrintReceiptData] = useState<any>(null);
  const [dischargeIncludeSignature, setDischargeIncludeSignature] = useState<boolean>(true);

  // New Admission Form State (Ward, Bed & All Charges Editable)
  const [newAdmissionForm, setNewAdmissionForm] = useState({
    uhid: "",
    name: "",
    age: "",
    sex: "Male" as "Male" | "Female" | "Other",
    phone: "",
    address: "",
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
    ward: "General Ward" as const,
    isCustomWard: false,
    customWardName: "",
    bedNumber: "GW-01",
    isCustomBed: false,
    customBedNumber: "",
    dailyRate: 1000,
    nursingRate: 600,
    doctorVisitFee: 800,
    initialAdvance: 5000,
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
    nursingRatePerDay: 600,
    doctorRatePerVisit: 800,
    provisionalDiagnosis: "",
    admissionDate: "",
    admissionTime: "",
    paymentCategory: "Cash" as "Cash" | "TPA / Insurance" | "Ayushman Bharat / MJPJAY" | "Corporate",
  });

  const [existingPatientFound, setExistingPatientFound] = useState<Patient | null>(null);
  const [submittingAdmission, setSubmittingAdmission] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Clinical Profile Sub-tab
  const [profileTab, setProfileTab] = useState<"vitals" | "doctorNotes" | "meds" | "investigations" | "procedures" | "nursing">("vitals");

  // Clinical Profile Inputs
  const [vitalsInput, setVitalsInput] = useState({ bp: "120/80", pulse: "72", temp: "98.6", spo2: "99", weight: "", recordedBy: "Staff Nurse" });
  const [doctorNoteInput, setDoctorNoteInput] = useState({ doctor: DOCTORS[0].name, note: "", plan: "" });
  const [medInput, setMedInput] = useState({ name: "", dosage: "", route: "Oral", frequency: "BD", timing: "Morning & Night" });
  const [investigationInput, setInvestigationInput] = useState({ name: "", cost: 500 });
  const [procedureInput, setProcedureInput] = useState({ name: "", surgeon: DOCTORS[0].name, cost: 5000, notes: "" });
  const [nursingNoteInput, setNursingNoteInput] = useState({ shift: "Morning" as const, note: "", nurse: "Staff Nurse" });

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
      const savedBeds = localStorage.getItem(BED_CONFIG_STORAGE_KEY);
      if (savedBeds) {
        const parsedBeds = JSON.parse(savedBeds);
        if (Array.isArray(parsedBeds) && parsedBeds.length > 0) {
          setWardBedConfig(parsedBeds);
        }
      }
    } catch (e) {
      console.error("Failed to load bed config:", e);
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

  // Save Admissions to Storage
  const saveAdmissions = (newItems: IPDAdmission[]) => {
    setAdmissions(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error("Failed to save IPD admissions:", e);
    }
  };

  // Save Ward Bed Config
  const saveWardBedConfig = (newConfig: WardBedConfigItem[]) => {
    setWardBedConfig(newConfig);
    try {
      localStorage.setItem(BED_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.error("Failed to save bed config:", e);
    }
  };

  // Helper to update active admission & list simultaneously
  const updateActiveAdmission = (updatedAdm: IPDAdmission) => {
    setActiveAdmission(updatedAdm);
    const updated = admissions.map((a) => (a.id === updatedAdm.id ? updatedAdm : a));
    saveAdmissions(updated);
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
        const found = await getPatientByPhoneNumber(phone.trim());
        if (found) {
          setExistingPatientFound(found);
          setNewAdmissionForm((prev) => ({
            ...prev,
            uhid: (found.reference_number || "CRX0001").replace(/^CH/i, "CRX"),
            name: found.name || prev.name,
            age: found.age ? String(found.age) : prev.age,
            sex: (found.sex as any) || prev.sex,
            address: (found as any).address || prev.address,
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

  // Calculate running bill for an admission with override support
  const calculateRunningBill = (admission: IPDAdmission) => {
    const rawDays = calculateStayDays(admission.admissionDate, admission.dischargeDate);
    const days = admission.billableDaysOverride ?? rawDays;
    const bedCharges = admission.bedChargesOverride ?? (days * (admission.dailyRate || 1000));
    const nursingCharges = admission.nursingChargesOverride ?? (days * (admission.nursingRatePerDay || 600));
    const rawDocVisits = Math.max(days, admission.doctorNotes.length);
    const doctorVisitsCount = admission.doctorVisitsCountOverride ?? rawDocVisits;
    const doctorCharges = admission.doctorChargesOverride ?? (doctorVisitsCount * (admission.doctorRatePerVisit || 800));
    const investigationsTotal = admission.investigations.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
    const proceduresTotal = admission.procedures.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const customChargesTotal = admission.customCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const grossTotal = bedCharges + nursingCharges + doctorCharges + investigationsTotal + proceduresTotal + customChargesTotal;
    const totalAdvances = admission.advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
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
      dischargeDate: new Date().toISOString().split("T")[0],
      dischargeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      conditionAtDischarge: adm.dischargeSummary?.conditionAtDischarge || "Cured / Stable",
      finalDiagnosis: adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || "",
      treatmentGiven: adm.dischargeSummary?.treatmentGiven || `${procSummary}Inpatient care for ${bill.days} days in ${adm.ward}.`.trim(),
      dischargeMeds: adm.dischargeSummary?.dischargeMeds || medSummary || "Continue prescribed oral medications for 5 days.",
      followupDate: adm.dischargeSummary?.followupDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      doctorNotes: adm.dischargeSummary?.doctorNotes || "Review in OPD after 7 days. Report immediately if fever or wound pain/discharge develops.",
      discount: 0,
      finalPaymentMode: "Cash",
    });
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
    if (!newAdmissionForm.name.trim() || !newAdmissionForm.phone.trim()) {
      alert("Please provide patient name and contact number.");
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

      // Next IPD Number
      const year = new Date().getFullYear();
      const ipdSeq = String(admissions.length + 1).padStart(3, "0");
      const ipdNumber = `IPD-${year}-${ipdSeq}`;

      const wardConfig = wardBedConfig.find((w) => w.ward === effectiveWard);
      const dailyRate = Number(newAdmissionForm.dailyRate) || wardConfig?.dailyRate || 1000;
      const nursingRate = Number(newAdmissionForm.nursingRate) || 600;
      const doctorVisitFee = Number(newAdmissionForm.doctorVisitFee) || 800;

      // Initial Advance Receipt if paid
      const initialAdvances: any[] = [];
      if (Number(newAdmissionForm.initialAdvance) > 0) {
        initialAdvances.push({
          id: `adv_${Date.now()}`,
          receiptNumber: `CRX-ADV-${year}-${ipdSeq}`,
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
      saveAdmissions(updated);

      setSuccessToast(`Patient ${newAdmission.name} admitted successfully to Bed ${newAdmission.bedNumber} (IPD No: ${newAdmission.ipdNumber})!`);
      setActiveTab("dashboard");

      // Reset form
      const nextConf = wardBedConfig[0];
      const nextVacantBed = nextConf?.beds.find((b) => !occupiedBeds.has(b)) || "GW-01";
      setNewAdmissionForm({
        uhid: "",
        name: "",
        age: "",
        sex: "Male",
        phone: "",
        address: "",
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
        dailyRate: nextConf?.dailyRate || 1000,
        nursingRate: 600,
        doctorVisitFee: 800,
        initialAdvance: 5000,
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
        return {
          ...adm,
          name: editAdmissionForm.name.trim(),
          age: editAdmissionForm.age.trim(),
          sex: editAdmissionForm.sex,
          phone: editAdmissionForm.phone.trim(),
          address: editAdmissionForm.address.trim(),
          uhid: editAdmissionForm.uhid.trim() || adm.uhid,
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
        };
      }
      return adm;
    });

    saveAdmissions(updated);
    if (activeAdmission?.id === editAdmissionForm.id) {
      const activeUpd = updated.find((a) => a.id === editAdmissionForm.id);
      if (activeUpd) setActiveAdmission(activeUpd);
    }
    setActiveModal("none");
    setSuccessToast(`Inpatient details, bed & charge rates updated for ${editAdmissionForm.name}!`);
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
    if (!chargeInput.description.trim() || Number(chargeInput.amount) <= 0) return;
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

  // Finalize Discharge & Settlement
  const handleFinalizeDischarge = (admissionId: string) => {
    const adm = admissions.find((a) => a.id === admissionId);
    if (!adm) return;

    const billing = calculateRunningBill(adm);
    const discount = Number(dischargeForm.discount) || 0;
    const netTotal = Math.max(0, billing.grossTotal - discount);
    const finalBalance = netTotal - billing.totalAdvances;

    const finalBillNumber = `CRX-IPD-${Date.now().toString().slice(-5)}`;

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

    saveAdmissions(updated);
    const dischargedAdm = updated.find((a) => a.id === admissionId);
    setActiveAdmission(dischargedAdm || null);
    setActiveModal("printDischarge");
    setSuccessToast(`Patient ${adm.name} discharged successfully! Bed ${adm.bedNumber} is now released and vacant.`);
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
            a.ipdNumber.toLowerCase().includes(q)
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
      {/* HEADER BANNER */}
      <header className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Bed className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">IPD Management</h1>
                <p className="text-xs text-slate-500">
                  Inpatient Care, Bed Allocation & Running Billing
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              Inpatient Board ({stats.admittedCount})
            </button>

            {/* Select from OPD by Date Button */}
            <button
              onClick={() => setShowOpdModal(true)}
              className="px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs"
            >
              <Users className="w-4 h-4 text-slate-500" />
              Import from OPD
            </button>

            <button
              onClick={() => setActiveTab("admit")}
              className={`px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 ${
                activeTab === "admit"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              + New Admission
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Discharge Archive ({stats.dischargedCount})
            </button>
          </div>
        </div>
      </header>

      {/* TOAST BANNER */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{successToast}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs font-medium px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Admitted Patients</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.admittedCount}</p>
          <span className="text-[11px] text-slate-400">Occupancy: {stats.occupancyPercent}%</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Available Beds</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <Bed className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.availableBeds} / {stats.totalBeds}</p>
          <span className="text-[11px] text-slate-400">Vacant for allocation</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Stay Charges</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{stats.totalActiveRevenue.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-slate-400">Total running bill</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Advances Collected</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{stats.totalAdvances.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-slate-400">Adjustable in settlement</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: INPATIENT DASHBOARD & BED OCCUPANCY
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* WARD & BED OCCUPANCY VISUAL MATRIX (EDITABLE) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                    Ward & Bed Occupancy
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded border border-slate-200">
                      Editable Matrix
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click an occupied bed to view clinical sheet, or vacant bed to assign.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Vacant
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Occupied
                </span>
                <button
                  type="button"
                  onClick={() => setShowBedConfigModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition shadow-2xs ml-2"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  Edit Beds & Rates
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {wardBedConfig.map((wConfig) => (
                <div key={wConfig.ward} className="bg-slate-50/60 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{wConfig.ward}</span>
                    <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      ₹{wConfig.dailyRate}/day
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {wConfig.beds.map((bedId) => {
                      const occ = occupiedBeds.get(bedId);
                      const isOccupied = !!occ;
                      return (
                        <div
                          key={bedId}
                          onClick={() => {
                            if (isOccupied) {
                              setActiveAdmission(occ);
                              setActiveModal("profile");
                            } else {
                              setNewAdmissionForm((prev) => ({
                                ...prev,
                                ward: wConfig.ward as any,
                                bedNumber: bedId,
                              }));
                              setActiveTab("admit");
                            }
                          }}
                          className={`p-2.5 rounded-lg border cursor-pointer transition text-left relative overflow-hidden ${
                            isOccupied
                              ? "bg-slate-50 border-slate-300 hover:bg-slate-100"
                              : "bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold text-slate-900">{bedId}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOccupied ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            ></span>
                          </div>
                          {isOccupied ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-900 truncate">{occ.name}</p>
                              <p className="text-[11px] text-slate-500">
                                Day {calculateStayDays(occ.admissionDate)} • {occ.uhid}
                              </p>
                              <button
                                type="button"
                                title="Transfer bed"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferModal({
                                    isOpen: true,
                                    admission: occ,
                                    targetWard: wardBedConfig[0]?.ward || "General Ward",
                                    targetBed: "",
                                  });
                                }}
                                className="mt-1.5 w-full py-0.5 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded flex items-center justify-center gap-1 transition"
                              >
                                <ArrowLeftRight className="w-2.5 h-2.5 text-slate-500" />
                                Transfer Bed
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-slate-400">Vacant +</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVE INPATIENTS LIST */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* List Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Currently Admitted Inpatients ({activeAdmissions.length})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, UHID, IPD No..."
                    className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-56"
                  />
                </div>

                <select
                  value={selectedWardFilter}
                  onChange={(e) => setSelectedWardFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                >
                  <option value="All">All Wards</option>
                  <option value="General Ward">General Ward</option>
                  <option value="Semi-Special">Semi-Special</option>
                  <option value="Special Deluxe">Special Deluxe</option>
                  <option value="ICU">ICU</option>
                </select>

                <select
                  value={selectedDoctorFilter}
                  onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                >
                  <option value="All">All Doctors</option>
                  {DOCTORS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Content */}
            {activeAdmissions.length === 0 ? (
              <div className="p-12 text-center">
                <Bed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No Inpatients Admitted</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">All beds are currently vacant or match no filter.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("admit")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  + Admit First Patient
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeAdmissions.map((adm) => {
                  const bill = calculateRunningBill(adm);
                  return (
                    <div key={adm.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Patient Details */}
                      <div className="flex items-start gap-3.5">
                        <div className="text-center min-w-[56px] bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-2 shadow-2xs">
                          <span className="text-[9px] font-bold block uppercase tracking-wider text-slate-500">BED</span>
                          <span className="text-base font-black text-slate-900">{adm.bedNumber}</span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{adm.name}</h3>
                            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                              {adm.uhid}
                            </span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                              {adm.ipdNumber}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {adm.ward}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>{adm.age}y • {adm.sex}</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {adm.phone}
                            </span>
                            <span>Doctor: <strong className="text-slate-800 font-medium">{adm.consultantDoctor}</strong></span>
                            <span>Admitted: <strong className="text-slate-800 font-medium">{adm.admissionDate}</strong> ({bill.days} {bill.days === 1 ? "day" : "days"})</span>
                          </div>

                          <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded w-fit">
                            <span className="font-semibold text-slate-500 uppercase text-[10px]">Diagnosis: </span>
                            <span className="font-medium text-slate-900">{adm.provisionalDiagnosis}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Running Bill & Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        {/* Running Bill Badge */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase">Running Balance</div>
                          <div className="flex items-center justify-end gap-1 font-bold text-sm">
                            <span className={bill.balanceDue > 0 ? "text-slate-900" : "text-emerald-700"}>
                              ₹{bill.balanceDue.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] font-normal text-slate-400">
                              (Adv: ₹{bill.totalAdvances.toLocaleString("en-IN")})
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAdmission(adm);
                              setActiveModal("profile");
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                            title="Clinical Stay Sheet (Vitals, Notes, Meds)"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            Clinical Sheet
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAdmission(adm);
                              setActiveModal("billing");
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                            title="Running Bill & Advances"
                          >
                            <Receipt className="w-3.5 h-3.5 text-slate-500" />
                            Running Bill
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAdmission(adm);
                              const isKnownWard = wardBedConfig.some(w => w.ward === adm.ward);
                              const isKnownBed = wardBedConfig.some(w => w.beds.includes(adm.bedNumber));
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
                                isCustomWard: !isKnownWard,
                                bedNumber: adm.bedNumber,
                                isCustomBed: !isKnownBed,
                                dailyRate: adm.dailyRate,
                                nursingRatePerDay: adm.nursingRatePerDay,
                                doctorRatePerVisit: adm.doctorRatePerVisit,
                                provisionalDiagnosis: adm.provisionalDiagnosis,
                                admissionDate: adm.admissionDate,
                                admissionTime: adm.admissionTime,
                                paymentCategory: adm.paymentCategory,
                              });
                              setActiveModal("editAdmission");
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                            title="Edit Inpatient Details, Ward, Bed & Rates"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAdmission(adm);
                              initDischargeFormForAdmission(adm);
                              setActiveModal("discharge");
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                            title="Discharge & Final Settlement"
                          >
                            <LogOut className="w-3.5 h-3.5 text-slate-500" />
                            Discharge
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAdmission(adm);
                              setActiveModal("printTicket");
                            }}
                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-xs transition"
                            title="Print Admission Bed Ticket"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: NEW IPD ADMISSION FORM
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "admit" && (
        <form onSubmit={handleCreateAdmission} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Patient IPD Admission & Bed Allocation</h2>
                <p className="text-xs text-slate-500">
                  Lookup existing patient by mobile/UHID or register new. Assign consultant doctor, ward, and bed.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                Next IPD No: IPD-{new Date().getFullYear()}-{String(admissions.length + 1).padStart(3, "0")}
              </span>
            </div>

            {/* OPD Patient Import Banner & Selector */}
            {importedFromOpd ? (
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-blue-900 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-sm block">Selected from OPD: {importedFromOpd.name}</span>
                    <span className="text-[11px] text-blue-700">
                      Token #{importedFromOpd.token} • Date: {importedFromOpd.date} • Demographics & vitals imported automatically.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImportedFromOpd(null)}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-800 hover:text-blue-950 underline"
                >
                  Clear OPD Selection
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Quick Import: Select from OPD Patients as per Date
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Choose a date to view registered OPD patients and import their UHID, demographics & vitals for admission.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedOpdDate}
                      onChange={(e) => setSelectedOpdDate(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedOpdDate(new Date().toISOString().split("T")[0])}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition ${
                        selectedOpdDate === new Date().toISOString().split("T")[0]
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOpdDate(
                          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
                        )
                      }
                      className="px-2 py-1 text-[11px] font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
                    >
                      Yesterday
                    </button>
                  </div>
                </div>

                {/* OPD Patients horizontal list / chips for selected date */}
                {(() => {
                  const matchingOpd = opdPatients.filter((p) => {
                    const d = p.registeredAt ? p.registeredAt.slice(0, 10) : "";
                    return !selectedOpdDate || d === selectedOpdDate;
                  });

                  if (matchingOpd.length === 0) {
                    return (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                        No OPD patients registered on <strong>{selectedOpdDate}</strong>. Change date or lookup by phone number below.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      {matchingOpd.map((opdPt) => (
                        <div
                          key={opdPt.id}
                          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-3 shadow-2xs flex flex-col justify-between gap-2 transition hover:shadow-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                Token #{opdPt.token} • {opdPt.uhid || "CRX..."}
                              </span>
                              <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {opdPt.doctor ? opdPt.doctor.replace("Dr. ", "") : "OPD"}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900">{opdPt.name}</h4>
                            <p className="text-[11px] text-slate-500">
                              {opdPt.age}y • {opdPt.sex} • Ph: {opdPt.phone}
                            </p>
                            {opdPt.vitals?.bp && (
                              <p className="text-[10px] text-slate-600 font-medium mt-1">
                                Vitals: BP {opdPt.vitals.bp} | SpO₂ {opdPt.vitals.spo2 || "—"}%
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectOpdPatient(opdPt)}
                            className="w-full py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1 transition shadow-2xs"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Select for IPD Admission
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Existing patient banner */}
            {existingPatientFound && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>
                    Existing patient found: <strong>{existingPatientFound.name}</strong> (UHID: <strong>{newAdmissionForm.uhid}</strong>). Demographic details pre-filled.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExistingPatientFound(null)}
                  className="text-blue-700 underline font-semibold"
                >
                  Clear
                </button>
              </div>
            )}

            {/* SECTION 1: Patient Demographics */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                1. Patient Demographics & UHID
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={newAdmissionForm.phone}
                      onChange={(e) => {
                        setNewAdmissionForm({ ...newAdmissionForm, phone: e.target.value });
                        handlePhoneLookup(e.target.value);
                      }}
                      placeholder="e.g. 9823012345"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Type 10 digits to auto-lookup UHID</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UHID / Reference No.
                  </label>
                  <input
                    type="text"
                    value={newAdmissionForm.uhid}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, uhid: e.target.value })}
                    placeholder="CRX0001 (Auto-generated if empty)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmissionForm.name}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, name: e.target.value })}
                    placeholder="Enter patient full name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      min="0"
                      max="125"
                      value={newAdmissionForm.age}
                      onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, age: e.target.value })}
                      placeholder="Age"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={newAdmissionForm.sex}
                      onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, sex: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={newAdmissionForm.address}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, address: e.target.value })}
                    placeholder="e.g. Shivaji Nagar, Wardha"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Clinical Details on Admission */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                2. Clinical Diagnosis & Reason for Admission
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Provisional Diagnosis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmissionForm.provisionalDiagnosis}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, provisionalDiagnosis: e.target.value })}
                    placeholder="e.g. Acute Appendicitis / Fracture Neck Femur / Normal Labour"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Admission</label>
                  <input
                    type="text"
                    value={newAdmissionForm.reasonForAdmission}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, reasonForAdmission: e.target.value })}
                    placeholder="e.g. Planned Surgery / Conservative IV Management"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Known Medical History</label>
                  <input
                    type="text"
                    value={newAdmissionForm.medicalHistory}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, medicalHistory: e.target.value })}
                    placeholder="e.g. DM / HTN / Asthma / None"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Known Drug Allergies</label>
                  <input
                    type="text"
                    value={newAdmissionForm.allergies}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, allergies: e.target.value })}
                    placeholder="e.g. Penicillin / Sulfa / No known drug allergies"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Ward & Bed Allocation */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-blue-600" />
                3. Doctor, Ward & Bed Allocation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consultant Doctor</label>
                  <select
                    value={newAdmissionForm.consultantDoctor}
                    onChange={(e) => {
                      const docObj = DOCTORS.find((d) => d.name === e.target.value);
                      setNewAdmissionForm({
                        ...newAdmissionForm,
                        consultantDoctor: e.target.value,
                        department: docObj?.specialty || newAdmissionForm.department,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none"
                  >
                    {DOCTORS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name} ({d.specialty})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newAdmissionForm.department}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Ward Category</label>
                    <button
                      type="button"
                      onClick={() => setNewAdmissionForm((prev) => ({ ...prev, isCustomWard: !prev.isCustomWard }))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                    >
                      {newAdmissionForm.isCustomWard ? "Choose Standard" : "+ Custom Ward"}
                    </button>
                  </div>
                  {newAdmissionForm.isCustomWard ? (
                    <input
                      type="text"
                      value={newAdmissionForm.customWardName}
                      onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, customWardName: e.target.value })}
                      placeholder="e.g. Special Deluxe, HDU, NICU..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none font-medium"
                    />
                  ) : (
                    <select
                      value={newAdmissionForm.ward}
                      onChange={(e) => {
                        const wName = e.target.value as any;
                        const conf = wardBedConfig.find((w) => w.ward === wName);
                        const firstVacantBed = conf?.beds.find((b) => !occupiedBeds.has(b)) || conf?.beds[0] || "GW-01";
                        setNewAdmissionForm({
                          ...newAdmissionForm,
                          ward: wName,
                          bedNumber: firstVacantBed,
                          dailyRate: conf?.dailyRate || newAdmissionForm.dailyRate,
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none"
                    >
                      {wardBedConfig.map((w) => (
                        <option key={w.ward} value={w.ward}>{w.ward} (₹{w.dailyRate}/day)</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Select Bed Number <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewAdmissionForm((prev) => ({ ...prev, isCustomBed: !prev.isCustomBed }))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                    >
                      {newAdmissionForm.isCustomBed ? "Choose Standard" : "+ Custom Bed"}
                    </button>
                  </div>
                  {newAdmissionForm.isCustomBed ? (
                    <input
                      type="text"
                      value={newAdmissionForm.customBedNumber}
                      onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, customBedNumber: e.target.value })}
                      placeholder="e.g. Bed #204, ICU-05, Extra-1..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono font-bold focus:outline-none"
                    />
                  ) : (
                    <select
                      value={newAdmissionForm.bedNumber}
                      onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, bedNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono font-bold focus:outline-none"
                    >
                      {(() => {
                        const conf = wardBedConfig.find((w) => w.ward === newAdmissionForm.ward);
                        return conf?.beds.map((b) => {
                          const isOcc = occupiedBeds.has(b);
                          return (
                            <option key={b} value={b} disabled={isOcc}>
                              {b} {isOcc ? "— OCCUPIED" : "— VACANT"}
                            </option>
                          );
                        });
                      })()}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date</label>
                  <input
                    type="date"
                    value={newAdmissionForm.admissionDate}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Time</label>
                  <input
                    type="text"
                    value={newAdmissionForm.admissionTime}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, admissionTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Category</label>
                  <select
                    value={newAdmissionForm.paymentCategory}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, paymentCategory: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                  >
                    <option value="Cash">Cash / Self-Pay</option>
                    <option value="TPA / Insurance">TPA / Mediclaim</option>
                    <option value="Ayushman Bharat / MJPJAY">Ayushman Bharat / MJPJAY</option>
                    <option value="Corporate">Corporate Tie-up</option>
                  </select>
                </div>

                {/* EDITABLE CHARGES DURING ADMISSION */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Rate (₹/day) <span className="text-[10px] text-slate-400 font-normal">Editable</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newAdmissionForm.dailyRate}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, dailyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nursing Care (₹/day) <span className="text-[10px] text-slate-400 font-normal">Editable</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newAdmissionForm.nursingRate}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, nursingRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Doctor Round (₹/visit) <span className="text-[10px] text-slate-400 font-normal">Editable</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newAdmissionForm.doctorVisitFee}
                    onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, doctorVisitFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Advance Deposit (₹)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={newAdmissionForm.initialAdvance}
                      onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, initialAdvance: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none"
                    />
                    <select
                      value={newAdmissionForm.advancePaymentMode}
                      onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, advancePaymentMode: e.target.value as any })}
                      className="px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submittingAdmission}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {submittingAdmission ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Admitting...
                  </>
                ) : (
                  <>
                    <Bed className="w-4 h-4" />
                    Confirm Admission & Allocate Bed
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: DISCHARGE ARCHIVE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Discharged Patients Archive</h2>
              <p className="text-xs text-slate-500">
                Completed admissions, discharge summaries, and settled hospital bills.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discharged patient..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none w-full"
              />
            </div>
          </div>

          {dischargedAdmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No discharged inpatient records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">IPD No.</th>
                    <th className="py-3 px-4">UHID</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Consultant Doctor</th>
                    <th className="py-3 px-4">Admitted & Discharged</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Settlement</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dischargedAdmissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{adm.ipdNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{adm.uhid}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{adm.name}</td>
                      <td className="py-3 px-4">{adm.consultantDoctor}</td>
                      <td className="py-3 px-4">
                        {adm.admissionDate} → {adm.dischargeDate || "N/A"} ({calculateStayDays(adm.admissionDate, adm.dischargeDate)} days)
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          {adm.dischargeSummary?.conditionAtDischarge || "Discharged"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {adm.finalSettlement ? `₹${adm.finalSettlement.netTotal.toLocaleString("en-IN")}` : "Settled"}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdmission(adm);
                            setActiveModal("printDischarge");
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-[11px]"
                        >
                          Summary
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdmission(adm);
                            setActiveModal("profile");
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-[11px]"
                        >
                          Stay Chart
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL 0: EDIT INPATIENT ADMISSION, BED & RATES (ADMIN EDITABLE)
      ───────────────────────────────────────────────────────────── */}
      {activeModal === "editAdmission" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-bold text-xs border border-slate-200">
                    {editAdmissionForm.ipdNumber || "IPD"}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-xs border border-slate-200">
                    {editAdmissionForm.uhid}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    Admin Editing Mode
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  Edit Inpatient Details, Bed & Rates: {editAdmissionForm.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Modify ward category, bed number, room & nursing rates, or patient admission info.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal("none")}
                className="w-8 h-8 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* 1. Demographics */}
              <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  1. Patient Demographics & Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Patient Full Name</label>
                    <input
                      type="text"
                      value={editAdmissionForm.name}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editAdmissionForm.phone}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Age</label>
                      <input
                        type="text"
                        value={editAdmissionForm.age}
                        onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, age: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sex</label>
                      <select
                        value={editAdmissionForm.sex}
                        onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, sex: e.target.value as any })}
                        className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={editAdmissionForm.address}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, address: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Ward Category & Bed Selection (Editable) */}
              <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-blue-600" />
                  2. Ward Category & Bed Allocation (Editable)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Ward Category</label>
                      <button
                        type="button"
                        onClick={() => setEditAdmissionForm((prev) => ({ ...prev, isCustomWard: !prev.isCustomWard }))}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        {editAdmissionForm.isCustomWard ? "Choose Standard" : "+ Custom Ward"}
                      </button>
                    </div>
                    {editAdmissionForm.isCustomWard ? (
                      <input
                        type="text"
                        value={editAdmissionForm.ward}
                        onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, ward: e.target.value })}
                        placeholder="e.g. Special Deluxe, HDU, NICU..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-900"
                      />
                    ) : (
                      <select
                        value={editAdmissionForm.ward}
                        onChange={(e) => {
                          const wName = e.target.value;
                          const conf = wardBedConfig.find((w) => w.ward === wName);
                          setEditAdmissionForm({
                            ...editAdmissionForm,
                            ward: wName,
                            dailyRate: conf?.dailyRate || editAdmissionForm.dailyRate,
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                      >
                        {wardBedConfig.map((w) => (
                          <option key={w.ward} value={w.ward}>{w.ward} (₹{w.dailyRate}/day)</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Bed Number</label>
                      <button
                        type="button"
                        onClick={() => setEditAdmissionForm((prev) => ({ ...prev, isCustomBed: !prev.isCustomBed }))}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        {editAdmissionForm.isCustomBed ? "Choose Standard" : "+ Custom Bed ID"}
                      </button>
                    </div>
                    {editAdmissionForm.isCustomBed ? (
                      <input
                        type="text"
                        value={editAdmissionForm.bedNumber}
                        onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, bedNumber: e.target.value })}
                        placeholder="e.g. Bed #204, ICU-05, Extra-1..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold text-slate-900"
                      />
                    ) : (
                      <select
                        value={editAdmissionForm.bedNumber}
                        onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, bedNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold"
                      >
                        <option value={editAdmissionForm.bedNumber}>{editAdmissionForm.bedNumber} (Current)</option>
                        {(() => {
                          const conf = wardBedConfig.find((w) => w.ward === editAdmissionForm.ward);
                          return conf?.beds
                            .filter((b) => b !== editAdmissionForm.bedNumber)
                            .map((b) => {
                              const isOcc = occupiedBeds.has(b);
                              return (
                                <option key={b} value={b} disabled={isOcc}>
                                  {b} {isOcc ? "— OCCUPIED" : "— VACANT"}
                                </option>
                              );
                            });
                        })()}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Charge Rates (Directly Editable by Admin) */}
              <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
                  3. Inpatient Charge Rates (Editable by Admin)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Room / Bed Rate (₹/day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editAdmissionForm.dailyRate}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, dailyRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Daily Nursing Care (₹/day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editAdmissionForm.nursingRatePerDay}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, nursingRatePerDay: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Doctor Round Fee (₹/visit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editAdmissionForm.doctorRatePerVisit}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, doctorRatePerVisit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Doctor, Department & Diagnosis */}
              <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  4. Doctor, Clinical Diagnosis & Dates
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Consultant Doctor</label>
                    <select
                      value={editAdmissionForm.consultantDoctor}
                      onChange={(e) => {
                        const docObj = DOCTORS.find((d) => d.name === e.target.value);
                        setEditAdmissionForm({
                          ...editAdmissionForm,
                          consultantDoctor: e.target.value,
                          department: docObj?.specialty || editAdmissionForm.department,
                        });
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                    >
                      {DOCTORS.map((d) => (
                        <option key={d.name} value={d.name}>{d.name} ({d.specialty})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department</label>
                    <select
                      value={editAdmissionForm.department}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, department: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Category</label>
                    <select
                      value={editAdmissionForm.paymentCategory}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, paymentCategory: e.target.value as any })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="Cash">Cash / Self-Pay</option>
                      <option value="TPA / Insurance">TPA / Mediclaim</option>
                      <option value="Ayushman Bharat / MJPJAY">Ayushman Bharat / MJPJAY</option>
                      <option value="Corporate">Corporate Tie-up</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Admission Date</label>
                    <input
                      type="date"
                      value={editAdmissionForm.admissionDate}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, admissionDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Admission Time</label>
                    <input
                      type="text"
                      value={editAdmissionForm.admissionTime}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, admissionTime: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provisional Diagnosis</label>
                    <input
                      type="text"
                      value={editAdmissionForm.provisionalDiagnosis}
                      onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, provisionalDiagnosis: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setActiveModal("none")}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditAdmission}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: PATIENT CLINICAL STAY PROFILE (TREATMENT & CARE)
      ───────────────────────────────────────────────────────────── */}
      {activeModal === "profile" && activeAdmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono font-bold text-xs">
                    {activeAdmission.ipdNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-xs">
                    {activeAdmission.uhid}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">
                    Bed: {activeAdmission.bedNumber} ({activeAdmission.ward})
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">{activeAdmission.name}</h2>
                <p className="text-xs text-slate-500">
                  {activeAdmission.age}y • {activeAdmission.sex} • Doctor: {activeAdmission.consultantDoctor} • Diagnosis: {activeAdmission.provisionalDiagnosis}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveModal("none");
                  setActiveAdmission(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-200 px-5 pt-3 gap-3 overflow-x-auto text-xs font-bold">
              {[
                { id: "vitals", label: "Vitals Chart", icon: HeartPulse, count: activeAdmission.vitals.length },
                { id: "doctorNotes", label: "Doctor Notes", icon: Stethoscope, count: activeAdmission.doctorNotes.length },
                { id: "meds", label: "Medication MAR", icon: Syringe, count: activeAdmission.medications.length },
                { id: "investigations", label: "Investigations", icon: Activity, count: activeAdmission.investigations.length },
                { id: "procedures", label: "Procedures / OT", icon: FileText, count: activeAdmission.procedures.length },
                { id: "nursing", label: "Nursing Care", icon: ClipboardCheck, count: activeAdmission.nursingNotes.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProfileTab(tab.id as any)}
                  className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                    profileTab === tab.id
                      ? "border-blue-600 text-blue-700 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* VITALS TAB */}
              {profileTab === "vitals" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-wrap items-end gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">BP (mmHg)</label>
                      <input
                        type="text"
                        value={vitalsInput.bp}
                        onChange={(e) => setVitalsInput({ ...vitalsInput, bp: e.target.value })}
                        className="px-2 py-1 text-xs border border-slate-300 rounded w-24"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Pulse (bpm)</label>
                      <input
                        type="text"
                        value={vitalsInput.pulse}
                        onChange={(e) => setVitalsInput({ ...vitalsInput, pulse: e.target.value })}
                        className="px-2 py-1 text-xs border border-slate-300 rounded w-20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Temp (°F)</label>
                      <input
                        type="text"
                        value={vitalsInput.temp}
                        onChange={(e) => setVitalsInput({ ...vitalsInput, temp: e.target.value })}
                        className="px-2 py-1 text-xs border border-slate-300 rounded w-20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">SpO₂ (%)</label>
                      <input
                        type="text"
                        value={vitalsInput.spo2}
                        onChange={(e) => setVitalsInput({ ...vitalsInput, spo2: e.target.value })}
                        className="px-2 py-1 text-xs border border-slate-300 rounded w-20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Recorded By</label>
                      <input
                        type="text"
                        value={vitalsInput.recordedBy}
                        onChange={(e) => setVitalsInput({ ...vitalsInput, recordedBy: e.target.value })}
                        className="px-2 py-1 text-xs border border-slate-300 rounded w-32"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddVitals(activeAdmission.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow transition"
                    >
                      + Record Vitals
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-3">Date & Time</th>
                          <th className="p-3">BP</th>
                          <th className="p-3">Pulse</th>
                          <th className="p-3">Temp</th>
                          <th className="p-3">SpO₂</th>
                          <th className="p-3">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeAdmission.vitals.map((v) => (
                          <tr key={v.id}>
                            <td className="p-3 font-medium">{v.date} ({v.time})</td>
                            <td className="p-3 font-bold text-slate-900">{v.bp}</td>
                            <td className="p-3">{v.pulse} bpm</td>
                            <td className="p-3">{v.temp} °F</td>
                            <td className="p-3 font-bold text-emerald-700">{v.spo2}%</td>
                            <td className="p-3 text-slate-500">{v.recordedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DOCTOR NOTES TAB */}
              {profileTab === "doctorNotes" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Consulting Doctor</label>
                        <select
                          value={doctorNoteInput.doctor}
                          onChange={(e) => setDoctorNoteInput({ ...doctorNoteInput, doctor: e.target.value })}
                          className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white"
                        >
                          {DOCTORS.map((d) => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Clinical Progress Note</label>
                        <input
                          type="text"
                          value={doctorNoteInput.note}
                          onChange={(e) => setDoctorNoteInput({ ...doctorNoteInput, note: e.target.value })}
                          placeholder="e.g. Afebrile, wound clean, drain minimal, vitals stable."
                          className="w-full p-1.5 text-xs border border-slate-300 rounded"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Treatment Plan / Orders</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={doctorNoteInput.plan}
                            onChange={(e) => setDoctorNoteInput({ ...doctorNoteInput, plan: e.target.value })}
                            placeholder="e.g. Start oral fluids, mobilised with walker."
                            className="w-full p-1.5 text-xs border border-slate-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDoctorNote(activeAdmission.id)}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs whitespace-nowrap shadow"
                          >
                            + Add Round Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeAdmission.doctorNotes.map((dn) => (
                      <div key={dn.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-900">{dn.doctor}</span>
                          <span className="text-slate-400 font-mono">{dn.date} • {dn.time}</span>
                        </div>
                        <p className="text-xs text-slate-700">{dn.note}</p>
                        {dn.plan && (
                          <p className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                            Plan: {dn.plan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MEDICATION MAR TAB */}
              {profileTab === "meds" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-wrap items-end gap-2.5">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Medicine & Strength</label>
                      <input
                        type="text"
                        value={medInput.name}
                        onChange={(e) => setMedInput({ ...medInput, name: e.target.value })}
                        placeholder="e.g. Inj. Ceftriaxone 1g"
                        className="w-full p-1.5 text-xs border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Route</label>
                      <select
                        value={medInput.route}
                        onChange={(e) => setMedInput({ ...medInput, route: e.target.value })}
                        className="p-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="Oral">Oral</option>
                        <option value="IV">IV</option>
                        <option value="IM">IM</option>
                        <option value="Infusion">Infusion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Frequency</label>
                      <select
                        value={medInput.frequency}
                        onChange={(e) => setMedInput({ ...medInput, frequency: e.target.value })}
                        className="p-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="OD">OD (Once daily)</option>
                        <option value="BD">BD (Twice daily)</option>
                        <option value="TDS">TDS (Thrice daily)</option>
                        <option value="SOS">SOS (As needed)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Timing</label>
                      <input
                        type="text"
                        value={medInput.timing}
                        onChange={(e) => setMedInput({ ...medInput, timing: e.target.value })}
                        placeholder="e.g. Morning & Night"
                        className="p-1.5 text-xs border border-slate-300 rounded w-36"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddMedication(activeAdmission.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow"
                    >
                      + Add Medication
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-3">Medicine Name</th>
                          <th className="p-3">Route</th>
                          <th className="p-3">Frequency</th>
                          <th className="p-3">Timing</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeAdmission.medications.map((m) => (
                          <tr key={m.id}>
                            <td className="p-3 font-bold text-slate-900">{m.name}</td>
                            <td className="p-3 font-mono">{m.route}</td>
                            <td className="p-3 font-semibold text-blue-700">{m.frequency}</td>
                            <td className="p-3 text-slate-600">{m.timing}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* INVESTIGATIONS TAB */}
              {profileTab === "investigations" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-wrap items-end gap-2.5">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Investigation Test / Imaging</label>
                      <input
                        type="text"
                        value={investigationInput.name}
                        onChange={(e) => setInvestigationInput({ ...investigationInput, name: e.target.value })}
                        placeholder="e.g. Serum Electrolytes / Digital X-Ray"
                        className="w-full p-1.5 text-xs border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Charge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={investigationInput.cost}
                        onChange={(e) => setInvestigationInput({ ...investigationInput, cost: Number(e.target.value) })}
                        className="p-1.5 text-xs border border-slate-300 rounded w-24"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddInvestigation(activeAdmission.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow"
                    >
                      + Order Test
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-3">Investigation Name</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeAdmission.investigations.map((inv) => (
                          <tr key={inv.id}>
                            <td className="p-3 font-bold text-slate-900">{inv.name}</td>
                            <td className="p-3 text-slate-500">{inv.date}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800">₹{inv.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PROCEDURES TAB */}
              {profileTab === "procedures" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Procedure / Surgery Name</label>
                        <input
                          type="text"
                          value={procedureInput.name}
                          onChange={(e) => setProcedureInput({ ...procedureInput, name: e.target.value })}
                          placeholder="e.g. Major Dressing / Implant Removal / Knee Arthroscopy"
                          className="w-full p-1.5 text-xs border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Surgeon / Doctor</label>
                        <select
                          value={procedureInput.surgeon}
                          onChange={(e) => setProcedureInput({ ...procedureInput, surgeon: e.target.value })}
                          className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white"
                        >
                          {DOCTORS.map((d) => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Procedure Charge (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={procedureInput.cost}
                          onChange={(e) => setProcedureInput({ ...procedureInput, cost: Number(e.target.value) })}
                          className="w-full p-1.5 text-xs border border-slate-300 rounded font-bold"
                        />
                      </div>
                      <div className="md:col-span-4 flex gap-2">
                        <input
                          type="text"
                          value={procedureInput.notes}
                          onChange={(e) => setProcedureInput({ ...procedureInput, notes: e.target.value })}
                          placeholder="Operative notes / findings..."
                          className="w-full p-1.5 text-xs border border-slate-300 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddProcedure(activeAdmission.id)}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs whitespace-nowrap shadow"
                        >
                          + Record Procedure
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeAdmission.procedures.map((p) => (
                      <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-slate-500 text-[11px]">{p.date} • Surgeon: {p.surgeon}</p>
                          {p.notes && <p className="text-slate-600 italic text-[11px] mt-0.5">{p.notes}</p>}
                        </div>
                        <span className="font-mono font-bold text-indigo-700 text-sm">₹{p.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NURSING NOTES TAB */}
              {profileTab === "nursing" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-wrap items-end gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Shift</label>
                      <select
                        value={nursingNoteInput.shift}
                        onChange={(e) => setNursingNoteInput({ ...nursingNoteInput, shift: e.target.value as any })}
                        className="p-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[250px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Care Observations & Notes</label>
                      <input
                        type="text"
                        value={nursingNoteInput.note}
                        onChange={(e) => setNursingNoteInput({ ...nursingNoteInput, note: e.target.value })}
                        placeholder="e.g. IV fluids infused, wound dressing intact, patient comfortable."
                        className="w-full p-1.5 text-xs border border-slate-300 rounded"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddNursingNote(activeAdmission.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow"
                    >
                      + Add Note
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeAdmission.nursingNotes.map((nn) => (
                      <div key={nn.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{nn.shift} Shift • {nn.nurse}</span>
                          <span className="text-slate-400 font-mono">{nn.date}</span>
                        </div>
                        <p className="text-slate-700">{nn.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: RUNNING BILLING & ADVANCES
      ───────────────────────────────────────────────────────────── */}
      {activeModal === "billing" && activeAdmission && (() => {
        const bill = calculateRunningBill(activeAdmission);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-xs">
                      RUNNING BILL
                    </span>
                    <span className="font-mono text-xs text-slate-500">{activeAdmission.ipdNumber} • {activeAdmission.uhid}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-1">{activeAdmission.name}</h2>
                  <p className="text-xs text-slate-500">
                    Stay: {activeAdmission.admissionDate} to Present ({bill.days} days) • Bed: {activeAdmission.bedNumber} ({activeAdmission.ward})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal("none");
                    setActiveAdmission(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-6">
                {/* Balance Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium uppercase">Total Accumulated Charges</span>
                    <p className="text-2xl font-bold text-slate-900">₹{bill.grossTotal.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium uppercase">Total Advances Deposited</span>
                    <p className="text-xl font-bold text-slate-700">− ₹{bill.totalAdvances.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right pl-4 border-l border-slate-200">
                    <span className="text-xs font-semibold uppercase text-slate-600">Net Outstanding Due</span>
                    <p className="text-2xl font-bold text-slate-900">₹{bill.balanceDue.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Section A: Charges Breakdown (MANAGEABLE & EDITABLE) */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-slate-100 gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                        1. Itemized Charge Accumulation (All Charges Editable)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Click &quot;Edit&quot; on any service to modify rates, stay units or set custom overrides. Add lab tests or OT procedures directly.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                      Billable Stay: {bill.days} Days
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Category / Service</th>
                          <th className="p-3">Rate / Rule</th>
                          <th className="p-3">Units</th>
                          <th className="p-3 text-right">Total (₹)</th>
                          <th className="p-3 text-center w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* 1. BED CHARGES */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">Bed & Room Charges</span>
                            <span className="text-[10px] text-slate-500">{activeAdmission.ward} (Bed: {activeAdmission.bedNumber})</span>
                          </td>
                          <td className="p-3 text-slate-600">₹{activeAdmission.dailyRate}/day</td>
                          <td className="p-3">
                            {bill.days} days
                            {activeAdmission.billableDaysOverride && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                                Manual Override
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold font-mono text-right text-slate-900">₹{bill.bedCharges}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChargeKey(editingChargeKey === "bed" ? null : "bed");
                                setChargeEditForm({
                                  ...chargeEditForm,
                                  dailyRate: activeAdmission.dailyRate,
                                  billableDays: bill.days,
                                  bedOverride: activeAdmission.bedChargesOverride || 0,
                                });
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 flex items-center gap-1 mx-auto transition"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              {editingChargeKey === "bed" ? "Cancel" : "Edit"}
                            </button>
                          </td>
                        </tr>

                        {/* Inline Edit Box for Bed Charges */}
                        {editingChargeKey === "bed" && (
                          <tr className="bg-indigo-50/70 border-b border-indigo-200">
                            <td colSpan={5} className="p-3">
                              <div className="flex flex-wrap items-end gap-3 text-xs">
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Daily Rate (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={chargeEditForm.dailyRate}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, dailyRate: Number(e.target.value) })}
                                    className="w-28 p-1.5 border border-indigo-300 rounded font-bold text-xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Billable Days</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={chargeEditForm.billableDays}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, billableDays: Number(e.target.value) })}
                                    className="w-24 p-1.5 border border-indigo-300 rounded font-bold text-xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Or Manual Total Override (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0 (auto-calc)"
                                    value={chargeEditForm.bedOverride || ""}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, bedOverride: Number(e.target.value) })}
                                    className="w-36 p-1.5 border border-indigo-300 rounded text-xs bg-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveChargeOverrides(activeAdmission.id)}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Save Bed Rate
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* 2. NURSING CHARGES */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">Nursing & Daily Inpatient Care</span>
                            <span className="text-[10px] text-slate-500">Standard daily nursing care</span>
                          </td>
                          <td className="p-3 text-slate-600">₹{activeAdmission.nursingRatePerDay}/day</td>
                          <td className="p-3">{bill.days} days</td>
                          <td className="p-3 font-bold font-mono text-right text-slate-900">₹{bill.nursingCharges}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChargeKey(editingChargeKey === "nursing" ? null : "nursing");
                                setChargeEditForm({
                                  ...chargeEditForm,
                                  nursingRate: activeAdmission.nursingRatePerDay,
                                  nursingOverride: activeAdmission.nursingChargesOverride || 0,
                                });
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 flex items-center gap-1 mx-auto transition"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              {editingChargeKey === "nursing" ? "Cancel" : "Edit"}
                            </button>
                          </td>
                        </tr>

                        {/* Inline Edit Box for Nursing Charges */}
                        {editingChargeKey === "nursing" && (
                          <tr className="bg-indigo-50/70 border-b border-indigo-200">
                            <td colSpan={5} className="p-3">
                              <div className="flex flex-wrap items-end gap-3 text-xs">
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Nursing Rate/Day (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={chargeEditForm.nursingRate}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, nursingRate: Number(e.target.value) })}
                                    className="w-28 p-1.5 border border-indigo-300 rounded font-bold text-xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Or Manual Total Override (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0 (auto-calc)"
                                    value={chargeEditForm.nursingOverride || ""}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, nursingOverride: Number(e.target.value) })}
                                    className="w-36 p-1.5 border border-indigo-300 rounded text-xs bg-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveChargeOverrides(activeAdmission.id)}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Save Nursing Rate
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* 3. DOCTOR ROUNDS */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">Consultant Doctor Rounds</span>
                            <span className="text-[10px] text-slate-500">{activeAdmission.consultantDoctor}</span>
                          </td>
                          <td className="p-3 text-slate-600">₹{activeAdmission.doctorRatePerVisit}/visit</td>
                          <td className="p-3">{bill.doctorVisitsCount} visits</td>
                          <td className="p-3 font-bold font-mono text-right text-slate-900">₹{bill.doctorCharges}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChargeKey(editingChargeKey === "doctor" ? null : "doctor");
                                setChargeEditForm({
                                  ...chargeEditForm,
                                  doctorRate: activeAdmission.doctorRatePerVisit,
                                  doctorVisits: bill.doctorVisitsCount,
                                  doctorOverride: activeAdmission.doctorChargesOverride || 0,
                                });
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 flex items-center gap-1 mx-auto transition"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              {editingChargeKey === "doctor" ? "Cancel" : "Edit"}
                            </button>
                          </td>
                        </tr>

                        {/* Inline Edit Box for Doctor Rounds */}
                        {editingChargeKey === "doctor" && (
                          <tr className="bg-indigo-50/70 border-b border-indigo-200">
                            <td colSpan={5} className="p-3">
                              <div className="flex flex-wrap items-end gap-3 text-xs">
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Rate Per Visit (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={chargeEditForm.doctorRate}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, doctorRate: Number(e.target.value) })}
                                    className="w-28 p-1.5 border border-indigo-300 rounded font-bold text-xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Number of Visits</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={chargeEditForm.doctorVisits}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, doctorVisits: Number(e.target.value) })}
                                    className="w-24 p-1.5 border border-indigo-300 rounded font-bold text-xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-indigo-900 uppercase">Or Total Override (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0 (auto-calc)"
                                    value={chargeEditForm.doctorOverride || ""}
                                    onChange={(e) => setChargeEditForm({ ...chargeEditForm, doctorOverride: Number(e.target.value) })}
                                    className="w-36 p-1.5 border border-indigo-300 rounded text-xs bg-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveChargeOverrides(activeAdmission.id)}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Save Doctor Charges
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* 4. INVESTIGATIONS - ITEMIZED */}
                        {activeAdmission.investigations.map((inv) => (
                          <tr key={inv.id} className="bg-blue-50/20 hover:bg-blue-50/40">
                            <td className="p-3">
                              <span className="font-semibold text-slate-800 block">🔬 Lab: {inv.name}</span>
                              <span className="text-[10px] text-slate-500">Ordered: {inv.date} ({inv.status})</span>
                            </td>
                            <td className="p-3 text-slate-500">Diagnostic Test</td>
                            <td className="p-3">1 Test</td>
                            <td className="p-3 font-bold font-mono text-right text-slate-900">
                              {editingInvestigation?.id === inv.id ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={editingInvestigation.cost}
                                  onChange={(e) => setEditingInvestigation({ ...editingInvestigation, cost: Number(e.target.value) })}
                                  className="w-20 p-1 border border-blue-400 rounded text-right font-bold text-xs"
                                />
                              ) : (
                                `₹${inv.cost}`
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {editingInvestigation?.id === inv.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateInvestigation(activeAdmission.id)}
                                    className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingInvestigation({ id: inv.id, name: inv.name, cost: inv.cost })}
                                    className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100"
                                    title="Edit test price"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvestigation(activeAdmission.id, inv.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                  title="Remove test charge"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* 5. PROCEDURES - ITEMIZED */}
                        {activeAdmission.procedures.map((proc) => (
                          <tr key={proc.id} className="bg-emerald-50/20 hover:bg-emerald-50/40">
                            <td className="p-3">
                              <span className="font-semibold text-slate-800 block">⚕️ OT: {proc.name}</span>
                              <span className="text-[10px] text-slate-500">Surgeon: {proc.surgeon} • Date: {proc.date}</span>
                            </td>
                            <td className="p-3 text-slate-500">OT & Surgeon Fee</td>
                            <td className="p-3">1 Proc</td>
                            <td className="p-3 font-bold font-mono text-right text-slate-900">
                              {editingProcedure?.id === proc.id ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={editingProcedure.cost}
                                  onChange={(e) => setEditingProcedure({ ...editingProcedure, cost: Number(e.target.value) })}
                                  className="w-24 p-1 border border-emerald-400 rounded text-right font-bold text-xs"
                                />
                              ) : (
                                `₹${proc.cost}`
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {editingProcedure?.id === proc.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateProcedure(activeAdmission.id)}
                                    className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingProcedure({ id: proc.id, name: proc.name, cost: proc.cost, surgeon: proc.surgeon })}
                                    className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100"
                                    title="Edit procedure cost"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProcedure(activeAdmission.id, proc.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                  title="Remove procedure charge"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* 6. CUSTOM CHARGES / PHARMACY */}
                        {activeAdmission.customCharges.map((cc) => (
                          <tr key={cc.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              {editingCustomCharge?.id === cc.id ? (
                                <input
                                  type="text"
                                  value={editingCustomCharge.description}
                                  onChange={(e) => setEditingCustomCharge({ ...editingCustomCharge, description: e.target.value })}
                                  className="w-full p-1 border border-slate-300 rounded text-xs font-semibold"
                                />
                              ) : (
                                <span className="font-semibold text-slate-800 block">{cc.description}</span>
                              )}
                              <span className="text-[10px] text-slate-500">Category: {cc.category}</span>
                            </td>
                            <td className="p-3 text-slate-500">{cc.category}</td>
                            <td className="p-3">{cc.date}</td>
                            <td className="p-3 font-bold font-mono text-right text-slate-900">
                              {editingCustomCharge?.id === cc.id ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={editingCustomCharge.amount}
                                  onChange={(e) => setEditingCustomCharge({ ...editingCustomCharge, amount: Number(e.target.value) })}
                                  className="w-20 p-1 border border-slate-400 rounded text-right font-bold text-xs"
                                />
                              ) : (
                                `₹${cc.amount}`
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {editingCustomCharge?.id === cc.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCustomCharge(activeAdmission.id)}
                                    className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingCustomCharge(cc)}
                                    className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100"
                                    title="Edit charge"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomCharge(activeAdmission.id, cc.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                  title="Delete charge"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* QUICK ADD CHARGE CONTROLS */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Add Investigation Charge Box */}
                    <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-3 space-y-2 text-xs">
                      <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
                        + Add Lab Test / Investigation Charge
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newInvBilling.name}
                          onChange={(e) => setNewInvBilling({ ...newInvBilling, name: e.target.value })}
                          placeholder="e.g. Serum Electrolytes / MRI Spine"
                          className="flex-1 p-1.5 border border-blue-300 rounded text-xs bg-white"
                        />
                        <input
                          type="number"
                          min="0"
                          value={newInvBilling.cost}
                          onChange={(e) => setNewInvBilling({ ...newInvBilling, cost: Number(e.target.value) })}
                          className="w-20 p-1.5 border border-blue-300 rounded font-bold text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddInvestigationCharge(activeAdmission.id)}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-xs"
                        >
                          Add Test
                        </button>
                      </div>
                    </div>

                    {/* Add OT Procedure Charge Box */}
                    <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3 space-y-2 text-xs">
                      <span className="text-[11px] font-bold text-emerald-900 block flex items-center gap-1">
                        + Add OT Surgery / Procedure Charge
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newProcBilling.name}
                          onChange={(e) => setNewProcBilling({ ...newProcBilling, name: e.target.value })}
                          placeholder="e.g. Wound Debridement / Arthroscopy"
                          className="flex-1 p-1.5 border border-emerald-300 rounded text-xs bg-white"
                        />
                        <input
                          type="number"
                          min="0"
                          value={newProcBilling.cost}
                          onChange={(e) => setNewProcBilling({ ...newProcBilling, cost: Number(e.target.value) })}
                          className="w-20 p-1.5 border border-emerald-300 rounded font-bold text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddProcedureCharge(activeAdmission.id)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs"
                        >
                          Add Proc
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Add Misc / Pharmacy / Consumable Charge Form */}
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-end gap-2 text-xs">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Description</label>
                      <input
                        type="text"
                        value={chargeInput.description}
                        onChange={(e) => setChargeInput({ ...chargeInput, description: e.target.value })}
                        placeholder="e.g. Oxygen Cylinder / Consumables / Ambulance"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Category</label>
                      <select
                        value={chargeInput.category}
                        onChange={(e) => setChargeInput({ ...chargeInput, category: e.target.value })}
                        className="p-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="Consumables">Consumables</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Oxygen">Oxygen</option>
                        <option value="Ambulance">Ambulance</option>
                        <option value="Nursing / Dressing">Nursing / Dressing</option>
                        <option value="Other">Other Service</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={chargeInput.amount}
                        onChange={(e) => setChargeInput({ ...chargeInput, amount: Number(e.target.value) })}
                        className="w-24 p-1.5 border border-slate-300 rounded text-xs font-bold bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCustomCharge(activeAdmission.id)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded font-bold text-xs shadow"
                    >
                      + Add Misc Charge
                    </button>
                  </div>
                </div>

                {/* Section B: Advances Paid Ledger */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. Advance Payments & Deposits Ledger
                  </h3>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Receipt No.</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Payment Mode</th>
                          <th className="p-3">Notes</th>
                          <th className="p-3 text-right">Amount (₹)</th>
                          <th className="p-3 text-center w-32">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeAdmission.advances.map((adv) => (
                          <tr key={adv.id}>
                            <td className="p-3 font-mono font-bold text-slate-900">{adv.receiptNumber}</td>
                            <td className="p-3 text-slate-600">{adv.date}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-[11px]">
                                {adv.mode}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{adv.notes || "—"}</td>
                            <td className="p-3 font-bold font-mono text-teal-700 text-right">₹{adv.amount}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintReceiptData({
                                      patient: activeAdmission,
                                      advance: adv,
                                    });
                                    setActiveModal("printReceipt");
                                  }}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px]"
                                >
                                  Slip
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdvance(activeAdmission.id, adv.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                  title="Remove advance record"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Record New Advance Form */}
                  <div className="mt-3 bg-teal-50/60 border border-teal-200 rounded-xl p-3.5 flex flex-wrap items-end gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-teal-800 uppercase">Collect Advance (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={advanceInput.amount}
                        onChange={(e) => setAdvanceInput({ ...advanceInput, amount: Number(e.target.value) })}
                        className="w-28 p-1.5 border border-teal-300 rounded font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-teal-800 uppercase">Mode</label>
                      <select
                        value={advanceInput.mode}
                        onChange={(e) => setAdvanceInput({ ...advanceInput, mode: e.target.value as any })}
                        className="p-1.5 border border-teal-300 rounded bg-white text-xs"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI (GPay / PhonePe)</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[10px] font-bold text-teal-800 uppercase">Remarks</label>
                      <input
                        type="text"
                        value={advanceInput.notes}
                        onChange={(e) => setAdvanceInput({ ...advanceInput, notes: e.target.value })}
                        placeholder="e.g. Surgery advance deposit"
                        className="w-full p-1.5 border border-teal-300 rounded text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRecordAdvance(activeAdmission.id)}
                      className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-bold text-xs shadow flex items-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Record & Print Receipt
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    initDischargeFormForAdmission(activeAdmission);
                    setActiveModal("discharge");
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Proceed to Final Discharge & Settlement →
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal("none");
                    setActiveAdmission(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: DISCHARGE SUMMARY & SETTLEMENT
      ───────────────────────────────────────────────────────────── */}
      {activeModal === "discharge" && activeAdmission && (() => {
        const bill = calculateRunningBill(activeAdmission);
        const discount = Number(dischargeForm.discount) || 0;
        const netTotal = Math.max(0, bill.grossTotal - discount);
        const finalBalance = netTotal - bill.totalAdvances;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono font-bold text-xs">
                      DISCHARGE WORKFLOW
                    </span>
                    <span className="font-mono text-xs text-slate-500">{activeAdmission.ipdNumber} • {activeAdmission.uhid}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-1">Discharge & Settle: {activeAdmission.name}</h2>
                  <p className="text-xs text-slate-500">
                    Bed {activeAdmission.bedNumber} ({activeAdmission.ward}) • Doctor: {activeAdmission.consultantDoctor}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal("none");
                    setActiveAdmission(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
                {/* Section 1: Discharge Summary */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs">
                    1. Clinical Discharge Summary
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Discharge Date</label>
                      <input
                        type="date"
                        value={dischargeForm.dischargeDate}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Condition at Discharge</label>
                      <select
                        value={dischargeForm.conditionAtDischarge}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, conditionAtDischarge: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Cured / Stable">Cured / Stable</option>
                        <option value="Improved">Improved</option>
                        <option value="Transferred to Higher Centre">Transferred to Higher Centre</option>
                        <option value="LAMA (Left Against Medical Advice)">LAMA</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">Final Diagnosis</label>
                      <input
                        type="text"
                        value={dischargeForm.finalDiagnosis}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                        placeholder="Final clinical diagnosis"
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">Treatment Given During Stay</label>
                      <textarea
                        rows={2}
                        value={dischargeForm.treatmentGiven}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentGiven: e.target.value })}
                        placeholder="Summary of surgeries, IV medications, and care provided..."
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-600 font-semibold mb-1">Discharge Medications (To Continue at Home)</label>
                      <textarea
                        rows={2}
                        value={dischargeForm.dischargeMeds}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeMeds: e.target.value })}
                        placeholder="Medications, dosages, timings..."
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Next Follow-up Date</label>
                      <input
                        type="date"
                        value={dischargeForm.followupDate}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, followupDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Diet / Activity Advice</label>
                      <input
                        type="text"
                        value={dischargeForm.doctorNotes}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, doctorNotes: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Financial Settlement */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs">
                    2. Final Financial Settlement
                  </h3>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Accumulated IPD Charges ({bill.days} days):</span>
                      <span className="font-bold font-mono">₹{bill.grossTotal.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Less: Approved Hospital Discount:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={dischargeForm.discount}
                          onChange={(e) => setDischargeForm({ ...dischargeForm, discount: Number(e.target.value) })}
                          className="w-20 p-1 border border-slate-300 rounded text-right font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center font-bold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Net Final Bill:</span>
                      <span className="font-mono text-sm">₹{netTotal.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between items-center text-teal-800">
                      <span>Less: Advance Payments Deposited:</span>
                      <span className="font-mono font-bold">− ₹{bill.totalAdvances.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between items-center font-black text-rose-700 text-sm pt-2 border-t border-slate-200">
                      <span>Final Balance to Settle:</span>
                      <span className="font-mono text-base">₹{finalBalance.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-slate-700 font-semibold">Payment Mode for Final Settlement:</label>
                    <select
                      value={dischargeForm.finalPaymentMode}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, finalPaymentMode: e.target.value as any })}
                      className="p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="TPA / Claim Settled">TPA / Claim Settled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleFinalizeDischarge(activeAdmission.id)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Discharge & Release Bed {activeAdmission.bedNumber}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal("none");
                    setActiveAdmission(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: PRINT ADVANCE RECEIPT
      ───────────────────────────────────────────────────────────── */}
      {activeModal === "printReceipt" && printReceiptData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center border-b border-slate-200 pb-3">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">CORTEX HOSPITAL</h2>
              <p className="text-[11px] text-slate-500">Official Inpatient Advance Payment Receipt</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-mono font-bold text-slate-900">{printReceiptData.advance.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-bold">{printReceiptData.advance.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-bold text-slate-900">{printReceiptData.patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UHID / IPD No:</span>
                <span className="font-mono">{printReceiptData.patient.uhid} • {printReceiptData.patient.ipdNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bed:</span>
                <span>{printReceiptData.patient.bedNumber} ({printReceiptData.patient.ward})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold">{printReceiptData.advance.mode}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                <span className="font-bold">Advance Amount Received:</span>
                <span className="font-black font-mono text-base">₹{printReceiptData.advance.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal("none");
                  setPrintReceiptData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: PRINT BED TICKET / ADMISSION CARD
      ───────────────────────────────────────────────────────────── */}
      {activeModal === "printTicket" && activeAdmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center border-b border-slate-200 pb-3">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">CORTEX HOSPITAL & RESEARCH CENTRE</h2>
              <p className="text-[11px] text-slate-500">INPATIENT ADMISSION CARD & BED TICKET</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase block">IPD Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeAdmission.ipdNumber}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase block">UHID</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeAdmission.uhid}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Patient Name:</span>
                <span className="font-bold text-slate-900">{activeAdmission.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Age / Sex / Mobile:</span>
                <span>{activeAdmission.age}y • {activeAdmission.sex} • {activeAdmission.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Admission Date & Time:</span>
                <span>{activeAdmission.admissionDate} ({activeAdmission.admissionTime})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Consultant Doctor:</span>
                <span className="font-bold">{activeAdmission.consultantDoctor}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Allocated Bed:</span>
                <span className="font-black text-indigo-700">{activeAdmission.bedNumber} ({activeAdmission.ward})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Category:</span>
                <span>{activeAdmission.paymentCategory}</span>
              </div>
              <div className="col-span-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                <span className="text-[10px] text-indigo-800 font-bold uppercase block">Provisional Diagnosis:</span>
                <span className="text-slate-900 font-medium">{activeAdmission.provisionalDiagnosis}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Bed Ticket
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal("none");
                  setActiveAdmission(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 6: PRINT DISCHARGE SUMMARY
      ───────────────────────────────────────────────────────────── */}
      {activeModal === "printDischarge" && activeAdmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Top Header Bar */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  Official Prescription-Format Summary
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Discharge Summary: {activeAdmission.name} ({activeAdmission.ipdNumber})
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Signature Mode Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={dischargeIncludeSignature}
                    onChange={(e) => setDischargeIncludeSignature(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                  />
                  <span>{dischargeIncludeSignature ? "✓ Doctor Signature Included" : "Without Sign (Name Only)"}</span>
                </label>

                <button
                  type="button"
                  onClick={() => window.open(`/print-discharge?id=${activeAdmission.id}&includeSignature=${dischargeIncludeSignature}`, "_blank")}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print A4 Document
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal("none");
                    setActiveAdmission(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview Box (Prescription Format) */}
            <div className="p-6 overflow-y-auto flex-1 font-sans text-xs bg-slate-100">
              <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm space-y-4 max-w-2xl mx-auto">
                {/* Header with Logo & Doctor Details */}
                <div className="flex justify-between items-start pb-3 border-b-2 border-slate-300">
                  <img src="/cortex_logo.png" alt="Cortex Hospital" className="h-12 w-auto object-contain" />
                  <div className="text-right">
                    {(activeAdmission.consultantDoctor || "").toLowerCase().includes("shillpa") ? (
                      <>
                        <h3 className="text-base font-extrabold text-[#7B1828]">Dr. Shillpa Raut</h3>
                        <p className="text-[11px] font-bold text-slate-900">M.B.B.S., M.D. (Gynecology &amp; Obstetrics)</p>
                        <p className="text-[10px] text-slate-500">Reg. No. 2004/05/1842 • Consulting Gynecologist</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-base font-extrabold text-[#7B1828]">{activeAdmission.consultantDoctor || "Dr. Vipeen Raut"}</h3>
                        <p className="text-[11px] font-bold text-slate-900">M.B.B.S., Dip.Ortho., DNB Ortho</p>
                        <p className="text-[10px] text-slate-500">Reg. No. 1692/03/2002 • Consulting Orthopaedic Surgeon</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Document Banner */}
                <div className="text-center bg-slate-50 border border-slate-200 py-1 rounded">
                  <span className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                    Inpatient Discharge Summary &amp; Clinical Report
                  </span>
                </div>

                {/* Patient Information Bar */}
                <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-200">
                  <div>
                    <span className="font-mono text-slate-600">{activeAdmission.uhid}</span> •{" "}
                    <span className="font-mono font-bold text-slate-900">{activeAdmission.ipdNumber}</span> :{" "}
                    <strong className="text-slate-900 text-sm">MR./MRS. {activeAdmission.name.toUpperCase()}</strong>{" "}
                    <span>({activeAdmission.age} Y, {activeAdmission.sex})</span>
                    {activeAdmission.phone && <span> - Ph: {activeAdmission.phone}</span>}
                  </div>
                  <div className="text-right font-bold text-slate-800">
                    {activeAdmission.ward} (Bed {activeAdmission.bedNumber})
                  </div>
                </div>

                {/* Stay Metadata Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px]">DOA (Admission)</span>
                    <span className="font-bold">{activeAdmission.admissionDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DOD (Discharge)</span>
                    <span className="font-bold text-slate-900">{activeAdmission.dischargeDate || new Date().toISOString().split("T")[0]}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Stay Duration</span>
                    <span className="font-bold">{calculateStayDays(activeAdmission.admissionDate, activeAdmission.dischargeDate)} Days</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Department</span>
                    <span className="font-bold">{activeAdmission.department || "Orthopaedics"}</span>
                  </div>
                </div>

                {/* Clinical Section: Diagnosis */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                    1. Clinical Diagnosis
                  </div>
                  <div className="p-3 space-y-1 text-xs">
                    <p>
                      <strong>Final Diagnosis : </strong>
                      <span className="font-extrabold text-slate-900">
                        {activeAdmission.dischargeSummary?.finalDiagnosis || activeAdmission.provisionalDiagnosis}
                      </span>
                    </p>
                    {activeAdmission.reasonForAdmission && (
                      <p className="text-[11px] text-slate-600">
                        <strong>Reason for Admission : </strong>{activeAdmission.reasonForAdmission}
                      </p>
                    )}
                    {(activeAdmission.medicalHistory || activeAdmission.allergies) && (
                      <p className="text-[10px] text-slate-500 pt-0.5">
                        {activeAdmission.medicalHistory && <span><strong>History: </strong>{activeAdmission.medicalHistory} </span>}
                        {activeAdmission.allergies && <span className="text-red-700 font-bold">• <strong>Allergies: </strong>{activeAdmission.allergies}</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Clinical Section: Surgeries / Procedures Done During Stay */}
                {activeAdmission.procedures && activeAdmission.procedures.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                      2. Surgeries / Procedures Performed
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600">
                            <th className="p-2">Procedure</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Operating Surgeon / Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeAdmission.procedures.map((proc, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="p-2 font-bold text-slate-900">{proc.name}</td>
                              <td className="p-2 font-mono text-slate-600">{proc.date}</td>
                              <td className="p-2 text-slate-700">{proc.surgeon} {proc.notes ? `(${proc.notes})` : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Clinical Section: Hospital Course & Treatment */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                    Hospital Course &amp; Treatment Given
                  </div>
                  <div className="p-3 text-xs text-slate-800 leading-relaxed">
                    {activeAdmission.dischargeSummary?.treatmentGiven ||
                      `Managed with inpatient supportive clinical and medical care in ${activeAdmission.ward}.`}
                  </div>
                </div>

                {/* Clinical Section: Key Investigations */}
                {activeAdmission.investigations && activeAdmission.investigations.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                      Investigations Performed
                    </div>
                    <div className="p-2.5 flex flex-wrap gap-2 text-[11px]">
                      {activeAdmission.investigations.map((inv, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-700">
                          <strong>{inv.name}</strong> ({inv.date}){inv.result ? `: ${inv.result}` : ` [${inv.status}]`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discharge Medications (Rx) Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1 flex items-center justify-between border-b border-slate-200">
                    <span className="text-[11px] font-black text-slate-900">
                      ℞ DISCHARGE MEDICATIONS (TO CONTINUE AT HOME)
                    </span>
                    <span className="text-[10px] text-slate-500 italic">As Prescribed</span>
                  </div>
                  <div className="p-3 text-xs">
                    <p className="whitespace-pre-line leading-relaxed font-mono text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200">
                      {activeAdmission.dischargeSummary?.dischargeMeds || "Continue prescribed oral medications."}
                    </p>
                  </div>
                </div>

                {/* Condition at Discharge & Follow-up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">Condition at Discharge:</span>
                    <span className="font-bold text-slate-900">{activeAdmission.dischargeSummary?.conditionAtDischarge || "Cured / Stable"}</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-200">
                    <span className="text-[10px] font-extrabold text-indigo-800 uppercase block">Follow-up Review (फेरतपासणी):</span>
                    <span className="font-bold text-slate-900">{activeAdmission.dischargeSummary?.followupDate || "After 7 days in OPD"}</span>
                  </div>
                </div>

                {/* Advice & Warning */}
                {activeAdmission.dischargeSummary?.doctorNotes && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Diet &amp; Post-Discharge Instructions:</span>
                    <p className="text-slate-800 mt-0.5">{activeAdmission.dischargeSummary.doctorNotes}</p>
                  </div>
                )}

                {/* Doctor Signature & Hospital Footer */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-[10px] text-red-700 font-semibold max-w-sm">
                    * Emergency: Report immediately to Cortex Hospital Casualty in case of high fever, acute pain, or bleeding.
                  </div>
                  <div className="text-center min-w-[130px]">
                    {dischargeIncludeSignature && (
                      <img src="/sign.png" alt="Signature" className="h-9 mx-auto object-contain" />
                    )}
                    <div className="font-bold text-xs text-slate-900 mt-1">{activeAdmission.consultantDoctor || "Dr. Vipeen Raut"}</div>
                    <div className="text-[10px] text-slate-500">Authorized Consultant</div>
                    {!dischargeIncludeSignature && (
                      <div className="text-[9px] text-slate-400 italic mt-0.5">(Name only, no sign image)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer Actions */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <span className="text-xs text-slate-500">
                A4 official letterhead template with watermark &amp; doctor credentials.
              </span>
              <div className="flex items-center gap-3">
                {/* Signature Mode Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={dischargeIncludeSignature}
                    onChange={(e) => setDischargeIncludeSignature(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                  />
                  <span>{dischargeIncludeSignature ? "✓ Doctor Signature Included" : "Without Sign (Name Only)"}</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal("none");
                    setActiveAdmission(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/print-discharge?id=${activeAdmission.id}&includeSignature=${dischargeIncludeSignature}`, "_blank")}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  Print Official Discharge Summary (A4)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 6: EDIT WARD & BED OCCUPANCY MATRIX & RATES
      ───────────────────────────────────────────────────────────── */}
      {showBedConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Settings className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Configure & Edit Bed Matrix & Daily Rates</h2>
                  <p className="text-xs text-slate-500">
                    Add new beds, remove vacant beds, and customize room rates per ward category.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBedConfigModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* 1. Daily Room Rates per Ward */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-3 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  1. Ward Daily Room Rates
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {wardBedConfig.map((w) => (
                    <div key={w.ward} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{w.ward}</span>
                        <span className="text-[11px] text-slate-500">{w.beds.length} Total Beds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">₹</span>
                        <input
                          type="number"
                          min="100"
                          step="100"
                          defaultValue={w.dailyRate}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0 && val !== w.dailyRate) {
                              handleUpdateWardRate(w.ward, val);
                            }
                          }}
                          className="w-24 p-1.5 border border-slate-300 rounded font-bold text-xs bg-white text-right"
                        />
                        <span className="text-[10px] text-slate-400">/day</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Add New Bed to Ward */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  2. Add New Bed to Matrix
                </h3>
                <form onSubmit={handleAddBed} className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-1">Ward Category</label>
                    <select
                      value={newBedForm.ward}
                      onChange={(e) => setNewBedForm({ ...newBedForm, ward: e.target.value })}
                      className="p-1.5 border border-indigo-300 rounded text-xs bg-white font-medium"
                    >
                      {wardBedConfig.map((w) => (
                        <option key={w.ward} value={w.ward}>{w.ward}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-1">Bed Number / Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GW-07 / ICU-03"
                      value={newBedForm.bedNumber}
                      onChange={(e) => setNewBedForm({ ...newBedForm, bedNumber: e.target.value })}
                      className="p-1.5 border border-indigo-300 rounded text-xs font-mono font-bold bg-white w-32 uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow"
                  >
                    + Add Bed
                  </button>
                </form>
              </div>

              {/* 3. Manage Existing Beds (Delete Vacant) */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-3 flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-blue-600" />
                  3. All Beds in Matrix
                </h3>
                <div className="space-y-3">
                  {wardBedConfig.map((w) => (
                    <div key={w.ward} className="border border-slate-200 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800 text-xs">{w.ward}</span>
                        <span className="text-[11px] text-slate-500 font-mono">₹{w.dailyRate}/day</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {w.beds.map((b) => {
                          const occ = occupiedBeds.get(b);
                          return (
                            <div
                              key={b}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                                occ
                                  ? "bg-amber-50 border-amber-300 text-amber-900"
                                  : "bg-slate-50 border-slate-200 text-slate-700"
                              }`}
                            >
                              <span className="font-mono font-bold">{b}</span>
                              {occ ? (
                                <span className="text-[10px] font-medium text-amber-700">({occ.name.split(" ")[0]})</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBed(w.ward, b)}
                                  className="text-slate-400 hover:text-red-600 transition"
                                  title="Delete vacant bed"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetBedConfig}
                className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-900 font-semibold"
              >
                Reset to Hospital Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowBedConfigModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 7: TRANSFER PATIENT BED
      ───────────────────────────────────────────────────────────── */}
      {transferModal.isOpen && transferModal.admission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <ArrowLeftRight className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Transfer Inpatient Bed</h3>
                  <p className="text-[11px] text-slate-500">{transferModal.admission.name} • {transferModal.admission.uhid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModal({ isOpen: false, admission: null, targetWard: "", targetBed: "" })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Allocation</span>
                <p className="font-bold text-slate-900">
                  Bed {transferModal.admission.bedNumber} ({transferModal.admission.ward}) • ₹{transferModal.admission.dailyRate}/day
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Ward Category</label>
                <select
                  value={transferModal.targetWard}
                  onChange={(e) => {
                    const wName = e.target.value;
                    const conf = wardBedConfig.find((w) => w.ward === wName);
                    const firstVacant = conf?.beds.find((b) => !occupiedBeds.has(b)) || "";
                    setTransferModal({
                      ...transferModal,
                      targetWard: wName,
                      targetBed: firstVacant,
                    });
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white"
                >
                  {wardBedConfig.map((w) => (
                    <option key={w.ward} value={w.ward}>{w.ward} (₹{w.dailyRate}/day)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Target Vacant Bed</label>
                <select
                  value={transferModal.targetBed}
                  onChange={(e) => setTransferModal({ ...transferModal, targetBed: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                >
                  <option value="">-- Choose Vacant Bed --</option>
                  {(() => {
                    const conf = wardBedConfig.find((w) => w.ward === transferModal.targetWard);
                    return conf?.beds
                      .filter((b) => !occupiedBeds.has(b))
                      .map((b) => (
                        <option key={b} value={b}>
                          {b} — VACANT
                        </option>
                      ));
                  })()}
                </select>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleTransferBed}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm Bed Transfer
              </button>
              <button
                type="button"
                onClick={() => setTransferModal({ isOpen: false, admission: null, targetWard: "", targetBed: "" })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 8: SELECT PATIENT FROM OPD AS PER DATE
      ───────────────────────────────────────────────────────────── */}
      {showOpdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Select Patient from OPD by Date</h2>
                  <p className="text-xs text-slate-600">
                    Lookup OPD registry by visit date. Selecting an OPD patient pre-fills their UHID, demographics & vitals for IPD admission.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpdModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Visit Date:
                </label>
                <input
                  type="date"
                  value={selectedOpdDate}
                  onChange={(e) => setSelectedOpdDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSelectedOpdDate(new Date().toISOString().split("T")[0])}
                  className={`px-2.5 py-1 font-bold rounded-lg border transition ${
                    selectedOpdDate === new Date().toISOString().split("T")[0]
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedOpdDate(
                      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
                    )
                  }
                  className="px-2.5 py-1 font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOpdDate("")}
                  className="px-2.5 py-1 font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
                >
                  All Dates
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={opdSearchQuery}
                  onChange={(e) => setOpdSearchQuery(e.target.value)}
                  placeholder="Search OPD patient name, phone, token..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto flex-1">
              {(() => {
                const filtered = opdPatients.filter((item) => {
                  const regDate = item.registeredAt ? item.registeredAt.slice(0, 10) : "";
                  const matchesDate = !selectedOpdDate || regDate === selectedOpdDate;
                  const q = opdSearchQuery.toLowerCase().trim();
                  const matchesQuery =
                    !q ||
                    item.name?.toLowerCase().includes(q) ||
                    item.phone?.includes(q) ||
                    item.uhid?.toLowerCase().includes(q) ||
                    item.token?.includes(q) ||
                    item.doctor?.toLowerCase().includes(q);
                  return matchesDate && matchesQuery;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-500 space-y-2">
                      <Users className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="font-semibold text-sm">No OPD patients found for {selectedOpdDate || "selected criteria"}</p>
                      <p className="text-xs text-slate-400">Change date filter above or register a new patient in OPD first.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map((pt) => (
                      <div
                        key={pt.id}
                        className="p-4 border border-slate-200 rounded-xl hover:border-emerald-400 bg-white transition hover:shadow-md flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                              Token #{pt.token} • {pt.uhid || "CRX..."}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {pt.registeredAt ? pt.registeredAt.slice(0, 10) : "OPD"}
                            </span>
                          </div>

                          <h3 className="font-black text-slate-900 text-sm">{pt.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {pt.age}y • {pt.sex} • 📞 {pt.phone}
                          </p>
                          <p className="text-xs text-slate-700 mt-1">
                            <strong>Doctor:</strong> {pt.doctor || "General OPD"} ({pt.department || "General"})
                          </p>

                          {pt.vitals?.bp && (
                            <div className="mt-2 p-2 bg-indigo-50/60 rounded-lg text-[11px] text-indigo-900 flex flex-wrap gap-2">
                              <span><strong>BP:</strong> {pt.vitals.bp}</span>
                              <span><strong>Pulse:</strong> {pt.vitals.pulse || "—"}</span>
                              <span><strong>Temp:</strong> {pt.vitals.temperature || "98.6"}°F</span>
                              <span><strong>SpO₂:</strong> {pt.vitals.spo2 || "—"}%</span>
                              {pt.vitals.weight && <span><strong>Wt:</strong> {pt.vitals.weight}kg</span>}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectOpdPatient(pt)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition"
                        >
                          <UserPlus className="w-4 h-4" />
                          Select & Admit to IPD →
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOpdModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
