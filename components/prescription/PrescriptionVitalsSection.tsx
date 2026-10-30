'use client';

import React from 'react';
import { Edit2, Undo2 } from 'lucide-react';

interface PrescriptionVitalsSectionProps {
  bpSystolic: string;
  setBpSystolic: (v: string) => void;
  bpDiastolic: string;
  setBpDiastolic: (v: string) => void;
  pulseVal: string;
  setPulseVal: (v: string) => void;
  heightVal: string;
  setHeightVal: (v: string) => void;
  weightVal: string;
  setWeightVal: (v: string) => void;
  tempVal: string;
  setTempVal: (v: string) => void;
  displayBmi: string;
  waistHipVal: string;
  setWaistHipVal: (v: string) => void;
  spo2Val: string;
  setSpo2Val: (v: string) => void;
  lmpDate: string;
  setLmpDate: (v: string) => void;
  eddDate: string;
  setEddDate: (v: string) => void;
  gestationalWeeks: string;
  setGestationalWeeks: (v: string) => void;
  gestationalDays: string;
  setGestationalDays: (v: string) => void;
  onResetVitals?: () => void;
  isGynae?: boolean;
}

export default function PrescriptionVitalsSection({
  bpSystolic,
  setBpSystolic,
  bpDiastolic,
  setBpDiastolic,
  pulseVal,
  setPulseVal,
  heightVal,
  setHeightVal,
  weightVal,
  setWeightVal,
  tempVal,
  setTempVal,
  displayBmi,
  waistHipVal,
  setWaistHipVal,
  spo2Val,
  setSpo2Val,
  lmpDate,
  setLmpDate,
  eddDate,
  setEddDate,
  gestationalWeeks,
  setGestationalWeeks,
  gestationalDays,
  setGestationalDays,
  onResetVitals,
  isGynae = false,
}: PrescriptionVitalsSectionProps) {
  const handleReset = () => {
    if (onResetVitals) {
      onResetVitals();
    } else {
      setBpSystolic('');
      setBpDiastolic('');
      setPulseVal('');
      setHeightVal('');
      setWeightVal('');
      setTempVal('');
      setWaistHipVal('');
      setSpo2Val('');
      setLmpDate('');
      setEddDate('');
      setGestationalWeeks('');
      setGestationalDays('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          Vitals
        </label>
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            title="Edit Vitals"
            className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Reset / Clear All Vitals"
            className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            onClick={handleReset}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* Row 1: BP, Pulse, Height, Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* BP */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              BP (Blood Pressure)
            </label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                placeholder="120"
                title="Systolic BP (mmHg)"
                className="w-1/2 min-w-0 py-2 px-2.5 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center text-slate-300 font-bold px-0.5 select-none">
                /
              </span>
              <input
                type="text"
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                placeholder="80"
                title="Diastolic BP (mmHg)"
                className="w-1/2 min-w-0 py-2 px-2.5 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                mmHg
              </span>
            </div>
          </div>

          {/* Pulse */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pulse</label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={pulseVal}
                onChange={(e) => setPulseVal(e.target.value)}
                placeholder="72"
                title="Pulse Rate (bpm)"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                bpm
              </span>
            </div>
          </div>

          {/* Height */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Height</label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={heightVal}
                onChange={(e) => setHeightVal(e.target.value)}
                placeholder="170"
                title="Height (cm)"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                cm
              </span>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Weight</label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={weightVal}
                onChange={(e) => setWeightVal(e.target.value)}
                placeholder="65"
                title="Weight (kg)"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Temperature, BMI, Waist/Hip, SPO2, LMP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Temperature
            </label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={tempVal}
                onChange={(e) => setTempVal(e.target.value)}
                placeholder="98.4"
                title="Body Temperature (°F)"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                °F
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">BMI</label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden shadow-xs">
              <input
                type="text"
                value={displayBmi}
                readOnly
                placeholder="—"
                title="Body Mass Index (Kg/m²)"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-extrabold text-teal-800 bg-transparent outline-none cursor-default"
              />
              <span className="inline-flex items-center px-2 py-2 bg-slate-100 border-l border-slate-200 text-xs font-semibold text-slate-500 select-none">
                Kg/m²
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Waist/Hip</label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={waistHipVal}
                onChange={(e) => setWaistHipVal(e.target.value)}
                placeholder="0.85"
                title="Waist to Hip Ratio"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                ratio
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">SPO2</label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={spo2Val}
                onChange={(e) => setSpo2Val(e.target.value)}
                placeholder="98"
                title="Blood Oxygen Saturation (SPO2 %)"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                %
              </span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Waist/Hip</label>
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
              <input
                type="text"
                value={waistHipVal}
                onChange={(e) => setWaistHipVal(e.target.value)}
                placeholder="0.85"
                title="Waist to Hip Ratio"
                className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
              />
              <span className="inline-flex items-center px-2 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                ratio
              </span>
            </div>
          </div>
        </div>

        {/* Antenatal & Obstetrics Vitals (LMP, EDD, Gestational Age) */}
        <div className={`mt-3 p-3 rounded-xl border transition-all ${
          isGynae || lmpDate
            ? 'bg-rose-50/50 border-pink-200 shadow-xs'
            : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold ${isGynae ? 'text-pink-900' : 'text-slate-800'}`}>
                Obstetrics &amp; Antenatal Record (LMP • EDD • Gestational Age)
              </span>
              {isGynae && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                  OB-GYN Active
                </span>
              )}
            </div>
            {eddDate && gestationalWeeks && (
              <span className="text-[11px] font-bold text-pink-700 bg-pink-100/90 px-2.5 py-0.5 rounded border border-pink-200">
                GA: {gestationalWeeks}w {gestationalDays || 0}d • EDD: {eddDate}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* LMP */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                LMP (Last Menstrual Period)
              </label>
              <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500 transition-all">
                <input
                  type="date"
                  value={lmpDate}
                  onChange={(e) => setLmpDate(e.target.value)}
                  title="Last Menstrual Period (LMP Date)"
                  className="flex-1 min-w-0 py-2 px-3 text-xs font-bold text-slate-800 outline-none bg-white cursor-pointer"
                />
              </div>
            </div>

            {/* EDD */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                EDD
              </label>
              <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500 transition-all">
                <input
                  type="date"
                  value={eddDate}
                  onChange={(e) => setEddDate(e.target.value)}
                  title="Estimated Due Date (EDD Date)"
                  className="flex-1 min-w-0 py-2 px-3 text-xs font-bold text-slate-800 outline-none bg-white cursor-pointer"
                />
              </div>
            </div>

            {/* Gestational Age */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Gestational Age (at consultation)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500 transition-all">
                  <input
                    type="text"
                    value={gestationalWeeks}
                    onChange={(e) => setGestationalWeeks(e.target.value)}
                    placeholder="Weeks"
                    title="Gestational Age (Weeks)"
                    className="flex-1 min-w-0 py-2 px-2 text-center text-xs font-bold text-slate-800 outline-none"
                  />
                  <span className="inline-flex items-center px-2 py-2 bg-slate-50 border-l border-slate-100 text-[11px] font-semibold text-slate-500 select-none">
                    wks
                  </span>
                </div>
                <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500 transition-all">
                  <input
                    type="text"
                    value={gestationalDays}
                    onChange={(e) => setGestationalDays(e.target.value)}
                    placeholder="Days"
                    title="Gestational Age (Days)"
                    className="flex-1 min-w-0 py-2 px-2 text-center text-xs font-bold text-slate-800 outline-none"
                  />
                  <span className="inline-flex items-center px-2 py-2 bg-slate-50 border-l border-slate-100 text-[11px] font-semibold text-slate-500 select-none">
                    days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

