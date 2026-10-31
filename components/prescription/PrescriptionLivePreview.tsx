'use client';

import React from 'react';
import { MedicineEntry } from '@/services/prescription';
import { DoctorOption } from './PrescriptionDoctorSignatureCard';
import { hospitalConfig, getDoctorProfile } from '@/config/hospital';

interface PrescriptionLivePreviewProps {
  formData: {
    patientName: string;
    phoneNumber?: string;
    age?: string;
    sex?: string;
    date?: string;
    reference_number?: string;
    cc?: string;
    mh?: string;
    de?: string;
    advice?: string;
    investigation?: string;
    followupDate?: string;
    bp?: string;
    spo2?: string;
    height?: string;
    weight?: string;
    pulse?: string;
    temperature?: string;
    [key: string]: any;
  };
  patientReferenceNumber?: string;
  selectedDoctorName: string;
  availableDoctors: DoctorOption[];
  includeSignature: boolean;
  medicines: MedicineEntry[];
  handlePrintablePrescription: () => void;
  loading: boolean;
  saving: boolean;
  diagnosesList?: { id?: string; diagnosis: string;[key: string]: any }[];
  complaintsList?: { id?: string; complaint: string;[key: string]: any }[];
  findingsText?: string;
  dietExercise?: string;
  procedureAdvice?: string;
  referralDocName?: string;
  referralSpeciality?: string;
  referralPhone?: string;
  drawingDataUrl?: string;
  bpSystolic?: string;
  bpDiastolic?: string;
  bpVal?: string;
  pulseVal?: string;
  heightVal?: string;
  weightVal?: string;
  spo2Val?: string;
  tempVal?: string;
  bmiVal?: string;
  lmpDate?: string;
  eddDate?: string;
  gestationalWeeks?: string;
  gestationalDays?: string;
  rxSectionOrder?: string[];
  enabledSections?: Record<string, boolean>;
  isModalPreview?: boolean;
}

