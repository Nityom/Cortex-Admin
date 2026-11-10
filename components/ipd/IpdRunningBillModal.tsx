"use client";

import React from "react";
import {
  FileText,
  IndianRupee,
  Receipt,
  X,
  SlidersHorizontal,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import { IPDAdmission, calculateRunningBill } from "./types";
import { formatDate } from "@/lib/utils";

interface IpdRunningBillModalProps {
  admission: IPDAdmission;
  onClose: () => void;
  onGenerateFinalBill: (admission: IPDAdmission) => void;
  onOpenRecordPayment: (admission: IPDAdmission) => void;
  onOpenPatientReceipt: (admission: IPDAdmission) => void;
  onProceedToDischarge: (admission: IPDAdmission) => void;
  editingChargeKey: string | null;
  setEditingChargeKey: (key: any) => void;
  chargeEditForm: {
    dailyRate: number;
    billableDays: number;
    bedOverride: number;
    nursingRate: number;
    nursingOverride: number;
    doctorRate: number;
    doctorVisits: number;
    doctorOverride: number;
  };
  setChargeEditForm: (val: any) => void;
  onSaveChargeOverrides: (id: string) => void;
  editingInvestigation: { id: string; name: string; cost: number } | null;
  setEditingInvestigation: (val: any) => void;
  onUpdateInvestigation: (id: string) => void;
  onDeleteInvestigation: (id: string, invId: string) => void;
  editingProcedure: { id: string; name: string; cost: number; surgeon: string } | null;
  setEditingProcedure: (val: any) => void;
  onUpdateProcedure: (id: string) => void;
  onDeleteProcedure: (id: string, procId: string) => void;
  editingCustomCharge: any | null;
  setEditingCustomCharge: (val: any) => void;
  onUpdateCustomCharge: (id: string) => void;
  onDeleteCustomCharge: (id: string, chargeId: string) => void;
  newInvBilling: { name: string; cost: number };
  setNewInvBilling: (val: any) => void;
  onAddInvestigationCharge: (id: string) => void;
  newProcBilling: { name: string; cost: number; surgeon?: string };
  setNewProcBilling: (val: any) => void;
  onAddProcedureCharge: (id: string) => void;
  chargeInput: { description: string; category: string; amount: number };
  setChargeInput: (val: any) => void;
  onAddCustomCharge: (id: string) => void;
  onPrintReceiptSlip: (admission: IPDAdmission, advance: any) => void;
  onOpenEditPaymentReceipt: (admission: IPDAdmission, advance: any) => void;
  onDeleteAdvance: (id: string, advId: string) => void;
  advanceInput: { amount: number; mode: any; notes: string };
  setAdvanceInput: (val: any) => void;
  onRecordAdvance: (id: string) => void;
}

export function IpdRunningBillModal({
  admission: activeAdmission,
  onClose,
  onGenerateFinalBill,
  onOpenRecordPayment,
  onOpenPatientReceipt,
  onProceedToDischarge,
  editingChargeKey,
  setEditingChargeKey,
  chargeEditForm,
  setChargeEditForm,
  onSaveChargeOverrides,
  editingInvestigation,
  setEditingInvestigation,
  onUpdateInvestigation,
  onDeleteInvestigation,
  editingProcedure,
  setEditingProcedure,
  onUpdateProcedure,
  onDeleteProcedure,
  editingCustomCharge,
  setEditingCustomCharge,
  onUpdateCustomCharge,
  onDeleteCustomCharge,
  newInvBilling,
  setNewInvBilling,
  onAddInvestigationCharge,
  newProcBilling,
  setNewProcBilling,
  onAddProcedureCharge,
  chargeInput,
  setChargeInput,
  onAddCustomCharge,
  onPrintReceiptSlip,
  onOpenEditPaymentReceipt,
  onDeleteAdvance,
  advanceInput,
  setAdvanceInput,
  onRecordAdvance,
}: IpdRunningBillModalProps) {
  const bill = calculateRunningBill(activeAdmission);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-3">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[86vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-xs">
                RUNNING BILL
              </span>
              <span className="font-mono text-xs text-slate-500">
                {activeAdmission.ipdNumber} • {activeAdmission.uhid}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">{activeAdmission.name}</h2>
            <p className="text-xs text-slate-500">
              Stay: {formatDate(activeAdmission.admissionDate)} to Present ({bill.days} days) • Bed: {activeAdmission.bedNumber} (
              {activeAdmission.ward})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onGenerateFinalBill(activeAdmission)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Generate, save and print final hospital bill"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Final Bill
            </button>
            <button
              type="button"
              onClick={() => onOpenRecordPayment(activeAdmission)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Record payment & give receipt to patient"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              + Record Payment
            </button>
            <button
              type="button"
              onClick={() => onOpenPatientReceipt(activeAdmission)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Print Payment Receipts"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              Receipts ({(activeAdmission.advances || []).length})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4">
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

          {/* Section A: Charges Breakdown */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  1. Patient Charges
                </h3>
                <p className="text-[11px] text-slate-500">
                  Only charges you add here are included. Bed, nursing, and doctor rates are not added automatically.
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
                      <span className="font-bold text-slate-900 block">Bed &amp; Room Charges</span>
                      <span className="text-[10px] text-slate-500">
                        {activeAdmission.ward} (Bed: {activeAdmission.bedNumber})
                      </span>
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
                        className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 mx-auto transition"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {editingChargeKey === "bed" ? "Cancel" : "Edit"}
                      </button>
                    </td>
                  </tr>

                  {/* Inline Edit Box for Bed Charges */}
                  {editingChargeKey === "bed" && (
                    <tr className="bg-emerald-50/70 border-b border-emerald-200">
                      <td colSpan={5} className="p-3">
                        <div className="flex flex-wrap items-end gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Daily Rate (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={chargeEditForm.dailyRate}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, dailyRate: Number(e.target.value) })}
                              className="w-28 p-1.5 border border-emerald-300 rounded font-bold text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Billable Days</label>
                            <input
                              type="number"
                              min="1"
                              value={chargeEditForm.billableDays}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, billableDays: Number(e.target.value) })}
                              className="w-24 p-1.5 border border-emerald-300 rounded font-bold text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Or Manual Total Override (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0 (auto-calc)"
                              value={chargeEditForm.bedOverride || ""}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, bedOverride: Number(e.target.value) })}
                              className="w-36 p-1.5 border border-emerald-300 rounded text-xs bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => onSaveChargeOverrides(activeAdmission.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow flex items-center gap-1"
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
                      <span className="font-bold text-slate-900 block">Nursing &amp; Daily Inpatient Care</span>
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
                        className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 mx-auto transition"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {editingChargeKey === "nursing" ? "Cancel" : "Edit"}
                      </button>
                    </td>
                  </tr>

                  {/* Inline Edit Box for Nursing Charges */}
                  {editingChargeKey === "nursing" && (
                    <tr className="bg-emerald-50/70 border-b border-emerald-200">
                      <td colSpan={5} className="p-3">
                        <div className="flex flex-wrap items-end gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Nursing Rate/Day (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={chargeEditForm.nursingRate}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, nursingRate: Number(e.target.value) })}
                              className="w-28 p-1.5 border border-emerald-300 rounded font-bold text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Or Manual Total Override (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0 (auto-calc)"
                              value={chargeEditForm.nursingOverride || ""}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, nursingOverride: Number(e.target.value) })}
                              className="w-36 p-1.5 border border-emerald-300 rounded text-xs bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => onSaveChargeOverrides(activeAdmission.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow flex items-center gap-1"
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
                        className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 mx-auto transition"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {editingChargeKey === "doctor" ? "Cancel" : "Edit"}
                      </button>
                    </td>
                  </tr>

                  {/* Inline Edit Box for Doctor Rounds */}
                  {editingChargeKey === "doctor" && (
                    <tr className="bg-emerald-50/70 border-b border-emerald-200">
                      <td colSpan={5} className="p-3">
                        <div className="flex flex-wrap items-end gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Rate Per Visit (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={chargeEditForm.doctorRate}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, doctorRate: Number(e.target.value) })}
                              className="w-28 p-1.5 border border-emerald-300 rounded font-bold text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Number of Visits</label>
                            <input
                              type="number"
                              min="1"
                              value={chargeEditForm.doctorVisits}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, doctorVisits: Number(e.target.value) })}
                              className="w-24 p-1.5 border border-emerald-300 rounded font-bold text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-900 uppercase">Or Total Override (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0 (auto-calc)"
                              value={chargeEditForm.doctorOverride || ""}
                              onChange={(e) => setChargeEditForm({ ...chargeEditForm, doctorOverride: Number(e.target.value) })}
                              className="w-36 p-1.5 border border-emerald-300 rounded text-xs bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => onSaveChargeOverrides(activeAdmission.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow flex items-center gap-1"
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
                    <tr key={inv.id} className="bg-emerald-50/20 hover:bg-emerald-50/40">
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block">🔬 Lab: {inv.name}</span>
                        <span className="text-[10px] text-slate-500">
                          Ordered: {inv.date} ({inv.status})
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">Diagnostic Test</td>
                      <td className="p-3">1 Test</td>
                      <td className="p-3 font-bold font-mono text-right text-slate-900">
                        {editingInvestigation?.id === inv.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editingInvestigation.cost}
                            onChange={(e) =>
                              setEditingInvestigation({ ...editingInvestigation, cost: Number(e.target.value) })
                            }
                            className="w-20 p-1 border border-emerald-400 rounded text-right font-bold text-xs"
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
                              onClick={() => onUpdateInvestigation(activeAdmission.id)}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingInvestigation({ id: inv.id, name: inv.name, cost: inv.cost })}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100"
                              title="Edit test price"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteInvestigation(activeAdmission.id, inv.id)}
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
                        <span className="text-[10px] text-slate-500">
                          Surgeon: {proc.surgeon} • Date: {proc.date}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">OT &amp; Surgeon Fee</td>
                      <td className="p-3">1 Proc</td>
                      <td className="p-3 font-bold font-mono text-right text-slate-900">
                        {editingProcedure?.id === proc.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editingProcedure.cost}
                            onChange={(e) =>
                              setEditingProcedure({ ...editingProcedure, cost: Number(e.target.value) })
                            }
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
                              onClick={() => onUpdateProcedure(activeAdmission.id)}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProcedure({
                                  id: proc.id,
                                  name: proc.name,
                                  cost: proc.cost,
                                  surgeon: proc.surgeon,
                                })
                              }
                              className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100"
                              title="Edit procedure cost"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteProcedure(activeAdmission.id, proc.id)}
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
                            onChange={(e) =>
                              setEditingCustomCharge({ ...editingCustomCharge, description: e.target.value })
                            }
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
                            onChange={(e) =>
                              setEditingCustomCharge({ ...editingCustomCharge, amount: Number(e.target.value) })
                            }
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
                              onClick={() => onUpdateCustomCharge(activeAdmission.id)}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingCustomCharge(cc)}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100"
                              title="Edit charge"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteCustomCharge(activeAdmission.id, cc.id)}
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
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-emerald-900 block flex items-center gap-1">
                  + Add Lab Test / Investigation Charge
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newInvBilling.name}
                    onChange={(e) => setNewInvBilling({ ...newInvBilling, name: e.target.value })}
                    placeholder="e.g. Serum Electrolytes / MRI Spine"
                    className="flex-1 p-1.5 border border-emerald-300 rounded text-xs bg-white"
                  />
                  <input
                    type="number"
                    min="0"
                    value={newInvBilling.cost}
                    onChange={(e) => setNewInvBilling({ ...newInvBilling, cost: Number(e.target.value) })}
                    className="w-20 p-1.5 border border-emerald-300 rounded font-bold text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => onAddInvestigationCharge(activeAdmission.id)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs"
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
                    onClick={() => onAddProcedureCharge(activeAdmission.id)}
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
                onClick={() => onAddCustomCharge(activeAdmission.id)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded font-bold text-xs shadow"
              >
                + Add Misc Charge
              </button>
            </div>
          </div>

          {/* Section B: Advances Paid Ledger */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              2. Advance Payments &amp; Deposits Ledger
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
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                          {adv.mode}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{adv.notes || "—"}</td>
                      <td className="p-3 font-bold font-mono text-emerald-700 text-right">₹{adv.amount}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPrintReceiptSlip(activeAdmission, adv)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px]"
                          >
                            Slip
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEditPaymentReceipt(activeAdmission, adv)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50"
                            title="Edit payment receipt"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAdvance(activeAdmission.id, adv.id)}
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
            <div className="mt-3 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-end gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 uppercase">Collect Advance (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={advanceInput.amount}
                  onChange={(e) => setAdvanceInput({ ...advanceInput, amount: Number(e.target.value) })}
                  className="w-28 p-1.5 border border-emerald-300 rounded font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-800 uppercase">Mode</label>
                <select
                  value={advanceInput.mode}
                  onChange={(e) => setAdvanceInput({ ...advanceInput, mode: e.target.value as any })}
                  className="p-1.5 border border-emerald-300 rounded bg-white text-xs"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-bold text-emerald-800 uppercase">Remarks</label>
                <input
                  type="text"
                  value={advanceInput.notes}
                  onChange={(e) => setAdvanceInput({ ...advanceInput, notes: e.target.value })}
                  placeholder="e.g. Surgery advance deposit"
                  className="w-full p-1.5 border border-emerald-300 rounded text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => onRecordAdvance(activeAdmission.id)}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs shadow flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                Record &amp; Print Receipt
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onProceedToDischarge(activeAdmission)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
          >
            Proceed to Final Discharge &amp; Settlement →
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
