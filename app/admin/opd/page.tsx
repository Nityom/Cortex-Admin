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
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createPatient, getPatients, getPatientByPhoneNumber, getPatientById, getNextPatientReference } from "@/services/patients";
import { Patient } from "@/types/patient";
import PatientSearchInput from "@/components/PatientSearchInput";

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
  status: "Waiting" | "In Consultation" | "Completed";
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

const getTodayString = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
};

const STORAGE_KEY = "cortex_opd_queue_v1";

export default function OPDManagementPage() {
  const router = useRouter();

  // Tab State: 'queue' | 'register' | 'appointments' | 'directory'
  const [activeTab, setActiveTab] = useState<"queue" | "register" | "appointments" | "directory">("queue");

  // Today & Selected Queue Date (Defaults to Today)
  const todayStr = useMemo(() => getTodayString(), []);
  const [selectedQueueDate, setSelectedQueueDate] = useState<string>(getTodayString());

  // Queue state persisted in localStorage
  const [queue, setQueue] = useState<OPDQueueItem[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("All");
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
  const updateAppointmentMutation = useMutation(api.appointments.update);

  const todayAppointments = useMemo(() => {
    if (!allAppointments) return [];
    return allAppointments
      .filter((a) => a.date === todayStr)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
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
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [allAppointments, selectedApptDate, apptDoctorFilter, apptSearchQuery]);

  const isApptInQueue = (appt: any) => {
    return queue.find(
      (q) =>
        q.appointmentId === appt._id ||
        (q.phone && appt.phone && q.phone === appt.phone && q.registeredAt.startsWith(todayStr))
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
            let dbPatients: any[] = [];
            try {
              dbPatients = await getPatients();
            } catch (_) {}

            const phoneToRef = new Map(
              dbPatients.map((p) => [p.phone_number?.trim(), p.reference_number?.replace(/^CH/i, "CRX")])
            );

            let changed = false;
            const updated = parsed.map((item: any) => {
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
              }

              if (uhid !== item.uhid) changed = true;
              return { ...item, uhid };
            });
            setQueue(updated);
            if (changed) {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch (_) {}
            }
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

  // Save Queue to Local Storage
  const saveQueue = (newQueue: OPDQueueItem[]) => {
    setQueue(newQueue);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
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
        const existing = await getPatientByPhoneNumber(cleanPhone);
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
      } catch (e) {}
    }
  };

  // Submit OPD Registration
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Please enter patient name and mobile number.");
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
          phone_number: formData.phone.trim(),
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
          const pt = await getPatientByPhoneNumber(formData.phone.trim());
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

      // 2. Next Token number for the day
      const today = getTodayString();
      const todayCount = queue.filter((q) => (q.registeredAt || "").startsWith(today)).length;
      const tokenNumber = String(todayCount + 1).padStart(2, "0");

      const newItem: OPDQueueItem = {
        id: `opd_${Date.now()}`,
        token: tokenNumber,
        uhid,
        patientId,
        name: formData.name.trim(),
        age: formData.age.trim(),
        ageUnit: formData.ageUnit,
        sex: formData.sex,
        phone: formData.phone.trim(),
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
  const updateStatus = (id: string, newStatus: "Waiting" | "In Consultation" | "Completed") => {
    const updated = queue.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
    saveQueue(updated);
  };

  // Open Check-In Modal with prefilled patient data
  const openCheckInModal = async (appt: any) => {
    setCheckInModalAppt(appt);
    let age = "";
    let sex: "Male" | "Female" | "Other" = "Male";
    try {
      const pt = await getPatientByPhoneNumber(appt.phone?.trim() || "");
      if (pt) {
        if (pt.age) age = String(pt.age);
        if (pt.sex) sex = pt.sex as any;
      }
    } catch (_) {}
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
        let pt = await getPatientByPhoneNumber(appt.phone?.trim() || "");
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

      const todayCount = queue.filter((q) => q.registeredAt.startsWith(today)).length;
      const tokenNumber = String(todayCount + 1).padStart(2, "0");

      const docName = appt.doctor_name || DOCTORS[0].name;
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
        age: customVitals?.age?.trim() || "—",
        ageUnit: "years",
        sex: customVitals?.sex || "Male",
        phone: appt.phone?.trim() || "",
        address: "",
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
  const startPrescription = (item: OPDQueueItem) => {
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

    if (item.id) {
      params.append("opdVisitId", item.id);
    }

    // Mark as In Consultation if currently waiting
    if (item.status === "Waiting") {
      updateStatus(item.id, "In Consultation");
    }

    router.push(`/admin/prescription?${params.toString()}`);
  };

  // Launch Hospital Billing pre-filled from OPD (Consultation charge added in Billing)
  const startBilling = (item: OPDQueueItem) => {
    const params = new URLSearchParams({
      tab: "opd",
      patientName: item.name,
      phoneNumber: item.phone,
      age: item.age,
      sex: item.sex,
      doctorName: item.doctor,
      uhid: item.uhid,
      opdVisitId: item.id,
      consultationFee: "400",
    });
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
    return queue.filter((item) => (item.registeredAt || "").split("T")[0] === todayStr).length;
  }, [queue, todayStr]);

  // Filtered queue (Filters by selectedQueueDate, doctor, status, search)
  // Sorted so active patients (In Consultation & Waiting) are on top, and Completed patients are at the bottom.
  const filteredQueue = useMemo(() => {
    const list = queue.filter((item) => {
      // 1. Filter by Date (Defaults to Today)
      if (selectedQueueDate) {
        const itemDate = (item.registeredAt || "").split("T")[0];
        if (itemDate && itemDate !== selectedQueueDate) return false;
      }
      // 2. Doctor Filter
      if (selectedDoctorFilter !== "All" && item.doctor !== selectedDoctorFilter) return false;
      // 3. Status Filter
      if (selectedStatusFilter !== "All" && item.status !== selectedStatusFilter) return false;
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

    const statusWeight: Record<string, number> = {
      "In Consultation": 0,
      "Waiting": 1,
      "Completed": 2,
    };

    return [...list].sort((a, b) => {
      const wA = statusWeight[a.status] ?? 1;
      const wB = statusWeight[b.status] ?? 1;
      if (wA !== wB) return wA - wB;

      // Secondary sort: earlier registrations / tokens first
      const timeA = new Date(a.registeredAt || 0).getTime();
      const timeB = new Date(b.registeredAt || 0).getTime();
      return timeA - timeB;
    });
  }, [queue, selectedQueueDate, selectedDoctorFilter, selectedStatusFilter, queueSearch]);

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
      {/* Header Banner */}
      <header className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Stethoscope className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">OPD Management Module</h1>
                <p className="text-xs text-slate-500 font-medium">
                  Cortex Hospital & Research Centre • Reception & Doctor Day Board
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Doctor:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDoctorChange('Dr. Vipeen Raut')}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        formData.doctor === 'Dr. Vipeen Raut'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dr. Vipeen Raut (Ortho)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDoctorChange('Dr. Shillpa Raut')}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        formData.doctor === 'Dr. Shillpa Raut'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dr. Shillpa Raut (Gynae)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("register")}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition ${
                activeTab === "register"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              + Add New Patient / OPD
            </button>

            <Link
              href="/admin/prescription"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Prescription
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              Hospital Billing
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 border-b border-slate-100 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 font-semibold text-sm rounded-lg transition flex items-center gap-2 shrink-0 ${
              activeTab === "queue"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            Today&apos;s OPD Queue ({todayQueueCount})
          </button>

          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-4 py-2 font-semibold text-sm rounded-lg transition flex items-center gap-2 shrink-0 ${
              activeTab === "appointments"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Appointments
            {todayAppointments.length > 0 && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === "appointments"
                    ? "bg-white text-blue-600"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {todayAppointments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("register")}
            className={`px-4 py-2 font-semibold text-sm rounded-lg transition flex items-center gap-2 shrink-0 ${
              activeTab === "register"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Register Patient (Walk-in)
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 font-semibold text-sm rounded-lg transition flex items-center gap-2 shrink-0 ${
              activeTab === "directory"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            Patient Directory
          </button>
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
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Quick Today's Appointments Bar */}
          {todayAppointments.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Today&apos;s Scheduled Appointments ({todayAppointments.length})
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium hidden sm:inline">
                    · {todayAppointments.filter((a) => isApptInQueue(a)).length} checked in
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("appointments")}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                >
                  View All Appointments <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Horizontal scroll of today's appointment chips */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {todayAppointments.map((appt) => {
                  const inQueue = isApptInQueue(appt);
                  return (
                    <div
                      key={appt._id}
                      className="bg-white rounded-lg border border-blue-100 p-2.5 min-w-[250px] shrink-0 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">{appt.name}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                            {appt.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {appt.doctor_name || DOCTORS[0].name}
                        </p>
                      </div>

                      {inQueue ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md shrink-0">
                          #{inQueue.token} In Queue
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleCheckInAppointment(appt)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shrink-0 shadow-xs disabled:opacity-50"
                        >
                          + Check In
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search patient, phone, UHID..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Date Filter & Calendar Picker */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(selectedQueueDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedQueueDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
                  onClick={() => {
                    const d = new Date(selectedQueueDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedQueueDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {selectedQueueDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedQueueDate(todayStr)}
                    className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition"
                  >
                    Today
                  </button>
                )}
              </div>

              {/* Doctor Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5" />
                <span>Doctor:</span>
                <select
                  value={selectedDoctorFilter}
                  onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="All">All Doctors</option>
                  {DOCTORS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
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
                </select>
              </div>

              {/* Clear Queue (For demo / day end) */}
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset OPD Queue? (Patient records in database are preserved)")) {
                      saveQueue([]);
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-blue-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>
                  Viewing OPD Queue for <strong>{selectedQueueDate}</strong> ({filteredQueue.length} {filteredQueue.length === 1 ? 'patient' : 'patients'}). Not showing today.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQueueDate(todayStr)}
                className="font-bold text-blue-700 hover:underline hover:text-blue-900"
              >
                Switch to Today&apos;s Queue →
              </button>
            </div>
          )}

          {/* Queue List */}
          {filteredQueue.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {selectedQueueDate === todayStr ? "No Patients in Queue Today" : `No Patients in Queue on ${selectedQueueDate}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {selectedQueueDate === todayStr
                  ? "There are currently no patients waiting for OPD consultation today."
                  : `No OPD patient registrations found for ${selectedQueueDate}. Choose another date from the calendar or return to today.`}
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  + Register Patient
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    item.status === "In Consultation"
                      ? "border-blue-300 bg-blue-50/20"
                      : item.status === "Completed"
                      ? "border-emerald-200 bg-emerald-50/10"
                      : "border-slate-200"
                  }`}
                >
                  {/* Left: Token & Basic Details */}
                  <div className="flex items-start gap-3">
                    <div className="text-center min-w-[58px] bg-slate-900 text-white rounded-xl p-2 shadow-sm">
                      <span className="text-[9px] font-bold block uppercase tracking-wider text-slate-300">TOKEN</span>
                      <span className="text-xl font-black">#{item.token}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{item.name}</h3>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {item.uhid}
                        </span>
                        {item.priority !== "Normal" && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              item.priority === "Emergency"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.priority}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{item.age ? `${item.age} ${item.ageUnit}` : "Age N/A"} • {item.sex}</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.phone}
                        </span>
                        <span>Doc: <strong className="text-slate-800">{item.doctor}</strong></span>
                        <span className="text-slate-400">({item.time})</span>
                      </div>

                      {/* Vitals summary if recorded */}
                      {(item.vitals.bp || item.vitals.spo2 || item.vitals.pulse || item.vitals.weight) && (
                        <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 w-fit">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          {item.vitals.bp && <span>BP: <strong>{item.vitals.bp}</strong></span>}
                          {item.vitals.pulse && <span>• Pulse: <strong>{item.vitals.pulse}</strong></span>}
                          {item.vitals.spo2 && <span>• SpO₂: <strong>{item.vitals.spo2}%</strong></span>}
                          {item.vitals.weight && <span>• Wt: <strong>{item.vitals.weight}kg</strong></span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Pill & Actions */}
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {/* Status Toggle */}
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value as any)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none transition ${
                        item.status === "Waiting"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : item.status === "In Consultation"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : "bg-emerald-50 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      <option value="Waiting">Waiting</option>
                      <option value="In Consultation">In Consultation</option>
                      <option value="Completed">Completed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => printOPDCard(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      title="Print OPD Token Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Card
                    </button>

                    {item.status === "Completed" ? (
                      <button
                        type="button"
                        onClick={() => startBilling(item)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
                        title="Prescription Completed - Generate Hospital Bill with Consultation Charge"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Generate Bill
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startBilling(item)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                        title="Open Hospital Billing for this patient"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Bill
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => startPrescription(item)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                        item.status === "Completed"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {item.status === "Completed" ? "View Rx" : "Prescription"}
                      {item.status !== "Completed" && <ArrowRight className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ))}
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
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    selectedApptDate === todayStr
                      ? "bg-white text-blue-600 shadow-xs"
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
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                    selectedApptDate !== todayStr
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
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
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
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
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
                    className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      inQueue ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200"
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
                            className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded flex items-center gap-1 transition"
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
                              <Stethoscope className="w-3 h-3 text-blue-600" />
                              {appt.dental_problem}
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
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                            With Vitals
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleCheckInAppointment(appt)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
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
              <span className="text-xs text-slate-400">Date: {new Date().toLocaleDateString("en-GB")}</span>
            </div>

            {/* Found existing patient alert */}
            {existingPatientFound && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>
                    Existing patient found: <strong>{existingPatientFound.name}</strong> ({existingPatientFound.reference_number || "UHID Registered"}). Details pre-filled.
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

            {/* Section 1: Demographics */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Patient Demographics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <PatientSearchInput
                    value={formData.phone}
                    searchType="phone"
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    onSelectPatient={handleAutoFillPatient}
                    patients={combinedPatients}
                    placeholder="e.g. 9876543210"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Type to search existing patient</span>
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <Activity className="w-4 h-4 text-blue-600" />
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
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
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
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {loadingPatients ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
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
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Sex</label>
                  <select
                    value={checkInVitals.sex}
                    onChange={(e) => setCheckInVitals({ ...checkInVitals, sex: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
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
