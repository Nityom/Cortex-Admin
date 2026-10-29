'use client';

import React from 'react';

interface PrescriptionHistorySectionProps {
  value: string;
  onChange: (val: string) => void;
  onCollapse?: () => void;
}

const COMMON_CHIPS = [
  'HTN',
  'Type 2 Diabetes',
  'Hypothyroidism',
  'Asthma',
  'CAD / IHD',
  'Previous Surgery',
  'NKDA (No Drug Allergies)',
];

export default function PrescriptionHistorySection({
  value,
  onChange,
  onCollapse,
}: PrescriptionHistorySectionProps) {
  const handleAddPrompt = () => {
    const item = prompt('Add Medical / Surgical History item:');
    if (item && item.trim()) {
      onChange(value ? `${value}, ${item.trim()}` : item.trim());
    }
  };

  const handleChipClick = (chip: string) => {
    if (!value.includes(chip)) {
      onChange(value ? `${value}, ${chip}` : chip);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            History
          </label>
          <span className="text-[11px] text-slate-400">Medical / Surgical / Family history</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="text-[11px] font-bold text-slate-500 hover:text-teal-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition cursor-pointer"
              title="Minimize / Collapse Medical History"
            >
              — Collapse
            </button>
          )}
          <button
            type="button"
            onClick={handleAddPrompt}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs transition cursor-pointer"
            title="Add History item"
          >
            +
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Record patient medical, surgical, allergy and drug history (e.g. Hypertension 5 yrs on Telmisartan, Type 2 Diabetes, NKDA, Previous appendectomy 2021)..."
        className="w-full min-h-[90px] p-3 text-sm leading-relaxed border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-2xs outline-none"
      />

      {/* History Quick-Select Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Quick Add:
        </span>
        {COMMON_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
          >
            +{chip}
          </button>
        ))}
      </div>
    </div>
  );
}
