"use client";

import React from "react";
import { Receipt, X, IndianRupee } from "lucide-react";
import { IPDAdmission, calculateRunningBill } from "./types";

interface IpdRecordPaymentModalProps {
  admission: IPDAdmission;
  editingAdvanceId: string | null;
  editingReceiptNumber: string;
  quickPaymentForm: {
    amount: string;
    mode: "Cash" | "UPI" | "Card" | "Bank Transfer" | "Cheque";
    date: string;
    notes: string;
    receivedBy: string;
  };
  setQuickPaymentForm: (val: any) => void;
  onClose: () => void;
  onSave: (printReceipt: boolean) => void;
}

export function IpdRecordPaymentModal({
  admission: pt,
  editingAdvanceId,
  editingReceiptNumber,
  quickPaymentForm,
  setQuickPaymentForm,
  onClose,
  onSave,
}: IpdRecordPaymentModalProps) {
  const ptBill = calculateRunningBill(pt);
  const totalPaidSoFar = (pt.advances || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const currentBalance = Math.max(0, ptBill.grossTotal - totalPaidSoFar);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingAdvanceId ? `Edit Payment Receipt — ${editingReceiptNumber || 'CRX-REC'}` : "Record Inpatient Payment"}
              </h2>
              <p className="text-xs text-slate-500">
                {editingAdvanceId ? "Modify amount, mode, date, or notes for this receipt" : "Record payment and give small receipt slip immediately"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Info Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900 text-sm">{pt.name}</div>
            <div className="text-slate-500 font-mono text-[11px] mt-0.5">
              UHID: <strong className="text-slate-800">{pt.uhid}</strong> • IPD: <strong className="text-emerald-700">{pt.ipdNumber}</strong>
            </div>
            <div className="text-slate-500 text-[11px]">
              {pt.ward} (Bed {pt.bedNumber}) • {pt.consultantDoctor}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Stay Balance</span>
            <span className="font-mono font-bold text-sm text-slate-900">₹{currentBalance.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-emerald-600 block">Total Paid: ₹{totalPaidSoFar.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Payment Input Form */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Enter Amount Received (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="number"
                min="1"
                autoFocus
                required
                value={quickPaymentForm.amount}
                onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, amount: e.target.value })}
                placeholder="e.g. 5000"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            {/* Quick-add chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {[1000, 2000, 5000, 10000, 20000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuickPaymentForm({ ...quickPaymentForm, amount: String(chip) })}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                >
                  +₹{chip.toLocaleString("en-IN")}
                </button>
              ))}
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickPaymentForm({ ...quickPaymentForm, amount: String(currentBalance) })}
                  className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-xs font-bold transition ml-auto"
                >
                  Full Balance (₹{currentBalance.toLocaleString("en-IN")})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={quickPaymentForm.mode}
                onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, mode: e.target.value as any })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={quickPaymentForm.date}
                onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, date: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Notes</label>
            <input
              type="text"
              value={quickPaymentForm.notes}
              onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, notes: e.target.value })}
              placeholder="e.g. Admission Advance / Part Payment"
              className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {["Admission Advance", "Surgery Deposit", "Medicines / Pharmacy", "Interim Payment", "Discharge Settlement"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuickPaymentForm({ ...quickPaymentForm, notes: p })}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Received By</label>
            <input
              type="text"
              value={quickPaymentForm.receivedBy}
              onChange={(e) => setQuickPaymentForm({ ...quickPaymentForm, receivedBy: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
          >
            {editingAdvanceId ? "Save Changes" : "Save Only"}
          </button>
          <button
            type="button"
            onClick={() => onSave(true)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
          >
            <Receipt className="w-4 h-4" />
            {editingAdvanceId ? "Update & Open Receipt Slip" : "Record & Print Small Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}
