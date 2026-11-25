'use client';

import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { getFollowupDayInfo } from '@/lib/prescriptionUtils';

interface PrescriptionNextVisitSectionProps {
  followupCount: string;
  setFollowupCount: (count: string) => void;
  followupUnit: 'Days' | 'Weeks' | 'Months';
  setFollowupUnit: (unit: 'Days' | 'Weeks' | 'Months') => void;
  followupDate: string;
  onUpdateFollowupDate: (date: string) => void;
}

export default function PrescriptionNextVisitSection({
  followupCount,
  setFollowupCount,
  followupUnit,
  setFollowupUnit,
  followupDate,
  onUpdateFollowupDate,
}: PrescriptionNextVisitSectionProps) {
  const calculateAndSetDate = (countStr: string, unit: 'Days' | 'Weeks' | 'Months') => {
    const num = parseInt(countStr, 10);
    if (!isNaN(num) && num > 0) {
      const d = new Date();
      if (unit === 'Days') d.setDate(d.getDate() + num);
      else if (unit === 'Weeks') d.setDate(d.getDate() + num * 7);
      else if (unit === 'Months') d.setMonth(d.getMonth() + num);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      onUpdateFollowupDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleApplyPreset = (count: string, unit: 'Days' | 'Weeks' | 'Months') => {
    setFollowupCount(count);
    setFollowupUnit(unit);
    calculateAndSetDate(count, unit);
  };

  const dayInfo = getFollowupDayInfo(followupDate);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      {/* Quick Interval Chips */}
      <div className="hidden sm:flex items-center justify-end gap-1.5 text-xs mb-3">
        <span className="text-slate-400 font-medium mr-1">Quick:</span>
        {[
          { label: '3 Days', count: '3', unit: 'Days' as const },
          { label: '5 Days', count: '5', unit: 'Days' as const },
          { label: '1 Week', count: '1', unit: 'Weeks' as const },
          { label: '10 Days', count: '10', unit: 'Days' as const },
          { label: '15 Days', count: '15', unit: 'Days' as const },
          { label: '1 Month', count: '1', unit: 'Months' as const },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handleApplyPreset(preset.count, preset.unit)}
            className="px-2 py-0.5 rounded border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 text-[11px] font-semibold transition cursor-pointer"
          >
            +{preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-600 font-semibold">After</span>
        <input
          type="number"
          min="1"
          value={followupCount}
          onChange={(e) => {
            const count = e.target.value;
            setFollowupCount(count);
            calculateAndSetDate(count, followupUnit);
          }}
          className="w-20 p-2 border border-slate-300 rounded-lg text-center font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          {(['Days', 'Weeks', 'Months'] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => {
                setFollowupUnit(unit);
                calculateAndSetDate(followupCount, unit);
              }}
              className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition cursor-pointer ${
                followupUnit === unit
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {unit}
            </button>
          ))}
        </div>

        <span className="text-slate-400 font-semibold">Or Pick Date:</span>

        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3.5 py-2 bg-slate-50 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <input
            type="date"
            value={followupDate}
            onChange={(e) => onUpdateFollowupDate(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 text-sm focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Prominent Follow-Up Day Card */}
      {dayInfo ? (
        <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/90 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs">
              <span className="text-[10px] uppercase leading-none font-medium text-emerald-100">{dayInfo.dayNameEn.slice(0, 3)}</span>
              <span className="text-sm font-mono leading-none mt-0.5">{dayInfo.formattedDate.slice(0, 2)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-slate-900">
                  {dayInfo.dayNameEn} <span className="text-emerald-700 font-semibold">({dayInfo.dayNameMr})</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-300 shadow-2xs">
                  {dayInfo.formattedDate}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Next consultation scheduled on <strong>{dayInfo.dayNameEn}</strong> ({dayInfo.dayNameMr})</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onUpdateFollowupDate('')}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition cursor-pointer px-2.5 py-1 hover:bg-white rounded-md border border-transparent hover:border-slate-200"
            title="Clear next visit date"
          >
            Clear Date
          </button>
        </div>
      ) : (
        <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span>No follow-up date scheduled. Choose an interval above or select a date in the calendar.</span>
        </div>
      )}
    </div>
  );
}

