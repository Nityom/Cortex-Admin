'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, ArrowRight, History, FileText } from 'lucide-react';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

interface PrescriptionPastVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientPhone?: string;
  patientName?: string;
  patientReference?: string;
  onLoadPastPrescription: (pastRx: any) => void;
}

export default function PrescriptionPastVisitsModal({
  isOpen,
  onClose,
  patientPhone,
  patientName,
  patientReference,
  onLoadPastPrescription,
}: PrescriptionPastVisitsModalProps) {
  const [pastVisits, setPastVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPastVisits = async () => {
      setLoading(true);
      try {
        if (!convexClient) {
          setPastVisits([]);
          setLoading(false);
          return;
        }

        // Fetch recent prescriptions list
        const all = await convexClient.query(api.prescriptions.list);
        if (Array.isArray(all)) {
          const filtered = all.filter((p: any) => {
            const matchPhone = patientPhone && p.phone_number && String(p.phone_number).trim() === String(patientPhone).trim();
            const matchRef = patientReference && p.reference_number && p.reference_number === patientReference;
            const matchName = patientName && p.patient_name && p.patient_name.toLowerCase().trim() === patientName.toLowerCase().trim();
            return matchPhone || matchRef || matchName;
          });

          // Sort by creation time / prescription date descending
          filtered.sort((a: any, b: any) => {
            const tA = a._creationTime || new Date(a.prescription_date || 0).getTime();
            const tB = b._creationTime || new Date(b.prescription_date || 0).getTime();
            return tB - tA;
          });

          setPastVisits(filtered);
          if (filtered.length > 0) {
            setSelectedVisitId(String(filtered[0]._id || (filtered[0] as any).id));
          }
        }
      } catch (err) {
        console.error('Error fetching past prescriptions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPastVisits();
  }, [isOpen, patientPhone, patientName, patientReference]);

  if (!isOpen) return null;

  const selectedVisit = pastVisits.find((v: any) => String(v._id || v.id) === selectedVisitId);

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Past Visits & Prescriptions
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-800">{patientName || 'Current Patient'}</span>
                {patientPhone && <span> • Phone: {patientPhone}</span>}
                {patientReference && <span> • UHID: {patientReference}</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row text-xs">
          {/* Left Column: Visits List */}
          <div className="w-full md:w-80 border-r border-slate-200 overflow-y-auto bg-slate-50/50 p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
              Recorded Visits ({pastVisits.length})
            </span>

            {loading ? (
              <div className="py-8 text-center text-slate-400">
                <Clock className="w-5 h-5 animate-spin mx-auto mb-1 text-teal-600" />
                <span>Loading past visits...</span>
              </div>
            ) : pastVisits.length === 0 ? (
              <div className="py-8 text-center text-slate-400 px-3">
                <Calendar className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <p className="font-semibold text-slate-600">No past visits found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  This appears to be the patient's 1st visit or no previous records match this phone number.
                </p>
              </div>
            ) : (
              pastVisits.map((visit: any, idx) => {
                const id = String(visit._id || visit.id);
                const isSelected = id === selectedVisitId;
                const dateStr = visit.prescription_date || (visit._creationTime ? new Date(visit._creationTime).toLocaleDateString() : 'Previous Visit');
                return (
                  <div
                    key={id || idx}
                    onClick={() => setSelectedVisitId(id)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-teal-600" />
                        {dateStr}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {visit.doctor_name || 'Attending Doctor'}
                      </span>
                    </div>
                    {visit.diagnosis && (
                      <p className="text-[11px] text-slate-700 font-medium line-clamp-1">
                        Dx: {visit.diagnosis}
                      </p>
                    )}
                    {visit.chief_complaint && (
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        CC: {visit.chief_complaint}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Visit Detailed Preview */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
            {selectedVisit ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Visit on {selectedVisit.prescription_date || 'Past Consultation'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Prescribed by <span className="font-semibold text-slate-700">{selectedVisit.doctor_name || 'Doctor'}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadPastPrescription(selectedVisit);
                      onClose();
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Load This Visit Into Form</span>
                  </button>
                </div>

                {/* Diagnosis & Complaints */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Diagnosis
                    </span>
                    <p className="font-semibold text-slate-800">
                      {selectedVisit.diagnosis || '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Chief Complaints
                    </span>
                    <p className="font-medium text-slate-800 whitespace-pre-line">
                      {selectedVisit.chief_complaint || '—'}
                    </p>
                  </div>
                </div>

                {/* Vitals Summary */}
                {selectedVisit.vitals && (
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Vitals Recorded
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-slate-700 font-semibold">
                      {selectedVisit.vitals.bp_systolic && (
                        <span>BP: {selectedVisit.vitals.bp_systolic}/{selectedVisit.vitals.bp_diastolic || 80} mmHg</span>
                      )}
                      {selectedVisit.vitals.pulse && <span>Pulse: {selectedVisit.vitals.pulse} bpm</span>}
                      {selectedVisit.vitals.spo2 && <span>SPO2: {selectedVisit.vitals.spo2}%</span>}
                      {selectedVisit.vitals.weight && <span>Weight: {selectedVisit.vitals.weight} kg</span>}
                      {selectedVisit.vitals.temperature && <span>Temp: {selectedVisit.vitals.temperature} °F</span>}
                    </div>
                  </div>
                )}

                {/* Medicines Table */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Prescribed Medicines
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Medicine</th>
                          <th className="py-2 px-3">Dosage</th>
                          <th className="py-2 px-3">When</th>
                          <th className="py-2 px-3">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {safeParseArray(selectedVisit.medicines).map((med: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {med.name || med.medicine_name}
                              {med.composition && (
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  {med.composition}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono">{med.dosage || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{med.when || med.timing || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{med.duration || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Advice */}
                {selectedVisit.advice && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                      Advice / Instructions
                    </span>
                    <p className="text-slate-700 whitespace-pre-line text-xs">
                      {selectedVisit.advice}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>Select a visit from the left to view prescription history.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Clicking "Load This Visit" populates diagnosis, complaints, vitals, and medicines into the active prescription.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
