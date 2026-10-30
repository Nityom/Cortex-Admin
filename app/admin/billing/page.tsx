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
  Check,
} from "lucide-react";
import { createBill, updateBill, getBillByPrescriptionId, getAll as getAllBills, Bill } from "@/services/bills";
import { paymentTransactionService } from "@/services/payment-transactions";
import { getPatients, getPatientByPhoneNumber } from "@/services/patients";
import { getPrescriptionsByPatient } from "@/services/prescription";
import { Patient } from "@/types/patient";

interface ChargeItem {
  id: string;
  name: string;
  category: "Registration" | "Consultation" | "Investigation" | "Procedure" | "Bed" | "Nursing" | "OT" | "Surgeon" | "Other" | "Medicine";
  unitPrice: number;
  quantity: number;
  total: number;
}

const DOCTORS = [
  { name: "Dr. Vipeen Raut", specialty: "Orthopaedics & Joint Replacement", firstFee: 400, followUpFee: 200 },
  { name: "Dr. Shillpa Raut", specialty: "Obstetrics & Gynaecology", firstFee: 200, followUpFee: 100 },
];

const getDoctorConsultationFee = (docName: string, isFollowUpWithin10Days = false) => {
  const isGynae = (docName || "").toLowerCase().includes("shilpa") || (docName || "").toLowerCase().includes("shillpa");
  if (isGynae) {
    return isFollowUpWithin10Days ? 100 : 200;
  }
  return isFollowUpWithin10Days ? 200 : 400;
};

const DEFAULT_OPD_PROCEDURES: { name: string; category: "Registration" | "Consultation" | "Investigation" | "Procedure" | "Bed" | "Nursing" | "OT" | "Surgeon" | "Other" | "Medicine"; price: number }[] = [
  { name: "Consultation Fee (Dr. Vipeen Raut)", category: "Consultation", price: 400 },
  { name: "Follow-up Consultation (Dr. Vipeen Raut)", category: "Consultation", price: 200 },
  { name: "Consultation Fee (Dr. Shillpa Raut)", category: "Consultation", price: 200 },
  { name: "Follow-up Consultation (Dr. Shillpa Raut)", category: "Consultation", price: 100 },
  { name: "Registration Fee", category: "Registration", price: 100 },
  { name: "Blood Test (CBC / Routine)", category: "Investigation", price: 300 },
  { name: "X-Ray / Digital Radiography", category: "Investigation", price: 300 },
  { name: "Dressing / Minor Wound Care", category: "Procedure", price: 500 },
  { name: "Injection / Nursing Charge", category: "Procedure", price: 150 },
  { name: "Physiotherapy Session", category: "Procedure", price: 500 },
  { name: "POP Slab / Cast Application", category: "Procedure", price: 1200 },
  { name: "Joint Aspiration / Injection", category: "Procedure", price: 800 },
  { name: "USG / Ultrasound Scan", category: "Procedure", price: 700 },
  { name: "Suturing / Minor Procedure", category: "Procedure", price: 600 },
  { name: "Stitch Removal & Dressing", category: "Procedure", price: 250 },
  { name: "ECG / Cardiac Trace", category: "Investigation", price: 250 },
  { name: "Nebulization Session", category: "Procedure", price: 150 },
];

