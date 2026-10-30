'use client';

import React, { useState } from 'react';
import {
  Printer,
  CheckSquare,
  Square,
  X,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  FileText,
  Mail,
} from 'lucide-react';
import PrescriptionLivePreview from './PrescriptionLivePreview';

interface PrescriptionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPrint: (enabledSections: Record<string, boolean>) => void;
  form: any;
}

interface ChecklistItem {
  key: string;
  label: string;
  desc: string;
}

const PRINT_SECTIONS_CHECKLIST: ChecklistItem[] = [
  { key: 'vitals', label: 'Vitals Sequentially Arranged', desc: 'BP, Pulse, SpO₂, Temp, Height, Weight, BMI, LMP, EDD, Gestational Age' },
  { key: 'complaints', label: 'Chief Complaints', desc: 'Reported symptoms & onset history' },
  { key: 'diagnosis', label: 'Diagnosis / Conditions', desc: 'Snomed / ICD mapped clinical diagnoses' },
  { key: 'history', label: 'Medical & Surgical History', desc: 'Chronic diseases, allergies & past surgery' },
  { key: 'findings', label: 'Clinical Findings & Examination', desc: 'Physical and systemic exam findings' },
  { key: 'drawing_board', label: 'Clinical Sketch / Drawing Board', desc: 'Anatomical sketch or diagram annotation' },
  { key: 'medicines', label: 'Prescribed Medicines Table', desc: '℞ Medicines, dosage, timing & frequency' },
  { key: 'clinical_notes', label: 'Clinical Advice, Diet & Investigations', desc: 'Special advice, diet recommendations & investigations' },
  { key: 'next_visit', label: 'Follow-Up / Next Visit Date', desc: 'Return schedule and elapsed days calculation' },
  { key: 'signature', label: 'Doctor Signature Image', desc: 'Official digital signature image and doctor name' },
];

export const RX_PRINT_SECTIONS_STORAGE_KEY = 'cortex_rx_print_enabled_sections';

export const DEFAULT_PRINT_ENABLED_SECTIONS: Record<string, boolean> = {
  vitals: true,
  complaints: true,
  diagnosis: true,
  history: true,
  findings: true,
  drawing_board: true,
  medicines: true,
  clinical_notes: true,
  next_visit: true,
  signature: true,
};

