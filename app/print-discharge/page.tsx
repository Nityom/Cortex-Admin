'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';

interface IPDAdmission {
  id: string;
  ipdNumber: string;
  uhid: string;
  patientId?: string;
  name: string;
  age: string;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  medicalHistory?: string;
  allergies?: string;
  provisionalDiagnosis: string;
  reasonForAdmission: string;
  admissionDate: string;
  admissionTime: string;
  department: string;
  consultantDoctor: string;
  referredBy?: string;
  ward: string;
  bedNumber: string;
  status: "Admitted" | "Discharged";
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeSummary?: {
    conditionAtDischarge: string;
    finalDiagnosis: string;
    treatmentGiven: string;
    dischargeMeds: string;
    followupDate: string;
    doctorNotes: string;
  };
  vitals?: Array<{
    date: string;
    time: string;
    bp: string;
    pulse: string;
    temp: string;
    spo2: string;
    respRate?: string;
    weight?: string;
  }>;
  procedures?: Array<{
    id: string;
    name: string;
    date: string;
    surgeon: string;
    notes?: string;
  }>;
  investigations?: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
    result?: string;
  }>;
  doctorNotes?: Array<{
    date: string;
    time: string;
    doctor: string;
    note: string;
    plan: string;
  }>;
  medications?: Array<{
    name: string;
    dosage: string;
    route: string;
    frequency: string;
    timing: string;
    status: string;
  }>;
  finalSettlement?: {
    billNumber: string;
    date: string;
    netTotal: number;
    paymentMode: string;
    status: string;
  };
}

const STORAGE_KEY = "cortex_ipd_admissions_v1";

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatFollowup(followupDate?: string, dischargeDate?: string): string {
  if (!followupDate) return '';
  const fDate = new Date(followupDate);
  if (isNaN(fDate.getTime())) return followupDate;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = daysOfWeek[fDate.getDay()];
  const formattedDate = `${String(fDate.getDate()).padStart(2, '0')}-${months[fDate.getMonth()]}-${fDate.getFullYear()}`;

  let diffPrefix = '';
  if (dischargeDate) {
    const dDate = new Date(dischargeDate);
    if (!isNaN(dDate.getTime())) {
      const diffMs = fDate.getTime() - dDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        diffPrefix = `${diffDays} days `;
      }
    }
  }

  return `${diffPrefix}(${formattedDate} - ${dayName})`;
}

function parseDischargeMeds(rawText?: string, inpatientMeds?: any[]) {
  const results: Array<{ name: string; dosage: string; timing: string; note?: string }> = [];

  if (rawText && rawText.trim()) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const cleanLine = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '');
      let parts: string[] = [];
      if (cleanLine.includes(' | ')) {
        parts = cleanLine.split(' | ').map(p => p.trim());
      } else if (cleanLine.includes(' - ')) {
        parts = cleanLine.split(' - ').map(p => p.trim());
      }

      if (parts.length >= 2) {
        results.push({
          name: parts[0],
          dosage: parts[1] || '—',
          timing: parts.slice(2).join(' · ') || 'As directed',
        });
      } else {
        results.push({
          name: cleanLine,
          dosage: '1 Tab / Cap',
          timing: 'Oral · As advised',
        });
      }
    }
  } else if (inpatientMeds && inpatientMeds.length > 0) {
    for (const m of inpatientMeds) {
      if (m.status === 'Active' || !m.status) {
        results.push({
          name: m.name,
          dosage: m.dosage || '—',
          timing: `${m.frequency || ''} ${m.timing || ''} (${m.route || 'Oral'})`.trim(),
        });
      }
    }
  }

  return results;
}