export default function HospitalBillingPage() {
  const router = useRouter();

  // Active Billing Tab: 'opd' | 'history' (IPD Billing is exclusively managed under /admin/ipd)
  const [activeTab, setActiveTab] = useState<"opd" | "history">("opd");

  // Active Doctor Persistence
  const [activeDoctor, setActiveDoctor] = useState<string>("Dr. Vipeen Raut");
  const [linkedPrescriptionId, setLinkedPrescriptionId] = useState<string | null>(null);
  const [linkedOpdVisitId, setLinkedOpdVisitId] = useState<string | null>(null);

  // Procedure suggestions catalog (merged with custom saved procedures)
  const [procedureCatalog, setProcedureCatalog] = useState(DEFAULT_OPD_PROCEDURES);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [autoSaved, setAutoSaved] = useState<boolean>(false);

  // Load custom saved procedures from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedProcs = localStorage.getItem("cortex_custom_procedures_v1");
      if (savedProcs) {
        const parsed = JSON.parse(savedProcs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingNames = new Set(parsed.map((p: any) => (p.name || "").trim().toLowerCase()));
          const filteredDefaults = DEFAULT_OPD_PROCEDURES.filter(
            (p) => !existingNames.has(p.name.trim().toLowerCase())
          );
          setProcedureCatalog([...parsed, ...filteredDefaults]);
        }
      }
    } catch (_) {}
  }, []);

  // Handler to auto-save procedure to catalog
  const saveProcedureToCatalog = (name: string, price: number, category: ChargeItem["category"] = "Procedure") => {
    const trimmed = name.trim();
    if (!trimmed || price <= 0) return;
    setProcedureCatalog((prev) => {
      const existingIdx = prev.findIndex((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
      let updated: any[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], price, category };
      } else {
        updated = [{ name: trimmed, price, category }, ...prev];
      }
      try {
        localStorage.setItem("cortex_custom_procedures_v1", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let savedDoc = "Dr. Vipeen Raut";
    try {
      const saved = localStorage.getItem("cortex_active_doctor");
      if (saved) {
        savedDoc = saved;
        setActiveDoctor(saved);
      }
    } catch (_) {}

    // Parse URL parameters linking from Prescription or OPD Queue
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
      const qDoc = params.get("doctorName") || params.get("doctor") || savedDoc;

      if (qDoc) {
        setActiveDoctor(qDoc);
        try { localStorage.setItem("cortex_active_doctor", qDoc); } catch (_) {}
      }

      const qToken = params.get("token");
      const qVisitType = params.get("visitType") || params.get("visitNumber");
      let resolvedVisit = "OPD Visit 1";
      if (qToken) {
        resolvedVisit = `Token #${qToken}`;
      } else if (qVisitType) {
        resolvedVisit = qVisitType;
      }

      if (qName || qPhone || qUhid) {
        setOpdPatient({
          patientId: "",
          name: qName || "",
          phone: qPhone || "",
          uhid: qUhid || "",
          age: qAge || "",
          sex: qSex || "Male",
          visitNumber: resolvedVisit,
        });
      }

      const isFollowUp = resolvedVisit.toLowerCase().includes("follow");
      const qConsultFee = params.get("consultationFee");
      const effectiveDoc = qDoc || savedDoc || "Dr. Vipeen Raut";
      const defaultFee =
        qConsultFee && !isNaN(Number(qConsultFee)) && Number(qConsultFee) > 0
          ? Number(qConsultFee)
          : getDoctorConsultationFee(effectiveDoc, isFollowUp);

      // Check if draft charges exist for this UHID, or globally
      let restoredCharges: ChargeItem[] | null = null;
      if (qUhid) {
        try {
          const patientSaved = localStorage.getItem(`cortex_billing_charges_${qUhid}`);
          if (patientSaved) {
            const parsed = JSON.parse(patientSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              restoredCharges = parsed;
            }
          }
        } catch (_) {}
      }

      if (!restoredCharges) {
        try {
          const globalSaved = localStorage.getItem("cortex_billing_opd_charges_draft");
          if (globalSaved) {
            const parsed = JSON.parse(globalSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              restoredCharges = parsed;
            }
          }
        } catch (_) {}
      }

      if (restoredCharges && restoredCharges.length > 0) {
        // Ensure consultation fee is updated if doctor or follow-up changed
        const updated = restoredCharges.map((c) => {
          if (c.name.toLowerCase().includes("consultation")) {
            return {
              ...c,
              name: isFollowUp ? `Follow-up Consultation (${effectiveDoc})` : `Consultation Fee (${effectiveDoc})`,
              unitPrice: defaultFee,
              total: defaultFee * c.quantity,
            };
          }
          return c;
        });
        setOpdCharges(updated);
      } else {
        // Default charges: Registration Fee + Consultation Fee
        setOpdCharges([
          { id: "1", name: "Registration Fee", category: "Registration", unitPrice: 100, quantity: 1, total: 100 },
          {
            id: "2",
            name: isFollowUp ? `Follow-up Consultation (${effectiveDoc})` : `Consultation Fee (${effectiveDoc})`,
            category: "Consultation",
            unitPrice: defaultFee,
            quantity: 1,
            total: defaultFee,
          },
        ]);
      }

      // Check discount draft
      let restoredDiscount: number | null = null;
      if (qUhid) {
        const patientDisc = localStorage.getItem(`cortex_billing_discount_${qUhid}`);
        if (patientDisc && !isNaN(Number(patientDisc))) {
          restoredDiscount = Number(patientDisc);
        }
      }
      if (restoredDiscount === null) {
        const globalDisc = localStorage.getItem("cortex_billing_opd_discount_draft");
        if (globalDisc && !isNaN(Number(globalDisc))) {
          restoredDiscount = Number(globalDisc);
        }
      }
      if (restoredDiscount !== null) {
        setOpdDiscount(restoredDiscount);
      }

      setIsInitialized(true);
    } catch (e) {
      console.error("Error reading URL search params in billing:", e);
      setIsInitialized(true);
    }
  }, []);

  const switchDoctor = (doc: string) => {
    setActiveDoctor(doc);
    try {
      localStorage.setItem("cortex_active_doctor", doc);
    } catch (_) {}
    // Update consultation charge to match this doctor's fee
    const isFollowUp = opdPatient.visitNumber.toLowerCase().includes("follow");
    const fee = getDoctorConsultationFee(doc, isFollowUp);
    setOpdCharges((prev) => {
      const hasConsult = prev.some((c) => c.name.toLowerCase().includes("consultation"));
      if (hasConsult) {
        return prev.map((c) =>
          c.name.toLowerCase().includes("consultation")
            ? { ...c, name: isFollowUp ? `Follow-up Consultation (${doc})` : `Consultation Fee (${doc})`, unitPrice: fee, total: fee * c.quantity }
            : c
        );
      }
      return [...prev, { id: "consult_" + Date.now(), name: isFollowUp ? `Follow-up Consultation (${doc})` : `Consultation Fee (${doc})`, category: "Consultation", unitPrice: fee, quantity: 1, total: fee }];
    });
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
    { id: "2", name: "Consultation Fee (Dr. Vipeen Raut)", category: "Consultation", unitPrice: 400, quantity: 1, total: 400 },
  ]);

  const [opdDiscount, setOpdDiscount] = useState<number>(0);
  const [opdPaidAmount, setOpdPaidAmount] = useState<number>(500);
  const [hasManuallyEditedPaid, setHasManuallyEditedPaid] = useState<boolean>(false);
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

  // Keep opdPaidAmount updated to match opdNetTotal unless manually overridden
  useEffect(() => {
    if (!hasManuallyEditedPaid) {
      setOpdPaidAmount(opdNetTotal);
    }
  }, [opdNetTotal, hasManuallyEditedPaid]);

  const opdBalanceDue = useMemo(() => {
    return Math.max(0, opdNetTotal - opdPaidAmount);
  }, [opdNetTotal, opdPaidAmount]);

  const opdPaymentStatus = useMemo<"PAID" | "PARTIAL" | "PENDING">(() => {
    if (opdPaidAmount <= 0) return "PENDING";
    if (opdPaidAmount >= opdNetTotal) return "PAID";
    return "PARTIAL";
  }, [opdPaidAmount, opdNetTotal]);

  // Real-time auto-save OPD charges & discount to localStorage whenever modified
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;
    try {
      localStorage.setItem("cortex_billing_opd_charges_draft", JSON.stringify(opdCharges));
      localStorage.setItem("cortex_billing_opd_discount_draft", String(opdDiscount));
      if (opdPatient.uhid) {
        localStorage.setItem(`cortex_billing_charges_${opdPatient.uhid}`, JSON.stringify(opdCharges));
        localStorage.setItem(`cortex_billing_discount_${opdPatient.uhid}`, String(opdDiscount));
      }
      setAutoSaved(true);
      const timer = setTimeout(() => setAutoSaved(false), 2000);
      return () => clearTimeout(timer);
    } catch (_) {}
  }, [opdCharges, opdDiscount, opdPatient.uhid, isInitialized]);

  // Quick lookup patient for OPD
  const handleOpdPhoneLookup = async (phoneStr: string) => {
    setOpdPatient((p) => ({ ...p, phone: phoneStr }));
    if (phoneStr.trim().length >= 10) {
      try {
        const found = await getPatientByPhoneNumber(phoneStr.trim());
        if (found) {
          const uhidClean = (found.reference_number || "CRX0001").replace(/^CH/i, "CRX");
          let isFollowUp = false;
          try {
            const pastRx = await getPrescriptionsByPatient(uhidClean);
            if (pastRx && pastRx.length > 0) {
              const sorted = [...pastRx].sort(
                (a, b) =>
                  new Date(b.prescription_date || b.created_at || (b as any)._creationTime || 0).getTime() -
                  new Date(a.prescription_date || a.created_at || (a as any)._creationTime || 0).getTime()
              );
              const lastDate = sorted[0].prescription_date || sorted[0].created_at || (sorted[0] as any)._creationTime;
              if (lastDate) {
                const diffDays = Math.round(
                  (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                if (diffDays <= 10) {
                  isFollowUp = true;
                }
              }
            }
          } catch (_) {}

          const visitLabel = isFollowUp ? "Follow-up Visit (≤10 days)" : "OPD Visit 1";
          setOpdPatient({
            patientId: String(found.id || ""),
            name: found.name,
            age: found.age ? String(found.age) : "",
            sex: found.sex || "Male",
            phone: found.phone_number,
            uhid: uhidClean,
            visitNumber: visitLabel,
          });

          // Set consultation fee automatically based on doctor & 10-day follow-up
          const fee = getDoctorConsultationFee(activeDoctor, isFollowUp);
          setOpdCharges((prev) => {
            const hasConsult = prev.some((c) => c.name.toLowerCase().includes("consultation"));
            if (hasConsult) {
              return prev.map((c) =>
                c.name.toLowerCase().includes("consultation")
                  ? {
                      ...c,
                      name: isFollowUp
                        ? `Follow-up Consultation (${activeDoctor})`
                        : `Consultation Fee (${activeDoctor})`,
                      unitPrice: fee,
                      total: fee * c.quantity,
                    }
                  : c
              );
            }
            return [
              ...prev,
              {
                id: "consult_" + Date.now(),
                name: isFollowUp
                  ? `Follow-up Consultation (${activeDoctor})`
                  : `Consultation Fee (${activeDoctor})`,
                category: "Consultation",
                unitPrice: fee,
                quantity: 1,
                total: fee,
              },
            ];
          });
        }
      } catch (err) {
        console.error("Lookup error:", err);
      }
    }
  };

  // Handle charge item name change with procedure catalog matching
  const handleChargeNameChange = (idx: number, newName: string) => {
    const updated = [...opdCharges];
    updated[idx].name = newName;
    const matched = procedureCatalog.find(
      (p) => p.name.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    if (matched && matched.price > 0) {
      updated[idx].unitPrice = matched.price;
      if (matched.category) {
        updated[idx].category = matched.category as any;
      }
      updated[idx].total = matched.price * updated[idx].quantity;
    }
    setOpdCharges(updated);
  };

  // Handle charge item price change and auto-save custom procedure to catalog
  const handleChargePriceChange = (idx: number, newPrice: number) => {
    const updated = [...opdCharges];
    updated[idx].unitPrice = newPrice;
    updated[idx].total = newPrice * updated[idx].quantity;
    setOpdCharges(updated);

    if (updated[idx].name.trim() && newPrice > 0) {
      saveProcedureToCatalog(updated[idx].name.trim(), newPrice, updated[idx].category);
    }
  };

  // Add Custom Charge (name blank with label placeholder "Custom Service / Procedure")
  const handleAddCustomCharge = () => {
    const customItem: ChargeItem = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: "",
      category: "Procedure",
      unitPrice: 0,
      quantity: 1,
      total: 0,
    };
    setOpdCharges([...opdCharges, customItem]);
  };

  // Add Preset Charge to OPD (kept for helper/backward compatibility)
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
      const patientRef = opdPatient.uhid || `CRX${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Check if an existing bill exists for this linked prescription or patient today
      let targetExistingBill: any = null;
      if (linkedPrescriptionId) {
        try {
          const rxBill = await getBillByPrescriptionId(linkedPrescriptionId);
          if (rxBill && rxBill.id) {
            targetExistingBill = rxBill;
          }
        } catch (e) {
          console.warn("Could not fetch bill by prescription id:", e);
        }
      }

      if (!targetExistingBill && patientRef) {
        try {
          const allBills = await getAllBills();
          const today = new Date().toISOString().split("T")[0];
          const matched = allBills.find(
            (b: any) =>
              b.reference_number === patientRef &&
              (b.created_at?.startsWith(today) || b.bill_date?.startsWith(today) || !b.created_at) &&
              b.payment_status !== "PAID"
          );
          if (matched && matched.id) {
            targetExistingBill = matched;
          }
        } catch (e) {
          console.warn("Could not search existing bills:", e);
        }
      }

      const billItems = opdCharges.map((item, idx) => ({
        id: idx + 1,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
        item_type: "procedure",
      }));

      let savedBillResult: any = null;

      if (targetExistingBill && targetExistingBill.id) {
        // Update the existing bill so Prescription History & Billing are in 100% sync
        const newPaid = opdPaidAmount;
        const newBalance = opdBalanceDue;
        const newStatus = opdPaymentStatus;

        savedBillResult = await updateBill(targetExistingBill.id, {
          total_amount: opdNetTotal,
          paid_amount: newPaid,
          balance_amount: newBalance,
          payment_status: newStatus,
          items: billItems,
          discount_amount: opdDiscount,
          notes: `OPD Bill • ${opdPatient.visitNumber} • Doctor: ${activeDoctor}${targetExistingBill.prescription_id ? ` • Linked Rx: ${targetExistingBill.prescription_id}` : ""}`,
        });
      } else {
        // Create new bill
        const billData: Bill = {
          prescription_id: linkedPrescriptionId || "OPD_DIRECT",
          patient_id: opdPatient.patientId || "WALKIN",
          reference_number: patientRef,
          total_amount: opdNetTotal,
          paid_amount: opdPaidAmount,
          balance_amount: opdBalanceDue,
          payment_status: opdPaymentStatus,
          payment_method: opdPaymentMode,
          discount_amount: opdDiscount,
          notes: `OPD Bill • ${opdPatient.visitNumber} • Doctor: ${activeDoctor}${linkedPrescriptionId ? ` • Linked Rx: ${linkedPrescriptionId}` : ""}`,
          items: billItems,
        };
        savedBillResult = await createBill(billData);
      }

      const activeBillId = savedBillResult?.id || savedBillResult?._id || targetExistingBill?.id;
      const billNumber = savedBillResult?.bill_number || targetExistingBill?.bill_number || `CRX-OPD-${Date.now().toString().slice(-4)}`;

      // Record payment transaction for installment history if amount was paid
      if (opdPaidAmount > 0 && activeBillId) {
        try {
          await paymentTransactionService.create({
            bill_id: String(activeBillId),
            patient_id: opdPatient.patientId || "WALKIN",
            amount: opdPaidAmount,
            payment_method: opdPaymentMode,
            payment_date: new Date().toISOString().split("T")[0],
            notes: `OPD payment collected (${opdPaymentMode}) • ${opdPatient.visitNumber}`,
          });
        } catch (txErr) {
          console.warn("Payment transaction log warning:", txErr);
        }
      }

      setOpdSuccessBill({
        id: activeBillId,
        billNumber: billNumber,
        uhid: patientRef,
        patientName: opdPatient.name,
        total: opdNetTotal,
        paid: opdPaidAmount,
        balance: opdBalanceDue,
        status: opdPaymentStatus,
      });

      // Clear draft on successful bill save
      if (typeof window !== "undefined") {
        try {
          if (patientRef) {
            localStorage.removeItem(`cortex_billing_charges_${patientRef}`);
            localStorage.removeItem(`cortex_billing_discount_${patientRef}`);
          }
          localStorage.removeItem("cortex_billing_opd_charges_draft");
          localStorage.removeItem("cortex_billing_opd_discount_draft");
        } catch (_) {}
      }

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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="tel"
                        value={opdPatient.phone}
                        onChange={(e) => handleOpdPhoneLookup(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-xl text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">Type to auto-fill patient</span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      Patient Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={opdPatient.name}
                      onChange={(e) => setOpdPatient({ ...opdPatient, name: e.target.value })}
                      placeholder="e.g. Dhiraj Bhandekar"
                      className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1.5">Age</label>
                      <input
                        type="number"
                        value={opdPatient.age}
                        onChange={(e) => setOpdPatient({ ...opdPatient, age: e.target.value })}
                        placeholder="34"
                        className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1.5">Sex</label>
                      <select
                        value={opdPatient.sex}
                        onChange={(e) => setOpdPatient({ ...opdPatient, sex: e.target.value })}
                        className="w-full px-3 py-3 border border-slate-300 rounded-xl text-base font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-sm text-slate-600 pt-3 border-t border-slate-100">
                  <span>Visit: <strong className="text-slate-900 font-bold">{opdPatient.visitNumber}</strong></span>
                  <span>Attending Doctor: <strong className="text-slate-900 font-bold">{activeDoctor}</strong></span>
                  <span>Date: <strong className="text-slate-900 font-bold">{new Date().toLocaleDateString("en-GB")}</strong></span>
                </div>
              </div>

              {/* Step 2: Add Configurable Charges */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">
                        2
                      </span>
                      Step 2: Add Charges &amp; Procedures
                    </h2>
                    {autoSaved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Auto-saved
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Auto-save enabled
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                    Changes save in real-time
                  </span>
                </div>

                {/* Charges Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs tracking-wider">
                        <th className="py-3 px-4">Service / Charge Description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-right">Unit Rate (₹)</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Total (₹)</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {opdCharges.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 min-w-[260px]">
                            <input
                              type="text"
                              list="opd-procedure-datalist"
                              value={item.name}
                              placeholder="Custom Service / Procedure"
                              onChange={(e) => handleChargeNameChange(idx, e.target.value)}
                              onBlur={() => {
                                if (item.name.trim() && item.unitPrice > 0) {
                                  saveProcedureToCatalog(item.name.trim(), item.unitPrice, item.category);
                                }
                              }}
                              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:italic placeholder:font-normal"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const updated = [...opdCharges];
                                updated[idx].category = e.target.value as any;
                                setOpdCharges(updated);
                                if (updated[idx].name.trim() && updated[idx].unitPrice > 0) {
                                  saveProcedureToCatalog(updated[idx].name.trim(), updated[idx].unitPrice, e.target.value as any);
                                }
                              }}
                              className="px-3 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Procedure">Procedure</option>
                              <option value="Consultation">Consultation</option>
                              <option value="Registration">Registration</option>
                              <option value="Investigation">Investigation</option>
                              <option value="Nursing">Nursing</option>
                              <option value="Other">Other</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice === 0 ? "" : item.unitPrice}
                              placeholder="0"
                              onChange={(e) => handleChargePriceChange(idx, Number(e.target.value) || 0)}
                              className="w-28 px-3 py-2.5 border border-slate-300 rounded-xl text-base text-right font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
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
                              className="w-16 px-2.5 py-2.5 border border-slate-300 rounded-xl text-base text-center font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-black text-lg text-slate-900 font-mono">
                            ₹{item.total}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => removeOpdCharge(item.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 cursor-pointer transition"
                              title="Remove Charge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Procedure Suggestions Datalist */}
                <datalist id="opd-procedure-datalist">
                  {procedureCatalog.map((proc, pIdx) => (
                    <option key={`${proc.name}_${pIdx}`} value={proc.name}>
                      ₹{proc.price} • {proc.category || "Procedure"}
                    </option>
                  ))}
                </datalist>

                {/* Add Custom Charge Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleAddCustomCharge}
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-blue-50 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" /> Add Custom Charge Item
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Step 3 (Payment Collection & Summary) */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">
                      3
                    </span>
                    Step 3: Collect Payment
                  </h2>
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
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
                <div className="space-y-3.5 text-base">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold">Total Charges (Gross):</span>
                    <strong className="font-mono text-slate-900 text-lg">₹{opdSubtotal}</strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold">Discount:</span>
                    <div className="flex items-center gap-1.5 w-32">
                      <span className="text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={opdDiscount}
                        onChange={(e) => setOpdDiscount(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-right text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-lg font-black text-slate-900 pt-2.5 border-t border-slate-200">
                    <span>Net Bill Amount:</span>
                    <span className="font-mono text-blue-700 text-xl font-black">₹{opdNetTotal}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-slate-800">
                        Amount Paid Now (₹):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setOpdPaidAmount(opdNetTotal);
                            setHasManuallyEditedPaid(false);
                          }}
                          className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition"
                        >
                          Full Paid
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpdPaidAmount(0);
                            setHasManuallyEditedPaid(true);
                          }}
                          className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition"
                        >
                          Pending
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-base font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={opdPaidAmount}
                        onChange={(e) => {
                          setHasManuallyEditedPaid(true);
                          setOpdPaidAmount(Number(e.target.value) || 0);
                        }}
                        className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl text-lg font-black text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Balance Due:</span>
                      <span className="text-xs text-slate-400">Amount remaining</span>
                    </div>
                    <strong className={`text-xl font-black font-mono ${opdBalanceDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      ₹{opdBalanceDue}
                    </strong>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">Payment Mode</label>
                    <select
                      value={opdPaymentMode}
                      onChange={(e) => setOpdPaymentMode(e.target.value as any)}
                      className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-base bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-base shadow transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <ReceiptText className="w-5 h-5" />
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
