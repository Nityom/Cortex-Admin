"use client";

import React from "react";
import {
  Bed,
  UserPlus,
  Users,
  Activity,
  ClipboardCheck,
  CheckCircle2,
  IndianRupee,
  ShieldCheck,
  Layers,
  Sparkles,
} from "lucide-react";

interface IpdStats {
  admittedCount: number;
  availableBeds: number;
  totalBeds: number;
  dischargedCount: number;
  totalActiveRevenue: number;
  totalAdvances: number;
  occupancyPercent: number;
}

interface IpdHeaderStatsProps {
  activeTab: "dashboard" | "admit" | "history";
  setActiveTab: (tab: "dashboard" | "admit" | "history") => void;
  stats: IpdStats;
  successToast: string | null;
  setSuccessToast: (msg: string | null) => void;
  onOpenOpdModal: () => void;
}

export default function IpdHeaderStats({
  activeTab,
  setActiveTab,
  stats,
  successToast,
  setSuccessToast,
  onOpenOpdModal,
}: IpdHeaderStatsProps) {
  return (
    <div className="space-y-4">
      {/* HEADER BANNER */}
      <header className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Bed className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">IPD Inpatient Census</h1>
                
              </div>
             
            </div>
          </div>

          {/* Primary View Toggles & Fast Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`px-3.5 py-1.5 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Active Inpatients ({stats.admittedCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3.5 py-1.5 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
                Discharged Archive ({stats.dischargedCount})
              </button>
            </div>

            {/* Quick Action: Select from OPD */}
            <button
              type="button"
              onClick={onOpenOpdModal}
              className="px-3.5 py-2 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer hover:border-slate-400"
              title="Admit a registered OPD patient directly into IPD"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              Import from OPD
            </button>

            {/* Action: New Admission */}
            <button
              type="button"
              onClick={() => setActiveTab("admit")}
              className={`px-4 py-2 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                activeTab === "admit"
                  ? "bg-emerald-700 text-white shadow-emerald-700/25 ring-2 ring-emerald-500/30"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              + New Admission
            </button>
          </div>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-emerald-950 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold">{successToast}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs font-medium px-2.5 py-1 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-200 rounded-lg transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* REFINED STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Admitted Inpatients */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Inpatients</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className="text-2xl font-bold font-mono text-slate-900">{stats.admittedCount}</p>
            <span className="text-xs font-semibold text-slate-400">patients</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.occupancyPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
              {stats.occupancyPercent}% occupancy
            </span>
          </div>
        </div>

        {/* Bed Availability */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bed Availability</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Bed className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1.5">
            <p className="text-2xl font-bold font-mono text-slate-900">{stats.availableBeds}</p>
            <span className="text-sm font-semibold text-slate-400">/ {stats.totalBeds}</span>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {stats.availableBeds > 0 ? "Beds Available" : "Full"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 truncate">
            {stats.availableBeds} vacant for new admission
          </p>
        </div>

        {/* Running Stay Charges */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Est. Running Bill</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1.5">
            ₹{stats.totalActiveRevenue.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-slate-400 mt-2.5 truncate">
            Beds, nursing, consultant & procedures
          </p>
        </div>

        {/* Advances Collected */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Advances Deposited</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1.5">
            ₹{stats.totalAdvances.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-slate-400 mt-2.5 truncate">
            Held in account for discharge adjustment
          </p>
        </div>
      </div>
    </div>
  );
}

