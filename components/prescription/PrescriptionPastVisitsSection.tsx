'use client';

import React, { useState, useEffect } from 'react';
import { History, Calendar, Clock, ArrowDownToLine, Pill, Activity, ChevronDown, ChevronUp, AlertCircle, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

interface PrescriptionPastVisitsSectionProps {
  patientPhone?: string;
  patientName?: string;
  patientReference?: string;
  currentPrescriptionId?: string | null;
  onLoadPastPrescription: (pastRx: any) => void;
}

export default function PrescriptionPastVisitsSection({
  patientPhone,
  patientName,
  patientReference,
  currentPrescriptionId,
  onLoadPastPrescription,
}: PrescriptionPastVisitsSectionProps) {
  const [pastVisits, setPastVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  useEffect(() => {
    const hasIdentifier = Boolean(
      (patientPhone && patientPhone.trim().length >= 4) ||
      (patientReference && patientReference.trim().length >= 2) ||
      (patientName && patientName.trim().length >= 2)
    );

    if (!hasIdentifier || !convexClient) {
      setPastVisits([]);
      return;
    }

    let isMounted = true;
    const fetchVisits = async () => {
      setLoading(true);
      try {
        const all = await convexClient.query(api.prescriptions.list);
        if (Array.isArray(all) && isMounted) {
          const targetRef = patientReference ? patientReference.trim().toUpperCase().replace(/^CH/i, 'CRX') : null;
          const phoneClean = (patientPhone || '').replace(/\D/g, '').slice(-10);
          const targetNormName = patientName ? patientName.toLowerCase().replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, '').replace(/[^a-z0-9]/g, '') : '';

          const filtered = all.filter((p: any) => {
            if (currentPrescriptionId && (String(p._id) === currentPrescriptionId || String(p.id) === currentPrescriptionId)) {
              return false;
            }
            const pRef = p.reference_number ? p.reference_number.trim().toUpperCase().replace(/^CH/i, 'CRX') : null;
            const pPhoneClean = (p.phone_number || '').replace(/\D/g, '').slice(-10);
            const pNormName = p.patient_name ? p.patient_name.toLowerCase().replace(/^(mr|mrs|ms|miss|dr|smt|shri)\.?\s+/i, '').replace(/[^a-z0-9]/g, '') : '';

            if (targetRef) {
              if (pRef) return pRef === targetRef;
              if (phoneClean && pPhoneClean && phoneClean === pPhoneClean) {
                return Boolean(targetNormName && pNormName && (targetNormName === pNormName || targetNormName.includes(pNormName) || pNormName.includes(targetNormName)));
              }
              return false;
            }

            if (targetNormName && phoneClean) {
              const phoneMatches = pPhoneClean && phoneClean === pPhoneClean;
              const nameMatches = pNormName && (targetNormName === pNormName || targetNormName.includes(pNormName) || pNormName.includes(targetNormName));
              return Boolean(phoneMatches && nameMatches);
            }

            if (targetNormName) return targetNormName === pNormName || targetNormName.includes(pNormName) || pNormName.includes(targetNormName);
            if (phoneClean) return phoneClean === pPhoneClean;
            return false;
          });

          filtered.sort((a: any, b: any) => {
            const tA = a._creationTime || new Date(a.prescription_date || 0).getTime();
            const tB = b._creationTime || new Date(b.prescription_date || 0).getTime();
            return tB - tA;
          });

          setPastVisits(filtered);
          if (filtered.length > 0) {
            setExpandedVisitId(String(filtered[0]._id || (filtered[0] as any).id));
          }
        }
      } catch (err) {
        console.warn('Could not fetch past visits:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVisits();
    return () => {
      isMounted = false;
    };
  }, [patientPhone, patientName, patientReference, currentPrescriptionId]);

  const safeParseArray = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const p = JSON.parse(val);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const hasIdentifier = Boolean(
    (patientPhone && patientPhone.trim().length >= 4) ||
    (patientReference && patientReference.trim().length >= 2) ||
    (patientName && patientName.trim().length >= 2)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mt-6">
      {/* Header Bar */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Patient Consultation History & Past Visits
              </h3>
              {pastVisits.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950">
                  {pastVisits.length} {pastVisits.length === 1 ? 'Visit' : 'Visits'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {patientName ? `Reviewing history for ${patientName}` : 'Quickly review and load past clinical records, diagnoses, and medications'}
            </p>
          </div>
        </div>

        {pastVisits.length > 0 && (
          <div className="text-xs text-slate-300 font-medium">
            Sorted newest first
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5">
        {!hasIdentifier ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300 opacity-60" />
            <p className="text-sm font-semibold text-slate-600">No Patient Selected</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Enter a patient phone number, UHID, or select a patient from OPD queue to immediately see their past visits here.
            </p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Loading past visits...</p>
          </div>
        ) : pastVisits.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-slate-100">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Previous Visits Recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              This patient has no recorded prior prescriptions in the system. New prescriptions will automatically appear here on future visits.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastVisits.map((visit: any, index: number) => {
              const visitId = String(visit._id || visit.id);
              const isExpanded = expandedVisitId === visitId;
              const meds = safeParseArray(visit.medicines);
              const vitals = visit.vitals || {};
              const dateDisplay = visit.prescription_date
                ? formatDate(visit.prescription_date)
                : 'Date N/A';

              return (
                <div
                  key={visitId}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-emerald-300/80 bg-white shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  {/* Collapsed Header Summary */}
                  <div
                    onClick={() => setExpandedVisitId(isExpanded ? null : visitId)}
                    className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center font-bold text-xs shrink-0">
                        #{pastVisits.length - index}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dateDisplay}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            · {visit.doctor_name || 'Doctor Consultation'}
                          </span>
                          {index === 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Most Recent
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 truncate mt-0.5">
                          {visit.diagnosis ? (
                            <span className="font-semibold text-slate-700">Diagnosis: {visit.diagnosis}</span>
                          ) : visit.chief_complaint ? (
                            <span>Complaint: {visit.chief_complaint}</span>
                          ) : (
                            <span className="text-slate-400 italic">Consultation visit</span>
                          )}
                          {meds.length > 0 && (
                            <span className="text-slate-500 ml-2 font-normal">
                              ({meds.length} {meds.length === 1 ? 'medicine' : 'medicines'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadPastPrescription(visit);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Copy all details from this visit into active prescription"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        Load This Visit
                      </button>

                      <button
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Visit Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/40 space-y-3.5 text-xs">
                      {/* Vitals & Obstetrics Highlights */}
                      {(vitals.bp_systolic || vitals.pulse || vitals.weight || vitals.lmp || vitals.edd || vitals.gestational_age) && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-emerald-600" /> Recorded Vitals & Antenatal
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-slate-700">
                            {vitals.bp_systolic && vitals.bp_diastolic && (
                              <span><strong>BP:</strong> {vitals.bp_systolic}/{vitals.bp_diastolic} mmHg</span>
                            )}
                            {vitals.pulse && <span><strong>Pulse:</strong> {vitals.pulse} bpm</span>}
                            {vitals.weight && <span><strong>Weight:</strong> {vitals.weight} kg</span>}
                            {vitals.height && <span><strong>Height:</strong> {vitals.height} cm</span>}
                            {vitals.lmp && <span><strong>LMP:</strong> {vitals.lmp}</span>}
                            {vitals.edd && <span><strong>EDD:</strong> {vitals.edd}</span>}
                            {vitals.gestational_age && (
                              <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                GA: {vitals.gestational_age}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Chief Complaints & Findings */}
                      {(visit.chief_complaint || visit.findings || visit.oral_exam_notes) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {visit.chief_complaint && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                              <span className="font-bold text-slate-700 block mb-1">Chief Complaints:</span>
                              <p className="text-slate-600 whitespace-pre-wrap">{visit.chief_complaint}</p>
                            </div>
                          )}
                          {(visit.findings || visit.oral_exam_notes) && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                              <span className="font-bold text-slate-700 block mb-1">Clinical Findings:</span>
                              <p className="text-slate-600 whitespace-pre-wrap">{visit.findings || visit.oral_exam_notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prescribed Medicines */}
                      {meds.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
                          <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescribed Medicines ({meds.length})
                          </div>
                          <div className="divide-y divide-slate-100">
                            {meds.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-slate-900">{m.name}</span>
                                  {m.composition && <span className="text-slate-400 ml-1.5">({m.composition})</span>}
                                  <div className="text-slate-600 text-[11px] mt-0.5">
                                    <span className="font-semibold text-emerald-800">{m.dosage || '—'}</span>
                                    {m.timing && <span className="ml-2 font-medium">{m.timing}</span>}
                                    {m.frequency && <span className="ml-2">· {m.frequency}</span>}
                                    {m.duration && <span className="ml-2">· {m.duration}</span>}
                                  </div>
                                </div>
                                {m.quantity && (
                                  <span className="text-slate-500 font-medium shrink-0">
                                    Qty: <strong>{m.quantity}</strong>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Advice & Tests */}
                      {(visit.advice || visit.investigation || visit.diet_exercise) && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1.5">
                          {visit.advice && (
                            <div>
                              <strong className="text-slate-800">Advice:</strong> <span className="text-slate-600">{visit.advice}</span>
                            </div>
                          )}
                          {visit.investigation && (
                            <div>
                              <strong className="text-slate-800">Tests / Investigations:</strong> <span className="text-slate-600">{visit.investigation}</span>
                            </div>
                          )}
                          {visit.diet_exercise && (
                            <div>
                              <strong className="text-slate-800">Diet & Instructions:</strong> <span className="text-slate-600">{visit.diet_exercise}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