function DischargeSheetContent() {
  const searchParams = useSearchParams();
  const admissionId = searchParams.get('id');
  const includeSigParam = searchParams.get('includeSignature');

  const [admission, setAdmission] = useState<IPDAdmission | null>(null);
  const [includeSignature, setIncludeSignature] = useState<boolean>(includeSigParam !== 'false');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: IPDAdmission[] = JSON.parse(saved);
        if (admissionId) {
          const found = parsed.find(a => a.id === admissionId || a.ipdNumber === admissionId);
          if (found) setAdmission(found);
        } else if (parsed.length > 0) {
          setAdmission(parsed[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load admission for discharge print:", e);
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  const stayDays = useMemo(() => {
    if (!admission?.admissionDate) return 1;
    const start = new Date(admission.admissionDate).getTime();
    const end = admission.dischargeDate ? new Date(admission.dischargeDate).getTime() : Date.now();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, isNaN(diff) ? 1 : diff);
  }, [admission]);

  const latestVitals = useMemo(() => {
    if (!admission?.vitals || admission.vitals.length === 0) return null;
    return admission.vitals[admission.vitals.length - 1];
  }, [admission]);

  const parsedMeds = useMemo(() => {
    return parseDischargeMeds(admission?.dischargeSummary?.dischargeMeds, admission?.medications);
  }, [admission]);

  const doctorIsGynae = (admission?.consultantDoctor || '').toLowerCase().includes('shillpa');
  const doctorName = admission?.consultantDoctor || (doctorIsGynae ? 'Dr. Shillpa Raut' : 'Dr. Vipeen Raut');

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Loading Inpatient Discharge Summary...</div>;
  }

  if (!admission) {
    return (
      <div className="p-8 text-center text-slate-600 font-sans">
        <p className="text-base font-bold text-slate-800">Discharge Record Not Found</p>
        <p className="text-xs text-slate-500 mt-1">Please open the discharge summary from IPD Management.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Screen Action Bar (Hidden on Print) ── */}
      <div className="no-print w-full max-w-[210mm] mx-auto mb-4 p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => window.close()}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Close
        </button>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 transition">
            <input
              type="checkbox"
              checked={includeSignature}
              onChange={(e) => setIncludeSignature(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
            <span>{includeSignature ? "✓ Doctor Signature Included" : "Name Only (No Signature Image)"}</span>
          </label>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> Print Discharge Summary
          </button>
        </div>
      </div>

      {/* ── Official A4 Prescription-Format Discharge Sheet ── */}
      <div className="prescription-sheet">
        {/* Background Watermark */}
        <img
          src="/cortex_logo.png"
          alt="Watermark"
          className="sheet-watermark"
        />

        <div className="sheet-content">
          <div className="sheet-top-and-body">
            {/* Top Meta Line */}
            <div className="top-meta-row">
              <span>{new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="font-bold tracking-wider">CORTEX HOSPITAL • INPATIENT DEPARTMENT (IPD)</span>
              <span>Svasth HMS</span>
            </div>

            {/* Doctor Letterhead Header */}
            <div className="header-row">
              <div className="flex items-center gap-3">
                <img
                  src="/cortex_logo.png"
                  alt="Cortex Hospital"
                  className="hospital-logo"
                />
              </div>

              <div className="doctor-header-block">
                {doctorIsGynae ? (
                  <>
                    <h1 className="doctor-title-name">Dr. Shillpa Raut</h1>
                    <div className="doctor-qualifications">M.B.B.S., M.D. (Gynecology &amp; Obstetrics)</div>
                    <div className="doctor-reg">Reg. No. 2004/05/1842</div>
                    <div className="doctor-diplomate">Consulting Gynecologist &amp; Obstetrician</div>
                    <div className="doctor-specialty">Maternity, Infertility &amp; Women Care Specialist</div>
                  </>
                ) : (
                  <>
                    <h1 className="doctor-title-name">{doctorName}</h1>
                    <div className="doctor-qualifications">M.B.B.S., Dip.Ortho., DNB Ortho</div>
                    <div className="doctor-reg">Reg. No. 1692/03/2002</div>
                    <div className="doctor-diplomate">Diplomate of National Board (Orthopaedics)</div>
                    <div className="doctor-specialty">Consulting Orthopaedic and Joint Replacement Surgeon</div>
                  </>
                )}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="doc-banner-row">
              <span className="doc-banner-title">INPATIENT DISCHARGE SUMMARY &amp; CLINICAL REPORT</span>
            </div>

            {/* Patient & Admission Info Bar */}
            <div className="patient-row">
              <div className="patient-info-left">
                <span>{admission.uhid}</span> • <span>IPD NO: <strong>{admission.ipdNumber}</strong></span> :{' '}
                <span className="patient-name">MR./MRS. {admission.name.toUpperCase()}</span>{' '}
                <span>
                  ({admission.age} Y, {admission.sex})
                </span>
                {admission.phone && <span> - Ph: {admission.phone}</span>}
                {admission.address && <span className="patient-addr"> • {admission.address}</span>}
              </div>
              <div className="patient-date-right">
                Ward: <strong>{admission.ward}</strong> (Bed {admission.bedNumber})
              </div>
            </div>

            {/* Stay Duration Row */}
            <div className="stay-meta-row">
              <div>
                <span>DOA: </span><strong>{formatDisplayDate(admission.admissionDate)} {admission.admissionTime || ''}</strong>
              </div>
              <div>
                <span>DOD: </span>
                <strong>
                  {formatDisplayDate(admission.dischargeDate || new Date().toISOString().split('T')[0])}{' '}
                  {admission.dischargeTime || ''}
                </strong>
              </div>
              <div>
                <span>Total Stay: </span><strong>{stayDays} {stayDays === 1 ? 'Day' : 'Days'}</strong>
              </div>
              <div>
                <span>Dept: </span><strong>{admission.department || 'Orthopaedics'}</strong>
              </div>
            </div>

            {/* Vitals Bar (if available) */}
            {latestVitals && (
              <div className="vitals-row">
                <span className="vitals-label">Vitals at Discharge:</span>
                {latestVitals.bp && (
                  <span className="vitals-item">
                    <strong>BP:</strong> {latestVitals.bp} mmHg
                  </span>
                )}
                {latestVitals.pulse && (
                  <span className="vitals-item">
                    <strong>Pulse:</strong> {latestVitals.pulse} /min
                  </span>
                )}
                {latestVitals.spo2 && (
                  <span className="vitals-item">
                    <strong>SpO₂:</strong> {latestVitals.spo2}%
                  </span>
                )}
                {latestVitals.temp && (
                  <span className="vitals-item">
                    <strong>Temp:</strong> {latestVitals.temp}°F
                  </span>
                )}
                {latestVitals.respRate && (
                  <span className="vitals-item">
                    <strong>RR:</strong> {latestVitals.respRate} /min
                  </span>
                )}
                {latestVitals.weight && (
                  <span className="vitals-item">
                    <strong>Weight:</strong> {latestVitals.weight} kg
                  </span>
                )}
              </div>
            )}

            {/* Diagnosis Section */}
            <div className="clinical-section">
              <div className="section-label">1. DIAGNOSIS</div>
              <div className="section-body">
                <p>
                  <strong>Final Diagnosis : </strong>
                  <span className="highlight-text">
                    {admission.dischargeSummary?.finalDiagnosis || admission.provisionalDiagnosis}
                  </span>
                </p>
                {admission.reasonForAdmission && (
                  <p className="mt-0.5 text-[8.5pt] text-slate-700">
                    <strong>Reason for Admission : </strong>{admission.reasonForAdmission}
                  </p>
                )}
                {(admission.medicalHistory || admission.allergies) && (
                  <p className="mt-0.5 text-[8pt] text-slate-600">
                    {admission.medicalHistory && <span><strong>History: </strong>{admission.medicalHistory} </span>}
                    {admission.allergies && <span className="text-red-700 font-semibold">• <strong>Allergies: </strong>{admission.allergies}</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Surgeries / Procedures Done During Stay (if any) */}
            {admission.procedures && admission.procedures.length > 0 && (
              <div className="clinical-section">
                <div className="section-label">2. SURGERIES / PROCEDURES PERFORMED</div>
                <div className="section-body p-0">
                  <table className="mini-clinical-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45%' }}>Procedure / Surgery</th>
                        <th style={{ width: '20%' }}>Date</th>
                        <th style={{ width: '35%' }}>Operating Surgeon / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admission.procedures.map((proc, idx) => (
                        <tr key={idx}>
                          <td><strong>{proc.name}</strong></td>
                          <td>{formatDisplayDate(proc.date)}</td>
                          <td>
                            <span>{proc.surgeon}</span>
                            {proc.notes && <span className="block text-[7.5pt] text-slate-500 italic">{proc.notes}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Hospital Course & Treatment Summary */}
            <div className="clinical-section">
              <div className="section-label">
                {admission.procedures && admission.procedures.length > 0 ? "3. HOSPITAL COURSE & TREATMENT GIVEN" : "2. HOSPITAL COURSE & TREATMENT GIVEN"}
              </div>
              <div className="section-body">
                <p className="leading-relaxed">
                  {admission.dischargeSummary?.treatmentGiven ||
                    `Patient admitted in ${admission.ward} for ${stayDays} days. Managed with supportive clinical and medical care.`}
                </p>
              </div>
            </div>

            {/* Key Investigations (if recorded) */}
            {admission.investigations && admission.investigations.length > 0 && (
              <div className="clinical-section">
                <div className="section-label">INVESTIGATIONS &amp; LAB FINDINGS</div>
                <div className="section-body">
                  <div className="flex flex-wrap gap-2 text-[8pt]">
                    {admission.investigations.map((inv, idx) => (
                      <span key={idx} className="inv-badge">
                        <strong>{inv.name}</strong> ({formatDisplayDate(inv.date)})
                        {inv.result ? `: ${inv.result}` : ` [${inv.status}]`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Discharge Medications (Rx) */}
            <div className="rx-wrapper">
              <div className="flex items-center justify-between">
                <div className="rx-symbol">℞ <span className="rx-title">DISCHARGE MEDICATIONS (TO CONTINUE AT HOME)</span></div>
                <div className="text-[8pt] text-slate-500 italic">Please take exactly as prescribed</div>
              </div>

              <table className="med-table">
                <thead>
                  <tr>
                    <th className="col-med">Medicine Name &amp; Instructions</th>
                    <th className="col-dosage">Dosage</th>
                    <th className="col-timing">Timing - Freq. - Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedMeds.length > 0 ? (
                    parsedMeds.map((med, index) => (
                      <tr key={index} className="med-row">
                        <td>
                          <div className="med-name-heading">
                            {index + 1}) &nbsp;{med.name}
                          </div>
                          {med.note && (
                            <div className="med-sub-line">
                              <span className="med-sub-lbl">Instructions</span>
                              <span className="med-sub-sep">:</span>
                              <span className="med-sub-val med-note-val">{med.note}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="dosage-val">
                            {med.dosage ? med.dosage.replace(/-/g, ' — ') : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="timing-val">
                            {med.timing}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="med-row">
                      <td colSpan={3} className="text-center py-2 text-slate-500 italic">
                        {admission.dischargeSummary?.dischargeMeds || "Continue prescribed oral medications."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Condition at Discharge & Post-Discharge Advice */}
            <div className="grid-2-sections">
              <div className="clinical-section">
                <div className="section-label">CONDITION AT DISCHARGE</div>
                <div className="section-body">
                  <span className="condition-badge">
                    {admission.dischargeSummary?.conditionAtDischarge || "Cured / Stable"}
                  </span>
                </div>
              </div>

              <div className="clinical-section">
                <div className="section-label">FOLLOW-UP REVIEW (फेरतपासणी)</div>
                <div className="section-body">
                  <span className="followup-text">
                    {formatFollowup(admission.dischargeSummary?.followupDate, admission.dischargeDate) || "Review in OPD after 7 days"}
                  </span>
                </div>
              </div>
            </div>

            {/* Advice & Special Instructions */}
            {admission.dischargeSummary?.doctorNotes && (
              <div className="clinical-section">
                <div className="section-label">ADVICE &amp; SPECIAL INSTRUCTIONS</div>
                <div className="section-body">
                  <p className="leading-relaxed whitespace-pre-line">
                    {admission.dischargeSummary.doctorNotes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Signatures & Footer Banner */}
          <div className="sheet-bottom-section">
            <div className="clinical-bottom-grid">
              <div className="advice-box">
                <div className="emergency-notice">
                  <strong>* EMERGENCY WARNING : </strong> In case of high fever, acute pain, bleeding, or wound discharge, please report to Cortex Hospital Casualty / OPD immediately.
                </div>
                {admission.finalSettlement && (
                  <div className="settlement-note">
                    Bill Ref: <strong>{admission.finalSettlement.billNumber}</strong> ({admission.finalSettlement.paymentMode}) • Status: <strong>{admission.finalSettlement.status}</strong>
                  </div>
                )}
              </div>

              {/* Signature Block */}
              <div className="signature-block">
                {includeSignature && (
                  <img
                    src="/sign.png"
                    alt="Doctor Signature"
                    className="sig-img"
                  />
                )}
                <div className="sig-doc-name">
                  {doctorName}
                </div>
                <div className="sig-doc-sub">Authorized Consultant</div>
              </div>
            </div>

            {/* Official Cortex Hospital Schedule & Contact Footer Banner */}
            <div className="footer-banner-container">
              <div className="footer-top-pill-row">
                <span className="clinic-pill">Hip &amp; Knee Joint Clinic</span>
                <span className="clinic-time">Every Thursday 6 pm to 8 pm</span>
              </div>

              <div className="footer-clinic-title">Orthopaedics &amp; Maternity Centre</div>

              <div className="footer-opd-line">
                <span className="footer-opd-label">OPD Time : </span>
                Mon. to Fri. - 10 am to 1 pm &amp; 6 pm to 8 pm | Sat. - 10 am to 1 pm &amp; Evening OPD Closed
              </div>

              <div className="footer-sunday-line">Sunday OPD Closed • 24/7 Casualty &amp; Inpatient Admissions Open</div>

              <div className="footer-address-line">
                Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001
                &nbsp;|&nbsp; Ph. : 07152-255795, Cell : 9373280505
              </div>

              <div className="footer-bottom-bar" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Prescription Sheet Styles ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 7mm 7mm 7mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 8.5pt !important;
          }

          .no-print {
            display: none !important;
          }

          .prescription-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
          }

          .sheet-content {
            height: auto !important;
            min-height: 275mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          .clinical-section {
            page-break-inside: avoid !important;
          }

          .rx-wrapper {
            page-break-inside: avoid !important;
          }

          .sheet-bottom-section {
            margin-top: auto !important;
            page-break-inside: avoid !important;
            padding-top: 4px !important;
          }

          .footer-banner-container {
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            margin-top: 4px !important;
          }
        }

        @media screen {
          body {
            background: #cbd5e1;
            padding: 16px 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .prescription-sheet {
            width: 210mm;
            min-height: 290mm;
            max-width: 210mm;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
            padding: 5mm 7mm 5mm 7mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .sheet-content {
            height: 100%;
            min-height: calc(290mm - 10mm);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }

        .prescription-sheet {
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #000000;
          background: #ffffff;
          line-height: 1.25;
          box-sizing: border-box;
        }

        .sheet-watermark {
          position: absolute;
          top: 48%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          opacity: 0.05;
          pointer-events: none;
          z-index: 0;
        }

        .sheet-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }

        .sheet-top-and-body {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sheet-bottom-section {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          margin-top: auto;
          padding-top: 6px;
        }

        /* ── Top Small Meta Line ── */
        .top-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 7pt;
          color: #555555;
          margin-bottom: 2px;
        }

        /* ── Header Area ── */
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 3px;
          border-bottom: 1.5px solid #d1d5db;
        }

        .hospital-logo {
          height: 54px;
          width: auto;
          object-fit: contain;
        }

        .doctor-header-block {
          text-align: right;
        }

        .doctor-title-name {
          font-size: 15pt;
          font-weight: 800;
          color: #7B1828;
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.2px;
        }

        .doctor-qualifications {
          font-size: 9pt;
          font-weight: 700;
          color: #111111;
          margin-top: 1px;
        }

        .doctor-reg {
          font-size: 7.5pt;
          color: #4b5563;
          margin-top: 1px;
        }

        .doctor-diplomate, .doctor-specialty {
          font-size: 8.5pt;
          font-weight: 600;
          color: #1f2937;
          margin-top: 1px;
        }

        /* ── Doc Title Banner ── */
        .doc-banner-row {
          text-align: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 3px 0;
          margin: 3px 0;
          border-radius: 4px;
        }

        .doc-banner-title {
          font-size: 9.5pt;
          font-weight: 900;
          letter-spacing: 0.8px;
          color: #0f172a;
        }

        /* ── Patient Bar ── */
        .patient-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0 2px 0;
          font-size: 8.5pt;
          font-weight: 600;
          color: #000000;
          border-bottom: 1px solid #e2e8f0;
        }

        .patient-info-left {
          flex: 1;
        }

        .patient-name {
          font-size: 9pt;
          font-weight: 800;
          color: #000000;
        }

        .patient-addr {
          font-size: 8pt;
          font-weight: normal;
          color: #64748b;
        }

        .patient-date-right {
          white-space: nowrap;
          font-size: 8.5pt;
          font-weight: 700;
        }

        /* ── Stay Meta Row ── */
        .stay-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2.5px 0;
          font-size: 8pt;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
          background: #fafafa;
          padding: 2px 4px;
        }

        /* ── Vitals Row ── */
        .vitals-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 2px 4px;
          font-size: 8pt;
          color: #111111;
          border-bottom: 1px dashed #cbd5e1;
          background: #f8fafc;
        }

        .vitals-label {
          font-weight: 800;
          color: #000000;
          text-transform: uppercase;
          font-size: 7.5pt;
        }

        .vitals-item {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        /* ── Clinical Sections ── */
        .clinical-section {
          margin-top: 4px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .section-label {
          font-size: 7.5pt;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #1e293b;
          background: #f1f5f9;
          padding: 2px 6px;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-body {
          padding: 4px 6px;
          font-size: 8.5pt;
          line-height: 1.3;
          color: #0f172a;
        }

        .highlight-text {
          font-weight: 800;
          color: #09090b;
        }

        /* ── Mini Clinical Table (Procedures) ── */
        .mini-clinical-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
        }

        .mini-clinical-table th {
          background: #f8fafc;
          padding: 3px 6px;
          text-align: left;
          font-size: 7.5pt;
          font-weight: 700;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }

        .mini-clinical-table td {
          padding: 3px 6px;
          border-bottom: 1px solid #f1f5f9;
        }

        .inv-badge {
          display: inline-block;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          padding: 1px 5px;
          color: #1e293b;
        }

        /* ── Rx Section ── */
        .rx-wrapper {
          margin-top: 5px;
        }

        .rx-symbol {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 14pt;
          font-weight: bold;
          font-style: italic;
          color: #1f2937;
          line-height: 1;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .rx-title {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 7.5pt;
          font-weight: 800;
          letter-spacing: 0.5px;
          font-style: normal;
          color: #1e293b;
        }

        .med-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 2px;
        }

        .med-table th {
          font-size: 8pt;
          font-weight: 700;
          color: #374151;
          padding: 2.5px 5px;
          border-bottom: 1.5px solid #9ca3af;
        }

        .med-table th.col-med {
          width: 50%;
          text-align: left;
        }

        .med-table th.col-dosage {
          width: 20%;
          text-align: center;
        }

        .med-table th.col-timing {
          width: 30%;
          text-align: left;
        }

        .med-row td {
          padding: 2.5px 5px;
          vertical-align: top;
          border-bottom: 1px solid #e5e7eb;
        }

        .med-name-heading {
          font-size: 8.5pt;
          font-weight: 800;
          color: #000000;
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }

        .med-sub-line {
          display: flex;
          font-size: 7pt;
          margin-top: 1px;
          padding-left: 10px;
          line-height: 1.25;
        }

        .med-sub-lbl {
          width: 65px;
          color: #555555;
          font-weight: 600;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .med-sub-sep {
          margin-right: 4px;
          color: #555555;
          flex-shrink: 0;
        }

        .med-sub-val {
          color: #111111;
          font-weight: 600;
        }

        .med-note-val {
          color: #000000;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-color: #dc2626;
        }

        .dosage-val {
          font-size: 9pt;
          font-weight: 700;
          color: #000000;
          text-align: center;
          letter-spacing: 0.5px;
          white-space: nowrap;
          padding-top: 1px;
        }

        .timing-val {
          font-size: 8pt;
          font-weight: 600;
          color: #111111;
          line-height: 1.25;
        }

        .grid-2-sections {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 4px;
        }

        .condition-badge {
          display: inline-block;
          font-weight: 800;
          color: #166534;
          font-size: 8.5pt;
        }

        .followup-text {
          font-weight: 800;
          color: #1e1b4b;
          font-size: 8.5pt;
        }

        /* ── Advice & Signatures ── */
        .clinical-bottom-grid {
          margin-top: 4px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
        }

        .advice-box {
          flex: 1;
        }

        .emergency-notice {
          font-size: 7.5pt;
          color: #991b1b;
          line-height: 1.3;
          background: #fef2f2;
          padding: 3px 6px;
          border-left: 2px solid #ef4444;
          border-radius: 2px;
        }

        .settlement-note {
          font-size: 7.5pt;
          color: #64748b;
          margin-top: 3px;
        }

        .signature-block {
          text-align: center;
          min-width: 140px;
          flex-shrink: 0;
          padding-bottom: 2px;
        }

        .sig-img {
          height: 38px;
          max-width: 120px;
          object-fit: contain;
          margin: 0 auto;
          display: block;
        }

        .sig-doc-name {
          font-size: 8.5pt;
          font-weight: 700;
          color: #111111;
          margin-top: 1px;
        }

        .sig-doc-sub {
          font-size: 7pt;
          color: #64748b;
        }

        /* ── Bottom Schedule Banner ── */
        .footer-banner-container {
          margin-top: 4px;
          padding-top: 3px;
          border-top: 1.5px solid #d1d5db;
          text-align: center;
        }

        .footer-top-pill-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .clinic-pill {
          background-color: #7B1828;
          color: #ffffff;
          font-size: 7.5pt;
          font-weight: 700;
          padding: 1px 8px;
          border-radius: 9999px;
          letter-spacing: 0.2px;
        }

        .clinic-time {
          font-size: 8pt;
          font-weight: 700;
          color: #111111;
        }

        .footer-clinic-title {
          font-size: 9.5pt;
          font-weight: 800;
          color: #000000;
          margin-bottom: 1px;
        }

        .footer-opd-line {
          font-size: 7.5pt;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1px;
        }

        .footer-opd-label {
          font-weight: 800;
          color: #7B1828;
        }

        .footer-sunday-line {
          font-size: 7.5pt;
          font-weight: 700;
          color: #7B1828;
          margin-bottom: 1.5px;
        }

        .footer-address-line {
          font-size: 7.5pt;
          font-weight: 500;
          color: #374151;
        }

        .footer-bottom-bar {
          height: 3.5px;
          background: linear-gradient(90deg, #4c1d95 0%, #7B1828 50%, #4c1d95 100%);
          border-radius: 2px;
          margin-top: 3px;
        }
      `}</style>
    </>
  );
}

export default function PrintDischargePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-sans">Loading Discharge Document...</div>}>
      <DischargeSheetContent />
    </Suspense>
  );
}
