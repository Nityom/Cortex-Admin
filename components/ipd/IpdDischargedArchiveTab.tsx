"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  FileText,
  Receipt,
  Pencil,
  IndianRupee,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  Printer,
} from "lucide-react";
import { IPDAdmission, calculateStayDays, calculateRunningBill } from "./types";

interface IpdDischargedArchiveTabProps {
  dischargedAdmissions: IPDAdmission[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenEditAdmission: (adm: IPDAdmission) => void;
  onOpenDischargeModal: (adm: IPDAdmission) => void;
  onGenerateFinalBill: (adm: IPDAdmission) => void;
  onOpenPatientReceipt: (adm: IPDAdmission) => void;
  onOpenPrintDischarge: (adm: IPDAdmission) => void;
}

export default function IpdDischargedArchiveTab({
  dischargedAdmissions,
  searchQuery,
  setSearchQuery,
  onOpenEditAdmission,
  onOpenDischargeModal,
  onGenerateFinalBill,
  onOpenPatientReceipt,
  onOpenPrintDischarge,
}: IpdDischargedArchiveTabProps) {
  // Local date & doctor filters for the archive
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("All");

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Format YYYY-MM-DD into a neat human-readable string: e.g. "02 Nov 2026"
  const formatDisplayDate = (d?: string) => {
    if (!d) return "—";
    try {
      const parts = d.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mIdx = parseInt(month, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          return `${day} ${months[mIdx]} ${year}`;
        }
      }
      return d;
    } catch {
      return d;
    }
  };

