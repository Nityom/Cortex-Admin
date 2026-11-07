'use client';

import React from 'react';
import { Edit2, Undo2 } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import AutoResizeTextarea from './AutoResizeTextarea';

interface PrescriptionFindingsSectionProps {
  value: string;
  onChange: (val: string) => void;
  onRestorePreviousFindings?: () => void;
  category?: string;
}

export default function PrescriptionFindingsSection({
  value,
  onChange,
  onRestorePreviousFindings,
  category,
}: PrescriptionFindingsSectionProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
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
            category={category}
            align="left"
            onApplyPreset={(val) => onChange(value ? value + '\n' + val : val)}
          />
          <button
            type="button"
            title="Restore Previous Prescription Findings"
            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            onClick={onRestorePreviousFindings || (() => onChange(''))}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <AutoResizeTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minRows={1}
        placeholder="Clinical findings, general examination, range of motion, swelling, tenderness, systemic signs..."
        className="w-full p-2.5 text-sm sm:text-base border border-slate-200 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed"
      />
    </div>
  );
}
