"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Calendar, 
  IndianRupee, 
  RefreshCw, 
  Users, 
  Search, 
  Building2, 
  Bed, 
  Stethoscope, 
  ReceiptText 
} from 'lucide-react';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { useIsAdmin } from '@/hooks/use-is-admin';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface PatientSalesReport {
  patient_id: string;
  patient_name: string;
  phone_number: string;
  uhid?: string;
  department: 'OPD' | 'IPD';
  ward_bed?: string;
  notes?: string;
  bill_numbers?: string[];
  total_bills: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function getDaysAgoIST(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

function getDateRangeForPeriod(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): { start: string; end: string } {
  const today = getTodayIST();
  switch (period) {
    case 'daily':
      return { start: today, end: today };
    case 'weekly':
      return { start: getDaysAgoIST(6), end: today };
    case 'monthly':
      return { start: getDaysAgoIST(29), end: today };
    case 'yearly':
      return { start: getDaysAgoIST(364), end: today };
  }
}

export default function SalesReportPage() {
  const router = useRouter();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();

  // Patient Sales States (OPD & IPD only)
  const [reportType, setReportType] = useState<ReportPeriod>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [salesData, setSalesData] = useState<PatientSalesReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.replace('/admin/patients');
    }
  }, [isAdminLoading, isAdmin, router]);

  useEffect(() => {
    // Set default dates (last 30 days) in IST
    const { start, end } = getDateRangeForPeriod('monthly');
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Update dates when report type changes
  useEffect(() => {
    if (reportType === 'custom') return;
    const { start, end } = getDateRangeForPeriod(reportType);
    setStartDate(start);
    setEndDate(end);
  }, [reportType]);

  const handlePeriodChange = (period: ReportPeriod) => {
    setReportType(period);
    if (period !== 'custom') {
      const { start, end } = getDateRangeForPeriod(period);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Fetch Patient Sales Report with OPD and IPD Segmentation (Real data only, no fake data)
  const fetchSalesReport = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const allBills = await convex.query(api.bills.list, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      // Filter bills strictly by startDate and endDate
      const filteredBills = (allBills as any[]).filter((bill) => {
        const bDate = bill.bill_date || (bill._creationTime ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(bill._creationTime)) : '');
        if (!bDate) return true;
        if (startDate && bDate < startDate) return false;
        if (endDate && bDate > endDate) return false;
        return true;
      });

      // Group by department & patient (reference_number/uhid)
      const grouped: Record<string, PatientSalesReport> = {};

      for (const bill of filteredBills) {
        // Disregard any test or mock entries
        if (bill.patient_name === 'Ramesh Sharma' && bill.reference_number === 'CRX0001') {
          continue;
        }

        const isIpdBill =
          bill.prescription_id === 'IPD_DIRECT' ||
          (typeof bill.prescription_id === 'string' && bill.prescription_id.toUpperCase().includes('IPD')) ||
          (typeof bill.notes === 'string' && bill.notes.toUpperCase().includes('IPD')) ||
          (Array.isArray(bill.items) && bill.items.some((it: any) =>
            typeof it.description === 'string' && (
              it.description.toLowerCase().includes('bed') ||
              it.description.toLowerCase().includes('nursing') ||
              it.description.toLowerCase().includes('inpatient') ||
              it.description.toLowerCase().includes('ward') ||
              it.description.toLowerCase().includes('admission') ||
              it.description.toLowerCase().includes('ot charges') ||
              it.description.toLowerCase().includes('surgery')
            )
          ));

        const dept: 'OPD' | 'IPD' = isIpdBill ? 'IPD' : 'OPD';
        const uhid = (bill.reference_number || bill.patient_id || 'UNKNOWN').replace(/^CH/i, 'CRX');
        const key = `${dept}_${uhid}`;

        if (!grouped[key]) {
          grouped[key] = {
            patient_id: bill.patient_id || uhid,
            patient_name: bill.patient_name || 'Patient',
            phone_number: bill.phone_number || '',
            uhid: uhid,
            department: dept,
            total_bills: 0,
            total_amount: 0,
            paid_amount: 0,
            balance_amount: 0,
            payment_status: '',
            bill_numbers: [],
            notes: bill.notes,
          };
        }
        grouped[key].total_bills += 1;
        grouped[key].total_amount += Number(bill.total_amount || 0);
        grouped[key].paid_amount += Number(bill.paid_amount || 0);
        grouped[key].balance_amount += Number(bill.balance_amount || 0);
        if (bill.bill_number && !grouped[key].bill_numbers?.includes(bill.bill_number)) {
          grouped[key].bill_numbers?.push(bill.bill_number);
        }
      }

      // Also ingest genuine IPD admissions from localStorage
      if (typeof window !== 'undefined') {
        try {
          const rawAdmissions = localStorage.getItem('cortex_ipd_admissions_v1') || localStorage.getItem('cortex_ipd_admissions');
          if (rawAdmissions) {
            const admissions = JSON.parse(rawAdmissions);
            if (Array.isArray(admissions)) {
              for (const adm of admissions) {
                // Strictly exclude any fake demo admission
                if (adm.id === 'ipd_demo_1' || adm.name === 'Ramesh Sharma' || adm.name === 'Smt. Shardabai Patil') {
                  continue;
                }

                const uhid = (adm.uhid || adm.id).replace(/^CH/i, 'CRX');
                const ipdKey = `IPD_${uhid}`;

                // 1. If discharged with final settlement
                if (adm.status === 'Discharged' && adm.finalSettlement) {
                  const sDate = adm.finalSettlement.date || adm.dischargeDate;
                  const inRange = (!startDate || sDate >= startDate) && (!endDate || sDate <= endDate);

                  if (inRange) {
                    if (!grouped[ipdKey]) {
                      const net = Number(adm.finalSettlement.netTotal || 0);
                      const paid = Number(adm.finalSettlement.advanceAdjusted || 0) + Number(adm.finalSettlement.balancePaid || 0);
                      const bal = Math.max(0, net - paid);
                      grouped[ipdKey] = {
                        patient_id: adm.patientId || uhid,
                        patient_name: adm.name || 'Inpatient',
                        phone_number: adm.phone || '',
                        uhid: uhid,
                        department: 'IPD',
                        ward_bed: `${adm.ward || 'Ward'} • Bed ${adm.bedNumber || 'N/A'}`,
                        total_bills: 1,
                        total_amount: net,
                        paid_amount: paid,
                        balance_amount: bal,
                        payment_status: bal === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
                        bill_numbers: adm.finalSettlement.billNumber ? [adm.finalSettlement.billNumber] : [],
                        notes: `Discharged Inpatient Stay (${adm.ward})`,
                      };
                    } else {
                      grouped[ipdKey].ward_bed = `${adm.ward || 'Ward'} • Bed ${adm.bedNumber || 'N/A'}`;
                    }
                  }
                } else if (adm.status === 'Admitted' && Array.isArray(adm.advances) && adm.advances.length > 0) {
                  // 2. Active inpatient with genuine advances collected in this date range
                  const periodAdvances = adm.advances.filter((adv: any) => {
                    const aDate = adv.date;
                    if (!aDate) return true;
                    if (startDate && aDate < startDate) return false;
                    if (endDate && aDate > endDate) return false;
                    return true;
                  });

                  const totalPeriodAdvance = periodAdvances.reduce((sum: number, adv: any) => sum + Number(adv.amount || 0), 0);

                  if (totalPeriodAdvance > 0 && !grouped[ipdKey]) {
                    grouped[ipdKey] = {
                      patient_id: adm.patientId || uhid,
                      patient_name: adm.name || 'Inpatient (Admitted)',
                      phone_number: adm.phone || '',
                      uhid: uhid,
                      department: 'IPD',
                      ward_bed: `${adm.ward || 'Ward'} • Bed ${adm.bedNumber || 'N/A'}`,
                      total_bills: periodAdvances.length,
                      total_amount: totalPeriodAdvance,
                      paid_amount: totalPeriodAdvance,
                      balance_amount: 0,
                      payment_status: 'PAID',
                      notes: `Active Inpatient Advance Deposit (${periodAdvances.length} payments)`,
                      bill_numbers: periodAdvances.map((a: any) => a.receiptNumber).filter(Boolean),
                    };
                  } else if (grouped[ipdKey]) {
                    grouped[ipdKey].ward_bed = `${adm.ward || 'Ward'} • Bed ${adm.bedNumber || 'N/A'}`;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error reading IPD admissions:', e);
        }
      }

      const result = Object.values(grouped).map((p) => ({
        ...p,
        payment_status:
          p.balance_amount === 0 ? 'PAID' : p.paid_amount > 0 ? 'PARTIAL' : 'PENDING',
      }));
      setSalesData(result);
    } catch (err) {
      console.error('Error fetching sales report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sales report');
      setSalesData([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchSalesReport();
    }
  }, [startDate, endDate, fetchSalesReport]);

  // OPD vs IPD Metrics Breakdown
  const opdSalesList = useMemo(() => 
    (Array.isArray(salesData) ? salesData : []).filter(p => p.department === 'OPD'),
    [salesData]
  );
  
  const ipdSalesList = useMemo(() => 
    (Array.isArray(salesData) ? salesData : []).filter(p => p.department === 'IPD'),
    [salesData]
  );

  const opdStats = useMemo(() => {
    return opdSalesList.reduce(
      (acc, item) => ({
        patients: acc.patients + 1,
        bills: acc.bills + Number(item.total_bills || 0),
        amount: acc.amount + Number(item.total_amount || 0),
        paid: acc.paid + Number(item.paid_amount || 0),
        balance: acc.balance + Number(item.balance_amount || 0),
      }),
      { patients: 0, bills: 0, amount: 0, paid: 0, balance: 0 }
    );
  }, [opdSalesList]);

  const ipdStats = useMemo(() => {
    return ipdSalesList.reduce(
      (acc, item) => ({
        patients: acc.patients + 1,
        bills: acc.bills + Number(item.total_bills || 0),
        amount: acc.amount + Number(item.total_amount || 0),
        paid: acc.paid + Number(item.paid_amount || 0),
        balance: acc.balance + Number(item.balance_amount || 0),
      }),
      { patients: 0, bills: 0, amount: 0, paid: 0, balance: 0 }
    );
  }, [ipdSalesList]);

  const hospitalTotalStats = useMemo(() => ({
    totalPatients: opdStats.patients + ipdStats.patients,
    totalBills: opdStats.bills + ipdStats.bills,
    totalAmount: opdStats.amount + ipdStats.amount,
    paidAmount: opdStats.paid + ipdStats.paid,
    balanceAmount: opdStats.balance + ipdStats.balance,
  }), [opdStats, ipdStats]);

  // Filtered patients for display according to department and search
  const displayedSales = useMemo(() => {
    return (Array.isArray(salesData) ? salesData : []).filter(item => {
      if (departmentFilter !== 'ALL' && item.department !== departmentFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = (item.patient_name || '').toLowerCase().includes(query);
        const matchPhone = (item.phone_number || '').includes(query);
        const matchUhid = (item.uhid || '').toLowerCase().includes(query);
        const matchWard = (item.ward_bed || '').toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchUhid && !matchWard) return false;
      }
      return true;
    });
  }, [salesData, departmentFilter, searchQuery]);

  if (isAdminLoading || !isAdmin) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{isAdminLoading ? 'Loading...' : 'Redirecting...'}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-6 pt-6 pb-6 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <TrendingUp className="mr-3 text-blue-600" size={32} />
          Sales & Revenue Report (OPD / IPD)
        </h1>
        <p className="text-gray-600 text-sm">
          Track genuine hospital revenue, outpatient consultations (OPD) and inpatient admissions (IPD)
        </p>
      </div>

      {/* Filters Box */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hospital Sales Filters</h2>
            <p className="text-xs text-slate-500">Filter OPD outpatient visits and IPD inpatient stay settlements by date</p>
          </div>

          {/* Department Filter Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDepartmentFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                departmentFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 size={14} className="text-slate-600" />
              <span>All Sales</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                {hospitalTotalStats.totalPatients}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDepartmentFilter('OPD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                departmentFilter === 'OPD'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <Stethoscope size={14} className={departmentFilter === 'OPD' ? 'text-white' : 'text-blue-600'} />
              <span>OPD (Outpatient)</span>
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                departmentFilter === 'OPD' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {opdStats.patients}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDepartmentFilter('IPD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                departmentFilter === 'IPD'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <Bed size={14} className={departmentFilter === 'IPD' ? 'text-white' : 'text-purple-600'} />
              <span>IPD (Inpatient)</span>
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                departmentFilter === 'IPD' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
              }`}>
                {ipdStats.patients}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Period
            </label>
            <select
              value={reportType}
              onChange={(e) => handlePeriodChange(e.target.value as ReportPeriod)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily (Today)</option>
              <option value="weekly">Weekly (Last 7 Days)</option>
              <option value="monthly">Monthly (Last 30 Days)</option>
              <option value="yearly">Yearly (Last 365 Days)</option>
              {reportType === 'custom' && <option value="custom">Custom Range</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setReportType('custom');
              }}
              max={getTodayIST()}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setReportType('custom');
              }}
              max={getTodayIST()}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Quick Select:</span>
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => {
            const labels = {
              daily: 'Daily (Today)',
              weekly: 'Weekly (7 Days)',
              monthly: 'Monthly (30 Days)',
              yearly: 'Yearly (365 Days)',
            };
            const active = reportType === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1 text-xs rounded-full border transition font-medium cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={fetchSalesReport}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center transition disabled:opacity-50 cursor-pointer text-sm font-semibold"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing Report...' : 'Refresh Report'}
          </button>

          <div className="text-xs text-slate-500 font-medium">
            Showing: <span className="font-bold text-slate-800">{departmentFilter === 'ALL' ? 'All Hospital Bills' : departmentFilter === 'OPD' ? 'OPD Outpatient Only' : 'IPD Inpatient Only'}</span> ({displayedSales.length} records)
          </div>
        </div>
      </div>

      {/* Executive OPD vs IPD Revenue Comparison Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Card 1: OPD Revenue */}
        <div className={`rounded-xl p-5 border transition-all ${
          departmentFilter === 'OPD' || departmentFilter === 'ALL'
            ? 'bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 border-blue-200 shadow-sm'
            : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Stethoscope size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">OPD Outpatient Sales</h3>
                <p className="text-[11px] text-blue-600 font-medium">Consultations, Procedures & Pharmacy</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
              OPD
            </span>
          </div>

          <div className="mt-2 mb-4">
            <span className="text-xs text-slate-500 font-medium">Total OPD Revenue</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{opdStats.amount.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-blue-100/80 text-xs">
            <div>
              <span className="text-slate-500 text-[11px]">Collected:</span>
              <p className="font-bold text-emerald-600">₹{opdStats.paid.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Outstanding Due:</span>
              <p className={`font-bold ${opdStats.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                ₹{opdStats.balance.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Patients:</span>
              <p className="font-bold text-slate-800">{opdStats.patients} patients</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Bills Issued:</span>
              <p className="font-bold text-slate-800">{opdStats.bills} bills</p>
            </div>
          </div>

          {hospitalTotalStats.totalAmount > 0 && (
            <div className="mt-3 pt-2 text-[11px] text-blue-700 font-medium flex items-center justify-between">
              <span>Revenue Share:</span>
              <span className="font-bold">{((opdStats.amount / hospitalTotalStats.totalAmount) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Card 2: IPD Revenue */}
        <div className={`rounded-xl p-5 border transition-all ${
          departmentFilter === 'IPD' || departmentFilter === 'ALL'
            ? 'bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 border-purple-200 shadow-sm'
            : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Bed size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-950">IPD Inpatient Sales</h3>
                <p className="text-[11px] text-purple-600 font-medium">Bed, Nursing, Surgeries & Settlements</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">
              IPD
            </span>
          </div>

          <div className="mt-2 mb-4">
            <span className="text-xs text-slate-500 font-medium">Total IPD Revenue</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{ipdStats.amount.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-purple-100/80 text-xs">
            <div>
              <span className="text-slate-500 text-[11px]">Collected / Advances:</span>
              <p className="font-bold text-emerald-600">₹{ipdStats.paid.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Outstanding Due:</span>
              <p className={`font-bold ${ipdStats.balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                ₹{ipdStats.balance.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Inpatients:</span>
              <p className="font-bold text-slate-800">{ipdStats.patients} admissions</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Settled / Stays:</span>
              <p className="font-bold text-slate-800">{ipdStats.bills} stay settlements</p>
            </div>
          </div>

          {hospitalTotalStats.totalAmount > 0 && (
            <div className="mt-3 pt-2 text-[11px] text-purple-700 font-medium flex items-center justify-between">
              <span>Revenue Share:</span>
              <span className="font-bold">{((ipdStats.amount / hospitalTotalStats.totalAmount) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Card 3: Total Consolidated Hospital Revenue */}
        <div className="rounded-xl p-5 border bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Total Hospital Revenue</h3>
                <p className="text-[11px] text-emerald-600 font-medium">Consolidated OPD + IPD Collections</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              TOTAL
            </span>
          </div>

          <div className="mt-2 mb-4">
            <span className="text-xs text-slate-500 font-medium">Consolidated Billed Amount</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{hospitalTotalStats.totalAmount.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-emerald-100/80 text-xs">
            <div>
              <span className="text-slate-500 text-[11px]">Total Paid:</span>
              <p className="font-bold text-emerald-600">₹{hospitalTotalStats.paidAmount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Total Balance:</span>
              <p className={`font-bold ${hospitalTotalStats.balanceAmount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                ₹{hospitalTotalStats.balanceAmount.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Total Patients:</span>
              <p className="font-bold text-slate-800">{hospitalTotalStats.totalPatients} patients</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Collection Ratio:</span>
              <p className="font-bold text-emerald-700">
                {hospitalTotalStats.totalAmount > 0 ? ((hospitalTotalStats.paidAmount / hospitalTotalStats.totalAmount) * 100).toFixed(1) : '100'}%
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>OPD : IPD Ratio:</span>
            <span className="font-bold text-slate-700">
              {hospitalTotalStats.totalAmount > 0 ? `${((opdStats.amount / hospitalTotalStats.totalAmount) * 100).toFixed(0)}% OPD : ${((ipdStats.amount / hospitalTotalStats.totalAmount) * 100).toFixed(0)}% IPD` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Patient Sales Table with OPD / IPD Indicators */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {departmentFilter === 'ALL'
                ? 'All Patient Sales & Billing Records'
                : departmentFilter === 'OPD'
                  ? 'OPD (Outpatient) Patient Sales'
                  : 'IPD (Inpatient) Stay Billing & Settlements'}
            </h2>
            <p className="text-xs text-slate-500">
              Listing individual patient bills and admissions with payment statuses
            </p>
          </div>

          {/* Real-time Search input */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, UHID, ward, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw size={32} className="animate-spin text-blue-500" />
          </div>
        ) : !Array.isArray(displayedSales) || displayedSales.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Users size={48} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No sales records found</h3>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'Try clearing your search query' : 'No records found for this period. Try adjusting your date range.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Patient Name & UHID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Bills / Stays
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Total Amount (₹)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Paid Amount (₹)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Balance Due (₹)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {displayedSales.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{row.patient_name || 'Unknown'}</div>
                      <div className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          {row.uhid || row.patient_id}
                        </span>
                        {row.bill_numbers && row.bill_numbers.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            • {row.bill_numbers[0]}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {row.department === 'OPD' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Stethoscope size={12} className="text-blue-600" />
                          OPD
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Bed size={12} className="text-purple-600" />
                            IPD
                          </span>
                          {row.ward_bed && (
                            <div className="text-[11px] text-purple-700 font-medium mt-0.5 truncate max-w-[140px]">
                              {row.ward_bed}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 font-mono">
                      {row.phone_number || 'N/A'}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-bold text-slate-700">
                      {row.total_bills}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-slate-900">
                      ₹{Number(row.total_amount).toFixed(2)}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-emerald-600">
                      ₹{Number(row.paid_amount).toFixed(2)}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold">
                      {Number(row.balance_amount) > 0 ? (
                        <span className="text-rose-600">₹{Number(row.balance_amount).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">₹0.00</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-bold rounded-full ${
                        Number(row.balance_amount) === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : Number(row.paid_amount) > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {Number(row.balance_amount) === 0 ? 'PAID' : Number(row.paid_amount) > 0 ? 'PARTIAL' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
