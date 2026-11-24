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

  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
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
          setAdmissions(parsed);
        }
      }
    } catch {}

    if (Array.isArray(liveAdmissions) && liveAdmissions.length > 0) {
      setAdmissions(liveAdmissions as unknown as IPDAdmission[]);
    }
  }, [liveAdmissions]);

  // 2. Select the admission corresponding to the URL param
  useEffect(() => {
    if (!admissionId || admissions.length === 0) return;
    const found = admissions.find((a) => a.id === admissionId || a.ipdNumber === admissionId);
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

    const billing = calculateRunningBill(adm, dischargeForm.dischargeDate);
    const discount = Number(dischargeForm.discount) || 0;
    const netTotal = Math.max(0, billing.grossTotal - discount);
    const finalBalance = netTotal - billing.totalAdvances;

    const finalBillNumber = adm.finalSettlement?.billNumber || `CRX-IPD-${Date.now().toString().slice(-5)}`;

    const updated = admissions.map((item) => {
      if (item.id === admId) {
        return {
          ...item,
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
      const billing = calculateRunningBill(admission);
      const discount = Number(dischargeForm.discount) || admission.finalSettlement?.discount || 0;
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

      if (activeBillId && Array.isArray(admission.advances) && admission.advances.length > 0) {
        try {
          await recordBillTransactionsMutation({
            bill_id: String(activeBillId),
            patient_id: admission.uhid || admission.patientId || "WALKIN",
            transactions: admission.advances.map((adv) => ({
              receipt_number: adv.receiptNumber,
              payment_date: adv.date,
              amount: adv.amount,
              payment_method: adv.mode,
              notes: adv.notes || "Inpatient advance deposit",
            })),
          });
        } catch (txErr) {
          console.warn("Could not record bill transactions:", txErr);
        }
      }

      const win = window.open(
        `/print-bill?id=${activeBillId || "IPD"}&patientName=${encodeURIComponent(
          admission.name
        )}&uhid=${encodeURIComponent(admission.uhid)}&phone=${encodeURIComponent(
          admission.phone
        )}&doctor=${encodeURIComponent(admission.consultantDoctor)}&ward=${encodeURIComponent(
          wardStr
        )}&admitDate=${encodeURIComponent(admitDateStr)}&dischargeDate=${encodeURIComponent(
          dischDateStr
        )}&age=${encodeURIComponent(admission.age)}&gender=${encodeURIComponent(
          admission.sex
        )}&address=${encodeURIComponent(admission.address || "")}&diagnosis=${encodeURIComponent(
          admission.provisionalDiagnosis || ""
        )}&stayDays=${billing.days}&grossTotal=${billing.grossTotal}&advances=${
          billing.totalAdvances
        }&discount=${discount}&balance=${finalBalance}&totalAmount=${netTotal}&billNumber=${encodeURIComponent(
          savedBill?.bill_number || `CRX-IPD-${Date.now().toString().slice(-5)}`
        )}&date=${encodeURIComponent(new Date().toISOString().split("T")[0])}`,
        "_blank"
      );
      if (!win) {
        alert("Pop-up blocked. Please allow pop-ups for this site to view the bill.");
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
