'use client';

import React from 'react';
import { Save, Printer, Mail } from 'lucide-react';

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
                    ? 'p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                    : 'p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="doctor_selection_radio"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">{doc.name}</p>
                    <p className="text-[10px] text-blue-700 font-semibold">
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
                  ? 'px-2.5 py-1 rounded text-xs font-semibold transition bg-blue-600 text-white shadow-xs cursor-pointer'
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
                  ? 'px-2.5 py-1 rounded text-xs font-semibold transition bg-blue-600 text-white shadow-xs cursor-pointer'
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
            className="flex-1 px-8 py-3.5 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
            className="flex-1 px-8 py-3.5 bg-purple-600 text-white text-base font-bold rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:ring-offset-2 disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            Print Prescription
          </button>

          {onEmailPrescription && (
            <button
              type="button"
              onClick={onEmailPrescription}
              disabled={loading || saving}
              className="px-6 py-3.5 bg-teal-700 text-white text-base font-bold rounded-xl hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-300 focus:ring-offset-2 disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-5 h-5" />
              Email Rx
            </button>
          )}
        </div>
      </div>
    </>
  );
}

