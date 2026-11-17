'use client';

import React from 'react';
import {
  FileEdit,
  Save,
  RotateCcw,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  User,
  Pill,
  Stethoscope,
  AlertCircle,
} from 'lucide-react';
import {
  PrescriptionDraftData,
  PrescriptionDraftSummary,
  formatDraftTime,
  getPrescriptionDraft,
} from '@/services/prescriptionDraftService';

interface PrescriptionDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDraft: PrescriptionDraftData | null;
  allDrafts: PrescriptionDraftSummary[];
  onRestoreDraft: (draft: PrescriptionDraftData) => void;
  onSaveCurrentAsDraft: () => void;
  onDeleteDraft: (patientKey: string) => void;
  onClearAllDrafts: () => void;
  currentPatientName?: string;
  hasUnsavedChanges?: boolean;
}

export default function PrescriptionDraftModal({
  isOpen,
  onClose,
  currentDraft,
  allDrafts,
  onRestoreDraft,
  onSaveCurrentAsDraft,
  onDeleteDraft,
  onClearAllDrafts,
  currentPatientName,
  hasUnsavedChanges,
}: PrescriptionDraftModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Prescription Drafts
                {currentDraft && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Active Draft
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Auto-saved drafts ensure you never lose your clinical notes or medicines if you navigate away.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 scrollbar-thin">
          {/* Quick Action: Save Current Draft */}
         

          {/* Section 1: Active Draft for this patient */}
          {currentDraft ? (
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-950">
                    Draft for this patient: {currentDraft.patientName || 'Current Patient'}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {formatDraftTime(currentDraft.timestamp)}
                </span>
              </div>

              {/* Draft snapshot chips */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {Array.isArray(currentDraft.medicines) && currentDraft.medicines.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-semibold text-emerald-900 shadow-2xs">
                    <Pill className="w-3 h-3 text-emerald-600" />
                    {currentDraft.medicines.length} Medicine{currentDraft.medicines.length > 1 ? 's' : ''}
                  </span>
                )}
                {Array.isArray(currentDraft.diagnosesList) && currentDraft.diagnosesList.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-semibold text-emerald-900 shadow-2xs">
                    <Stethoscope className="w-3 h-3 text-emerald-600" />
                    {currentDraft.diagnosesList.length} Diagnosis
                  </span>
                )}
                {Array.isArray(currentDraft.complaintsList) && currentDraft.complaintsList.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-semibold text-emerald-900 shadow-2xs">
                    {currentDraft.complaintsList.length} Complaint{currentDraft.complaintsList.length > 1 ? 's' : ''}
                  </span>
                )}
                {currentDraft.advice && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-semibold text-emerald-900 shadow-2xs">
                    Advice
                  </span>
                )}
                {(currentDraft.bpSystolic || currentDraft.pulseVal || currentDraft.weightVal) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 font-semibold text-emerald-900 shadow-2xs">
                    Vitals: {currentDraft.bpSystolic ? `${currentDraft.bpSystolic}/${currentDraft.bpDiastolic || ''} mmHg ` : ''}
                    {currentDraft.pulseVal ? `${currentDraft.pulseVal} bpm` : ''}
                  </span>
                )}
              </div>

              {/* Medicines preview */}
              {Array.isArray(currentDraft.medicines) && currentDraft.medicines.length > 0 && (
                <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="font-bold text-slate-700">Medicines: </span>
                  {currentDraft.medicines.map((m: any) => `${m.name || ''} (${m.dosage || '1-0-1'})`).filter(Boolean).join(', ')}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onDeleteDraft(currentDraft.patientKey)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRestoreDraft(currentDraft);
                    onClose();
                  }}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore This Draft</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
              No saved draft found for the current patient. Start typing or click &ldquo;Save As Draft&rdquo; above.
            </div>
          )}

          {/* Section 2: Other Recent Drafts List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recent Drafts History ({allDrafts.length})
              </h4>
              {allDrafts.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllDrafts}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition cursor-pointer"
                >
                  Clear All History
                </button>
              )}
            </div>

            {allDrafts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No previous drafts stored in history.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white">
                {allDrafts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate">{d.patientName}</span>
                        {d.age && (
                          <span className="text-[10px] text-slate-400">
                            ({d.age}Y, {d.sex})
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                          {formatDraftTime(d.timestamp)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {d.diagnosisPreview ? `Diagnosis: ${d.diagnosisPreview} • ` : ''}
                        {d.medicinesCount > 0 ? `${d.medicinesCount} med(s): ${d.medicinesPreview}` : 'Draft notes'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const full = getPrescriptionDraft(d.patientKey);
                          if (full) {
                            onRestoreDraft(full);
                            onClose();
                          }
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Restore this draft"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDraft(d.patientKey)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Prescription state is auto-saved locally so you can leave and return anytime.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

