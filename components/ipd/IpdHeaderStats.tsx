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
    <>
      {/* HEADER BANNER */}
      <header className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Bed className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">IPD Management</h1>
                <p className="text-xs text-slate-500">Inpatient Care, Bed Allocation & Running Billing</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              Inpatient Board ({stats.admittedCount})
            </button>

            {/* Select from OPD by Date Button */}
            <button
              onClick={onOpenOpdModal}
              className="px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-500" />
              Import from OPD
            </button>

            <button
              onClick={() => setActiveTab("admit")}
              className={`px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === "admit"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <UserPlus className="w-4 h-4" />+ New Admission
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-2 font-medium text-xs rounded-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === "history"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Discharge Archive ({stats.dischargedCount})
            </button>
          </div>
        </div>
      </header>

      {/* TOAST BANNER */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{successToast}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs font-medium px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Admitted Patients</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.admittedCount}</p>
          <span className="text-[11px] text-slate-400">Occupancy: {stats.occupancyPercent}%</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Available Beds</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <Bed className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats.availableBeds} / {stats.totalBeds}
          </p>
          <span className="text-[11px] text-slate-400">Vacant for allocation</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Stay Charges</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{stats.totalActiveRevenue.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-slate-400">Total running bill</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Advances Collected</span>
            <span className="p-1 bg-slate-100 text-slate-600 rounded">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{stats.totalAdvances.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-slate-400">Adjustable in settlement</span>
        </div>
      </div>
    </>
  );
}