export default function PrescriptionPrintModal({
  isOpen,
  onClose,
  onConfirmPrint,
  form,
}: PrescriptionPrintModalProps) {
  const [localEnabledSections, setLocalEnabledSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(RX_PRINT_SECTIONS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return {
              ...DEFAULT_PRINT_ENABLED_SECTIONS,
              ...parsed,
            };
          }
        }
      } catch {}
    }
    return DEFAULT_PRINT_ENABLED_SECTIONS;
  });

  const enabledSections: Record<string, boolean> = form?.enabledPrintSections || localEnabledSections;

  const setEnabledSections = (
    updaterOrVal:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => {
    if (form?.saveEnabledPrintSections) {
      form.saveEnabledPrintSections(updaterOrVal);
    } else {
      setLocalEnabledSections((prev) => {
        const next =
          typeof updaterOrVal === 'function' ? updaterOrVal(prev) : updaterOrVal;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              RX_PRINT_SECTIONS_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch {}
        }
        return next;
      });
    }
  };

  const orderedChecklist = React.useMemo(() => {
    const rawOrder: string[] = form?.rxSectionOrder || [];
    const itemMap = new Map(PRINT_SECTIONS_CHECKLIST.map((item) => [item.key, item]));
    const result: ChecklistItem[] = [];
    for (const key of rawOrder) {
      if (key === 'procedure') continue;
      const item = itemMap.get(key);
      if (item) {
        result.push(item);
        itemMap.delete(key);
      }
    }
    // Append any remaining items
    itemMap.forEach((item) => result.push(item));
    return result;
  }, [form?.rxSectionOrder]);

  if (!isOpen) return null;

  const toggleSection = (key: string) => {
    setEnabledSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    const updated: Record<string, boolean> = {};
    orderedChecklist.forEach((s) => {
      updated[s.key] = true;
    });
    setEnabledSections(updated);
  };

  const handleMedicinesOnly = () => {
    const updated: Record<string, boolean> = {};
    orderedChecklist.forEach((s) => {
      updated[s.key] = s.key === 'medicines' || s.key === 'signature';
    });
    setEnabledSections(updated);
  };

  const selectedCount = Object.values(enabledSections).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                Print Prescription & Section Customizer
              </h2>
              <p className="text-[11px] text-slate-300">
                Choose which sections to print and assure print order before generating letterhead
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Split 2-Column Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          {/* Left Panel: Checklist with Sticky Actions */}
          <div className="col-span-12 lg:col-span-4 h-full min-h-0 flex flex-col overflow-hidden bg-slate-50">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-white/80 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
                  Sections to Print ({selectedCount}/{orderedChecklist.length})
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2 py-0.5 rounded font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 cursor-pointer transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleMedicinesOnly}
                    className="px-2 py-0.5 rounded font-semibold text-slate-600 hover:bg-slate-200 border border-slate-300 cursor-pointer transition"
                  >
                    Rx Only
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Checkboxes control what appears on the printout. Unchecked sections are completely omitted.
              </p>

              {/* Dynamic Order Pill Banner */}
              <div className="p-2 bg-teal-50/80 border border-teal-200 rounded-lg text-[11px] text-teal-900 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <strong className="font-bold">Dynamic Print Sequence:</strong> Arranged in your custom order.
                </div>
              </div>
            </div>

            {/* Scrollable Checklist Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2">
              {orderedChecklist.map((item) => {
                const isChecked = enabledSections[item.key] !== false;
                return (
                  <label
                    key={item.key}
                    onClick={() => toggleSection(item.key)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-white border-teal-400 shadow-2xs'
                        : 'bg-slate-100/70 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 text-teal-600">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-teal-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </label>
                );
              })}

              {/* Exclusion Notice */}
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-tight">
                  <strong>Strict Exclusions:</strong> Doctor Notes and Treatment Done are kept private and never printed.
                </span>
              </div>
            </div>

            {/* Sticky Bottom Actions Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white shadow-lg shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onConfirmPrint(enabledSections)}
                  className="flex-1 py-2.5 px-3 sm:px-4 bg-[#7B1828] hover:bg-[#621320] active:scale-[0.99] text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Prescription ({selectedCount})</span>
                </button>
                {form?.handleOpenEmailModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      form.handleOpenEmailModal();
                    }}
                    className="py-2.5 px-3.5 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Send prescription via email to patient"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email Rx</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-1.5 px-3 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Right Panel: Fully Scrollable Live Letterhead Preview */}
          <div className="col-span-12 lg:col-span-8 h-full min-h-0 flex flex-col overflow-hidden bg-slate-200/80">
            {/* Top Bar for Preview */}
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-300 flex items-center justify-between text-xs font-bold text-slate-700 shrink-0">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-700" />
                <span>Live Print Preview (Exact A4 Output Representation)</span>
              </span>
              <span className="text-[11px] font-semibold text-teal-700 hidden sm:inline">
                Scroll down to inspect full sheet • Live updates
              </span>
            </div>

            {/* Scrollable Viewport with Bottom Padding */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 w-full">
              <div className="w-full max-w-3xl mx-auto pb-20">
                <PrescriptionLivePreview
                  formData={form.formData}
                  patientReferenceNumber={form.formData.reference_number || form.patientReferenceNumber}
                  selectedDoctorName={form.selectedDoctorName}
                  availableDoctors={form.availableDoctors}
                  includeSignature={enabledSections.signature !== false}
                  medicines={form.medicines}
                  handlePrintablePrescription={() => onConfirmPrint(enabledSections)}
                  loading={false}
                  saving={false}
                  diagnosesList={form.diagnosesList}
                  complaintsList={form.complaintsList}
                  findingsText={form.findingsText}
                  dietExercise={form.dietExercise}
                  procedureAdvice={form.procedureAdvice}
                  referralDocName={form.referralDocName}
                  referralSpeciality={form.referralSpeciality}
                  referralPhone={form.referralPhone}
                  drawingDataUrl={form.drawingDataUrl}
                  bpSystolic={form.bpSystolic}
                  bpDiastolic={form.bpDiastolic}
                  pulseVal={form.pulseVal}
                  heightVal={form.heightVal}
                  weightVal={form.weightVal}
                  spo2Val={form.spo2Val}
                  tempVal={form.tempVal}
                  bmiVal={form.bmiVal}
                  lmpDate={form.lmpDate}
                  eddDate={form.eddDate}
                  gestationalWeeks={form.gestationalWeeks}
                  gestationalDays={form.gestationalDays}
                  rxSectionOrder={form.rxSectionOrder}
                  enabledSections={enabledSections}
                  isModalPreview={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
