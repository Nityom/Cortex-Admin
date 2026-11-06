'use client';

import React from 'react';
import { Save, Printer, Mail, ArrowRight, Loader2, BookmarkPlus } from 'lucide-react';

export interface DoctorOption {
  id?: string;
  _id?: string;
  name: string;
  signature_url?: string;
}

interface PrescriptionDoctorSignatureCardProps {
  availableDoctors: DoctorOption[];
  selectedDoctorName: string;
  handleDoctorSelect: (name: string) => void;
  includeSignature: boolean;
  setIncludeSignature: (val: boolean) => void;
  loading: boolean;
  saving: boolean;
  isEditMode: boolean;
  handlePrintablePrescription: () => void;
  onEmailPrescription?: () => void;
  onOpenSaveTemplate?: () => void;
  nextReadyPatientName?: string;
  onMoveToNextPatient?: () => void;
  movingToNextPatient?: boolean;
  isOpdVisit?: boolean;
}

export default function PrescriptionDoctorSignatureCard({
  availableDoctors,
  selectedDoctorName,
  handleDoctorSelect,
  includeSignature,
  setIncludeSignature,
  loading,
  saving,
  isEditMode,
  handlePrintablePrescription,
  onEmailPrescription,
  onOpenSaveTemplate,
  nextReadyPatientName,
  onMoveToNextPatient,
  movingToNextPatient = false,
  isOpdVisit = false,
}: PrescriptionDoctorSignatureCardProps) {
  return (
    <>
      {/* Doctor / Signature Selector Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Attending & Signing Doctor
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableDoctors.map((doc) => {
            const isSelected =
              (selectedDoctorName || '').toLowerCase() === doc.name.toLowerCase();
            return (
              <div
                key={doc.id || doc._id || doc.name}
                onClick={() => handleDoctorSelect(doc.name)}
                className={
                  isSelected
                    ? 'p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600'
                    : 'p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="doctor_selection_radio"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 text-emerald-600 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">{doc.name}</p>
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      {doc.name.toLowerCase().includes('shillpa')
                        ? 'Gynecologist & Obstetrician'
                        : 'Orthopaedic & Joint Replacement Surgeon'}
                    </p>
                  </div>
                </div>
                {doc.signature_url && (
                  <img
                    src={
                      doc.signature_url.startsWith('http') || doc.signature_url.startsWith('data:')
                        ? doc.signature_url
                        : '/' + doc.signature_url.replace(/^\//, '')
                    }
                    alt="Sign"
                    className="h-5 max-w-[60px] object-contain opacity-75"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Doctor Signature Print Mode */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600">
            Prescription Print Signature Mode:
          </span>
          <div className="flex items-center gap-1.5 bg-white p-1 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setIncludeSignature(true)}
              className={
                includeSignature
                  ? 'px-2.5 py-1 rounded text-xs font-semibold transition bg-emerald-600 text-white shadow-xs cursor-pointer'
                  : 'px-2.5 py-1 rounded text-xs font-semibold transition text-slate-600 hover:bg-slate-100 cursor-pointer'
              }
            >
              ✓ With Signature
            </button>
            <button
              type="button"
              onClick={() => setIncludeSignature(false)}
              className={
                !includeSignature
                  ? 'px-2.5 py-1 rounded text-xs font-semibold transition bg-emerald-600 text-white shadow-xs cursor-pointer'
                  : 'px-2.5 py-1 rounded text-xs font-semibold transition text-slate-600 hover:bg-slate-100 cursor-pointer'
              }
            >
              Without Sign (Name Only)
            </button>
          </div>
        </div>
      </div>

      {/* Main Submit & Print Action Buttons */}
      <div className="flex flex-col items-center gap-3 mt-8 pb-10">
        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-xl">
          <button
            type="submit"
            disabled={loading || saving}
            className="svasth-action svasth-action-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading
              ? 'Saving...'
              : saving
              ? 'Saving Prescription...'
              : isEditMode
              ? 'Update Prescription'
              : 'Save Prescription'}
          </button>

          <button
            type="button"
            onClick={handlePrintablePrescription}
            disabled={loading || saving}
            className="svasth-action svasth-action-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            Print Prescription
          </button>

          {onOpenSaveTemplate && (
            <button
              type="button"
              onClick={onOpenSaveTemplate}
              disabled={loading || saving}
              className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
              title="Save entire prescription as master reusable template"
            >
              <BookmarkPlus className="w-4 h-4 text-purple-600" />
              <span>Save as Template</span>
            </button>
          )}

          {onEmailPrescription && (
            <button
              type="button"
              onClick={onEmailPrescription}
              disabled={loading || saving}
              className="svasth-action svasth-action-tertiary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              Email Rx
            </button>
          )}
        </div>
        {isOpdVisit && (
          nextReadyPatientName && onMoveToNextPatient ? (
            <button
              type="button"
              onClick={onMoveToNextPatient}
              disabled={loading || saving || movingToNextPatient}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-bold text-sky-900 shadow-xs transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {movingToNextPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {movingToNextPatient ? 'Saving and moving…' : `Move to next patient: ${nextReadyPatientName}`}
            </button>
          ) : (
            <p className="text-xs font-medium text-slate-500">No other Ready patients for this doctor today.</p>
          )
        )}
      </div>
    </>
  );
}