// Helpers
function formatPrescriptionDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatFollowup(followupDate?: string, prescriptionDate?: string): string {
  if (!followupDate) return '';
  const formatted = formatPrescriptionDate(followupDate);
  if (!prescriptionDate) return formatted;
  const pDate = new Date(prescriptionDate);
  const fDate = new Date(followupDate);
  const diffDays = Math.round((fDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    return `${formatted} (${diffDays} दिवसानंतर)`;
  }
  return formatted;
}

function getTimingFromDosage(dosage: string): string {
  if (!dosage) return '';
  const clean = dosage.trim().toLowerCase();

  // Standard clinical dosages mapped to Marathi instructions
  if (clean === '1-0-0') return 'सकाळी नाश्त्यानंतर (Morning after breakfast)';
  if (clean === '0-1-0') return 'दुपारी जेवणानंतर (Afternoon after lunch)';
  if (clean === '0-0-1') return 'रात्री जेवणानंतर (Night after dinner)';
  if (clean === '1-0-1') return 'सकाळी नाश्त्यानंतर, रात्री जेवणानंतर';
  if (clean === '1-1-1') return 'सकाळी नाश्त्यानंतर, दुपारी जेवणानंतर, रात्री जेवणानंतर';
  if (clean === '1-1-0') return 'सकाळी नाश्त्यानंतर, दुपारी जेवणानंतर';
  if (clean === '0-1-1') return 'दुपारी जेवणानंतर, रात्री जेवणानंतर';
  if (clean === 'stat') return 'तातडीने (Immediately / Stat)';
  if (clean === 'sos') return 'गरज भासल्यास (As needed / SOS)';

  // General quantity handling (e.g. 2-0-0, 2-0-2, 1/2-0-1/2)
  const parts = dosage.trim().split('-').map((p) => p.trim());
  if (parts.length === 3) {
    const [m, a, n] = parts;
    const segments: string[] = [];
    if (m && m !== '0') {
      segments.push(m === '1' ? 'सकाळी नाश्त्यानंतर' : `${m} - सकाळी नाश्त्यानंतर`);
    }
    if (a && a !== '0') {
      segments.push(a === '1' ? 'दुपारी जेवणानंतर' : `${a} - दुपारी जेवणानंतर`);
    }
    if (n && n !== '0') {
      segments.push(n === '1' ? 'रात्री जेवणानंतर' : `${n} - रात्री जेवणानंतर`);
    }
    if (segments.length > 0) {
      return segments.join(', ');
    }
  }

  return '';
}

const DEFAULT_PRINT_ORDER = [
  'vitals',
  'complaints',
  'diagnosis',
  'history',
  'findings',
  'drawing_board',
  'medicines',
  'clinical_notes',
  'next_visit',
  'signature',
];

export default function PrescriptionLivePreview({
  formData,
  patientReferenceNumber,
  selectedDoctorName,
  availableDoctors,
  includeSignature,
  medicines,
  handlePrintablePrescription,
  loading,
  saving,
  diagnosesList,
  complaintsList,
  findingsText,
  dietExercise,
  procedureAdvice,
  referralDocName,
  referralSpeciality,
  referralPhone,
  drawingDataUrl,
  bpSystolic,
  bpDiastolic,
  bpVal: propBpVal,
  pulseVal,
  heightVal,
  weightVal,
  spo2Val,
  tempVal,
  bmiVal,
  lmpDate,
  eddDate,
  gestationalWeeks,
  gestationalDays,
  rxSectionOrder,
  enabledSections,
  isModalPreview = false,
}: PrescriptionLivePreviewProps) {
  const chiefComplaintText =
    (complaintsList && complaintsList.length > 0
      ? complaintsList.map((c) => c.complaint).filter(Boolean).join(', ')
      : formData.cc)?.trim();

  const medicalHistoryText = formData.mh?.trim();
  const cleanFindingsText = findingsText?.trim();
  const diagnosisText = (
    formData.de ||
    (diagnosesList && diagnosesList.length > 0
      ? diagnosesList.map((d) => d.diagnosis).filter(Boolean).join(', ')
      : '')
  )?.trim();

  const allAdviceText = [formData.advice, procedureAdvice].filter(Boolean).join('\n')?.trim();
  const referralText = referralDocName
    ? `${referralDocName}${referralSpeciality ? ` (${referralSpeciality})` : ''}${referralPhone ? ` - ${referralPhone}` : ''}`
    : '';

  const bpVal = (
    propBpVal ||
    (bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic}` : bpSystolic || bpDiastolic || '') ||
    formData.bp ||
    ''
  )?.trim();
  const spo2 = (spo2Val || formData.spo2)?.trim();
  const height = (heightVal || formData.height)?.trim();
  const weight = (weightVal || formData.weight)?.trim();
  const pulse = (pulseVal || formData.pulse)?.trim();
  const temp = (tempVal || formData.temperature)?.trim();
  const bmi = (bmiVal || formData.bmi)?.trim();
  const lmp = (lmpDate || formData.lmp)?.trim();
  const edd = (eddDate || formData.edd)?.trim();
  const ga = (gestationalWeeks ? `${gestationalWeeks} weeks${gestationalDays ? ` ${gestationalDays} days` : ''}` : formData.gestational_age || '')?.trim();
  const hasVitals = !!(bpVal || spo2 || height || weight || pulse || temp || bmi || lmp || edd || ga);

  const effectiveOrder = rxSectionOrder && rxSectionOrder.length > 0
    ? rxSectionOrder.filter((k) => k !== 'procedure')
    : DEFAULT_PRINT_ORDER;

  // Individual Section Renderers for Dynamic Ordering
  const renderVitals = () => {
    if (enabledSections && enabledSections.vitals === false) return null;
    if (!hasVitals) return null;
    return (
      <div key="vitals" className="flex flex-wrap items-center gap-3 py-1.5 text-xs text-slate-800 border-b border-dashed border-slate-300 bg-slate-50/60 px-2 rounded mt-1">
        <span className="font-black text-black uppercase tracking-wider text-[11px]">
          Vitals:
        </span>
        {bpVal && (
          <span className="inline-flex items-center gap-1">
            <strong>BP:</strong> {bpVal}
            {!bpVal.toLowerCase().includes('mmhg') ? ' mmHg' : ''}
          </span>
        )}
        {pulse && (
          <span className="inline-flex items-center gap-1">
            <strong>Pulse:</strong> {pulse}
            {!String(pulse).includes('/') ? ' /min' : ''}
          </span>
        )}
        {spo2 && (
          <span className="inline-flex items-center gap-1">
            <strong>SpO₂:</strong> {spo2}
            {!String(spo2).includes('%') ? '%' : ''}
          </span>
        )}
        {temp && (
          <span className="inline-flex items-center gap-1">
            <strong>Temp:</strong> {temp}
            {!String(temp).toLowerCase().includes('f') && !String(temp).toLowerCase().includes('c') ? ' °F' : ''}
          </span>
        )}
        {height && (
          <span className="inline-flex items-center gap-1">
            <strong>Height:</strong> {height}
            {!String(height).toLowerCase().includes('cm') ? ' cm' : ''}
          </span>
        )}
        {weight && (
          <span className="inline-flex items-center gap-1">
            <strong>Weight:</strong> {weight}
            {!String(weight).toLowerCase().includes('kg') ? ' kg' : ''}
          </span>
        )}
        {bmi && (
          <span className="inline-flex items-center gap-1">
            <strong>BMI:</strong> {bmi}
          </span>
        )}
        {lmp && (
          <span className="inline-flex items-center gap-1">
            <strong>LMP:</strong> {formatPrescriptionDate(lmp)}
          </span>
        )}
        {edd && (
          <span className="inline-flex items-center gap-1">
            <strong>EDD:</strong> {formatPrescriptionDate(edd)}
          </span>
        )}
        {ga && (
          <span className="inline-flex items-center gap-1">
            <strong>Gestational Age:</strong> {ga}
          </span>
        )}
      </div>
    );
  };

  const renderComplaints = () => {
    if (enabledSections && enabledSections.complaints === false) return null;
    if (!chiefComplaintText) return null;
    return (
      <div key="complaints" className="py-1.5 px-2 bg-slate-50/50 rounded border-b border-slate-200 text-xs flex items-baseline gap-2">
        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider shrink-0">
          Chief Complaints:
        </span>
        <span className="font-semibold text-slate-800">{chiefComplaintText}</span>
      </div>
    );
  };

  const renderHistory = () => {
    if (enabledSections && enabledSections.history === false) return null;
    if (!medicalHistoryText) return null;
    return (
      <div key="history" className="py-1.5 px-2 bg-slate-50/50 rounded border-b border-slate-200 text-xs flex items-baseline gap-2">
        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider shrink-0">
          Medical History:
        </span>
        <span className="font-semibold text-slate-800">{medicalHistoryText}</span>
      </div>
    );
  };

  const renderFindings = () => {
    if (enabledSections && enabledSections.findings === false) return null;
    if (!cleanFindingsText) return null;
    return (
      <div key="findings" className="py-1.5 px-2 bg-slate-50/50 rounded border-b border-slate-200 text-xs flex items-baseline gap-2">
        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider shrink-0">
          Clinical Examination:
        </span>
        <span className="font-semibold text-slate-800">{cleanFindingsText}</span>
      </div>
    );
  };

  const renderDiagnosis = () => {
    if (enabledSections && enabledSections.diagnosis === false) return null;
    if (!diagnosisText) return null;
    return (
      <div key="diagnosis" className="py-2 text-xs sm:text-sm border-b border-slate-300">
        <span className="font-extrabold text-black">Diagnosis: </span>
        <span className="font-bold text-slate-900 uppercase">
          {diagnosisText}
        </span>
      </div>
    );
  };

  const renderDrawingBoard = () => {
    if (enabledSections && enabledSections.drawing_board === false) return null;
    if (!drawingDataUrl || (!drawingDataUrl.startsWith('data:image') && !drawingDataUrl.startsWith('http') && drawingDataUrl.length < 500)) return null;
    return (
      <div key="drawing_board" className="py-2 flex items-center gap-3 border-b border-dashed border-slate-300">
        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider shrink-0">
          Clinical Sketch:
        </span>
        <img
          src={drawingDataUrl}
          alt="Clinical Sketch"
          className="max-h-20 max-w-[180px] object-contain border border-slate-200 rounded bg-white shadow-2xs"
        />
      </div>
    );
  };

  const renderMedicines = () => {
    if (enabledSections && enabledSections.medicines === false) return null;
    return (
      <div key="medicines" className="mt-3">
        <div className="font-serif italic font-bold text-2xl text-slate-900 leading-none mb-1">
          ℞
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-slate-400 text-xs font-bold text-slate-700">
                <th className="py-2 px-1 text-left w-1/2">Medicine</th>
                <th className="py-2 px-2 text-center w-1/5">Dosage</th>
                <th className="py-2 px-2 text-left w-3/10">Timing - Freq. - Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {medicines.length > 0 ? (
                medicines.map((med, index) => (
                  <tr key={index} className="align-top">
                    {/* Medicine Details */}
                    <td className="py-2 px-1">
                      <div className="font-extrabold text-sm text-black tracking-wide uppercase">
                        {index + 1}) &nbsp;{med.name || 'Not specified'}
                      </div>
                      {med.composition && (
                        <div className="text-[11px] text-slate-600 pl-4 mt-0.5">
                          <span className="font-semibold text-slate-500 uppercase">
                            Composition:
                          </span>{' '}
                          {med.composition}
                        </div>
                      )}
                      {(() => {
                        const timingVal = med.timing || getTimingFromDosage(med.dosage);
                        if (!timingVal) return null;
                        return (
                          <div className="text-[11px] text-slate-800 pl-4 mt-0.5">
                            <span className="font-semibold text-slate-500 uppercase">
                              Timing:
                            </span>{' '}
                            {timingVal}
                          </div>
                        );
                      })()}
                      {med.note && (
                        <div className="text-[11px] text-red-700 font-bold underline pl-4 mt-0.5">
                          Note: {med.note}
                        </div>
                      )}
                    </td>

                    {/* Dosage */}
                    <td className="py-2 px-2 text-center font-bold text-sm tracking-wider text-slate-900">
                      {med.dosage ? med.dosage.replace(/-/g, ' — ') : '—'}
                    </td>

                    {/* Timing - Freq - Duration */}
                    <td className="py-2 px-2 text-xs font-semibold text-slate-900">
                      {(() => {
                        const parts: string[] = [];
                        if (med.frequency && med.frequency !== 'Daily')
                          parts.push(med.frequency);
                        if (med.freq_duration) parts.push(med.freq_duration);
                        if (
                          med.duration &&
                          (!med.freq_duration ||
                            (!med.freq_duration
                              .toLowerCase()
                              .includes(med.duration.toLowerCase()) &&
                              !/दिवस|महिना|week|day/i.test(med.freq_duration)))
                        ) {
                          parts.push(`(${med.duration})`);
                        }
                        return (
                          parts.join(' • ') ||
                          med.freq_duration ||
                          med.duration ||
                          med.frequency ||
                          '—'
                        );
                      })()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-slate-400 italic">
                    No medications added yet. Add medicines from the form above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderClinicalNotes = () => {
    if (enabledSections && enabledSections.clinical_notes === false) return null;
    const hasAnyNote = !!(allAdviceText || dietExercise || referralText || formData.investigation);
    if (!hasAnyNote) return null;
    return (
      <div key="clinical_notes" className="py-2 text-xs border-t border-slate-200 mt-3 space-y-1.5">
        {allAdviceText && (
          <div>
            <div className="font-bold text-black uppercase tracking-wider text-[11px]">
              Advice:
            </div>
            <div className="text-slate-800 font-medium whitespace-pre-line mt-0.5">
              {allAdviceText}
            </div>
          </div>
        )}
        {dietExercise && (
          <div className="text-slate-900 font-bold mt-1">
            <span className="font-extrabold mr-1.5">Diet &amp; Exercise:</span>
            <span className="font-normal text-slate-800">{dietExercise}</span>
          </div>
        )}
        {referralText && (
          <div className="text-slate-900 font-bold mt-1">
            <span className="font-extrabold mr-1.5">Referred To:</span>
            <span className="font-normal text-slate-800">{referralText}</span>
          </div>
        )}
        {formData.investigation && (
          <div className="text-slate-900 font-bold mt-1">
            <span className="font-extrabold mr-1.5">फेर चाचणी / Tests :</span>
            <span>{formData.investigation}</span>
          </div>
        )}
      </div>
    );
  };

  const renderNextVisit = () => {
    if (enabledSections && enabledSections.next_visit === false) return null;
    if (!formData.followupDate) return null;
    return (
      <div key="next_visit" className="py-1.5 text-xs text-slate-900 font-bold">
        <span className="font-extrabold mr-1.5">फेरतपासणी (Next Visit):</span>
        <span>{formatFollowup(formData.followupDate, formData.date)}</span>
      </div>
    );
  };

  const renderSignature = () => {
    if (enabledSections && enabledSections.signature === false) return null;
    return (
      <div key="signature" className="pt-3 border-t border-slate-200 flex justify-end">
        <div className="text-center min-w-[150px] shrink-0 pb-1">
          {includeSignature && (
            <div className="mb-1">
              <img
                src={(() => {
                  const docObj = availableDoctors.find(
                    (d) =>
                      d.name.toLowerCase() === (selectedDoctorName || '').toLowerCase()
                  );
                  const sig = docObj?.signature_url;
                  if (!sig)
                    return (selectedDoctorName || '').toLowerCase().includes('anjali')
                      ? '/sign1.png'
                      : '/sign.png';
                  if (
                    sig.startsWith('data:') ||
                    sig.startsWith('http://') ||
                    sig.startsWith('https://')
                  )
                    return sig;
                  return `/${sig.replace(/^\//, '')}`;
                })()}
                alt="Doctor's Signature"
                className="inline-block h-12 max-w-[130px] object-contain"
              />
            </div>
          )}
          <div className="font-bold text-xs sm:text-sm text-slate-900">
            {selectedDoctorName || 'Dr. Vipeen Raut'}
          </div>
          {!includeSignature && (
            <div className="text-[10px] text-slate-400 italic">
              (Signature omitted in print mode)
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={isModalPreview ? 'w-full' : 'mt-12 mb-8'}>
      {!isModalPreview && (
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Prescription Preview</h2>
            <p className="text-xs text-slate-500">
              Exact print representation as printed on hospital letterhead (renders in your custom dynamic order)
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrintablePrescription}
            disabled={loading || saving}
            className="px-4 py-2 bg-[#7B1828] hover:bg-[#621320] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Prescription
          </button>
        </div>
      )}

      {/* Letterhead Container */}
      <div className={`max-w-4xl mx-auto bg-white ${isModalPreview ? 'shadow-xl rounded-xl border border-slate-300 p-5 sm:p-7' : 'shadow-2xl rounded-2xl border border-slate-300 p-6 sm:p-9'} relative overflow-hidden font-sans text-slate-900 transition`}>
        {/* Background Watermark */}
        <img
          src="/cortex_logo.png"
          alt="Watermark"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 opacity-[0.08] pointer-events-none select-none"
        />

        {/* Top Meta Row */}
        <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono border-b border-slate-200 pb-1.5 mb-3">
          <span>
            {formData.date
              ? `${formatPrescriptionDate(formData.date)} ${new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}`
              : 'Live Preview'}
          </span>
          <span className="font-bold text-slate-700">Svasth HMS</span>
        </div>

        {/* Header Area */}
        <div className="flex justify-between items-start pb-3 border-b-2 border-slate-800 gap-4">
          <div className="flex items-center pt-1">
            <img
              src={hospitalConfig.branding.logoUrl}
              alt={hospitalConfig.name}
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="text-right">
            {(() => {
              const activeDoc = getDoctorProfile(selectedDoctorName);
              return (
                <>
                  <h1 className="text-xl sm:text-2xl font-black text-[#7B1828] tracking-tight leading-tight">
                    {activeDoc?.name || selectedDoctorName || 'Consulting Physician'}
                  </h1>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5">
                    {activeDoc?.degrees}
                  </div>
                  {activeDoc?.registrationNumber && (
                    <div className="text-[11px] text-slate-500">Reg. No. {activeDoc.registrationNumber}</div>
                  )}
                  {activeDoc?.designation && (
                    <div className="text-xs font-semibold text-slate-800">
                      {activeDoc.designation}
                    </div>
                  )}
                  <div className="text-xs font-semibold text-slate-800">
                    {activeDoc?.specialty === 'gynecology'
                      ? 'Maternity, Infertility & Women Care Specialist'
                      : activeDoc?.designation || hospitalConfig.tagline}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Patient Bar */}
        <div className="flex flex-wrap justify-between items-center py-2 text-xs sm:text-sm font-bold text-black border-b border-slate-300">
          <div className="flex-1 min-w-[240px]">
            <span>{formData.reference_number || patientReferenceNumber || 'CRX0001'}</span>
            {formData.token ? (
              <span className="ml-1 px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded border border-teal-200 text-[10px] font-black">
                Token #{formData.token}
              </span>
            ) : null}{' '}
            :{' '}
            <span>MR./MS. {(formData.patientName || 'PATIENT NAME').toUpperCase()}</span>{' '}
            <span className="font-medium text-slate-700">
              ({formData.age ? `${formData.age} Y` : '—'}
              {formData.age && formData.sex ? ', ' : ''}
              {formData.sex || ''})
            </span>
            {formData.phoneNumber ? (
              <span className="font-normal text-slate-600"> - Ph: {formData.phoneNumber}</span>
            ) : (
              ''
            )}
          </div>
          <div className="whitespace-nowrap font-bold text-slate-900">
            Date:{' '}
            {formatPrescriptionDate(formData.date || new Date().toISOString().slice(0, 10))}
          </div>
        </div>

        {/* Dynamic Medical Body Sections in Custom User Order */}
        <div className="space-y-1.5 mt-2">
          {effectiveOrder.map((sectionKey) => {
            switch (sectionKey) {
              case 'vitals':
                return renderVitals();
              case 'complaints':
                return renderComplaints();
              case 'history':
                return renderHistory();
              case 'findings':
                return renderFindings();
              case 'diagnosis':
                return renderDiagnosis();
              case 'drawing_board':
                return renderDrawingBoard();
              case 'medicines':
                return renderMedicines();
              case 'clinical_notes':
                return renderClinicalNotes();
              case 'next_visit':
                return renderNextVisit();
              case 'signature':
                return renderSignature();
              default:
                return null;
            }
          })}
        </div>

        {/* Validity Note */}
        <div className="text-rose-700 font-extrabold text-[11px] tracking-wide mt-3 pt-2 border-t border-slate-200">
          * Prescription is valid for 30 days only
        </div>

        {/* Bottom Schedule Banner */}
        <div className="mt-4 pt-3 border-t-2 border-slate-300 text-center">
          {hospitalConfig.schedule.clinicDetails && (
            <div className="flex items-center justify-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-[#7B1828] text-white text-[11px] font-bold px-3 py-0.5 rounded-full">
                {hospitalConfig.schedule.clinicDetails.split('•')[0]?.trim()}
              </span>
              <span className="text-xs font-bold text-slate-900">
                {hospitalConfig.schedule.clinicDetails.split('•')[1]?.trim() || ''}
              </span>
            </div>
          )}

          <div className="text-xs sm:text-sm font-extrabold text-black">
            {hospitalConfig.tagline}
          </div>

          <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
            <span className="font-bold text-[#7B1828]">OPD Time : </span>
            {hospitalConfig.schedule.opdTimings}
          </div>

          {hospitalConfig.schedule.sundayStatus && (
            <div className="text-[11px] font-bold text-[#7B1828] mt-0.5">{hospitalConfig.schedule.sundayStatus}</div>
          )}

          <div className="text-[10px] text-slate-600 mt-1">
            {hospitalConfig.address.fullFormatted} &nbsp;|&nbsp; Ph. : {hospitalConfig.contacts.phones.join(', ')}
          </div>

          <div className="h-1 bg-gradient-to-r from-purple-800 via-[#7B1828] to-purple-800 rounded mt-2"></div>
        </div>

        {/* Centered Powered by Svasth-HMS Line at Bottom */}
        {hospitalConfig.branding.poweredBySvasth && (
          <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 text-[10px] text-slate-500 text-center select-none">
            <span>Powered by</span>
            <img src={hospitalConfig.branding.svasthLogoUrl} alt="Svasth HMS" className="h-3 w-auto inline-block" />
            <strong className="text-teal-700 font-extrabold">Svasth-HMS</strong>
          </div>
        )}
      </div>
    </div>
  );
}
