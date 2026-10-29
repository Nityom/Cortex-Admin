'use client';

import React from 'react';
import { Edit2, Undo2 } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';

interface PrescriptionFindingsSectionProps {
  value: string;
  onChange: (val: string) => void;
}

export default function PrescriptionFindingsSection({
  value,
  onChange,
}: PrescriptionFindingsSectionProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          Findings
        </label>
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            title="Edit Findings"
            className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <SectionTemplatePicker
            sectionKey="findings"
            sectionTitle="Findings"
            currentValue={value}
            align="left"
            onApplyPreset={(val) => onChange(value ? value + '\n' + val : val)}
          />
          <button
            type="button"
            title="Reset / Clear Findings"
            className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            onClick={() => onChange('')}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Clinical findings, general examination, range of motion, swelling, tenderness, systemic signs..."
        className="w-full p-3 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-teal-500 outline-none"
      />
    </div>
  );
}

