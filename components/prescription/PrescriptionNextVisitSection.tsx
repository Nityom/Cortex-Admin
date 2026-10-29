'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

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
      onUpdateFollowupDate(d.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          Next Visit
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-500 font-semibold">No of</span>
        <input
          type="number"
          min="1"
          value={followupCount}
          onChange={(e) => {
            const count = e.target.value;
            setFollowupCount(count);
            calculateAndSetDate(count, followupUnit);
          }}
          className="w-16 p-2 border border-slate-200 rounded text-center font-bold text-slate-800 outline-none"
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
              className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                followupUnit === unit
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {unit}
            </button>
          ))}
        </div>

        <span className="text-slate-400 font-semibold">Or</span>

        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={followupDate}
            onChange={(e) => onUpdateFollowupDate(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