  // Filter admissions by search query (name, number, IPD, UHID, dates), date filter, and doctor filter
  const filteredList = useMemo(() => {
    return dischargedAdmissions.filter((adm) => {
      // 1. Date filter (checks discharge date OR admission date)
      if (selectedDate) {
        const matchAdmDate = adm.admissionDate === selectedDate;
        const matchDischDate = adm.dischargeDate === selectedDate;
        if (!matchAdmDate && !matchDischDate) return false;
      }

      // 2. Doctor filter
      if (selectedDoctor !== "All") {
        const docLower = (adm.consultantDoctor || "").toLowerCase();
        if (selectedDoctor === "Dr. Shillpa Raut") {
          if (!docLower.includes("shilpa") && !docLower.includes("shillpa")) return false;
        } else if (selectedDoctor === "Dr. Vipeen Raut") {
          if (docLower.includes("shilpa") || docLower.includes("shillpa")) return false;
        }
      }

      // 3. Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const admDateRev = adm.admissionDate ? adm.admissionDate.split("-").reverse().join("-") : "";
        const dischDateRev = adm.dischargeDate ? adm.dischargeDate.split("-").reverse().join("-") : "";
        const admDateSlash = adm.admissionDate ? adm.admissionDate.split("-").reverse().join("/") : "";
        const dischDateSlash = adm.dischargeDate ? adm.dischargeDate.split("-").reverse().join("/") : "";

        const matchesQuery =
          adm.name.toLowerCase().includes(q) ||
          adm.phone.includes(q) ||
          adm.ipdNumber.toLowerCase().includes(q) ||
          adm.uhid.toLowerCase().includes(q) ||
          adm.ward.toLowerCase().includes(q) ||
          adm.bedNumber.toLowerCase().includes(q) ||
          adm.consultantDoctor.toLowerCase().includes(q) ||
          (adm.admissionDate && adm.admissionDate.toLowerCase().includes(q)) ||
          (adm.dischargeDate && adm.dischargeDate.toLowerCase().includes(q)) ||
          admDateRev.includes(q) ||
          dischDateRev.includes(q) ||
          admDateSlash.includes(q) ||
          dischDateSlash.includes(q) ||
          (adm.admissionTime && adm.admissionTime.toLowerCase().includes(q)) ||
          (adm.dischargeTime && adm.dischargeTime.toLowerCase().includes(q)) ||
          (adm.dischargeSummary?.finalDiagnosis || "").toLowerCase().includes(q) ||
          (adm.provisionalDiagnosis || "").toLowerCase().includes(q);

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [dischargedAdmissions, searchQuery, selectedDate, selectedDoctor]);

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedDate || selectedDoctor !== "All");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
      {/* Title & Toolbar */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Discharged Patients Archive
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {filteredList.length} {filteredList.length === 1 ? "Record" : "Records"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed inpatient stays, discharge summaries, and settled hospital bills. Editable anytime.
            </p>
          </div>

          {/* Quick Doctor Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Doctor:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDoctor("All")}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] ${
                selectedDoctor === "All" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedDoctor("Dr. Vipeen Raut")}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] ${
                selectedDoctor === "Dr. Vipeen Raut" ? "bg-emerald-600 text-white font-bold shadow-2xs" : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Dr. Vipeen
            </button>
            <button
              type="button"
              onClick={() => setSelectedDoctor("Dr. Shillpa Raut")}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] ${
                selectedDoctor === "Dr. Shillpa Raut" ? "bg-pink-600 text-white font-bold shadow-2xs" : "text-slate-600 hover:text-pink-700"
              }`}
            >
              Dr. Shillpa
            </button>
          </div>
        </div>

        {/* Search & Date Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
          {/* Text Search Input (Name, Phone, IPD No., UHID, Date) */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, phone number, IPD number, UHID, date..."
              className="pl-8 pr-7 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full bg-slate-50/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 pl-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Stay Date:
            </span>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="Filter by admission or discharge date"
            />

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                selectedDate === todayStr
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                selectedDate === yesterdayStr
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              Yesterday
            </button>

            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                title="Clear date filter"
              >
                All Dates
              </button>
            )}
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedDate("");
                setSelectedDoctor("All");
              }}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center text-slate-500 space-y-2 bg-slate-50/50 rounded-xl border border-slate-200">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-bold text-sm text-slate-700">No discharged patient records found</p>
          <p className="text-xs text-slate-400">
            {hasActiveFilters
              ? "Try clearing your search query or date filter above to see more records."
              : "Discharged patients will automatically appear here once their stay is completed."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                <th className="py-3 px-3.5 align-middle w-28 whitespace-nowrap">IPD No.</th>
                <th className="py-3 px-3.5 align-middle w-24 whitespace-nowrap">UHID</th>
                <th className="py-3 px-3.5 align-middle min-w-[170px]">Patient Info</th>
                <th className="py-3 px-3.5 align-middle min-w-[130px] whitespace-nowrap">Room / Bed</th>
                <th className="py-3 px-3.5 align-middle min-w-[140px] whitespace-nowrap">Consultant Doctor</th>
                <th className="py-3 px-3.5 align-middle min-w-[190px] whitespace-nowrap">Stay Period &amp; Times</th>
                <th className="py-3 px-3.5 align-middle min-w-[150px]">Condition &amp; Diagnosis</th>
                <th className="py-3 px-3.5 align-middle min-w-[110px] whitespace-nowrap">Settlement</th>
                <th className="py-3 px-3.5 align-middle text-right w-[240px] shrink-0">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {filteredList.map((adm) => {
                const bill = calculateRunningBill(adm);
                const finalAmount = adm.finalSettlement?.netTotal ?? bill.grossTotal;
                const isGyno = /shillpa|shilpa|gyn/i.test(adm.consultantDoctor || "");

                return (
                  <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. IPD Number */}
                    <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs inline-block">
                        {adm.ipdNumber}
                      </span>
                    </td>

                    {/* 2. UHID */}
                    <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                      <span className="font-mono text-slate-600 font-semibold text-[11px]">
                        {adm.uhid}
                      </span>
                    </td>

                    {/* 3. Patient Name & Phone */}
                    <td className="py-3.5 px-3.5 align-top">
                      <div className="font-bold text-slate-900 text-sm">{adm.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>📞 {adm.phone}</span>
                        <span>•</span>
                        <span>
                          {adm.age}y / {adm.sex}
                        </span>
                      </div>
                      {adm.address && (
                        <div className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1" title={adm.address}>
                          {adm.address}
                        </div>
                      )}
                    </td>

                    {/* 4. Room & Bed */}
                    <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-xs">{adm.ward}</div>
                      <div className="text-[11px] font-mono font-bold text-emerald-700 mt-0.5">
                        {adm.bedNumber}
                      </div>
                    </td>

                    {/* 5. Consultant Doctor */}
                    <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          isGyno
                            ? "bg-pink-50 text-pink-700 border-pink-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {adm.consultantDoctor}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{adm.department}</div>
                    </td>

                    {/* 6. Stay Period & Times (Clean, non-wrapping lines) */}
                    <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                      <div className="text-slate-800 font-medium whitespace-nowrap flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase w-10">Adm:</span>
                        <span>{formatDisplayDate(adm.admissionDate)}</span>
                        {adm.admissionTime && <span className="text-slate-500 text-[10px]">({adm.admissionTime})</span>}
                      </div>
                      <div className="text-slate-700 text-[11px] whitespace-nowrap mt-0.5 flex items-center gap-1">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase w-10">Disch:</span>
                        <span className="font-semibold">{formatDisplayDate(adm.dischargeDate)}</span>
                        {adm.dischargeTime && <span className="text-slate-500 text-[10px]">({adm.dischargeTime})</span>}
                      </div>
                      <div className="mt-1">
                        <span className="inline-block px-2 py-0.5 text-[10px] bg-slate-100 rounded font-semibold text-slate-700 border border-slate-200">
                          {calculateStayDays(adm.admissionDate, adm.dischargeDate)} billable days
                        </span>
                      </div>
                    </td>

                    {/* 7. Condition & Diagnosis */}
                    <td className="py-3.5 px-3.5 align-top">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10.5px]">
                        {adm.dischargeSummary?.conditionAtDischarge || "Cured / Stable"}
                      </span>
                      <p
                        className="text-[11px] text-slate-600 mt-1 line-clamp-2 max-w-[200px] leading-relaxed"
                        title={adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis}
                      >
                        {adm.dischargeSummary?.finalDiagnosis || adm.provisionalDiagnosis || "Routine discharge"}
                      </p>
                    </td>

                    {/* 8. Settlement Amount & Mode */}
                    <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        ₹{finalAmount.toLocaleString("en-IN")}
                      </div>
                      <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5">
                        {adm.finalSettlement?.paymentMode || "Settled"}
                      </span>
                    </td>

                    {/* 9. Actions (Tidy 2-Row Layout, eliminating table stretch) */}
                    <td className="py-3.5 px-3.5 align-top text-right whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 items-end">
                        {/* Primary action buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenEditAdmission(adm)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="Edit patient details, admission/discharge dates, times, notes anytime"
                          >
                            <Pencil className="w-3 h-3 text-amber-700" />
                            Edit Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDischargeModal(adm)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="Edit patient bill, charges, discharge date/time, and settlement"
                          >
                            <IndianRupee className="w-3 h-3 text-white" />
                            Edit Bill &amp; Settle
                          </button>
                        </div>

                        {/* Document print buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onGenerateFinalBill(adm)}
                            className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md font-semibold text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                            title="View / Print Final Hospital Bill"
                          >
                            <FileText className="w-2.5 h-2.5 text-emerald-700" />
                            Final Bill
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPatientReceipt(adm)}
                            className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md font-semibold text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                            title="View payment receipt slips"
                          >
                            <Receipt className="w-2.5 h-2.5 text-emerald-600" />
                            Receipts ({(adm.advances || []).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPrintDischarge(adm)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-semibold text-[10.5px] cursor-pointer"
                            title="View discharge clinical summary"
                          >
                            Summary
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
