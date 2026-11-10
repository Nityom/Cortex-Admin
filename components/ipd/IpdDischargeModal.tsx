"use client";

import React from "react";
import {
  X,
  IndianRupee,
  FileText,
  AlertCircle,
  CheckCircle2,
  Plus,
  Check,
  Trash2,
  Receipt,
} from "lucide-react";
import { IPDAdmission, HospitalChargeItem, calculateRunningBill } from "./types";

interface IpdDischargeModalProps {
  isOpen: boolean;
  admission: IPDAdmission | null;
  onClose: () => void;
  procedureCatalog: HospitalChargeItem[];
  dischargeForm: {
    dischargeDate: string;
    dischargeTime: string;
    conditionAtDischarge: string;
    finalDiagnosis: string;
    treatmentGiven: string;
    dischargeMeds: string;
    followupDate: string;
    doctorNotes: string;
    discount: number;
    finalPaymentMode: "Cash" | "UPI" | "Card" | "Bank Transfer" | "TPA / Claim Settled";
  };
  setDischargeForm: React.Dispatch<React.SetStateAction<any>>;
  dischargeTab: "settlement" | "clinical";
  setDischargeTab: (tab: "settlement" | "clinical") => void;
  dischargeChargeInput: {
    name: string;
    category: "Procedure" | "Investigation" | "Consultation" | "Nursing" | "Medicine" | "Bed" | "Other";
    unitPrice: string;
    quantity: number;
  };
  setDischargeChargeInput: React.Dispatch<React.SetStateAction<any>>;
  showDischargeChargeSuggestions: boolean;
  setShowDischargeChargeSuggestions: (show: boolean) => void;
  ipdAutoSaved: boolean;
  onDischargeDiscountChange: (admissionId: string, val: number) => void;
  onAddChargeInDischarge: (admissionId: string) => void;
  onDeleteChargeInDischarge: (admissionId: string, chargeId: string, type: "inv" | "proc" | "custom") => void;
  onUpdateCustomChargeInDischarge: (admissionId: string, chargeId: string, desc: string, amt: number) => void;
  onOpenRecordPayment: (admission: IPDAdmission, returnTo?: "none" | "discharge" | "billing") => void;
  onFinalizeDischarge: (admissionId: string) => void;
  onGenerateFinalBill: (admission: IPDAdmission) => Promise<void>;
}

