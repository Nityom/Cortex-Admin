'use client';

import React, { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Download, Printer, PlusCircle, History, CheckCircle2, AlertCircle, X, CreditCard } from "lucide-react";
import {
  convertBillRecordToBillData,
  downloadBillPdf,
  printBillPdf,
} from "@/lib/generate-bill-client";
import { updateBill } from "@/services/bills";
import { paymentTransactionService, PaymentTransaction } from "@/services/payment-transactions";

interface Bill {
  id: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
  reference_number?: string;
  notes?: string;
  patient_id?: string;
  patient_name?: string;
  patient_age?: string | number;
  patient_sex?: string;
  phone_number?: string;
  items?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
}

interface BillSummaryProps {
  bill?: Bill;
  onBillUpdated?: () => void;
}

export function BillSummary({ bill, onBillUpdated }: BillSummaryProps) {
  const [localPaid, setLocalPaid] = useState<number>(bill?.paid_amount ?? 0);
  const [localBalance, setLocalBalance] = useState<number>(bill?.balance_amount ?? 0);
  const [localStatus, setLocalStatus] = useState<'PENDING' | 'PARTIAL' | 'PAID'>(bill?.payment_status ?? 'PENDING');
  
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("Cash");
  const [payNotes, setPayNotes] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Synchronize state when prop changes
  useEffect(() => {
    if (bill) {
      setLocalPaid(bill.paid_amount ?? 0);
      setLocalBalance(bill.balance_amount !== undefined ? bill.balance_amount : (bill.total_amount - (bill.paid_amount || 0)));
      setLocalStatus(bill.payment_status || (bill.paid_amount >= bill.total_amount ? 'PAID' : bill.paid_amount > 0 ? 'PARTIAL' : 'PENDING'));
    }
  }, [bill]);

  if (!bill) {
    return (
      <Card className="p-5 border border-slate-200 bg-slate-50/60 rounded-xl">
        <div className="text-xs text-slate-500 font-medium text-center py-2">No bill generated for this visit.</div>
      </Card>
    );
  }

  const totalAmount = bill.total_amount || 0;
  const displayPaid = localPaid;
  const displayBalance = Math.max(0, localBalance);
  const paidPercent = totalAmount > 0 ? Math.min(100, Math.round((displayPaid / totalAmount) * 100)) : 100;

  const handlePrintableBill = () => {
    if (bill.id) {
      window.open(`/print-bill?billId=${bill.id}`, '_blank');
    }
  };

  const handleDownload = () => {
    const clientData = convertBillRecordToBillData({
      ...bill,
      paid_amount: displayPaid,
      balance_amount: displayBalance,
      payment_status: localStatus,
    });
    downloadBillPdf(clientData);
  };

  // Load payment installments history
  const loadTransactions = async () => {
    if (!bill.id) return;
    setLoadingHistory(true);
    try {
      const txs = await paymentTransactionService.getByBillId(bill.id);
      setTransactions(txs);
    } catch (e) {
      console.warn("Could not load payment transactions:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openPaymentModal = () => {
    setPayAmount(displayBalance);
    setPayMethod("Cash");
    setPayNotes("");
    setShowInstallmentModal(true);
  };

  const toggleHistory = () => {
    if (!showHistory) {
      loadTransactions();
    }
    setShowHistory(!showHistory);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill.id || payAmount <= 0) return;

    setSubmittingPayment(true);
    try {
      const newPaid = displayPaid + payAmount;
      const newBalance = Math.max(0, totalAmount - newPaid);
      const newStatus = newPaid >= totalAmount ? 'PAID' : 'PARTIAL';

      // 1. Update bill in database
      await updateBill(bill.id, {
        paid_amount: newPaid,
        balance_amount: newBalance,
        payment_status: newStatus,
      });

      // 2. Record transaction in payment ledger
      try {
        await paymentTransactionService.create({
          bill_id: bill.id,
          patient_id: bill.patient_id || bill.reference_number || "PATIENT",
          amount: payAmount,
          payment_method: payMethod,
          payment_date: new Date().toISOString().split("T")[0],
          notes: payNotes || `Installment payment (${payMethod})`,
        });
      } catch (txErr) {
        console.warn("Could not insert transaction log:", txErr);
      }

      // 3. Update local state immediately
      setLocalPaid(newPaid);
      setLocalBalance(newBalance);
      setLocalStatus(newStatus);
      setShowInstallmentModal(false);

      if (showHistory) {
        loadTransactions();
      }

      if (onBillUpdated) {
        onBillUpdated();
      }
    } catch (err: any) {
      console.error("Failed to record installment:", err);
      alert("Error saving payment: " + (err.message || "Unknown error"));
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-bold text-slate-800 text-sm">Bill Summary</h5>
            {bill.reference_number && (
              <span className="text-[10px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-semibold">
                {bill.reference_number.replace(/^CH/i, 'CRX')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(bill.created_at)}</p>
        </div>

        {/* Status Badge */}
        {localStatus === 'PAID' && (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PAID
          </span>
        )}
        {localStatus === 'PARTIAL' && (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            PARTIAL
          </span>
        )}
        {localStatus === 'PENDING' && (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            PENDING
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
          <span>Payment Progress</span>
          <span className="font-bold text-slate-700">{paidPercent}% Collected</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              paidPercent === 100 ? 'bg-emerald-500' : paidPercent > 0 ? 'bg-amber-500' : 'bg-rose-400'
            }`}
            style={{ width: `${paidPercent}%` }}
          />
        </div>
      </div>

      {/* Financial Numbers */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 mb-3 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
          <span className="text-xs font-bold text-slate-800">₹{totalAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="border-x border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid</span>
          <span className="text-xs font-bold text-emerald-700">₹{displayPaid.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Due</span>
          <span className={`text-xs font-extrabold ${displayBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            ₹{displayBalance.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrintableBill}
            className="h-7 text-xs px-2.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer"
            title="Print Official Letterhead Bill"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Print
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-7 text-xs px-2.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            PDF
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleHistory}
            className="h-7 text-xs px-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
            title="View Payment Installments Ledger"
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>

          {displayBalance > 0 && (
            <Button
              size="sm"
              onClick={openPaymentModal}
              className="h-7 text-xs px-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Collect ₹{displayBalance}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Installments History */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
          <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Installment History:</span>
            {loadingHistory && <span className="text-[10px] text-teal-600 animate-pulse">Loading...</span>}
          </div>

          {transactions.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No installment payments recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {transactions.map((tx, idx) => (
                <div
                  key={tx.id || idx}
                  className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg p-2"
                >
                  <div>
                    <span className="font-bold text-emerald-700">₹{Number(tx.amount).toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5 bg-white border border-slate-200 px-1 py-0.2 rounded">
                      {tx.payment_method || 'Cash'}
                    </span>
                    {tx.notes && <div className="text-[10px] text-slate-400 mt-0.5">{tx.notes}</div>}
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDate(tx.payment_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Collect Installment / Manage Balance */}
      {showInstallmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-200" />
                <h4 className="text-sm font-bold">Collect Installment / Balance</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallmentModal(false)}
                className="text-teal-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRecordPayment} className="p-4 space-y-3.5">
              {/* Summary strip */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 flex justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Bill</span>
                  <span className="font-bold text-slate-800">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Already Paid</span>
                  <span className="font-bold text-emerald-700">₹{displayPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Remaining Due</span>
                  <span className="font-extrabold text-rose-600">₹{displayBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount Paying Now (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={displayBalance}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), displayBalance))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Enter amount"
                />

                {/* Preset shortcuts */}
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setPayAmount(displayBalance)}
                    className="flex-1 text-[11px] font-bold py-1 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg transition"
                  >
                    Full Balance (₹{displayBalance})
                  </button>
                  {displayBalance > 200 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(Math.round(displayBalance / 2))}
                      className="text-[11px] font-bold py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition"
                    >
                      50% (₹{Math.round(displayBalance / 2)})
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Remaining Balance preview */}
              <div className="text-[11px] text-slate-500 flex justify-between px-1">
                <span>Remaining After Payment:</span>
                <strong className={displayBalance - payAmount === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                  ₹{Math.max(0, displayBalance - payAmount).toLocaleString('en-IN')}
                </strong>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Cash">Cash (रोख)</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Installment 1, Txn #..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInstallmentModal(false)}
                  disabled={submittingPayment}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || payAmount <= 0}
                  className="flex-1 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submittingPayment ? "Recording..." : `Confirm ₹${payAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
