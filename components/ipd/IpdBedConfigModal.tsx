"use client";

import React from "react";
import { Settings, X, IndianRupee, Plus, Bed, Trash2 } from "lucide-react";
import { WardBedConfigItem, IPDAdmission } from "./types";

interface IpdBedConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  wardBedConfig: WardBedConfigItem[];
  occupiedBeds: Map<string, IPDAdmission>;
  newBedForm: { ward: string; bedNumber: string };
  setNewBedForm: React.Dispatch<React.SetStateAction<{ ward: string; bedNumber: string }>>;
  onUpdateWardRate: (ward: string, rate: number) => void;
  onAddBed: (e: React.FormEvent) => void;
  onDeleteBed: (ward: string, bedNumber: string) => void;
  onResetBedConfig: () => void;
}

export default function IpdBedConfigModal({
  isOpen,
  onClose,
  wardBedConfig,
  occupiedBeds,
  newBedForm,
  setNewBedForm,
  onUpdateWardRate,
  onAddBed,
  onDeleteBed,
  onResetBedConfig,
}: IpdBedConfigModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Configure & Edit Bed Matrix & Daily Rates</h2>
              <p className="text-xs text-slate-500">
                Add new beds, remove vacant beds, and customize room rates per ward category.
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

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* 1. Daily Room Rates per Ward */}
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-3 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              1. Ward Daily Room Rates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wardBedConfig.map((w) => (
                <div
                  key={w.ward}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{w.ward}</span>
                    <span className="text-[11px] text-slate-500">{w.beds.length} Total Beds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      defaultValue={w.dailyRate}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0 && val !== w.dailyRate) {
                          onUpdateWardRate(w.ward, val);
                        }
                      }}
                      className="w-24 p-1.5 border border-slate-300 rounded font-bold text-xs bg-white text-right"
                    />
                    <span className="text-[10px] text-slate-400">/day</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Add New Bed to Ward */}
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              2. Add New Bed to Matrix
            </h3>
            <form
              onSubmit={onAddBed}
              className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-wrap items-end gap-3"
            >
              <div>
                <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">Ward Category</label>
                <select
                  value={newBedForm.ward}
                  onChange={(e) => setNewBedForm({ ...newBedForm, ward: e.target.value })}
                  className="p-1.5 border border-emerald-300 rounded text-xs bg-white font-medium"
                >
                  {wardBedConfig.map((w) => (
                    <option key={w.ward} value={w.ward}>
                      {w.ward}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">Bed Number / Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bed 101-C / Bed 205"
                  value={newBedForm.bedNumber}
                  onChange={(e) => setNewBedForm({ ...newBedForm, bedNumber: e.target.value })}
                  className="p-1.5 border border-emerald-300 rounded text-xs font-mono font-bold bg-white w-36 uppercase"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow cursor-pointer"
              >
                + Add Bed
              </button>
            </form>
          </div>

          {/* 3. Manage Existing Beds (Delete Vacant) */}
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-3 flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-emerald-600" />
              3. All Beds in Matrix
            </h3>
            <div className="space-y-3">
              {wardBedConfig.map((w) => (
                <div key={w.ward} className="border border-slate-200 rounded-xl p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-xs">{w.ward}</span>
                    <span className="text-[11px] text-slate-500 font-mono">₹{w.dailyRate}/day</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {w.beds.map((b) => {
                      const occ = occupiedBeds.get(b);
                      return (
                        <div
                          key={b}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                            occ
                              ? "bg-amber-50 border-amber-300 text-amber-900"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span className="font-mono font-bold">{b}</span>
                          {occ ? (
                            <span className="text-[10px] font-medium text-amber-700">({occ.name.split(" ")[0]})</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onDeleteBed(w.ward, b)}
                              className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                              title="Delete vacant bed"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetBedConfig}
            className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
          >
            Reset to Hospital Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
