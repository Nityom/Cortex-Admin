'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  Mail,
  PlusCircle,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  FileText,
  Pill,
  Activity,
  Heart,
  Baby,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Share2,
  Stethoscope,
  Sparkles,
  Edit3,
} from 'lucide-react';

interface PrescriptionPastVisitsDashboardProps {
  patientName: string;
  patientAge: string;
  patientSex: string;
  patientPhone: string;
  patientReference?: string;
  pastVisits: any[];
  selectedVisit?: any;
  onSelectVisit: (visit: any) => void;
  onCreateNewVisit: (sourceVisit?: any) => void;
  onEditPastVisit?: (sourceVisit?: any) => void;
  onCloseDashboard: () => void;
  selectedDoctorName?: string;
  handleDoctorSelect?: (name: string) => void;
  availableDoctors?: { id?: string; _id?: string; name: string }[];
  onOpenEmailModal?: (visit?: any) => void;
  onPrintPastVisit?: (visit: any) => void;
}

function formatHealthPlixDate(dateVal?: string | number): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseTimelineDate(dateVal?: string | number): { dayMonth: string; year: string } {
  if (!dateVal) return { dayMonth: 'Visit', year: '' };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { dayMonth: String(dateVal), year: '' };
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = String(d.getFullYear());
  return { dayMonth: `${day} ${month}`, year };
}

function safeParseArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function PrescriptionPastVisitsDashboard({
  patientName,
  patientAge,
  patientSex,
  patientPhone,
  patientReference,
  pastVisits,
  selectedVisit: controlledSelectedVisit,
  onSelectVisit,
  onCreateNewVisit,
  onEditPastVisit,
  onCloseDashboard,
  selectedDoctorName = 'Dr. Shillpa Raut',
  handleDoctorSelect,
  availableDoctors = [],
  onOpenEmailModal,
  onPrintPastVisit,
}: PrescriptionPastVisitsDashboardProps) {
  // Sort past visits newest first
  const sortedVisits = useMemo(() => {
    return [...pastVisits].sort((a, b) => {
      const tA = new Date(a.prescription_date || a._creationTime || 0).getTime();
      const tB = new Date(b.prescription_date || b._creationTime || 0).getTime();
      return tB - tA;
    });
  }, [pastVisits]);

  // Active selected visit
  const [internalSelectedId, setInternalSelectedId] = useState<string>(() => {
    if (controlledSelectedVisit?._id || controlledSelectedVisit?.id) {
      return String(controlledSelectedVisit._id || controlledSelectedVisit.id);
    }
    return sortedVisits[0] ? String(sortedVisits[0]._id || sortedVisits[0].id) : '';
  });

  const activeVisit = useMemo(() => {
    if (!sortedVisits.length) return null;
    const found = sortedVisits.find(
      (v) => String(v._id || v.id) === internalSelectedId
    );
    return found || sortedVisits[0];
  }, [sortedVisits, internalSelectedId]);

  const handleSelect = (visit: any) => {
    const id = String(visit._id || visit.id);
    setInternalSelectedId(id);
    onSelectVisit(visit);
  };

  // Timeline collapsed/expanded state (initial limit: 4 visits)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const INITIAL_VISIBLE_COUNT = 4;

  const visibleVisits = useMemo(() => {
    if (isTimelineExpanded || sortedVisits.length <= INITIAL_VISIBLE_COUNT) {
      return sortedVisits;
    }
    return sortedVisits.slice(0, INITIAL_VISIBLE_COUNT);
  }, [sortedVisits, isTimelineExpanded]);

  const remainingVisitsCount = sortedVisits.length - INITIAL_VISIBLE_COUNT;

  // Auto-expand if active visit is beyond the first 4 visits
  React.useEffect(() => {
    if (activeVisit) {
      const activeIdx = sortedVisits.findIndex(
        (v) => String(v._id || v.id) === String(activeVisit._id || activeVisit.id)
      );
      if (activeIdx >= INITIAL_VISIBLE_COUNT) {
        setIsTimelineExpanded(true);
      }
    }
  }, [activeVisit, sortedVisits]);

  // Summary Metrics (HealthPlix IMG_0902 style)
  const visitMetrics = useMemo(() => {
    const totalCount = sortedVisits.length;
    const currentVisitNumber = totalCount + 1; // Upcoming is (N+1)th visit

    // Oldest visit date
    const oldest = sortedVisits[sortedVisits.length - 1];
    const sinceDateStr = oldest
      ? formatHealthPlixDate(oldest.prescription_date || oldest._creationTime)
      : '';

    // Latest visit
    const latest = sortedVisits[0];
    const latestDateStr = latest
      ? formatHealthPlixDate(latest.prescription_date || latest._creationTime)
      : '';

    // Follow-up & late calculation
    let nextVisitDateStr = '';
    let followUpText = '';
    let isLate = false;
    let daysLate = 0;

    if (latest?.followup_date) {
      nextVisitDateStr = formatHealthPlixDate(latest.followup_date);
      const targetDate = new Date(latest.followup_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - targetDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        isLate = true;
        daysLate = diffDays;
        followUpText = `(Patient is late by ${daysLate} Days)`;
      } else if (diffDays === 0) {
        followUpText = `(Visit due today)`;
      } else {
        followUpText = `(Due in ${Math.abs(diffDays)} days)`;
      }
    } else if (latest) {
      const lastDate = new Date(latest.prescription_date || latest._creationTime);
      const today = new Date();
      const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        followUpText = diffDays === 0 ? `(Today)` : diffDays === 1 ? `(Yesterday)` : `(${diffDays} days ago)`;
      }
    }

    return {
      currentVisitNumber,
      sinceDateStr,
      latestDateStr,
      nextVisitDateStr,
      followUpText,
      isLate,
      daysLate,
    };
  }, [sortedVisits]);

  // Active visit clinical details
  const activeMedicines = useMemo(() => {
    return safeParseArray(activeVisit?.medicines);
  }, [activeVisit]);

  const activeVitals = activeVisit?.vitals || {};
  const isGynae =
    (selectedDoctorName || '').toLowerCase().includes('shilpa') ||
    (selectedDoctorName || '').toLowerCase().includes('shillpa') ||
    (activeVisit?.doctor_name || '').toLowerCase().includes('shilpa') ||
    (activeVisit?.doctor_name || '').toLowerCase().includes('shillpa');

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* 1. TOP PATIENT BANNER (HealthPlix Style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {patientName || 'Patient Name'}
            </h2>
            <span className="text-sm font-bold text-slate-600">
              ({patientAge || '—'} Y, {patientSex || 'Female'})
            </span>

            {/* Tag Button */}
            <button
              type="button"
              onClick={() => {
                const tag = prompt('Add tag for patient (e.g. Antenatal, VIP, Follow-up):');
                if (tag) alert('Tag noted: ' + tag);
              }}
              className="text-xs px-2.5 py-1 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer font-medium"
            >
              + tag
            </button>

            {/* Call Action */}
            {patientPhone && (
              <a
                href={'tel:' + patientPhone}
                className="text-xs px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call</span>
              </a>
            )}
          </div>

          {/* Right Info: UHID & Phone */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
            {patientReference && (
              <div>
                <span className="text-slate-400">UHID / Ref:</span>{' '}
                <span className="font-bold text-slate-800">{patientReference}</span>
              </div>
            )}
            {patientPhone && (
              <div>
                <span className="text-slate-400">Phone:</span>{' '}
                <span className="font-bold text-slate-800">{patientPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Switcher & Quick Navigation */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Attending Doctor:
            </span>
            <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {selectedDoctorName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCloseDashboard}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
            >
              Direct to Blank Rx Form →
            </button>
          </div>
        </div>
      </div>

      {/* 2. PROMINENT ACTION CARD: CREATE NEW VISIT (HealthPlix Highlight) */}
      <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center space-y-4">
        {/* Large Green Action Button */}
        <div>
          <button
            type="button"
            onClick={() => onCreateNewVisit(activeVisit || sortedVisits[0])}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-base sm:text-lg font-black shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-150 cursor-pointer transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            <span>Create New Visit</span>
          </button>
        </div>

        {/* Summary Line: {N}th Visit | Since {Date} | Next Visit : {Date} (Late by X Days) */}
        <div className="text-xs sm:text-sm text-slate-600 font-medium flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="font-bold text-slate-900">
            {visitMetrics.currentVisitNumber}
            {visitMetrics.currentVisitNumber === 1
              ? 'st'
              : visitMetrics.currentVisitNumber === 2
              ? 'nd'
              : visitMetrics.currentVisitNumber === 3
              ? 'rd'
              : 'th'}{' '}
            Visit
          </span>
          {visitMetrics.sinceDateStr && (
            <>
              <span className="text-slate-300">|</span>
              <span>
                Since <b className="text-slate-800">{visitMetrics.sinceDateStr}</b>
              </span>
            </>
          )}
          {visitMetrics.nextVisitDateStr ? (
            <>
              <span className="text-slate-300">|</span>
              <span>
                Next Visit : <b className="text-slate-800">{visitMetrics.nextVisitDateStr}</b>
              </span>
              {visitMetrics.followUpText && (
                <span
                  className={`font-bold ml-1 ${
                    visitMetrics.isLate ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {visitMetrics.followUpText}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-slate-300">|</span>
              <span>
                Last Visit : <b className="text-slate-800">{visitMetrics.latestDateStr}</b>
              </span>
              {visitMetrics.followUpText && (
                <span className="font-semibold text-slate-500 ml-1">
                  {visitMetrics.followUpText}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. PAST VISITS SECTION (HealthPlix Layout) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Past Visits
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
              {sortedVisits.length} {sortedVisits.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {/* Quick Print, Email & Edit Actions for Selected Visit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onEditPastVisit && activeVisit) {
                  onEditPastVisit(activeVisit);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition shadow-2xs cursor-pointer"
              title="Edit this previous prescription"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onPrintPastVisit && activeVisit) {
                  onPrintPastVisit(activeVisit);
                } else {
                  window.print();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenEmailModal) onOpenEmailModal(activeVisit);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* Two-Column Body: Left Timeline | Right Visit Details */}
        <div className="flex flex-col md:flex-row min-h-[460px]">
          {/* LEFT COLUMN: Vertical Timeline of Dates */}
          <div className="w-full md:w-44 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/40 p-3 space-y-2 shrink-0 overflow-y-auto">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Timeline
            </div>
            {visibleVisits.map((visit, idx) => {
              const visitId = String(visit._id || visit.id);
              const isSelected = activeVisit && String(activeVisit._id || activeVisit.id) === visitId;
              const { dayMonth, year } = parseTimelineDate(
                visit.prescription_date || visit._creationTime
              );

              return (
                <button
                  key={visitId || idx}
                  type="button"
                  onClick={() => handleSelect(visit)}
                  className={`w-full p-2.5 rounded-xl border text-center transition-all cursor-pointer block select-none ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="text-sm font-extrabold tracking-tight">
                    {dayMonth}
                  </div>
                  {year && (
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {year}
                    </div>
                  )}
                  {idx === 0 && (
                    <div className="mt-1 text-[9px] uppercase font-black text-amber-700 bg-amber-100/80 py-0.5 px-1.5 rounded-full inline-block">
                      Latest
                    </div>
                  )}
                </button>
              );
            })}

            {/* Expand / Collapse Button when more than 4 visits */}
            {!isTimelineExpanded && sortedVisits.length > INITIAL_VISIBLE_COUNT && (
              <button
                type="button"
                onClick={() => setIsTimelineExpanded(true)}
                className="w-full p-2.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-900 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-2xs group select-none"
                title={`Click to view remaining ${remainingVisitsCount} visits`}
              >
                <div className="flex items-center gap-1 text-xs font-black tracking-tight text-emerald-800">
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-600 transition-transform group-hover:translate-y-0.5" />
                  <span>+{remainingVisitsCount} visits</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600">
                  Click to open
                </span>
              </button>
            )}

            {isTimelineExpanded && sortedVisits.length > INITIAL_VISIBLE_COUNT && (
              <button
                type="button"
                onClick={() => setIsTimelineExpanded(false)}
                className="w-full py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100/80 text-slate-500 hover:text-slate-700 text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs select-none"
              >
                <ChevronUp className="w-3 h-3" />
                <span>Show Less</span>
              </button>
            )}
          </div>

          {/* RIGHT COLUMN: Selected Visit Full Details */}
          <div className="flex-1 p-5 sm:p-6 space-y-5 bg-white overflow-y-auto">
            {activeVisit ? (
              <>
                {/* Visit Sub-Header: Date By : Doctor */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {formatHealthPlixDate(activeVisit.prescription_date || activeVisit._creationTime)}
                      {' By : '}
                      <span className="text-emerald-700">
                        {activeVisit.doctor_name || selectedDoctorName || 'Consulting Doctor'}
                      </span>
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCreateNewVisit(activeVisit)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                  >
                    <span>Use As Base For Today</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Complaints & Diagnosis Badges */}
                {(activeVisit.diagnosis || activeVisit.chief_complaint) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {activeVisit.diagnosis && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Diagnosis
                        </span>
                        <p className="font-bold text-slate-900 text-sm">
                          {activeVisit.diagnosis}
                        </p>
                      </div>
                    )}
                    {activeVisit.chief_complaint && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Chief Complaints
                        </span>
                        <p className="font-semibold text-slate-800 whitespace-pre-line">
                          {activeVisit.chief_complaint}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Vitals Summary Card */}
                {(activeVitals.bp_systolic ||
                  activeVitals.pulse ||
                  activeVitals.weight ||
                  activeVitals.height ||
                  activeVitals.spo2 ||
                  activeVitals.temperature) && (
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Recorded Vitals
                    </span>
                    <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-800">
                      {activeVitals.bp_systolic && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          BP: {activeVitals.bp_systolic}/{activeVitals.bp_diastolic || '80'} mmHg
                        </span>
                      )}
                      {activeVitals.pulse && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          Pulse: {activeVitals.pulse} bpm
                        </span>
                      )}
                      {activeVitals.weight && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          Weight: {activeVitals.weight} kg
                        </span>
                      )}
                      {activeVitals.height && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          Height: {activeVitals.height} cm
                        </span>
                      )}
                      {activeVitals.spo2 && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          SpO2: {activeVitals.spo2}%
                        </span>
                      )}
                      {activeVitals.temperature && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          Temp: {activeVitals.temperature} °F
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Obstetrics & Antenatal Card (Gynae Patients) */}
                {(activeVitals.lmp || activeVitals.edd || activeVitals.gestational_age) && (
                  <div className="bg-pink-50/60 p-3.5 rounded-xl border border-pink-200 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 block mb-2">
                      Obstetrics & Antenatal Details
                    </span>
                    <div className="flex flex-wrap items-center gap-3 font-bold text-slate-800">
                      {activeVitals.lmp && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-pink-200">
                          LMP: {formatHealthPlixDate(activeVitals.lmp)}
                        </span>
                      )}
                      {activeVitals.edd && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-pink-200 text-pink-900">
                          EDD: {formatHealthPlixDate(activeVitals.edd)}
                        </span>
                      )}
                      {activeVitals.gestational_age && (
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-pink-200 text-pink-900">
                          GA at visit: {activeVitals.gestational_age}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Clinical Findings / Examination Notes */}
                {(activeVisit.findings || activeVisit.oral_exam_notes) && (
                  <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                      Clinical Examination & Findings
                    </span>
                    <p className="font-medium text-slate-800 whitespace-pre-line">
                      {activeVisit.findings || activeVisit.oral_exam_notes}
                    </p>
                  </div>
                )}

                {/* 4. MEDICINES TABLE (Rx Table matching HealthPlix) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-black text-slate-800 tracking-wide flex items-center gap-1.5">
                      <span className="text-emerald-700 font-serif text-base italic">Rx:</span>
                      <span>Prescribed Medications ({activeMedicines.length})</span>
                    </h5>
                  </div>

                  {activeMedicines.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                      No medications recorded for this visit.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-3 w-8 text-center">#</th>
                            <th className="py-2.5 px-3 min-w-[160px]">Medicine</th>
                            <th className="py-2.5 px-2.5 min-w-[70px]">Dosage</th>
                            <th className="py-2.5 px-2.5 min-w-[60px]">Unit</th>
                            <th className="py-2.5 px-2.5 min-w-[80px]">Time</th>
                            <th className="py-2.5 px-2.5 min-w-[90px]">When</th>
                            <th className="py-2.5 px-2.5 min-w-[90px]">Where</th>
                            <th className="py-2.5 px-2.5 min-w-[80px]">Frequency</th>
                            <th className="py-2.5 px-2.5 min-w-[75px]">Duration</th>
                            <th className="py-2.5 px-2.5 min-w-[85px]">Start From</th>
                            <th className="py-2.5 px-3 min-w-[140px]">Details / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {activeMedicines.map((med: any, mIdx: number) => {
                            const medName = med.name || med.medicine_name || 'Medicine';
                            const dosage = med.dosage || med.dose || med.timing || '—';
                            const unit = med.unit || med.type || med.form || '—';
                            const time = med.time || med.time_of_day || med.timing || '—';
                            const when = med.when || med.food_relation || med.instructions || '—';
                            const where = med.where || med.route || '—';
                            const freq = med.frequency || (med.dosage ? 'Daily' : '—');
                            const duration = med.duration
                              ? `${med.duration} ${med.duration_unit || 'days'}`
                              : '—';
                            const startFrom = med.start_from
                              ? formatHealthPlixDate(med.start_from)
                              : formatHealthPlixDate(activeVisit.prescription_date);
                            const notes = med.notes || med.special_instruction || med.instructions || '—';

                            return (
                              <tr key={mIdx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                  {mIdx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-extrabold text-slate-900">
                                  {medName}
                                </td>
                                <td className="py-2.5 px-2.5 font-bold text-emerald-800">
                                  {dosage}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-600">
                                  {unit}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-600">
                                  {time}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-600">
                                  {when}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-600">
                                  {where}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-600">
                                  {freq}
                                </td>
                                <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                                  {duration}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-500 whitespace-nowrap">
                                  {startFrom}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 italic">
                                  {notes}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Advice & Doctor Notes */}
                {(activeVisit.advice || activeVisit.dr_notes) && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                    {activeVisit.advice && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          General Advice
                        </span>
                        <p className="text-slate-800 whitespace-pre-line font-medium">
                          {activeVisit.advice}
                        </p>
                      </div>
                    )}
                    {activeVisit.dr_notes && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Doctor Internal Notes
                        </span>
                        <p className="text-slate-700 whitespace-pre-line">
                          {activeVisit.dr_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Next Visit / Follow-up */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>
                      Next Visit:{' '}
                      <b className="text-slate-900">
                        {activeVisit.followup_date
                          ? formatHealthPlixDate(activeVisit.followup_date)
                          : 'Not Scheduled'}
                      </b>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (onEditPastVisit && activeVisit) {
                          onEditPastVisit(activeVisit);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                      title="Edit this previous prescription"
                    >
                      <Edit3 className="w-4 h-4 text-amber-700" />
                      <span>Edit Prescription</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onCreateNewVisit(activeVisit)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Create New Visit With This Data</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No Visit Selected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

