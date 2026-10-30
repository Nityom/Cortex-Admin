"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { formatDate } from "@/lib/utils";
import PaymentHistory from "./PaymentHistory";
import AddPaymentDialog from "./AddPaymentDialog";
import { ChevronDown, ChevronUp, Printer, PlusCircle, CheckCircle2, AlertCircle, Clock, FileText } from "lucide-react";
import { Bill } from "@/services/bills";

interface BillHistoryWithPaymentsProps {
  bills: Bill[];
  onBillUpdated?: () => void;
  defaultSignature?: string;
  defaultDoctorName?: string;
}

export function BillHistoryWithPayments({
  bills,
  onBillUpdated,
  defaultSignature = 'sign.png',
  defaultDoctorName = 'Dr. Vipeen Raut',
}: BillHistoryWithPaymentsProps) {
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());

  if (!bills || bills.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <p className="text-sm text-slate-500 font-medium">No pending bills found matching your criteria.</p>
      </div>
    );
  }

  // Overall totals
  const overallTotal = bills.reduce((s, b) => s + (b.total_amount || 0), 0);
  const overallPaid = bills.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const overallBalance = bills.reduce((s, b) => s + (Number(b.balance_amount) || 0), 0);
  const overallPercent = overallTotal > 0 ? Math.min(100, Math.round((overallPaid / overallTotal) * 100)) : 100;

  const toggleSelect = (id: string) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = bills.map((b) => b.id).filter(Boolean) as string[];
    setSelectedBillIds(new Set(ids));
  };

  const clearSelection = () => setSelectedBillIds(new Set());

  const handlePrintSelected = () => {
    const ids = Array.from(selectedBillIds);
    if (ids.length === 0) return;
    const params = new URLSearchParams({
      billIds: ids.join(','),
      signature: defaultSignature,
      doctorName: defaultDoctorName,
    });
    window.open(`/print-bill/statement?${params.toString()}`, '_blank');
  };

  const handlePrintAll = () => {
    const ids = bills.map((b) => b.id).filter(Boolean) as string[];
    const params = new URLSearchParams({
      billIds: ids.join(','),
      signature: defaultSignature,
      doctorName: defaultDoctorName,
    });
    window.open(`/print-bill/statement?${params.toString()}`, '_blank');
  };

  const toggleBillExpansion = (billId: string) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  const handleAddPaymentClick = (bill: Bill) => {
    setSelectedBill(bill);
    setShowAddPayment(true);
  };

  const handlePaymentAdded = () => {
    if (onBillUpdated) {
      onBillUpdated();
    }
    setShowAddPayment(false);
  };

  return (
    <>
      {/* Overall Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 mb-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Overall Billing & Installments Portfolio</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cumulative summary across all active patient dues and treatment plans
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              className="text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50"
            >
              Select All
            </Button>
            {selectedBillIds.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                className="text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50"
              >
                Clear ({selectedBillIds.size})
              </Button>
            )}
            {selectedBillIds.size > 0 ? (
              <Button
                size="sm"
                onClick={handlePrintSelected}
                className="flex items-center gap-1.5 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Selected ({selectedBillIds.size})
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintAll}
                className="flex items-center gap-1.5 text-xs font-bold rounded-xl border-teal-200 text-teal-800 hover:bg-teal-50"
              >
                <Printer className="h-3.5 w-3.5 text-teal-700" />
                Print All Statements
              </Button>
            )}
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">₹{overallTotal.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">{bills.length} pending bills</div>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Collected</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">₹{overallPaid.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">{overallPercent}% received</div>
          </div>
          <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Outstanding Balance</span>
            <div className={`text-xl font-black mt-0.5 ${overallBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ₹{overallBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-1">Remaining to collect</div>
          </div>
        </div>
      </div>

      {/* Bills Cards List */}
      <div className="space-y-4">
        {bills.map((bill) => {
          if (!bill.id) return null;

          const isExpanded = expandedBillId === bill.id;
          const totalAmt = bill.total_amount || 0;
          const paidAmt = bill.paid_amount || 0;
          const balAmt = Number(bill.balance_amount) || 0;
          const hasBalance = balAmt > 0;
          const percent = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 100;

          return (
            <div key={bill.id} className="space-y-2">
              <div
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
                  selectedBillIds.has(bill.id)
                    ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-4 sm:p-5">
                  {/* Top Bar: Selection + Bill Number + Patient Name + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedBillIds.has(bill.id)}
                        onChange={() => bill.id && toggleSelect(bill.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {bill.bill_number || `Bill #${bill.id.slice(0, 8)}`}
                          </span>

                          {bill.reference_number && (
                            <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                              {bill.reference_number.replace(/^CH/i, 'CRX')}
                            </span>
                          )}

                          {bill.payment_status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              PAID
                            </span>
                          )}
                          {bill.payment_status === 'PARTIAL' && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              PARTIAL
                            </span>
                          )}
                          {(bill.payment_status === 'PENDING' || !bill.payment_status) && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                              <Clock className="w-3 h-3 text-rose-600" />
                              PENDING
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="font-bold text-slate-800">{bill.patient_name || 'Patient'}</span>
                          {bill.phone_number && (
                            <span className="text-slate-500 font-medium">• 📱 {bill.phone_number}</span>
                          )}
                          <span className="text-slate-400 font-medium">
                            • Created {bill.created_at ? formatDate(bill.created_at) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Amount</span>
                      <span className="text-lg font-black text-slate-900">₹{totalAmt.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 mb-1.5">
                      <span>Payment Progress</span>
                      <span>
                        <strong className="text-slate-800">₹{paidAmt.toLocaleString('en-IN')}</strong> paid of ₹{totalAmt.toLocaleString('en-IN')} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-amber-500' : 'bg-rose-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Breakdown & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid So Far</span>
                        <span className="font-bold text-emerald-700">₹{paidAmt.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-l border-slate-200 pl-4">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Due</span>
                        <span className={`font-extrabold ${hasBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{balAmt.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `/print-dues?billId=${bill.id}&signature=${defaultSignature}&doctorName=${encodeURIComponent(
                              defaultDoctorName
                            )}`,
                            '_blank'
                          )
                        }
                        className="h-8 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                        title="Print clinic-ready extraction / surgical dues report"
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-500" />
                        Print Dues Slip
                      </Button>

                      {hasBalance && (
                        <Button
                          size="sm"
                          onClick={() => handleAddPaymentClick(bill)}
                          className="h-8 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Add Installment</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Toggle Installment Ledger */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => bill.id && toggleBillExpansion(bill.id)}
                      className="w-full py-1 text-xs font-bold text-slate-600 hover:text-teal-700 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          <span>Hide Installment History</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          <span>View Installment History & Transactions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Payment Ledger */}
                {isExpanded && bill.id && (
                  <div className="px-5 pb-5 pt-1 bg-slate-50/50 border-t border-slate-100">
                    <PaymentHistory
                      billId={bill.id}
                      totalAmount={bill.total_amount}
                      paidAmount={bill.paid_amount}
                      balanceAmount={Number(bill.balance_amount) || 0}
                      onPaymentAdded={onBillUpdated || (() => {})}
                      onAddPaymentClick={() => handleAddPaymentClick(bill)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Payment Dialog */}
      {selectedBill && selectedBill.id && (
        <AddPaymentDialog
          open={showAddPayment}
          onOpenChange={setShowAddPayment}
          billId={selectedBill.id}
          patientId={selectedBill.patient_id || selectedBill.reference_number || "PATIENT"}
          balanceAmount={Number(selectedBill.balance_amount) || 0}
          totalAmount={selectedBill.total_amount}
          paidAmount={selectedBill.paid_amount}
          billNumber={selectedBill.bill_number}
          patientName={selectedBill.patient_name}
          onPaymentAdded={handlePaymentAdded}
        />
      )}
    </>
  );
}
