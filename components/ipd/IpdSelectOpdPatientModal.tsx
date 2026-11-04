"use client";

import React from "react";
import { Users, X, Calendar, Search, UserPlus } from "lucide-react";

interface IpdSelectOpdPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  opdPatients: any[];
  selectedOpdDate: string;
  setSelectedOpdDate: (d: string) => void;
  opdSearchQuery: string;
  setOpdSearchQuery: (q: string) => void;
  onSelectOpdPatient: (pt: any) => void;
}

export default function IpdSelectOpdPatientModal({
  isOpen,
  onClose,
  opdPatients,
  selectedOpdDate,
  setSelectedOpdDate,
  opdSearchQuery,
  setOpdSearchQuery,
  onSelectOpdPatient,
}: IpdSelectOpdPatientModalProps) {
  if (!isOpen) return null;

  const filtered = opdPatients.filter((item) => {
    const regDate = item.registeredAt ? item.registeredAt.slice(0, 10) : "";
    const matchesDate = !selectedOpdDate || regDate === selectedOpdDate;
    const q = opdSearchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.phone?.includes(q) ||
      item.uhid?.toLowerCase().includes(q) ||
      item.token?.includes(q) ||
      item.doctor?.toLowerCase().includes(q);
    return matchesDate && matchesQuery;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Select Patient from OPD by Date</h2>
              <p className="text-xs text-slate-600">
                Lookup OPD registry by visit date. Selecting an OPD patient pre-fills their UHID, demographics & vitals
                for IPD admission.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Visit Date:
            </label>
            <input
              type="date"
              value={selectedOpdDate}
              onChange={(e) => setSelectedOpdDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setSelectedOpdDate(new Date().toISOString().split("T")[0])}
              className={`px-2.5 py-1 font-bold rounded-lg border transition cursor-pointer ${
                selectedOpdDate === new Date().toISOString().split("T")[0]
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedOpdDate(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0])
              }
              className="px-2.5 py-1 font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setSelectedOpdDate("")}
              className="px-2.5 py-1 font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              All Dates
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={opdSearchQuery}
              onChange={(e) => setOpdSearchQuery(e.target.value)}
              placeholder="Search OPD patient name, phone, token..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-5 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm">No OPD patients found for {selectedOpdDate || "selected criteria"}</p>
              <p className="text-xs text-slate-400">Change date filter above or register a new patient in OPD first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((pt) => (
                <div
                  key={pt.id}
                  className="p-4 border border-slate-200 rounded-xl hover:border-emerald-400 bg-white transition hover:shadow-md flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        Token #{pt.token} • {pt.uhid || "CRX..."}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {pt.registeredAt ? pt.registeredAt.slice(0, 10) : "OPD"}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-sm">{pt.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {pt.age}y • {pt.sex} • 📞 {pt.phone}
                    </p>
                    <p className="text-xs text-slate-700 mt-1">
                      <strong>Doctor:</strong> {pt.doctor || "General OPD"} ({pt.department || "General"})
                    </p>

                    {pt.vitals?.bp && (
                      <div className="mt-2 p-2 bg-emerald-50/60 rounded-lg text-[11px] text-emerald-900 flex flex-wrap gap-2">
                        <span>
                          <strong>BP:</strong> {pt.vitals.bp}
                        </span>
                        <span>
                          <strong>Pulse:</strong> {pt.vitals.pulse || "—"}
                        </span>
                        <span>
                          <strong>Temp:</strong> {pt.vitals.temperature || "98.6"}°F
                        </span>
                        <span>
                          <strong>SpO₂:</strong> {pt.vitals.spo2 || "—"}%
                        </span>
                        {pt.vitals.weight && (
                          <span>
                            <strong>Wt:</strong> {pt.vitals.weight}kg
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectOpdPatient(pt)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Select & Admit to IPD →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
