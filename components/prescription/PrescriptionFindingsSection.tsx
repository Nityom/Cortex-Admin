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
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
      <div className="flex items-center justify-between mb-1.5">
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
            align="right"
            onApplyPreset={(val) => {
              const text = typeof val === 'string' ? val : JSON.stringify(val);
              onChange(text.trim());
            }}
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
        sectionKey="findings"
        sectionTitle="Findings"
        category={category}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onApplyTemplate={(val) => {
          const text = typeof val === 'string' ? val : JSON.stringify(val);
          onChange(text.trim());
        }}
        minRows={1}
        placeholder="Clinical findings, general examination, range of motion, swelling, tenderness, systemic signs..."
        className="w-full p-0 text-sm sm:text-base border-none text-slate-800 bg-transparent focus:ring-0 outline-none leading-relaxed"
      />
    </div>
  );
}
