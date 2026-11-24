"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Settings,
  ArrowLeftRight,
  HeartPulse,
  Search,
  Bed,
  Phone,
  Stethoscope,
  Receipt,
  IndianRupee,
  Pencil,
  LogOut,
  Printer,
  ChevronDown,
  ChevronUp,
  Filter,
  Activity,
  Plus,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  IPDAdmission,
  WardBedConfigItem,
  DOCTORS,
  calculateStayDays,
  calculateRunningBill,
} from "./types";
import { formatDate } from "@/lib/utils";
import { isShillpaDoctor } from "@/lib/doctorColors";

interface IpdBedMatrixTabProps {
  wardBedConfig: WardBedConfigItem[];
  occupiedBeds: Map<string, IPDAdmission>;
  activeAdmissions: IPDAdmission[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedWardFilter: string;
  setSelectedWardFilter: (ward: string) => void;
  selectedDoctorFilter: string;
  setSelectedDoctorFilter: (doc: string) => void;
  onOpenBedConfigModal: () => void;
  onSelectBedForAdmit: (ward: string, bed: string) => void;
  onOpenProfile: (adm: IPDAdmission) => void;
  onOpenBilling: (adm: IPDAdmission) => void;
  onOpenRecordPayment: (adm: IPDAdmission) => void;
  onOpenPatientReceipt: (adm: IPDAdmission) => void;
  onOpenEditAdmission: (adm: IPDAdmission) => void;
  onOpenDischarge: (adm: IPDAdmission) => void;
  onOpenPrintTicket: (adm: IPDAdmission) => void;
  onOpenTransferBed: (adm: IPDAdmission) => void;
  onSwitchToAdmitTab: () => void;
}

export default function IpdBedMatrixTab({
  wardBedConfig,
  occupiedBeds,
  activeAdmissions,
  searchQuery,
  setSearchQuery,
  selectedWardFilter,
  setSelectedWardFilter,
  selectedDoctorFilter,
  setSelectedDoctorFilter,
  onOpenBedConfigModal,
  onSelectBedForAdmit,
  onOpenProfile,
  onOpenBilling,
  onOpenRecordPayment,
  onOpenPatientReceipt,
  onOpenEditAdmission,
  onOpenDischarge,
  onOpenPrintTicket,
  onOpenTransferBed,
  onSwitchToAdmitTab,
}: IpdBedMatrixTabProps) {
  // Collapsible toggle for Bed Matrix grid
  const [isBedGridExpanded, setIsBedGridExpanded] = useState<boolean>(true);
  // Stay duration filter: "All" | "day1" | "day2-4" | "day5plus"
  const [stayFilter, setStayFilter] = useState<string>("All");

  // Compute total bed count and occupied bed count
  const totalBedsCount = useMemo(() => {
    return wardBedConfig.reduce((acc, w) => acc + (w.beds?.length || 0), 0);
  }, [wardBedConfig]);

  const occupiedBedsCount = occupiedBeds.size;
  const vacantBedsCount = Math.max(0, totalBedsCount - occupiedBedsCount);

  // Filter active admissions based on search, ward, doctor, and stay length
  const filteredAdmissions = useMemo(() => {
    return activeAdmissions.filter((adm) => {
      // 1. Ward filter
      if (selectedWardFilter !== "All" && adm.ward !== selectedWardFilter) {
        return false;
      }

      // 2. Doctor filter
      if (selectedDoctorFilter !== "All") {
        const docLower = (adm.consultantDoctor || "").toLowerCase();
        if (selectedDoctorFilter === "Dr. Shillpa Raut") {
          if (!docLower.includes("shilpa") && !docLower.includes("shillpa")) return false;
        } else if (selectedDoctorFilter === "Dr. Vipeen Raut") {
          if (docLower.includes("shilpa") || docLower.includes("shillpa")) return false;
        } else {
          if (!docLower.includes(selectedDoctorFilter.toLowerCase())) return false;
        }
      }

      // 3. Stay duration filter
      if (stayFilter !== "All") {
        const stayDays = calculateStayDays(adm.admissionDate);
        if (stayFilter === "day1" && stayDays > 1) return false;
        if (stayFilter === "day2-4" && (stayDays < 2 || stayDays > 4)) return false;
        if (stayFilter === "day5plus" && stayDays < 5) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const admDateRev = adm.admissionDate ? adm.admissionDate.split("-").reverse().join("-") : "";
        const admDateSlash = adm.admissionDate ? adm.admissionDate.split("-").reverse().join("/") : "";

        const matchesQuery =
          adm.name.toLowerCase().includes(q) ||
          adm.phone.includes(q) ||
          adm.ipdNumber.toLowerCase().includes(q) ||
          adm.uhid.toLowerCase().includes(q) ||
          adm.ward.toLowerCase().includes(q) ||
          adm.bedNumber.toLowerCase().includes(q) ||
          adm.consultantDoctor.toLowerCase().includes(q) ||
          (adm.provisionalDiagnosis || "").toLowerCase().includes(q) ||
          adm.admissionDate.toLowerCase().includes(q) ||
          admDateRev.includes(q) ||
          admDateSlash.includes(q);

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [activeAdmissions, selectedWardFilter, selectedDoctorFilter, stayFilter, searchQuery]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedWardFilter !== "All" ||
      selectedDoctorFilter !== "All" ||
      stayFilter !== "All"
  );

  // Helper for stay duration badge
  const getStayBadge = (days: number) => {
    if (days <= 1) {
      return {
        label: "Day 1 (Today)",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    }
    if (days <= 3) {
      return {
        label: `Day ${days}`,
        className: "bg-sky-50 text-sky-800 border-sky-200",
      };
    }
    if (days <= 7) {
      return {
        label: `Day ${days}`,
        className: "bg-amber-50 text-amber-800 border-amber-200",
      };
    }
    return {
      label: `Day ${days}`,
      className: "bg-purple-50 text-purple-800 border-purple-200",
    };
  };

  // Helper to extract the most recent recorded vitals
  const getLatestVitals = (adm: IPDAdmission) => {
    if (!adm.vitals || adm.vitals.length === 0) return null;
    return adm.vitals[adm.vitals.length - 1];
  };

  return (
    <div className="space-y-5">
      {/* ─────────────────────────────────────────────────────────────
          1. WARD & BED OCCUPANCY VISUAL MATRIX (COLLAPSIBLE STRIP)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
        {/* Strip Header */}
        <div className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-wide">
                  Ward &amp; Bed Occupancy Grid
                </h2>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200 font-mono">
                  {occupiedBedsCount}/{totalBedsCount} Occupied
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Click an occupied bed for clinical stay sheet, or vacant bed to assign.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs"></span>
              Vacant ({vacantBedsCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs"></span>
              Occupied ({occupiedBedsCount})
            </span>

            {/* Edit Beds & Tariff Rates Button */}
            <button
              type="button"
              onClick={onOpenBedConfigModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition shadow-2xs cursor-pointer ml-1"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Edit Beds &amp; Rates
            </button>

            {/* Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsBedGridExpanded(!isBedGridExpanded)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              {isBedGridExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  Hide Grid
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  Show Grid
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expanded Bed Matrix Grid */}
        {isBedGridExpanded ? (
          <div className="p-4 sm:p-5 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {wardBedConfig.map((wConfig) => {
                const wardOccupied = wConfig.beds.filter((b) => occupiedBeds.has(b)).length;
                return (
                  <div
                    key={wConfig.ward}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 truncate" title={wConfig.ward}>
                          {wConfig.ward}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          ₹{wConfig.dailyRate}/d
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 mb-2 font-medium">
                        {wardOccupied}/{wConfig.beds.length} occupied
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        {wConfig.beds.map((bedId) => {
                          const occ = occupiedBeds.get(bedId);
                          const isOccupied = !!occ;
                          const isGyn = occ && isShillpaDoctor(occ.consultantDoctor);

                          return (
                            <div
                              key={bedId}
                              onClick={() => {
                                if (isOccupied) {
                                  onOpenProfile(occ);
                                } else {
                                  onSelectBedForAdmit(wConfig.ward, bedId);
                                }
                              }}
                              className={`p-2 rounded-lg border cursor-pointer transition text-left relative overflow-hidden group ${
                                isOccupied
                                  ? "bg-slate-50/80 border-slate-300/80 hover:bg-slate-100"
                                  : "bg-white border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/30"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-slate-900">{bedId}</span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isOccupied ? "bg-amber-500 shadow-xs" : "bg-emerald-500 shadow-xs"
                                  }`}
                                />
                              </div>

                              {isOccupied ? (
                                <div className="mt-1">
                                  <p className="text-xs font-semibold text-slate-900 truncate" title={occ.name}>
                                    {occ.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Day {calculateStayDays(occ.admissionDate)} • {occ.uhid}
                                  </p>
                                  <div className="mt-1 flex items-center justify-between gap-1">
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold border truncate max-w-[110px] ${
                                        isGyn
                                          ? "bg-pink-50 text-pink-700 border-pink-200"
                                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      }`}
                                    >
                                      <span
                                        className={`w-1 h-1 rounded-full ${isGyn ? "bg-pink-500" : "bg-emerald-500"}`}
                                      />
                                      <span className="truncate">{occ.consultantDoctor.replace(/^Dr\.?\s*/i, "")}</span>
                                    </span>

                                    <button
                                      type="button"
                                      title="Transfer Bed"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenTransferBed(occ);
                                      }}
                                      className="p-1 hover:bg-slate-200 text-slate-500 rounded transition cursor-pointer"
                                    >
                                      <ArrowLeftRight className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1 flex items-center justify-between text-slate-400 group-hover:text-emerald-700">
                                  <span className="text-[11px] font-medium">Vacant</span>
                                  <span className="text-xs font-bold">+</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Collapsed Summary Bar */
          <div className="px-4 py-3 bg-slate-50/70 flex flex-wrap items-center gap-2 text-xs border-t border-slate-100">
            <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Rooms:</span>
            {wardBedConfig.map((w) => {
              const occCount = w.beds.filter((b) => occupiedBeds.has(b)).length;
              const isFull = occCount === w.beds.length && w.beds.length > 0;
              return (
                <div
                  key={w.ward}
                  onClick={() => setIsBedGridExpanded(true)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
                    isFull
                      ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                  title={`${w.ward} (${occCount}/${w.beds.length} occupied)`}
                >
                  <span className="font-semibold">{w.ward}:</span>
                  <span className="font-mono font-bold">
                    {occCount}/{w.beds.length}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. INPATIENT CLINICAL CENSUS TABLE (REGISTRY-FIRST VIEW)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
        {/* Table Toolbar & Multi-Filter Bar */}
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Inpatient Clinical Census
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {filteredAdmissions.length} {filteredAdmissions.length === 1 ? "Inpatient" : "Inpatients"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Active admitted patients • Doctor rounds &amp; MAR charting • Running bill ledger • Fast discharges
              </p>
            </div>

            {/* Quick Action: New Admission */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onSwitchToAdmitTab}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + New Admission
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Search Box */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, UHID, IPD, bed..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full sm:w-60 bg-white"
              />
            </div>

            {/* Room / Ward Filter Dropdown */}
            <select
              value={selectedWardFilter}
              onChange={(e) => setSelectedWardFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Rooms / Wards</option>
              {wardBedConfig.map((w) => (
                <option key={w.ward} value={w.ward}>
                  {w.ward}
                </option>
              ))}
            </select>

            {/* Doctor Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDoctorFilter("All")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  selectedDoctorFilter === "All"
                    ? "bg-white text-slate-800 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                All Doctors
              </button>
              {DOCTORS.filter((d) => !d.name.includes("Visiting")).map((d) => {
                const isSelected = selectedDoctorFilter === d.name;
                const isGyn = isShillpaDoctor(d.name);
                return (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setSelectedDoctorFilter(isSelected ? "All" : d.name)}
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? isGyn
                          ? "bg-pink-50 text-pink-700 border border-pink-300 shadow-2xs font-bold"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs font-bold"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isGyn ? "bg-pink-500" : "bg-emerald-500"}`} />
                    {d.name}
                  </button>
                );
              })}
            </div>

            {/* Stay Duration Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Stay:</span>
              <button
                type="button"
                onClick={() => setStayFilter("All")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  stayFilter === "All"
                    ? "bg-white text-slate-800 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStayFilter("day1")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  stayFilter === "day1"
                    ? "bg-white text-emerald-800 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Day 1
              </button>
              <button
                type="button"
                onClick={() => setStayFilter("day2-4")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  stayFilter === "day2-4"
                    ? "bg-white text-sky-800 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                2–4d
              </button>
              <button
                type="button"
                onClick={() => setStayFilter("day5plus")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  stayFilter === "day5plus"
                    ? "bg-white text-amber-800 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                5d+
              </button>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedWardFilter("All");
                  setSelectedDoctorFilter("All");
                  setStayFilter("All");
                }}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer shrink-0"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. TABULAR INPATIENT CENSUS
           ───────────────────────────────────────────────────────────── */}
        {filteredAdmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2 bg-slate-50/50 rounded-xl border border-slate-200">
            <Bed className="w-10 h-10 text-slate-300 mx-auto mb-1" />
            <p className="font-bold text-sm text-slate-800">No Inpatients Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters
                ? "No admitted patients match your current search and filters. Try clearing your search or filters above."
                : "All beds are currently vacant. Click '+ New Admission' to admit an inpatient."}
            </p>
            <button
              type="button"
              onClick={onSwitchToAdmitTab}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              + Admit Patient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                  <th className="py-3 px-3 align-middle w-28 whitespace-nowrap">Bed &amp; Room</th>
                  <th className="py-3 px-3 align-middle w-28 whitespace-nowrap">IPD / UHID</th>
                  <th className="py-3 px-3 align-middle min-w-[170px]">Patient Name &amp; Contact</th>
                  <th className="py-3 px-3 align-middle min-w-[130px] whitespace-nowrap">Admission &amp; Stay</th>
                  <th className="py-3 px-3 align-middle min-w-[140px] whitespace-nowrap">Attending Doctor</th>
                  <th className="py-3 px-3 align-middle min-w-[170px]">Clinical Vitals &amp; Notes</th>
                  <th className="py-3 px-3 align-middle min-w-[130px] whitespace-nowrap">Running Bill</th>
                  <th className="py-3 px-3 align-middle text-right min-w-[270px] shrink-0">Actions Hub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {filteredAdmissions.map((adm) => {
                  const bill = calculateRunningBill(adm);
                  const isGyn = isShillpaDoctor(adm.consultantDoctor);
                  const stayBadge = getStayBadge(bill.days);
                  const latestVitals = getLatestVitals(adm);
                  const doctorNotesCount = adm.doctorNotes?.length || 0;
                  const activeMedsCount = adm.medications?.filter((m) => m.status === "Active")?.length || 0;

                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Bed & Ward */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 border border-slate-300/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            {adm.bedNumber}
                          </span>
                          <button
                            type="button"
                            title="Transfer Bed"
                            onClick={() => onOpenTransferBed(adm)}
                            className="p-1 hover:bg-slate-200 text-slate-500 rounded transition cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[110px]" title={adm.ward}>
                          {adm.ward}
                        </div>
                      </td>

                      {/* 2. IPD & UHID */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 inline-block">
                          {adm.ipdNumber}
                        </span>
                        <div className="text-[10.5px] font-mono text-slate-500 mt-0.5">{adm.uhid}</div>
                      </td>

                      {/* 3. Patient Name & Contact */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900 text-sm">{adm.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>
                            {adm.age}y • {adm.sex}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {adm.phone}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-700 font-medium mt-0.5 line-clamp-1" title={adm.provisionalDiagnosis}>
                          Dx: <span className="font-semibold text-slate-900">{adm.provisionalDiagnosis || "General Admission"}</span>
                        </div>
                      </td>

                      {/* 4. Admission & Stay */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="text-slate-800 font-medium text-xs">
                          {formatDate(adm.admissionDate)}
                        </div>
                        {adm.admissionTime && (
                          <div className="text-[10.5px] text-slate-400">{adm.admissionTime}</div>
                        )}
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] rounded font-bold border ${stayBadge.className}`}
                          >
                            {stayBadge.label}
                          </span>
                        </div>
                      </td>

                      {/* 5. Attending Consultant */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            isGyn
                              ? "bg-pink-50 text-pink-700 border-pink-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isGyn ? "bg-pink-500" : "bg-emerald-500"}`} />
                          {adm.consultantDoctor}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{adm.department}</div>
                        {adm.paymentCategory && (
                          <div className="text-[9.5px] font-mono text-slate-500 mt-0.5">
                            {adm.paymentCategory}
                          </div>
                        )}
                      </td>

                      {/* 6. Clinical Snapshot (Vitals & Rounds) */}
                      <td className="py-3 px-3 align-top">
                        {latestVitals ? (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-md p-1.5 text-[10.5px] space-y-0.5 max-w-[200px]">
                            <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                              <span>BP: {latestVitals.bp || "—"}</span>
                              <span>SpO2: {latestVitals.spo2 || "—"}%</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500 text-[10px]">
                              <span>Pulse: {latestVitals.pulse || "—"}</span>
                              <span>Temp: {latestVitals.temp || "—"}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10.5px] text-slate-400 italic">No vitals logged</div>
                        )}

                        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium border border-slate-200">
                            {doctorNotesCount} {doctorNotesCount === 1 ? "round" : "rounds"}
                          </span>
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium border border-slate-200">
                            {activeMedsCount} meds
                          </span>
                        </div>
                      </td>

                      {/* 7. Running Financials */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          ₹{bill.balanceDue.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Gross: ₹{bill.grossTotal.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium">
                          Paid: ₹{bill.totalAdvances.toLocaleString("en-IN")} ({adm.advances?.length || 0})
                        </div>
                      </td>

                      {/* 8. Actions Hub */}
                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-end">
                          {/* Row 1: Primary Actions */}
                          <div className="flex items-center gap-1.5">
                            {/* Clinical Sheet */}
                            <button
                              type="button"
                              onClick={() => onOpenProfile(adm)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              title="Clinical Stay Sheet (Doctor Notes, Vitals, MAR meds, Nursing)"
                            >
                              <Stethoscope className="w-3 h-3 text-white" />
                              Clinical Sheet
                            </button>

                            {/* Running Bill */}
                            <button
                              type="button"
                              onClick={() => onOpenBilling(adm)}
                              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              title="Running Bill & Advances Ledger"
                            >
                              <Receipt className="w-3 h-3 text-slate-500" />
                              Bill
                            </button>

                            {/* Record Advance / Payment */}
                            <button
                              type="button"
                              onClick={() => onOpenRecordPayment(adm)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-0.5 cursor-pointer transition shadow-2xs"
                              title="Record payment & give small receipt"
                            >
                              <IndianRupee className="w-3 h-3 text-emerald-700" />
                              + Pay
                            </button>
                          </div>

                          {/* Row 2: Secondary / Admin Actions */}
                          <div className="flex items-center gap-1">
                            {/* Receipts */}
                            <button
                              type="button"
                              onClick={() => onOpenPatientReceipt(adm)}
                              className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md font-medium text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                              title="View / Print Payment Receipts"
                            >
                              <Receipt className="w-2.5 h-2.5 text-emerald-600" />
                              Slips ({adm.advances?.length || 0})
                            </button>

                            {/* Edit Admission */}
                            <button
                              type="button"
                              onClick={() => onOpenEditAdmission(adm)}
                              className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md font-medium text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                              title="Edit patient details, ward, bed & daily rates"
                            >
                              <Pencil className="w-2.5 h-2.5 text-slate-500" />
                              Edit
                            </button>

                            {/* Bed Ticket */}
                            <button
                              type="button"
                              onClick={() => onOpenPrintTicket(adm)}
                              className="p-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10.5px] cursor-pointer"
                              title="Print Admission Bed Ticket"
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                            </button>

                            {/* Discharge */}
                            <button
                              type="button"
                              onClick={() => onOpenDischarge(adm)}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-bold text-[10.5px] inline-flex items-center gap-1 cursor-pointer transition"
                              title="Discharge patient, summary & final settlement"
                            >
                              <LogOut className="w-2.5 h-2.5 text-amber-700" />
                              Discharge
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
    </div>
  );
}
