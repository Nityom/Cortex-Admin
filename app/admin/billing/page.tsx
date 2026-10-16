"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ReceiptText,
  User,
  Search,
  Plus,
  Trash2,
  Printer,
  FileText,
  Bed,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  DollarSign,
  AlertCircle,
  Calendar,
  Phone,
  Activity,
  Stethoscope,
  Building,
} from "lucide-react";
import { createBill, getAll as getAllBills, Bill } from "@/services/bills";
import { getPatients, getPatientByPhoneNumber } from "@/services/patients";
import { Patient } from "@/types/patient";

interface ChargeItem {
  id: string;
  name: string;
  category: "Registration" | "Consultation" | "Investigation" | "Procedure" | "Bed" | "Nursing" | "OT" | "Surgeon" | "Other";
  unitPrice: number;
  quantity: number;
  total: number;
}

const DOCTORS = [
  { name: "Dr. Vipeen Raut", specialty: "Orthopaedics & Joint Replacement", defaultFee: 400 },
  { name: "Dr. Shillpa Raut", specialty: "Obstetrics & Gynaecology", defaultFee: 400 },
];

const OPD_CHARGE_CATALOG = [
  { name: "Registration Fee", category: "Registration", price: 100 },
  { name: "Consultation Fee (Dr. Vipeen Raut)", category: "Consultation", price: 400 },
  { name: "Consultation Fee (Dr. Shillpa Raut)", category: "Consultation", price: 400 },
  { name: "Blood Test (CBC / Routine)", category: "Investigation", price: 300 },
  { name: "X-Ray / Digital Radiography", category: "Investigation", price: 300 },
  { name: "Dressing / Minor Wound Care", category: "Procedure", price: 500 },
  { name: "Injection / Nursing Charge", category: "Procedure", price: 150 },
  { name: "Physiotherapy Session", category: "Procedure", price: 500 },
  { name: "POP Slab / Cast Application", category: "Procedure", price: 1200 },
];