export default function IpdDischargeModal({
  isOpen,
  admission,
  onClose,
  procedureCatalog,
  dischargeForm,
  setDischargeForm,
  dischargeTab,
  setDischargeTab,
  dischargeChargeInput,
  setDischargeChargeInput,
  showDischargeChargeSuggestions,
  setShowDischargeChargeSuggestions,
  ipdAutoSaved,
  onDischargeDiscountChange,
  onAddChargeInDischarge,
  onDeleteChargeInDischarge,
  onUpdateCustomChargeInDischarge,
  onOpenRecordPayment,
  onFinalizeDischarge,
  onGenerateFinalBill,
}: IpdDischargeModalProps) {
  if (!isOpen || !admission) return null;

  const bill = calculateRunningBill(admission, dischargeForm.dischargeDate);
  const discount = Number(dischargeForm.discount) || 0;
  const netTotal = Math.max(0, bill.grossTotal - discount);
  const finalBalance = netTotal - bill.totalAdvances;
  const toRecover = finalBalance > 0 ? finalBalance : 0;
  const toRefund = finalBalance < 0 ? Math.abs(finalBalance) : 0;

  const matchingCharges = procedureCatalog.filter((c) =>
    c.name.toLowerCase().includes((dischargeChargeInput.name || "").trim().toLowerCase())
  );

  const isAlreadyDischarged = admission.status === "Discharged";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-2 md:p-3">
      <div className="bg-white sm:rounded-2xl w-full max-w-6xl h-full sm:h-auto max-h-[88vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs uppercase tracking-wider ${
                    isAlreadyDischarged
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  {isAlreadyDischarged
                    ? "DISCHARGED • EDITABLE RECORD & SETTLEMENT"
                    : "DISCHARGE & FINANCIAL SETTLEMENT"}
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  IPD: {admission.ipdNumber}
                </span>
                <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  UHID: {admission.uhid}
                </span>
                <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  📞 {admission.phone}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                {isAlreadyDischarged ? "Edit Discharge & Bill:" : "Discharge & Settle:"} {admission.name}
                <span className="text-sm font-normal text-slate-500 font-sans">
                  ({admission.age} yrs, {admission.sex})
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Doctor: <strong className="text-slate-900">{admission.consultantDoctor}</strong> • Room & Bed:{" "}
                <strong className="text-slate-900">
                  {admission.ward} — {admission.bedNumber}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition cursor-pointer"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Admission & Discharge Date/Time Bar (Directly Editable with Live Bill Recalculation) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Admission Date & Time
                </span>
                <span className="font-bold text-slate-800">
                  {admission.admissionDate} {admission.admissionTime ? `• ${admission.admissionTime}` : ""}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 hidden sm:block" />
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Discharge Date
                </label>
                <input
                  type="date"
                  value={dischargeForm.dischargeDate}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDate: e.target.value })}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg font-bold text-xs sm:text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Discharge Time
                </label>
                <input
                  type="text"
                  value={dischargeForm.dischargeTime}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeTime: e.target.value })}
                  placeholder="e.g. 02:30 PM"
                  className="w-28 px-2.5 py-1 border border-slate-300 rounded-lg font-bold text-xs sm:text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg font-bold text-xs sm:text-sm border border-emerald-300 shadow-2xs">
                ⏱️ {bill.days} Billable Stay Days
              </span>
              {admission.finalSettlement?.billNumber && (
                <span className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg font-mono font-bold text-xs sm:text-sm border border-blue-200 shadow-2xs">
                  Bill #{admission.finalSettlement.billNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setDischargeTab("settlement")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              dischargeTab === "settlement"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            1. Financial Settlement & Charges (Recover / Return)
          </button>
          <button
            type="button"
            onClick={() => setDischargeTab("clinical")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              dischargeTab === "clinical"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            2. Clinical Summary & Discharge Medications
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          {dischargeTab === "settlement" ? (
            <>
              {/* SECTION A: PROMINENT RECOVERY / REFUND STATUS BANNER */}
              {toRecover > 0 ? (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow shrink-0">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                          Payment Due From Patient
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-rose-950 mt-1">
                        AMOUNT NEEDED TO RECOVER FROM PATIENT
                      </h4>
                      <p className="text-xs sm:text-sm text-rose-700">
                        Patient has remaining balance dues after adjusting all advances. Collect this balance before
                        discharge.
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right sm:border-l sm:border-rose-200 sm:pl-6">
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                      Balance to Recover
                    </span>
                    <span className="text-3xl sm:text-4xl font-black font-mono text-rose-700">
                      ₹{toRecover.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ) : toRefund > 0 ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                          Excess Advance Deposited
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-emerald-950 mt-1">
                        AMOUNT TO BE GIVEN / RETURNED TO PATIENT (REFUND)
                      </h4>
                      <p className="text-xs sm:text-sm text-emerald-700">
                        Patient deposited more than the total charges incurred. Refund this excess amount upon discharge.
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right sm:border-l sm:border-emerald-200 sm:pl-6">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                      Refund to Patient
                    </span>
                    <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-700">
                      ₹{toRefund.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-blue-950">
                        ACCOUNT FULLY SETTLED (₹0.00 DUE)
                      </h4>
                      <p className="text-xs sm:text-sm text-blue-700">
                        All accumulated charges match patient advances exactly. No recovery or refund required.
                      </p>
                    </div>
                  </div>
                  <span className="text-3xl sm:text-4xl font-black font-mono text-blue-800">₹0</span>
                </div>
              )}

              {/* SECTION B: 4 NUMERICAL METRIC PILLS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase block tracking-wider">
                    1. Gross Total Charges
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1 block">
                    ₹{bill.grossTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase block tracking-wider">
                      2. Hospital Discount
                    </span>
                    {ipdAutoSaved && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Saved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={dischargeForm.discount === 0 ? "" : dischargeForm.discount}
                      placeholder="0"
                      onChange={(e) => onDischargeDiscountChange(admission.id, Math.max(0, Number(e.target.value)))}
                      className="w-28 p-1.5 border border-slate-300 rounded-lg font-mono font-bold text-base bg-white text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase block tracking-wider">
                    3. Net Final Bill
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1 block">
                    ₹{netTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                  <span className="text-xs font-bold text-emerald-800 uppercase block tracking-wider">
                    4. Total Advances Paid
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800 mt-1 block">
                    − ₹{bill.totalAdvances.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* SECTION C: ADD MORE CHARGES & SERVICES (LIKE OPD BILLING) */}
              <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/60 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      Add More Charges & Services (Full Charges Catalog with Autocomplete)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Type to search from 75 standard IPD charges (Day-wise & other particulars) or enter a custom
                      service.
                    </p>
                  </div>
                  {ipdAutoSaved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Auto-saved to DB
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Auto-save enabled
                    </span>
                  )}
                </div>

                {/* Quick Add Form Row with Rich Autocomplete & Keyboard Support */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-xs">
                  <div className="relative sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Service / Procedure Name (Type to search 75+ charges)
                    </label>
                    <input
                      type="text"
                      value={dischargeChargeInput.name}
                      onFocus={() => setShowDischargeChargeSuggestions(true)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = procedureCatalog.find((p) => p.name.toLowerCase() === val.toLowerCase());
                        if (matched) {
                          setDischargeChargeInput({
                            ...dischargeChargeInput,
                            name: val,
                            category: matched.category,
                            unitPrice: String(matched.price),
                          });
                        } else {
                          setDischargeChargeInput({ ...dischargeChargeInput, name: val });
                        }
                        setShowDischargeChargeSuggestions(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            dischargeChargeInput.name.trim() &&
                            !isNaN(Number(dischargeChargeInput.unitPrice)) &&
                            Number(dischargeChargeInput.unitPrice) >= 0
                          ) {
                            onAddChargeInDischarge(admission.id);
                            setShowDischargeChargeSuggestions(false);
                          }
                        } else if (e.key === "Escape") {
                          setShowDischargeChargeSuggestions(false);
                        }
                      }}
                      placeholder="Type e.g. Dressing, X-Ray, Blood, OT, Injection, AC..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />

                    {/* Autocomplete Dropdown */}
                    {showDischargeChargeSuggestions && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                        <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 border-b border-slate-200">
                          <span>Charges Catalog ({matchingCharges.length} matching)</span>
                          <button
                            type="button"
                            onClick={() => setShowDischargeChargeSuggestions(false)}
                            className="text-slate-400 hover:text-slate-700 font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                        {matchingCharges.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            No preset match. You can still type custom name and rate.
                          </div>
                        ) : (
                          matchingCharges.map((item, idx) => (
                            <button
                              key={`${item.name}-${item.price}-${idx}`}
                              type="button"
                              onClick={() => {
                                setDischargeChargeInput({
                                  ...dischargeChargeInput,
                                  name: item.name,
                                  category: item.category,
                                  unitPrice: String(item.price),
                                });
                                setShowDischargeChargeSuggestions(false);
                              }}
                              className="w-full text-left p-2.5 hover:bg-emerald-50 transition flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-900">
                                  {item.name}
                                </span>
                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 font-semibold">
                                  {item.category}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-xs sm:text-sm text-emerald-700">
                                ₹{item.price.toLocaleString("en-IN")}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={dischargeChargeInput.category}
                      onChange={(e) =>
                        setDischargeChargeInput({ ...dischargeChargeInput, category: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium outline-none"
                    >
                      <option value="Procedure">Procedure</option>
                      <option value="Investigation">Investigation</option>
                      <option value="Consultation">Consultation</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Medicine">Medicine / Pharmacy</option>
                      <option value="Bed">Bed / Stay</option>
                      <option value="Other">Other / Misc</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={dischargeChargeInput.unitPrice}
                      onChange={(e) => setDischargeChargeInput({ ...dischargeChargeInput, unitPrice: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            dischargeChargeInput.name.trim() &&
                            !isNaN(Number(dischargeChargeInput.unitPrice)) &&
                            Number(dischargeChargeInput.unitPrice) >= 0
                          ) {
                            onAddChargeInDischarge(admission.id);
                            setShowDischargeChargeSuggestions(false);
                          }
                        }
                      }}
                      placeholder="₹ 0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-right outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={dischargeChargeInput.quantity}
                      onChange={(e) =>
                        setDischargeChargeInput({
                          ...dischargeChargeInput,
                          quantity: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (
                            dischargeChargeInput.name.trim() &&
                            !isNaN(Number(dischargeChargeInput.unitPrice)) &&
                            Number(dischargeChargeInput.unitPrice) >= 0
                          ) {
                            onAddChargeInDischarge(admission.id);
                            setShowDischargeChargeSuggestions(false);
                          }
                        }
                      }}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-center outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        onAddChargeInDischarge(admission.id);
                        setShowDischargeChargeSuggestions(false);
                      }}
                      disabled={
                        !dischargeChargeInput.name.trim() ||
                        isNaN(Number(dischargeChargeInput.unitPrice)) ||
                        Number(dischargeChargeInput.unitPrice) < 0
                      }
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Itemized Charges Table with Inline Editing & Delete */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-sm shadow-xs min-h-[220px] max-h-72 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-3">Service Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                        <th className="p-3 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Bed charges */}
                      {bill.bedCharges > 0 && (
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">
                            Bed & Accommodation ({admission.ward} - {admission.bedNumber}) • {bill.days} days @ ₹
                            {admission.dailyRate}/day
                          </td>
                          <td className="p-3 text-slate-500">Stay / Bed</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{bill.bedCharges.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center text-slate-400 text-xs italic">Base</td>
                        </tr>
                      )}
                      {/* Nursing charges */}
                      {bill.nursingCharges > 0 && (
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">
                            Nursing Care & Monitoring • {bill.days} days @ ₹{admission.nursingRatePerDay}/day
                          </td>
                          <td className="p-3 text-slate-500">Nursing</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{bill.nursingCharges.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center text-slate-400 text-xs italic">Base</td>
                        </tr>
                      )}
                      {/* Doctor visits */}
                      {bill.doctorCharges > 0 && (
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">
                            Doctor Consultations ({admission.consultantDoctor}) • {bill.doctorVisitsCount} visit(s) @ ₹
                            {admission.doctorRatePerVisit}/visit
                          </td>
                          <td className="p-3 text-slate-500">Consultation</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{bill.doctorCharges.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center text-slate-400 text-xs italic">Base</td>
                        </tr>
                      )}
                      {/* Diagnostic Investigations */}
                      {(admission.investigations || []).map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">🔬 Lab Test: {inv.name}</td>
                          <td className="p-3 text-slate-500">Investigation</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{inv.cost.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteChargeInDischarge(admission.id, inv.id, "inv")}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                              title="Remove charge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* Surgical Procedures */}
                      {(admission.procedures || []).map((proc) => (
                        <tr key={proc.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">
                            ⚕️ Procedure: {proc.name}
                            {proc.surgeon ? ` (${proc.surgeon})` : ""}
                          </td>
                          <td className="p-3 text-slate-500">Procedure</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{proc.cost.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteChargeInDischarge(admission.id, proc.id, "proc")}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                              title="Remove charge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* Custom Hospital Charges (Inline Editable like OPD Billing) */}
                      {(admission.customCharges || []).map((cc) => (
                        <tr key={cc.id} className="hover:bg-slate-50/50 group">
                          <td className="p-2 font-semibold text-slate-800">
                            <input
                              type="text"
                              value={cc.description}
                              onChange={(e) =>
                                onUpdateCustomChargeInDischarge(admission.id, cc.id, e.target.value, cc.amount)
                              }
                              placeholder="Service description"
                              className="w-full px-2.5 py-1.5 border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded text-sm font-semibold bg-transparent focus:bg-white outline-none"
                            />
                          </td>
                          <td className="p-3 text-slate-500">{cc.category || "Custom"}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400 text-sm">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={cc.amount}
                                onChange={(e) =>
                                  onUpdateCustomChargeInDischarge(
                                    admission.id,
                                    cc.id,
                                    cc.description,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-24 px-2 py-1 border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded text-right font-mono font-bold text-sm bg-transparent focus:bg-white outline-none"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteChargeInDischarge(admission.id, cc.id, "custom")}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                              title="Remove charge"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION D: ADVANCE PAYMENTS DEPOSITED (PATIENT MONEY IN) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Patient Advance Payments Received ({(admission.advances || []).length} receipts):
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenRecordPayment(admission, "discharge")}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Record Additional Advance
                  </button>
                </div>
                {(admission.advances || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No advance deposits received yet for this patient.</p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {admission.advances.map((adv, idx) => (
                      <div
                        key={adv.id}
                        className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2.5"
                      >
                        <span className="font-mono font-bold text-emerald-900">
                          #{idx + 1} {adv.receiptNumber}
                        </span>
                        <span className="text-slate-600">
                          ({adv.date} • {adv.mode})
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          ₹{adv.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION E: SETTLEMENT PAYMENT COLLECTION MODE */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-slate-800">
                    {toRecover > 0
                      ? "Mode of Balance Recovery:"
                      : toRefund > 0
                        ? "Mode of Refund to Patient:"
                        : "Settlement Mode:"}
                  </label>
                  <select
                    value={dischargeForm.finalPaymentMode}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, finalPaymentMode: e.target.value as any })}
                    className="p-2 border border-slate-300 rounded-lg bg-white text-sm font-bold text-slate-800 outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Bank Transfer">NEFT / Bank Transfer</option>
                    <option value="TPA / Claim Settled">TPA / Claim Settled</option>
                  </select>
                </div>

                <div className="text-sm font-semibold text-slate-600">
                  {toRecover > 0 ? (
                    <span className="text-rose-700 font-bold">
                      Collect ₹{toRecover.toLocaleString("en-IN")} via {dischargeForm.finalPaymentMode}
                    </span>
                  ) : toRefund > 0 ? (
                    <span className="text-emerald-700 font-bold">
                      Return ₹{toRefund.toLocaleString("en-IN")} via {dischargeForm.finalPaymentMode}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">All payments balanced</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: CLINICAL DISCHARGE SUMMARY & MEDS */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Discharge Date</label>
                  <input
                    type="date"
                    value={dischargeForm.dischargeDate}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Condition at Discharge</label>
                  <select
                    value={dischargeForm.conditionAtDischarge}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, conditionAtDischarge: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-sm font-semibold"
                  >
                    <option value="Cured / Stable">Cured / Stable</option>
                    <option value="Improved">Improved</option>
                    <option value="Transferred to Higher Centre">Transferred to Higher Centre</option>
                    <option value="LAMA (Left Against Medical Advice)">LAMA</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Final Diagnosis</label>
                  <input
                    type="text"
                    value={dischargeForm.finalDiagnosis}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                    placeholder="Final clinical diagnosis"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Treatment Given During Stay</label>
                  <textarea
                    rows={3}
                    value={dischargeForm.treatmentGiven}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentGiven: e.target.value })}
                    placeholder="Summary of surgeries, IV medications, and care provided..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Discharge Medications (To Continue at Home)
                  </label>
                  <textarea
                    rows={4}
                    value={dischargeForm.dischargeMeds}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeMeds: e.target.value })}
                    placeholder="Medications, dosages, timings..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={dischargeForm.followupDate}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, followupDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Diet / Activity Advice</label>
                  <input
                    type="text"
                    value={dischargeForm.doctorNotes}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, doctorNotes: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onFinalizeDischarge(admission.id)}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {isAlreadyDischarged ? "Save Summary Only" : "Discharge Only"}
            </button>

            <button
              type="button"
              onClick={() => onGenerateFinalBill(admission)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              {admission.finalSettlement?.billId ? "Update & Print Bill" : "Generate & Print Bill"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

