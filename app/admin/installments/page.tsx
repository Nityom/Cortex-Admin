'use client';

import { useState, useEffect, useMemo } from 'react';
import { billService, Bill } from '@/services/bills';
import { BillHistoryWithPayments } from '@/components/BillHistoryWithPayments';
import AddPaymentDialog from '@/components/AddPaymentDialog';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Wallet,
  Receipt,
  PlusCircle,
  Printer,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

export default function InstallmentsPage() {
  const [pendingBills, setPendingBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'EXTRACTION' | 'OTHER'>('ALL');

  // Quick installment dialog from table
  const [quickPayBill, setQuickPayBill] = useState<Bill | null>(null);

  useEffect(() => {
    fetchPendingBills();
  }, []);

  const fetchPendingBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const allBills = await billService.getAll();

      // Filter bills with pending or partial payments
      const pending = allBills.filter(
        (bill: Bill) => bill.payment_status === 'PARTIAL' || bill.payment_status === 'PENDING'
      );

      setPendingBills(pending);
    } catch (error) {
      console.error('Error fetching pending bills:', error);
      setError('Failed to load pending bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = pendingBills.reduce((sum, bill) => sum + (Number(bill.balance_amount) || 0), 0);
  const totalCollected = pendingBills.reduce((sum, bill) => sum + (Number(bill.paid_amount) || 0), 0);
  const totalAmount = pendingBills.reduce((sum, bill) => sum + (Number(bill.total_amount) || 0), 0);
  const recoveryRate = totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0;

  const isExtractionBill = (bill: Bill) => {
    if (!bill.items || !Array.isArray(bill.items)) return false;
    return bill.items.some((item: any) => {
      const desc = (item.description || '').toLowerCase();
      return (
        desc.includes('extraction') ||
        desc.includes('tooth removal') ||
        desc.includes('impaction') ||
        desc.includes('surgical') ||
        desc.includes('park')
      );
    });
  };

  // Filter bills based on search query and category
  const filteredBills = useMemo(() => {
    let list = pendingBills;

    if (categoryFilter === 'EXTRACTION') {
      list = list.filter(isExtractionBill);
    } else if (categoryFilter === 'OTHER') {
      list = list.filter((b) => !isExtractionBill(b));
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const query = searchQuery.toLowerCase();
    return list.filter((bill) => {
      const patientName = (bill.patient_name || '').toLowerCase();
      const phoneNumber = (bill.phone_number || '').toLowerCase();
      const billNumber = (bill.bill_number || '').toLowerCase();
      const referenceNumber = (bill.reference_number || '').toLowerCase();
      const billId = (bill.id || '').toLowerCase();

      return (
        patientName.includes(query) ||
        phoneNumber.includes(query) ||
        billNumber.includes(query) ||
        referenceNumber.includes(query) ||
        billId.includes(query)
      );
    });
  }, [pendingBills, searchQuery, categoryFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-700 border-t-transparent mx-auto"></div>
          <p className="text-xs font-bold text-slate-600">Loading installment portfolio & dues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 pt-5 pb-12 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Payment Installments & Dues Manager
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage patient balances, record part-payments, and track surgical dues ledger
            </p>
          </div>
        </div>
      </div>

      {/* 4 Modern KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Cases */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Accounts</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{pendingBills.length}</div>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-1">
              Active Dues
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white border border-rose-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-rose-50/20">
          <div>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Outstanding Due</span>
            <div className="text-2xl font-black text-rose-600 mt-0.5">₹{totalPending.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">Balance to be recovered</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-emerald-50/20">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Received</span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">₹{totalCollected.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-emerald-700 font-semibold block mt-1">{recoveryRate}% Recovery Rate</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Billed Value */}
        <div className="bg-white border border-teal-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-teal-50/20">
          <div>
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Total Billed</span>
            <div className="text-2xl font-black text-teal-900 mt-0.5">₹{totalAmount.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">Across all pending visits</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'ALL'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            All Pending ({pendingBills.length})
          </button>
          <button
            onClick={() => setCategoryFilter('EXTRACTION')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'EXTRACTION'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Extraction & Surgical Dues ({pendingBills.filter(isExtractionBill).length})
          </button>
          <button
            onClick={() => setCategoryFilter('OTHER')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'OTHER'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Other Treatments ({pendingBills.filter((b) => !isExtractionBill(b)).length})
          </button>
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search patient, phone, bill #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9.5 pr-3 text-xs font-semibold h-10 rounded-xl bg-white border-slate-200 focus:ring-teal-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800 font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Area */}
      {filteredBills.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {searchQuery ? 'No matching pending bills found' : 'No outstanding balances!'}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {searchQuery
              ? `No records matched "${searchQuery}". Please verify search keyword.`
              : 'All treatment bills and installments are fully settled. Great work! 🎉'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Overview Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Quick Dues Overview</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {filteredBills.length} active bills requiring installment collection
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="text-left px-4 py-3">Patient & UHID</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3">Bill Number</th>
                    <th className="text-right px-4 py-3">Total Billed</th>
                    <th className="text-right px-4 py-3">Paid</th>
                    <th className="text-right px-4 py-3">Balance Due</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.map((bill) => {
                    const bal = Number(bill.balance_amount) || 0;
                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3">
                          <div className="font-extrabold text-slate-900">{bill.patient_name || 'Patient'}</div>
                          {bill.reference_number && (
                            <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              {bill.reference_number.replace(/^CH/i, 'CRX')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {bill.phone_number || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {bill.bill_number || `#${bill.id?.slice(0, 8)}`}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          ₹{Number(bill.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          ₹{Number(bill.paid_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-rose-600">
                          ₹{bal.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {bill.payment_status === 'PAID' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              PAID
                            </span>
                          ) : bill.payment_status === 'PARTIAL' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              PARTIAL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {bal > 0 && (
                              <button
                                onClick={() => setQuickPayBill(bill)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}
                            <button
                              onClick={() => window.open(`/print-dues?billId=${bill.id}`, '_blank')}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                              title="Print Dues Slip"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Bills Cards with Installment Ledgers */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-extrabold text-slate-900">
                Detailed Bills & Payment Ledgers ({filteredBills.length})
              </h2>
              <span className="text-xs text-slate-500 font-medium">Click on any bill to inspect transactions</span>
            </div>

            <BillHistoryWithPayments bills={filteredBills} onBillUpdated={fetchPendingBills} />
          </div>
        </div>
      )}

      {/* Quick Pay Dialog */}
      {quickPayBill && quickPayBill.id && (
        <AddPaymentDialog
          open={Boolean(quickPayBill)}
          onOpenChange={(open) => !open && setQuickPayBill(null)}
          billId={quickPayBill.id}
          patientId={quickPayBill.patient_id || quickPayBill.reference_number || 'PATIENT'}
          balanceAmount={Number(quickPayBill.balance_amount) || 0}
          totalAmount={quickPayBill.total_amount}
          paidAmount={quickPayBill.paid_amount}
          billNumber={quickPayBill.bill_number}
          patientName={quickPayBill.patient_name}
          onPaymentAdded={() => {
            setQuickPayBill(null);
            fetchPendingBills();
          }}
        />
      )}
    </div>
  );
}