export default function HospitalBillingPage() {
  const router = useRouter();

  // Active Billing Tab: 'opd' | 'history' (IPD Billing is exclusively managed under /admin/ipd)
  const [activeTab, setActiveTab] = useState<"opd" | "history">("opd");

  // Active Doctor Persistence
  const [activeDoctor, setActiveDoctor] = useState<string>("Dr. Vipeen Raut");
  const [linkedPrescriptionId, setLinkedPrescriptionId] = useState<string | null>(null);
  const [linkedOpdVisitId, setLinkedOpdVisitId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Restore active doctor
    try {
      const saved = localStorage.getItem("cortex_active_doctor");
      if (saved) setActiveDoctor(saved);
    } catch (_) {}

    // 2. Parse URL parameters linking from Prescription or OPD Queue
    try {
      const params = new URLSearchParams(window.location.search);
      const qTab = params.get("tab");
      if (qTab === "ipd") {
        router.push("/admin/ipd");
        return;
      }
      if (qTab === "opd" || qTab === "history") {
        setActiveTab(qTab);
      }

      const qRxId = params.get("prescriptionId");
      if (qRxId) setLinkedPrescriptionId(qRxId);

      const qVisitId = params.get("opdVisitId");
      if (qVisitId) setLinkedOpdVisitId(qVisitId);

      const qName = params.get("patientName") || params.get("name");
      const qPhone = params.get("phoneNumber") || params.get("phone");
      let qUhid = params.get("uhid") || params.get("reference_number") || params.get("reference");
      if (qUhid) {
        qUhid = qUhid.replace(/^CH/i, "CRX");
        if (qName?.toLowerCase() === "testing" && (qUhid === "CRX0001" || qUhid === "CH0001")) {
          qUhid = "CRX0002";
        } else if (qUhid === "CRX0002" && qName?.toLowerCase() !== "testing") {
          qUhid = "CRX0003";
        }
      }
      const qAge = params.get("age");
      const qSex = params.get("sex");
      const qDoc = params.get("doctorName") || params.get("doctor");

      if (qDoc) {
        setActiveDoctor(qDoc);
        try { localStorage.setItem("cortex_active_doctor", qDoc); } catch (_) {}
      }

      if (qName || qPhone || qUhid) {
        setOpdPatient((prev) => ({
          ...prev,
          name: qName || prev.name,
          phone: qPhone || prev.phone,
          uhid: qUhid || prev.uhid,
          age: qAge || prev.age,
          sex: qSex || prev.sex,
          visitNumber: qVisitId ? `OPD Visit #${qVisitId.slice(-3)}` : prev.visitNumber,
        }));
      }

      const qConsultFee = params.get("consultationFee");
      if (qConsultFee && !isNaN(Number(qConsultFee)) && Number(qConsultFee) > 0) {
        const fee = Number(qConsultFee);
        setOpdCharges((prev) => {
          const hasConsult = prev.some(c => c.name.toLowerCase().includes("consultation"));
          if (hasConsult) {
            return prev.map(c => c.name.toLowerCase().includes("consultation") ? { ...c, unitPrice: fee, total: fee * c.quantity } : c);
          }
          return [...prev, { id: "consult_" + Date.now(), name: "Consultation Fee", category: "Consultation", unitPrice: fee, quantity: 1, total: fee }];
        });
      }
    } catch (e) {
      console.error("Error reading URL search params in billing:", e);
    }
  }, []);

  const switchDoctor = (doc: string) => {
    setActiveDoctor(doc);
    try {
      localStorage.setItem("cortex_active_doctor", doc);
    } catch (_) {}
  };

  // Patients Cache for auto-lookup
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setLoadingPatients(true);
      try {
        const data = await getPatients();
        setPatients(data || []);
      } catch (e) {
        console.error("Error fetching patients:", e);
      } finally {
        setLoadingPatients(false);
      }
    })();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1. OPD BILLING STATE
  // ─────────────────────────────────────────────────────────────
  const [opdPatient, setOpdPatient] = useState({
    patientId: "",
    name: "",
    age: "",
    sex: "Male",
    phone: "",
    uhid: "",
    visitNumber: "OPD Visit 1",
  });

  const [opdCharges, setOpdCharges] = useState<ChargeItem[]>([
    { id: "1", name: "Registration Fee", category: "Registration", unitPrice: 100, quantity: 1, total: 100 },
    { id: "2", name: "Consultation Fee", category: "Consultation", unitPrice: 400, quantity: 1, total: 400 },
  ]);

  const [opdDiscount, setOpdDiscount] = useState<number>(0);
  const [opdPaidAmount, setOpdPaidAmount] = useState<number>(500);
  const [opdPaymentMode, setOpdPaymentMode] = useState<"Cash" | "UPI" | "Card">("Cash");
  const [opdSubmitting, setOpdSubmitting] = useState<boolean>(false);
  const [opdSuccessBill, setOpdSuccessBill] = useState<any>(null);

  // Subtotal, Net, Balance for OPD
  const opdSubtotal = useMemo(() => {
    return opdCharges.reduce((sum, item) => sum + item.total, 0);
  }, [opdCharges]);

  const opdNetTotal = useMemo(() => {
    return Math.max(0, opdSubtotal - opdDiscount);
  }, [opdSubtotal, opdDiscount]);

  const opdBalanceDue = useMemo(() => {
    return Math.max(0, opdNetTotal - opdPaidAmount);
  }, [opdNetTotal, opdPaidAmount]);

  const opdPaymentStatus = useMemo<"PAID" | "PARTIAL" | "PENDING">(() => {
    if (opdPaidAmount <= 0) return "PENDING";
    if (opdPaidAmount >= opdNetTotal) return "PAID";
    return "PARTIAL";
  }, [opdPaidAmount, opdNetTotal]);

  // Quick lookup patient for OPD
  const handleOpdPhoneLookup = async (phoneStr: string) => {
    setOpdPatient((p) => ({ ...p, phone: phoneStr }));
    if (phoneStr.trim().length >= 10) {
      try {
        const found = await getPatientByPhoneNumber(phoneStr.trim());
        if (found) {
          setOpdPatient({
            patientId: String(found.id || ""),
            name: found.name,
            age: found.age ? String(found.age) : "",
            sex: found.sex || "Male",
            phone: found.phone_number,
            uhid: found.reference_number || "CRX0001",
            visitNumber: "OPD Visit 1",
          });
        }
      } catch (err) {
        console.error("Lookup error:", err);
      }
    }
  };

  // Add Preset Charge to OPD
  const addOpdPresetCharge = (preset: { name: string; category: any; price: number }) => {
    const newItem: ChargeItem = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      category: preset.category,
      unitPrice: preset.price,
      quantity: 1,
      total: preset.price,
    };
    setOpdCharges([...opdCharges, newItem]);
  };

  // Remove charge
  const removeOpdCharge = (id: string) => {
    setOpdCharges(opdCharges.filter((c) => c.id !== id));
  };

  // Save OPD Bill
  const handleSaveOpdBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opdPatient.name.trim() || !opdPatient.phone.trim()) {
      alert("Please enter patient name and mobile number.");
      return;
    }
    if (opdCharges.length === 0) {
      alert("Please add at least one charge item.");
      return;
    }

    setOpdSubmitting(true);
    try {
      const billData: Bill = {
        prescription_id: linkedPrescriptionId || "OPD_DIRECT",
        patient_id: opdPatient.patientId || "WALKIN",
        reference_number: opdPatient.uhid || `CRX${Math.floor(1000 + Math.random() * 9000)}`,
        total_amount: opdNetTotal,
        paid_amount: opdPaidAmount,
        balance_amount: opdBalanceDue,
        payment_status: opdPaymentStatus,
        payment_method: opdPaymentMode,
        discount_amount: opdDiscount,
        notes: `OPD Bill • ${opdPatient.visitNumber} • Doctor: ${activeDoctor}${linkedPrescriptionId ? ` • Linked Rx: ${linkedPrescriptionId}` : ""}`,
        items: opdCharges.map((item, idx) => ({
          id: idx + 1,
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          item_type: "procedure",
        })),
      };

      const result = await createBill(billData);
      setOpdSuccessBill({
        id: result?.id || result,
        billNumber: result?.bill_number || `CRX-OPD-${Date.now().toString().slice(-4)}`,
        uhid: billData.reference_number,
        patientName: opdPatient.name,
        total: opdNetTotal,
        paid: opdPaidAmount,
        balance: opdBalanceDue,
        status: opdPaymentStatus,
      });

      // Refresh list
      loadBills();
    } catch (err: any) {
      console.error("Failed to save OPD bill:", err);
      alert("Error creating OPD bill: " + (err.message || "Unknown error"));
    } finally {
      setOpdSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. BILLING HISTORY STATE (All Hospital Bills Archive)
  // ─────────────────────────────────────────────────────────────
  const [allBillsList, setAllBillsList] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState<boolean>(false);
  const [billsSearch, setBillsSearch] = useState<string>("");
  const [billsStatusFilter, setBillsStatusFilter] = useState<string>("All");

  const loadBills = async () => {
    setLoadingBills(true);
    try {
      const data = await getAllBills();
      setAllBillsList(data || []);
    } catch (e) {
      console.error("Error loading bills:", e);
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadBills();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <header className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <ReceiptText className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hospital Billing Portal</h1>
                <p className="text-xs text-slate-500 font-medium">
                  Cortex Hospital & Research Centre • Dedicated OPD & IPD Billing Management
                </p>
              </div>
            </div>
          </div>

          {/* Active Doctor Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
                Active Doctor:
              </span>
              <button
                type="button"
                onClick={() => switchDoctor("Dr. Vipeen Raut")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeDoctor === "Dr. Vipeen Raut"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Dr. Vipeen Raut (Ortho)
              </button>
              <button
                type="button"
                onClick={() => switchDoctor("Dr. Shillpa Raut")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeDoctor === "Dr. Shillpa Raut"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Dr. Shillpa Raut (Gynae)
              </button>
            </div>

            <Link
              href="/admin/prescription"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Prescriptions
            </Link>
          </div>
        </div>

        {/* Tab Controls: OPD / History + Direct Link to IPD Management */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 border-b border-slate-100 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("opd")}
              className={`px-5 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 ${
                activeTab === "opd"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              1. OPD Billing (Outpatient)
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-5 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              2. All Bills & Payment Receipts
            </button>
          </div>

          <Link
            href="/admin/ipd"
            className="px-4 py-2 font-semibold text-xs rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 flex items-center gap-2 shadow-sm transition"
          >
            <Bed className="w-4 h-4 text-indigo-600" />
            <span>IPD Management & Inpatient Billing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: OPD BILLING (OUTPATIENT)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "opd" && (
        <div className="space-y-6">
          {/* Success Banner */}
          {opdSuccessBill && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm">
                    OPD Bill Generated: {opdSuccessBill.billNumber}
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Patient: {opdSuccessBill.patientName} ({opdSuccessBill.uhid}) • Paid: ₹{opdSuccessBill.paid} • Due: ₹{opdSuccessBill.balance}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/print-bill?billId=${opdSuccessBill.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Bill & Receipt
                </a>

                {linkedPrescriptionId && (
                  <a
                    href={`/print-prescription?prescriptionId=${linkedPrescriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-white text-teal-700 hover:bg-teal-50 border border-teal-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Print Rx
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setOpdSuccessBill(null)}
                  className="px-3 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Linked Clinical Prescription Banner */}
          {(linkedPrescriptionId || linkedOpdVisitId) && (
            <div className="bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50 border-2 border-teal-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-md">
                      Linked Clinical Record
                    </span>
                    {linkedPrescriptionId && (
                      <span className="text-xs font-mono font-bold text-slate-700">
                        Rx ID: {linkedPrescriptionId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    Patient: <strong>{opdPatient.name || "Patient"}</strong> {opdPatient.uhid ? `(UHID: ${opdPatient.uhid})` : ""} • Doctor: {activeDoctor}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {linkedPrescriptionId && (
                  <a
                    href={`/print-prescription?prescriptionId=${linkedPrescriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white text-teal-700 hover:bg-teal-50 border border-teal-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Rx
                  </a>
                )}
                {linkedPrescriptionId && (
                  <a
                    href={`/admin/prescription?prescriptionId=${linkedPrescriptionId}`}
                    className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 border border-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Edit Rx
                  </a>
                )}
                <a
                  href="/admin/opd"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  OPD Queue
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Step 1 (Patient) & Step 2 (Charges) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Patient Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    Step 1: Patient Registration & Visit Selection
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    {opdPatient.uhid ? `UHID: ${opdPatient.uhid}` : "Auto UHID"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        value={opdPatient.phone}
                        onChange={(e) => handleOpdPhoneLookup(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Type to auto-fill patient</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={opdPatient.name}
                      onChange={(e) => setOpdPatient({ ...opdPatient, name: e.target.value })}
                      placeholder="e.g. Dhiraj Bhandekar"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={opdPatient.age}
                        onChange={(e) => setOpdPatient({ ...opdPatient, age: e.target.value })}
                        placeholder="34"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sex</label>
                      <select
                        value={opdPatient.sex}
                        onChange={(e) => setOpdPatient({ ...opdPatient, sex: e.target.value })}
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Visit: <strong className="text-slate-800">{opdPatient.visitNumber}</strong></span>
                  <span>Attending Doctor: <strong className="text-slate-800">{activeDoctor}</strong></span>
                  <span>Date: <strong className="text-slate-800">{new Date().toLocaleDateString("en-GB")}</strong></span>
                </div>
              </div>

              {/* Step 2: Add Configurable Charges */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    Step 2: Add Charges from Catalog
                  </h2>
                  <span className="text-xs text-slate-500">
                    Click any preset to add to OPD bill
                  </span>
                </div>

                {/* Quick Add Presets Bar */}
                <div className="flex flex-wrap gap-2">
                  {OPD_CHARGE_CATALOG.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => addOpdPresetCharge(preset)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3 text-blue-600" />
                      {preset.name} <span className="text-slate-400 font-mono">₹{preset.price}</span>
                    </button>
                  ))}
                </div>

                {/* Charges Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Service / Charge Description</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {opdCharges.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const updated = [...opdCharges];
                                updated[idx].name = e.target.value;
                                setOpdCharges(updated);
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-medium">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const updated = [...opdCharges];
                                updated[idx].unitPrice = val;
                                updated[idx].total = val * updated[idx].quantity;
                                setOpdCharges(updated);
                              }}
                              className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-right font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 1;
                                const updated = [...opdCharges];
                                updated[idx].quantity = qty;
                                updated[idx].total = updated[idx].unitPrice * qty;
                                setOpdCharges(updated);
                              }}
                              className="w-14 px-2 py-1 border border-slate-200 rounded text-xs text-center font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            ₹{item.total}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeOpdCharge(item.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Remove Charge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Custom Charge Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const customItem: ChargeItem = {
                        id: `c_${Date.now()}`,
                        name: "Custom Service / Procedure",
                        category: "Procedure",
                        unitPrice: 200,
                        quantity: 1,
                        total: 200,
                      };
                      setOpdCharges([...opdCharges, customItem]);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    + Add Custom Charge Item
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Step 3 (Payment Collection & Summary) */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    Step 3: Collect Payment
                  </h2>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      opdPaymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : opdPaymentStatus === "PARTIAL"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {opdPaymentStatus === "PAID" ? "Full Paid" : opdPaymentStatus === "PARTIAL" ? "Partially Paid" : "Pending"}
                  </span>
                </div>

                {/* Numerical Breakdown */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Charges (Gross):</span>
                    <strong className="font-mono text-slate-900">₹{opdSubtotal}</strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Discount:</span>
                    <div className="flex items-center gap-1 w-28">
                      <span className="text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={opdDiscount}
                        onChange={(e) => setOpdDiscount(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                    <span>Net Bill Amount:</span>
                    <span className="font-mono text-blue-700 text-lg">₹{opdNetTotal}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Amount Paid Now (₹):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={opdPaidAmount}
                        onChange={(e) => setOpdPaidAmount(Number(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">Balance Due:</span>
                      <span className="text-xs text-slate-400">Amount remaining</span>
                    </div>
                    <strong className={`text-lg font-black font-mono ${opdBalanceDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      ₹{opdBalanceDue}
                    </strong>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={opdPaymentMode}
                      onChange={(e) => setOpdPaymentMode(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="Card">Debit / Credit Card</option>
                    </select>
                  </div>
                </div>

                {/* Step 4: Actions */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveOpdBill}
                    disabled={opdSubmitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ReceiptText className="w-4 h-4" />
                    {opdSubmitting ? "Generating Bill..." : "Step 4: Generate OPD Bill & Receipt"}
                  </button>

                  <div className="text-center pt-2">
                    <Link
                      href={`/admin/prescription?patientName=${encodeURIComponent(opdPatient.name)}&phoneNumber=${encodeURIComponent(opdPatient.phone)}&doctorName=${encodeURIComponent(activeDoctor)}`}
                      className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      <span>Prescription can be created separately</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: ALL BILLS & RECEIPTS ARCHIVE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hospital Invoices & Payment Receipts</h2>
              <p className="text-xs text-slate-500">
                All OPD and IPD bills generated across Cortex Hospital
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={billsSearch}
                  onChange={(e) => setBillsSearch(e.target.value)}
                  placeholder="Search invoice or patient..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <select
                value={billsStatusFilter}
                onChange={(e) => setBillsStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
              >
                <option value="All">All Status</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          {loadingBills ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading billing records...</div>
          ) : allBillsList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No bills generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Patient Name (UHID)</th>
                    <th className="py-3 px-4">Type / Description</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4 text-right">Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allBillsList
                    .filter((b) => {
                      if (billsStatusFilter !== "All" && b.payment_status !== billsStatusFilter) return false;
                      if (billsSearch.trim()) {
                        const q = billsSearch.toLowerCase();
                        return (
                          (b.bill_number && b.bill_number.toLowerCase().includes(q)) ||
                          (b.patient_name && b.patient_name.toLowerCase().includes(q)) ||
                          (b.reference_number && b.reference_number.toLowerCase().includes(q))
                        );
                      }
                      return true;
                    })
                    .map((b) => (
                      <tr key={b.id || b._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.bill_number || "—"}</td>
                        <td className="py-3 px-4 text-slate-500">{b.bill_date || b.created_at || "—"}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{b.patient_name || "Walk-in Patient"}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{b.reference_number}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          <span className="block truncate">{b.notes || (b.prescription_id === "IPD_DIRECT" ? "IPD Final Bill" : "OPD Consultation")}</span>
                          {b.prescription_id && !["DIRECT_BILL", "OPD_DIRECT", "IPD_DIRECT"].includes(b.prescription_id) && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                                Linked Rx #{b.prescription_id.slice(-6)}
                              </span>
                              <a
                                href={`/print-prescription?prescriptionId=${b.prescription_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 hover:underline font-bold"
                              >
                                View Rx ↗
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{Number(b.total_amount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                          ₹{Number(b.paid_amount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                          ₹{Number(b.balance_amount || (b.total_amount - b.paid_amount)).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              b.payment_status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : b.payment_status === "PARTIAL"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {b.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <a
                            href={`/print-bill?billId=${b.id || b._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            <Printer className="w-3 h-3" />
                            Print
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
