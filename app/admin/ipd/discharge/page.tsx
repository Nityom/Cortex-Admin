"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  IPDAdmission,
  COMPLETE_IPD_CHARGES_CATALOG,
  calculateRunningBill,
  STORAGE_KEY,
} from "@/components/ipd/types";
import IpdDischargeModal from "@/components/ipd/IpdDischargeModal";
import { IpdRecordPaymentModal } from "@/components/ipd/IpdRecordPaymentModal";
import { IpdPrintReceiptModal } from "@/components/ipd/IpdPrintReceiptModal";
import IpdPrintDischargeModal from "@/components/ipd/IpdPrintDischargeModal";
import { hospitalConfig } from "@/config/hospital";
import { createBill, updateBill } from "@/services/bills";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

function DischargeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const admissionId = searchParams.get("id");

  const liveAdmissions = useQuery(api.ipd.list, {});
  const saveIpdMutation = useMutation(api.ipd.save);
  const recordBillTransactionsMutation = useMutation(api.payment_transactions.recordBillTransactions);

  const [admissions, setAdmissions] = useState<IPDAdmission[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any, idx: number) => ({
              ...item,
              id: item.id || item.admission_id || item._id || String(100 + idx + 1),
              ipdNumber: item.ipdNumber || String(100 + idx + 1),
            }));
          }
        }
      } catch {}
    }
    return [];
  });
  const [activeAdmission, setActiveAdmission] = useState<IPDAdmission | null>(null);
  const [activeModal, setActiveModal] = useState<"none" | "recordPayment" | "printReceipt" | "printDischarge">("none");
  const [recordPaymentAdmission, setRecordPaymentAdmission] = useState<IPDAdmission | null>(null);
  const [printReceiptData, setPrintReceiptData] = useState<{ patient: IPDAdmission; advance: any } | null>(null);
  const [receiptPageSize, setReceiptPageSize] = useState<"A6" | "A7" | "A4">("A4");
  const [dischargeIncludeSignature, setDischargeIncludeSignature] = useState(true);

  // Quick Payment Modal Form State
  const [editingAdvanceId, setEditingAdvanceId] = useState<string | null>(null);
  const [editingReceiptNumber, setEditingReceiptNumber] = useState<string>("");
  const [quickPaymentForm, setQuickPaymentForm] = useState<{
    amount: string;
    mode: "Cash" | "UPI" | "Card" | "Bank Transfer";
    date: string;
    notes: string;
    receivedBy: string;
  }>({
    amount: "",
    mode: "UPI",
    date: new Date().toISOString().split("T")[0],
    notes: "Inpatient Stay Payment",
    receivedBy: "Reception Desk",
  });

  // Discharge Form State
  const [dischargeTab, setDischargeTab] = useState<"settlement" | "clinical">("settlement");
  const [dischargeForm, setDischargeForm] = useState({
    admissionDate: "",
    admissionTime: "",
    dischargeDate: new Date().toISOString().split("T")[0],
    dischargeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    conditionAtDischarge: "Cured / Stable",
    finalDiagnosis: "",
    treatmentGiven: "",
    dischargeMeds: "",
    followupDate: "",
    doctorNotes: "",
    discount: 0,
    finalPaymentMode: "Cash" as "Cash" | "UPI" | "Card" | "Bank Transfer" | "TPA / Claim Settled",
  });

  const [dischargeChargeInput, setDischargeChargeInput] = useState<{
    name: string;
    category: "Procedure" | "Investigation" | "Consultation" | "Nursing" | "Medicine" | "Bed" | "Other";
    unitPrice: string;
    quantity: number;
  }>({
    name: "",
    category: "Procedure",
    unitPrice: "",
    quantity: 1,
  });

  const [showDischargeChargeSuggestions, setShowDischargeChargeSuggestions] = useState(false);
  const [ipdAutoSaved, setIpdAutoSaved] = useState(false);

  // 1. Sync admissions from Convex & LocalStorage
  useEffect(() => {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((item: any, idx: number) => ({
            ...item,
            id: item.id || item.admission_id || item._id || String(100 + idx + 1),
            ipdNumber: item.ipdNumber || String(100 + idx + 1),
          }));
          setAdmissions(mapped);
        }
      }
    } catch {}

    if (Array.isArray(liveAdmissions) && liveAdmissions.length > 0) {
      const mapped: IPDAdmission[] = liveAdmissions.map((item: any, idx: number) => {
        const fallbackIpdNo =
          item.ipdNumber && item.ipdNumber.trim() ? item.ipdNumber.trim() : String(100 + (idx + 1));
        return {
          ...item,
          id: item.id || item.admission_id || item._id,
          ipdNumber: fallbackIpdNo,
        };
      });
      setAdmissions(mapped);
    }
  }, [liveAdmissions]);

  // 2. Select the admission corresponding to the URL param
  useEffect(() => {
    if (!admissionId || admissions.length === 0) return;
    const cleanId = admissionId.trim().toLowerCase();
    const found = admissions.find((a: any) => {
      const aId = String(a.id || a.admission_id || a._id || "").trim().toLowerCase();
      const aIpd = String(a.ipdNumber || "").trim().toLowerCase();
      const aUhid = String(a.uhid || "").trim().toLowerCase();
      return aId === cleanId || aIpd === cleanId || aUhid === cleanId;
    });

    if (found) {
      setActiveAdmission(found);
      const isDisch = found.status === "Discharged";
      const initialDischargeDate = isDisch
        ? found.dischargeDate || new Date().toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const initialDischargeTime = isDisch
        ? found.dischargeTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      setDischargeForm({
        admissionDate: found.admissionDate || new Date().toISOString().split("T")[0],
        admissionTime: found.admissionTime || "",
        dischargeDate: initialDischargeDate,
        dischargeTime: initialDischargeTime,
        conditionAtDischarge: found.dischargeSummary?.conditionAtDischarge || "Cured / Stable",
        finalDiagnosis: found.dischargeSummary?.finalDiagnosis || found.provisionalDiagnosis || "",
        treatmentGiven:
          found.dischargeSummary?.treatmentGiven ||
          `Admitted under ${found.consultantDoctor} in ${found.ward}. Routine inpatient management administered.`,
        dischargeMeds:
          found.dischargeSummary?.dischargeMeds ||
          "Tab. Paracetamol 650mg TDS x 3 days\nTab. Pantoprazole 40mg OD Before Breakfast x 5 days",
        followupDate: found.dischargeSummary?.followupDate || "",
        doctorNotes: found.dischargeSummary?.doctorNotes || "Follow-up in OPD after 5 days with test reports.",
        discount: found.finalSettlement?.discount || 0,
        finalPaymentMode: (found.finalSettlement?.paymentMode as any) || "Cash",
      });
    }
  }, [admissionId, admissions]);

  // Helper to persist admission updates
  const saveAdmissions = (newItems: IPDAdmission[], changedItem?: IPDAdmission) => {
    setAdmissions(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error("Failed to save IPD admissions to storage:", e);
    }

    if (changedItem) {
      try {
        saveIpdMutation({ admission: changedItem as any })
          .then(() => {
            setIpdAutoSaved(true);
            setTimeout(() => setIpdAutoSaved(false), 2500);
          })
          .catch((err) => console.error("Convex IPD mutation failed:", err));
      } catch (e) {
        console.error("Could not sync to Convex:", e);
      }
    }
  };

  const handleDischargeDiscountChange = (admId: string, val: number) => {
    const num = Math.max(0, val);
    setDischargeForm((prev) => ({ ...prev, discount: num }));

    const updated = admissions.map((item) => {
      if (item.id === admId) {
        const prevSettlement = item.finalSettlement || {
          billNumber: `CRX-IPD-${Date.now().toString().slice(-5)}`,
          date: dischargeForm.dischargeDate,
          grossTotal: 0,
          discount: 0,
          netTotal: 0,
          advanceAdjusted: 0,
          balancePaid: 0,
          paymentMode: dischargeForm.finalPaymentMode,
          status: "PAID" as const,
        };
        const billing = calculateRunningBill(item, dischargeForm.dischargeDate);
        const netTotal = Math.max(0, billing.grossTotal - num);
        const finalBalance = netTotal - billing.totalAdvances;
        return {
          ...item,
          finalSettlement: {
            ...prevSettlement,
            discount: num,
            netTotal,
            balancePaid: finalBalance,
            status: finalBalance <= 0 ? "PAID" : ("PARTIAL" as any),
          },
        };
      }
      return item;
    });

    const currentItem = updated.find((a) => a.id === admId);
    saveAdmissions(updated, currentItem);
    if (currentItem) setActiveAdmission(currentItem);
  };

  const handleAddChargeInDischarge = (admId: string) => {
    if (!dischargeChargeInput.name.trim()) return;
    const price = Number(dischargeChargeInput.unitPrice) || 0;
    const qty = Math.max(1, dischargeChargeInput.quantity || 1);
    const totalAmount = price * qty;
    const chargeDesc =
      qty > 1 ? `${dischargeChargeInput.name.trim()} (Qty: ${qty} @ ₹${price})` : dischargeChargeInput.name.trim();

    const updated: IPDAdmission[] = admissions.map((item) => {
      if (item.id === admId) {
        const newCustomCharge = {
          id: `cc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          description: chargeDesc,
          amount: totalAmount,
          date: new Date().toISOString().split("T")[0],
          category: dischargeChargeInput.category,
        };
        return {
          ...item,
          customCharges: [...(item.customCharges || []), newCustomCharge],
        };
      }
      return item;
    });

    const currentItem = updated.find((a) => a.id === admId);
    saveAdmissions(updated, currentItem);
    if (currentItem) setActiveAdmission(currentItem);

    setDischargeChargeInput({
      name: "",
      category: "Procedure",
      unitPrice: "",
      quantity: 1,
    });
    setShowDischargeChargeSuggestions(false);
  };

  const handleDeleteChargeInDischarge = (
    admId: string,
    chargeId: string,
    type: "inv" | "proc" | "custom"
  ) => {
    const updated = admissions.map((item) => {
      if (item.id === admId) {
        if (type === "inv") {
          return {
            ...item,
            investigations: (item.investigations || []).filter((i) => i.id !== chargeId),
          };
        } else if (type === "proc") {
          return {
            ...item,
            procedures: (item.procedures || []).filter((p) => p.id !== chargeId),
          };
        } else {
          return {
            ...item,
            customCharges: (item.customCharges || []).filter((c) => c.id !== chargeId),
          };
        }
      }
      return item;
    });

    const currentItem = updated.find((a) => a.id === admId);
    saveAdmissions(updated, currentItem);
    if (currentItem) setActiveAdmission(currentItem);
  };

  const handleUpdateCustomChargeInDischarge = (
    admId: string,
    chargeId: string,
    description: string,
    amount: number
  ) => {
    const updated = admissions.map((item) => {
      if (item.id === admId) {
        return {
          ...item,
          customCharges: (item.customCharges || []).map((cc) =>
            cc.id === chargeId ? { ...cc, description, amount: Math.max(0, amount) } : cc
          ),
        };
      }
      return item;
    });

    const currentItem = updated.find((a) => a.id === admId);
    saveAdmissions(updated, currentItem);
    if (currentItem) setActiveAdmission(currentItem);
  };

  const handleOpenRecordPayment = (adm: IPDAdmission) => {
    setRecordPaymentAdmission(adm);
    setEditingAdvanceId(null);
    setEditingReceiptNumber("");
    setQuickPaymentForm({
      amount: "",
      mode: "UPI",
      date: new Date().toISOString().split("T")[0],
      notes: "Inpatient Stay Payment",
      receivedBy: "Reception Desk",
    });
    setActiveModal("recordPayment");
  };

  const handleFinalizeDischarge = (admId: string) => {
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const effectiveAdm: IPDAdmission = {
      ...adm,
      admissionDate: dischargeForm.admissionDate || adm.admissionDate,
      admissionTime: dischargeForm.admissionTime !== undefined ? dischargeForm.admissionTime : (adm.admissionTime || ""),
    };

    const billing = calculateRunningBill(effectiveAdm, dischargeForm.dischargeDate);
    const discount = Number(dischargeForm.discount) || 0;
    const netTotal = Math.max(0, billing.grossTotal - discount);
    const finalBalance = netTotal - billing.totalAdvances;

    const finalBillNumber = adm.finalSettlement?.billNumber || `CRX-IPD-${Date.now().toString().slice(-5)}`;

    const updated = admissions.map((item) => {
      if (item.id === admId) {
        return {
          ...item,
          admissionDate: effectiveAdm.admissionDate,
          admissionTime: effectiveAdm.admissionTime,
          status: "Discharged" as const,
          dischargeDate: dischargeForm.dischargeDate,
          dischargeTime: dischargeForm.dischargeTime,
          dischargeSummary: {
            conditionAtDischarge: dischargeForm.conditionAtDischarge,
            finalDiagnosis: dischargeForm.finalDiagnosis.trim() || item.provisionalDiagnosis,
            treatmentGiven:
              dischargeForm.treatmentGiven.trim() || `Inpatient care for ${billing.days} days in ${item.ward}.`,
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

    const dischargedAdm = updated.find((a) => a.id === admId);
    saveAdmissions(updated, dischargedAdm);
    if (dischargedAdm) setActiveAdmission(dischargedAdm);
    setActiveModal("printDischarge");
  };

  const handleGenerateFinalBill = async (admission: IPDAdmission) => {
    try {
      const effectiveAdmission: IPDAdmission = {
        ...admission,
        admissionDate: dischargeForm.admissionDate || admission.admissionDate,
        admissionTime: dischargeForm.admissionTime !== undefined ? dischargeForm.admissionTime : (admission.admissionTime || ""),
      };

      const billing = calculateRunningBill(effectiveAdmission, dischargeForm.dischargeDate);
      const discount = Number(dischargeForm.discount) || effectiveAdmission.finalSettlement?.discount || 0;
      const netTotal = Math.max(0, billing.grossTotal - discount);
      const finalBalance = Math.max(0, netTotal - billing.totalAdvances);

      const dischDateStr = `${dischargeForm.dischargeDate || effectiveAdmission.dischargeDate || new Date().toISOString().split("T")[0]} ${dischargeForm.dischargeTime || effectiveAdmission.dischargeTime || ""}`.trim();
      const admitDateStr = `${effectiveAdmission.admissionDate} ${effectiveAdmission.admissionTime || ""}`.trim();
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

      const updated = admissions.map((item) => {
        if (item.id === admission.id) {
          return {
            ...item,
            admissionDate: effectiveAdmission.admissionDate,
            admissionTime: effectiveAdmission.admissionTime,
            dischargeDate: dischargeForm.dischargeDate || item.dischargeDate,
            dischargeTime: dischargeForm.dischargeTime || item.dischargeTime,
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

      // Build complete list of receipts (all advance payments + final settlement if any)
      const receiptsList: Array<{
        amount: number;
        payment_date: string;
        payment_method: string;
        receipt_number: string;
        notes?: string;
      }> = [];

      (admission.advances || []).forEach((adv, idx) => {
        if (Number(adv.amount) > 0) {
          receiptsList.push({
            receipt_number: adv.receiptNumber || `REC-${idx + 1}`,
            payment_date: adv.date || effectiveAdmission.admissionDate,
            amount: Number(adv.amount),
            payment_method: adv.mode || "Cash",
            notes: adv.notes || "Advance Deposit",
          });
        }
      });

      const settlementMode = dischargeForm.finalPaymentMode || admission.finalSettlement?.paymentMode || "Cash";
      const settlementPaid = finalBalance > 0 ? finalBalance : (admission.finalSettlement?.balancePaid || 0);
      if (settlementPaid > 0) {
        receiptsList.push({
          receipt_number: savedBill?.bill_number || admission.finalSettlement?.billNumber || "Final Settlement",
          payment_date: dischargeForm.dischargeDate || admission.dischargeDate || new Date().toISOString().split("T")[0],
          amount: settlementPaid,
          payment_method: settlementMode,
          notes: "Discharge Settlement",
        });
      }

      if (activeBillId && receiptsList.length > 0) {
        try {
          await recordBillTransactionsMutation({
            bill_id: String(activeBillId),
            patient_id: admission.patientId || "WALKIN",
            transactions: receiptsList,
          });
        } catch (txErr) {
          console.warn("Could not record bill transactions:", txErr);
        }
      }

      const totalPaidAmount = receiptsList.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      const remainingBalance = Math.max(0, netTotal - totalPaidAmount);

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
          deposit: String(totalPaidAmount),
          balance: String(remainingBalance),
          receipts: encodeURIComponent(JSON.stringify(receiptsList)),
        });
        const win = window.open(`/print-bill?${queryParams.toString()}`, "_blank");
        if (!win) {
          alert("Pop-up blocked. Please allow pop-ups for this site to view the bill.");
        }
      } else {
        alert("Unable to open bill print preview: No bill ID was returned after saving.");
      }
    } catch (e: any) {
      console.error("Failed to generate final bill:", e);
      alert(`Error generating final bill: ${e?.message || e}`);
    }
  };

  if (!admissionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900">No Admission Selected</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please select an admitted patient to view their discharge details.</p>
        <button
          type="button"
          onClick={() => router.push("/admin/ipd")}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to IPD Ward
        </button>
      </div>
    );
  }

  if (!activeAdmission) {
    if (liveAdmissions !== undefined && admissions.length > 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Admission Record Not Found</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Could not find an IPD record matching:{" "}
            <span className="font-mono font-bold text-slate-700">{admissionId}</span>.
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/ipd")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to IPD Ward
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading patient discharge record...</p>
      </div>
    );
  }

  return (
    <>
      <IpdDischargeModal
        isOpen={true}
        isPageMode={true}
        admission={activeAdmission}
        onClose={() => router.push("/admin/ipd")}
        procedureCatalog={COMPLETE_IPD_CHARGES_CATALOG}
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

      {/* Record Payment Modal */}
      {activeModal === "recordPayment" && recordPaymentAdmission && (
        <IpdRecordPaymentModal
          admission={recordPaymentAdmission}
          editingAdvanceId={editingAdvanceId}
          editingReceiptNumber={editingReceiptNumber}
          quickPaymentForm={quickPaymentForm}
          setQuickPaymentForm={setQuickPaymentForm}
          onClose={() => {
            setActiveModal("none");
            setRecordPaymentAdmission(null);
          }}
          onSave={(printReceipt) => {
            const num = Number(quickPaymentForm.amount) || 0;
            if (num <= 0) {
              alert("Please enter a valid advance amount.");
              return;
            }
            const receiptNum = editingAdvanceId
              ? editingReceiptNumber
              : `CRX-REC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
            const newAdv = {
              id: editingAdvanceId || `adv_${Date.now()}`,
              receiptNumber: receiptNum,
              date: quickPaymentForm.date,
              amount: num,
              mode: quickPaymentForm.mode,
              notes: quickPaymentForm.notes,
              receivedBy: quickPaymentForm.receivedBy,
            };

            const updated = admissions.map((item) => {
              if (item.id === recordPaymentAdmission.id) {
                const prevAdvances = item.advances || [];
                const updatedAdvances = editingAdvanceId
                  ? prevAdvances.map((a) => (a.id === editingAdvanceId ? newAdv : a))
                  : [...prevAdvances, newAdv];
                return { ...item, advances: updatedAdvances };
              }
              return item;
            });

            const currentItem = updated.find((a) => a.id === recordPaymentAdmission.id);
            saveAdmissions(updated, currentItem);
            if (currentItem) setActiveAdmission(currentItem);

            if (printReceipt && currentItem) {
              setPrintReceiptData({ patient: currentItem, advance: newAdv });
              setActiveModal("printReceipt");
            } else {
              setActiveModal("none");
              setRecordPaymentAdmission(null);
            }
          }}
        />
      )}

      {/* Print Advance Receipt Modal */}
      {activeModal === "printReceipt" && printReceiptData && (
        <IpdPrintReceiptModal
          data={printReceiptData}
          setData={setPrintReceiptData}
          receiptPageSize={receiptPageSize}
          setReceiptPageSize={setReceiptPageSize}
          hospitalConfig={hospitalConfig}
          onClose={() => {
            setActiveModal("none");
            setPrintReceiptData(null);
          }}
          onOpenEditReceipt={(patient, advance) => {
            setRecordPaymentAdmission(patient);
            setEditingAdvanceId(advance.id);
            setEditingReceiptNumber(advance.receiptNumber);
            setQuickPaymentForm({
              amount: String(advance.amount),
              mode: advance.mode || "UPI",
              date: advance.date || new Date().toISOString().split("T")[0],
              notes: advance.notes || "",
              receivedBy: advance.receivedBy || "Reception Desk",
            });
            setActiveModal("recordPayment");
          }}
          onOpenRecordPayment={(patient) => {
            handleOpenRecordPayment(patient);
          }}
        />
      )}

      {/* Print Discharge Summary Modal */}
      <IpdPrintDischargeModal
        isOpen={activeModal === "printDischarge"}
        admission={activeAdmission}
        onClose={() => setActiveModal("none")}
        dischargeIncludeSignature={dischargeIncludeSignature}
        setDischargeIncludeSignature={setDischargeIncludeSignature}
      />
    </>
  );
}

export default function IpdDischargePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      }
    >
      <DischargeContent />
    </Suspense>
  );
}
