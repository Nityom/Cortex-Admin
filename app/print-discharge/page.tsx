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
    id?: string;
    date: string;
    time: string;
    bp: string;
    pulse: string;
    temp: string;
    spo2: string;
    respRate?: string;
    weight?: string;
    recordedBy?: string;
  }>;
  procedures?: Array<{
    id: string;
    name: string;
    date: string;
    surgeon: string;
    notes?: string;
    cost?: number;
  }>;
  investigations?: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
    result?: string;
    cost?: number;
  }>;
  doctorNotes?: Array<{
    id?: string;
    date: string;
    time: string;
    doctor: string;
    note: string;
    plan: string;
  }>;
  medications?: Array<{
    id?: string;
    name: string;
    dosage: string;
    route: string;
    frequency: string;
    timing: string;
    status: string;
  }>;
  nursingNotes?: Array<{
    id?: string;
    date: string;
    shift: string;
    note: string;
    nurse?: string;
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
  const includeClinicalParam = searchParams.get('includeClinicalSheet');

  const [admission, setAdmission] = useState<IPDAdmission | null>(null);
  const [includeSignature, setIncludeSignature] = useState<boolean>(includeSigParam !== 'false');
  const [includeClinicalSheet, setIncludeClinicalSheet] = useState<boolean>(includeClinicalParam !== 'false');
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

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 transition">
            <input
              type="checkbox"
              checked={includeClinicalSheet}
              onChange={(e) => setIncludeClinicalSheet(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
            <span>{includeClinicalSheet ? "✓ Full Clinical Sheet Included" : "Summary Only (No Clinical Logs)"}</span>
          </label>

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

            {/* Official Hospital Discharge Document Footer */}
            <div className="discharge-footer">
              <div className="discharge-footer-contact">
                <strong>CORTEX HOSPITAL &amp; RESEARCH CENTRE</strong> • Beside Urich Mall, Aarti Square, Nagpur Road, Wardha (M.S) - 442001 • Mobile: +91 9373280505
              </div>
              <div className="discharge-footer-disclaimer">
                This Inpatient Discharge Summary &amp; Clinical Report is a confidential medical record. Please bring this summary during follow-up visits.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Official A4 Clinical Stay Sheet (Annexure) ── */}
      {includeClinicalSheet && (
        <div className="prescription-sheet clinical-sheet-annexure">
          <img
            src="/cortex_logo.png"
            alt="Watermark"
            className="sheet-watermark"
          />

          <div className="sheet-content">
            <div className="sheet-top-and-body">
              {/* Top Meta Row */}
              <div className="top-meta-row">
                <span>{new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-bold tracking-wider">CORTEX HOSPITAL • INPATIENT CLINICAL CASE SHEET &amp; STAY LOG</span>
                <span>PAGE 2 (ANNEXURE)</span>
              </div>

              {/* Header Row */}
              <div className="header-row">
                <div className="flex items-center gap-3">
                  <img
                    src="/cortex_logo.png"
                    alt="Cortex Hospital"
                    className="hospital-logo"
                  />
                </div>

                <div className="doctor-header-block">
                  <h1 className="doctor-title-name">{doctorName}</h1>
                  <div className="doctor-qualifications">
                    {doctorIsGynae ? "M.B.B.S., M.D. (Gynecology & Obstetrics)" : "M.B.B.S., Dip.Ortho., DNB Ortho"}
                  </div>
                  <div className="doctor-specialty">
                    {doctorIsGynae ? "Consulting Gynecologist & Obstetrician" : "Consulting Orthopaedic & Joint Replacement Surgeon"}
                  </div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="doc-banner-row">
                <span className="doc-banner-title">INPATIENT CLINICAL STAY RECORD (CASE SHEET)</span>
              </div>

              {/* Patient Info Strip */}
              <div className="patient-row">
                <div className="patient-info-left">
                  <span>{admission.uhid}</span> • <span>IPD NO: <strong>{admission.ipdNumber}</strong></span> :{' '}
                  <span className="patient-name">MR./MRS. {admission.name.toUpperCase()}</span>{' '}
                  <span>({admission.age} Y, {admission.sex})</span>
                  {admission.phone && <span> - Ph: {admission.phone}</span>}
                </div>
                <div className="patient-date-right">
                  Ward: <strong>{admission.ward}</strong> (Bed {admission.bedNumber})
                </div>
              </div>

              {/* Admission & Stay Meta Row */}
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
                  <span>Stay: </span><strong>{stayDays} {stayDays === 1 ? 'Day' : 'Days'}</strong>
                </div>
                <div>
                  <span>Diagnosis: </span><strong>{admission.dischargeSummary?.finalDiagnosis || admission.provisionalDiagnosis}</strong>
                </div>
              </div>

              {/* 1. TPR & Vitals History Chart */}
              <div className="clinical-section">
                <div className="section-label">1. INPATIENT VITALS &amp; TPR MONITORING LOG (DAILY OBSERVATIONS)</div>
                {admission.vitals && admission.vitals.length > 0 ? (
                  <div className="section-body p-0">
                    <table className="annexure-table">
                      <thead>
                        <tr>
                          <th style={{ width: '16%' }}>Date &amp; Time</th>
                          <th style={{ width: '14%' }}>BP (mmHg)</th>
                          <th style={{ width: '12%' }}>Pulse (/min)</th>
                          <th style={{ width: '12%' }}>Temp (°F)</th>
                          <th style={{ width: '12%' }}>SpO₂ (%)</th>
                          <th style={{ width: '12%' }}>Resp. Rate</th>
                          <th style={{ width: '22%' }}>Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admission.vitals.map((v, i) => (
                          <tr key={i}>
                            <td><strong>{formatDisplayDate(v.date)}</strong> <span className="text-[7pt] text-slate-500">{v.time}</span></td>
                            <td><strong className="font-mono text-slate-900">{v.bp || '—'}</strong></td>
                            <td>{v.pulse ? `${v.pulse} bpm` : '—'}</td>
                            <td>{v.temp ? `${v.temp} °F` : '—'}</td>
                            <td>{v.spo2 ? `${v.spo2}%` : '—'}</td>
                            <td>{v.respRate ? `${v.respRate} /min` : '—'}</td>
                            <td className="text-slate-700">{v.recordedBy || 'Staff Nurse'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="section-body text-slate-500 italic text-[8pt]">No vitals logs recorded during admission.</div>
                )}
              </div>

              {/* 2. Doctor Clinical Round Notes */}
              <div className="clinical-section">
                <div className="section-label">2. DOCTOR DAILY ROUND NOTES &amp; CLINICAL PROGRESS</div>
                {admission.doctorNotes && admission.doctorNotes.length > 0 ? (
                  <div className="section-body p-0">
                    <table className="annexure-table">
                      <thead>
                        <tr>
                          <th style={{ width: '18%' }}>Date &amp; Time</th>
                          <th style={{ width: '22%' }}>Doctor</th>
                          <th style={{ width: '35%' }}>Clinical Observations &amp; Progress</th>
                          <th style={{ width: '25%' }}>Orders / Treatment Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admission.doctorNotes.map((dn, i) => (
                          <tr key={i}>
                            <td><strong>{formatDisplayDate(dn.date)}</strong> <span className="text-[7pt] text-slate-500">{dn.time}</span></td>
                            <td className="font-bold text-slate-900">{dn.doctor}</td>
                            <td>{dn.note}</td>
                            <td className="text-indigo-900 font-medium">{dn.plan || 'Continue current therapy'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="section-body text-slate-500 italic text-[8pt]">No doctor progress notes recorded.</div>
                )}
              </div>

              {/* 3. Inpatient Medication MAR */}
              <div className="clinical-section">
                <div className="section-label">3. INPATIENT MEDICATION ADMINISTRATION RECORD (MAR)</div>
                {admission.medications && admission.medications.length > 0 ? (
                  <div className="section-body p-0">
                    <table className="annexure-table">
                      <thead>
                        <tr>
                          <th style={{ width: '38%' }}>Medicine Name</th>
                          <th style={{ width: '16%' }}>Dosage</th>
                          <th style={{ width: '14%' }}>Route</th>
                          <th style={{ width: '20%' }}>Frequency &amp; Timing</th>
                          <th style={{ width: '12%' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admission.medications.map((m, i) => (
                          <tr key={i}>
                            <td className="font-bold text-slate-900">{m.name}</td>
                            <td>{m.dosage}</td>
                            <td><span className="annexure-tag">{m.route || 'Oral'}</span></td>
                            <td>{m.frequency} {m.timing ? `• ${m.timing}` : ''}</td>
                            <td>
                              <span className={`annexure-status-tag ${m.status === 'Active' ? 'tag-active' : 'tag-stopped'}`}>
                                {m.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="section-body text-slate-500 italic text-[8pt]">No inpatient running medications logged.</div>
                )}
              </div>

              {/* 4. Investigations & Diagnostic Reports */}
              {admission.investigations && admission.investigations.length > 0 && (
                <div className="clinical-section">
                  <div className="section-label">4. DIAGNOSTIC INVESTIGATIONS &amp; LAB FINDINGS</div>
                  <div className="section-body p-0">
                    <table className="annexure-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Investigation / Test</th>
                          <th style={{ width: '18%' }}>Date</th>
                          <th style={{ width: '18%' }}>Status</th>
                          <th style={{ width: '24%' }}>Report Findings / Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admission.investigations.map((inv, i) => (
                          <tr key={i}>
                            <td className="font-bold text-slate-900">{inv.name}</td>
                            <td>{formatDisplayDate(inv.date)}</td>
                            <td>
                              <span className={`annexure-status-tag ${inv.status === 'Completed' ? 'tag-active' : 'tag-pending'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td>{inv.result || 'Normal / Within normal limits'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. Procedures & Surgeries Log (if any) */}
              {admission.procedures && admission.procedures.length > 0 && (
                <div className="clinical-section">
                  <div className="section-label">5. SURGICAL &amp; OPERATIVE PROCEDURES PERFORMED</div>
                  <div className="section-body p-0">
                    <table className="annexure-table">
                      <thead>
                        <tr>
                          <th style={{ width: '38%' }}>Procedure / Surgery</th>
                          <th style={{ width: '18%' }}>Date</th>
                          <th style={{ width: '24%' }}>Surgeon</th>
                          <th style={{ width: '20%' }}>Operative Findings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admission.procedures.map((p, i) => (
                          <tr key={i}>
                            <td className="font-bold text-slate-900">{p.name}</td>
                            <td>{formatDisplayDate(p.date)}</td>
                            <td className="font-semibold text-slate-800">{p.surgeon}</td>
                            <td className="text-slate-600 text-[7.5pt]">{p.notes || 'Successfully performed without complications'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. Nursing Shift Observations */}
              <div className="clinical-section">
                <div className="section-label">6. NURSING CARE &amp; SHIFT OBSERVATIONS LOG</div>
                {admission.nursingNotes && admission.nursingNotes.length > 0 ? (
                  <div className="section-body p-0">
                    <table className="annexure-table">
                      <thead>
                        <tr>
                          <th style={{ width: '20%' }}>Date &amp; Shift</th>
                          <th style={{ width: '58%' }}>Nursing Care, Vitals Monitoring &amp; Patient Condition</th>
                          <th style={{ width: '22%' }}>Duty Nurse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admission.nursingNotes.map((nn, i) => (
                          <tr key={i}>
                            <td><strong>{formatDisplayDate(nn.date)}</strong> <span className="annexure-tag">[{nn.shift}]</span></td>
                            <td>{nn.note}</td>
                            <td className="font-semibold text-slate-700">{nn.nurse || 'Staff Nurse'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="section-body text-slate-500 italic text-[8pt]">Regular routine nursing care provided. Vitals stable throughout stay.</div>
                )}
              </div>
            </div>

            {/* Bottom Signatures for Clinical Sheet */}
            <div className="sheet-bottom-section">
              <div className="clinical-bottom-grid">
                <div className="advice-box">
                  <div className="emergency-notice">
                    <strong>* RECORD VERIFICATION : </strong> This clinical sheet is an official chronological record of inpatient hospital care at Cortex Hospital &amp; Research Centre.
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="signature-block">
                    <div className="h-[38px] flex items-end justify-center">
                      <span className="text-[7.5pt] text-slate-400 italic">Verified Record</span>
                    </div>
                    <div className="sig-doc-name">Nursing In-Charge</div>
                    <div className="sig-doc-sub">IPD Ward Station</div>
                  </div>

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
              </div>

              {/* Official Hospital Discharge Document Footer */}
              <div className="discharge-footer">
                <div className="discharge-footer-contact">
                  <strong>CORTEX HOSPITAL &amp; RESEARCH CENTRE</strong> • Beside Urich Mall, Aarti Square, Nagpur Road, Wardha (M.S) - 442001 • Mobile: +91 9373280505
                </div>
                <div className="discharge-footer-disclaimer">
                  Confidential Patient Clinical Stay Record • Inpatient Medical Records
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

          .clinical-sheet-annexure {
            page-break-before: always !important;
            margin-top: 0 !important;
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
          color: #0f172a;
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

        /* ── Discharge Document Footer ── */
        .discharge-footer {
          margin-top: 6px;
          padding-top: 5px;
          border-top: 1.5px solid #cbd5e1;
          text-align: center;
        }

        .discharge-footer-contact {
          font-size: 8pt;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .discharge-footer-disclaimer {
          font-size: 7pt;
          color: #64748b;
          font-style: italic;
        }

        .prescription-sheet + .prescription-sheet {
          margin-top: 24px;
        }

        .annexure-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.5pt;
        }

        .annexure-table th {
          background: #f1f5f9;
          padding: 2.5px 5px;
          text-align: left;
          font-size: 7pt;
          font-weight: 700;
          color: #334155;
          border-bottom: 1px solid #cbd5e1;
          border-right: 1px solid #f1f5f9;
        }

        .annexure-table td {
          padding: 2.5px 5px;
          border-bottom: 1px solid #f1f5f9;
          border-right: 1px solid #f8fafc;
          vertical-align: top;
          color: #0f172a;
        }

        .annexure-table tr:nth-child(even) {
          background: #fafbfc;
        }

        .annexure-tag {
          display: inline-block;
          font-size: 6.5pt;
          font-weight: 700;
          background: #e2e8f0;
          color: #334155;
          padding: 0.5px 4px;
          border-radius: 2px;
        }

        .annexure-status-tag {
          display: inline-block;
          font-size: 6.5pt;
          font-weight: 700;
          padding: 0.5px 4px;
          border-radius: 2px;
        }

        .tag-active {
          background: #dcfce7;
          color: #166534;
        }

        .tag-stopped {
          background: #fee2e2;
          color: #991b1b;
        }

        .tag-pending {
          background: #fef3c7;
          color: #92400e;
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
