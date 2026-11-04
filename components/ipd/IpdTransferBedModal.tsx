"use client";

import React from "react";
import { ArrowLeftRight, X, CheckCircle2 } from "lucide-react";
import { IPDAdmission, WardBedConfigItem } from "./types";

interface IpdTransferBedModalProps {
  isOpen: boolean;
  admission: IPDAdmission | null;
  targetWard: string;
  targetBed: string;
  wardBedConfig: WardBedConfigItem[];
  occupiedBeds: Map<string, IPDAdmission>;
  onClose: () => void;
  onUpdateTargetWard: (ward: string, defaultBed: string) => void;
  onUpdateTargetBed: (bed: string) => void;
  onConfirmTransfer: () => void;
}

export default function IpdTransferBedModal({
  isOpen,
  admission,
  targetWard,
  targetBed,
  wardBedConfig,
  occupiedBeds,
  onClose,
  onUpdateTargetWard,
  onUpdateTargetBed,
  onConfirmTransfer,
}: IpdTransferBedModalProps) {
  if (!isOpen || !admission) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Transfer Inpatient Bed</h3>
              <p className="text-[11px] text-slate-500">
                {admission.name} • {admission.uhid}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Allocation</span>
            <p className="font-bold text-slate-900">
              Bed {admission.bedNumber} ({admission.ward}) • ₹{admission.dailyRate}/day
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Ward Category</label>
            <select
              value={targetWard}
              onChange={(e) => {
                const wName = e.target.value;
                const conf = wardBedConfig.find((w) => w.ward === wName);
                const firstVacant = conf?.beds.find((b) => !occupiedBeds.has(b)) || "";
                onUpdateTargetWard(wName, firstVacant);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white"
            >
              {wardBedConfig.map((w) => (
                <option key={w.ward} value={w.ward}>
                  {w.ward} (₹{w.dailyRate}/day)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Target Vacant Bed</label>
            <select
              value={targetBed}
              onChange={(e) => onUpdateTargetBed(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
            >
              <option value="">-- Choose Vacant Bed --</option>
              {(() => {
                const conf = wardBedConfig.find((w) => w.ward === targetWard);
                return conf?.beds
                  .filter((b) => !occupiedBeds.has(b))
                  .map((b) => (
                    <option key={b} value={b}>
                      {b} — VACANT
                    </option>
                  ));
              })()}
            </select>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onConfirmTransfer}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirm Bed Transfer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

