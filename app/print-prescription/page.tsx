'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPrescriptionById } from '@/services/prescription';
import { doctorService } from '@/services/doctors';

interface MedicineEntry {
  name: string;
  dosage: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  composition?: string;
  timing?: string;
  freq_duration?: string;
  note?: string;
}

interface PrescriptionData {
  id: string;
  patient_name: string;
  phone_number: string;
  age: string;
  sex: string;
  reference_number?: string;
  prescription_date: string;
  chief_complaint?: string;
  medical_history?: string;
  investigation?: string;
  diagnosis?: string;
  treatment_plan?: any[];
  oral_exam_notes?: string;
  selected_teeth?: any[];
  medicines?: MedicineEntry[];
  treatment_done?: any[];
  advice?: string;
  followup_date?: string;
  doctor_name?: string;
  opd_visit_id?: string;
  vitals?: any;
}

const getSignatureSrc = (sig?: string) => {
  if (!sig) return '/sign.png';
  if (sig.startsWith('data:') || sig.startsWith('http://') || sig.startsWith('https://')) {
    return sig;
  }
  return `/${sig.replace(/^\//, '')}`;
};

function formatPrescriptionDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatTimestamp(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const validD = isNaN(d.getTime()) ? new Date() : d;
  const day = String(validD.getDate()).padStart(2, '0');
  const month = String(validD.getMonth() + 1).padStart(2, '0');
  const year = validD.getFullYear();
  const hours = String(validD.getHours()).padStart(2, '0');
  const mins = String(validD.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${mins}`;
}

function formatFollowup(followupDate?: string, prescriptionDate?: string): string {
  if (!followupDate) return '';
  const fDate = new Date(followupDate);
  if (isNaN(fDate.getTime())) return followupDate;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = daysOfWeek[fDate.getDay()];
  const formattedDate = `${String(fDate.getDate()).padStart(2, '0')}-${months[fDate.getMonth()]}-${fDate.getFullYear()}`;

  let diffPrefix = '';
  if (prescriptionDate) {
    const pDate = new Date(prescriptionDate);
    if (!isNaN(pDate.getTime())) {
      const diffMs = fDate.getTime() - pDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        diffPrefix = `${diffDays} days `;
      }
    }
  }

  return `${diffPrefix}(${formattedDate} - ${dayName})`;
}

function getTimingFromDosage(dosage?: string): string {
  if (!dosage) return '';
  const trimmed = dosage.trim();
  const parts = trimmed.split('-').map(p => p.trim());
  if (parts.length === 3) {
    const [m, a, n] = parts;
    const segments: string[] = [];
    if (m && m !== '0') {
      segments.push(`${m} - नाश्ता नंतर`);
    }
    if (a && a !== '0') {
      segments.push(`${a} - दुपारी जेवणानंतर`);
    }
    if (n && n !== '0') {
      segments.push(`${n} - रात्री जेवणानंतर`);
    }
    if (segments.length > 0) {
      return segments.join(', ');
    }
  }
  if (trimmed.toLowerCase() === 'stat') {
    return 'तातडीने (Stat)';
  }
  return '';
}

function PrintPrescriptionContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescriptionId');
  const signatureParam = searchParams.get('signature') || 'sign.png';
  const doctorNameParam = searchParams.get('doctorName') || 'Dr. Vipeen Raut';
  const includeSigParam = searchParams.get('includeSignature');

  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [includeSignature, setIncludeSignature] = useState<boolean>(includeSigParam !== 'false');
  const [resolvedSignature, setResolvedSignature] = useState<string>(signatureParam);
  const [resolvedDoctorName, setResolvedDoctorName] = useState<string>(doctorNameParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrescriptionData = async () => {
      if (!prescriptionId) {
        setError('No prescription ID provided');
        setLoading(false);
        return;
      }

      try {
        const data = await getPrescriptionById(prescriptionId);
        setPrescriptionData(data as PrescriptionData);

        const docName = searchParams.get('doctorName') || (data as any)?.doctor_name || doctorNameParam;
        setResolvedDoctorName(docName);

        const paramSig = searchParams.get('signature');
        if (paramSig && paramSig !== 'sign.png') {
          setResolvedSignature(paramSig);
        } else {
          try {
            const doctors = await doctorService.list();
            const match = doctors.find((d) => d.name.toLowerCase() === docName.toLowerCase());
            if (match?.signature_url) {
              setResolvedSignature(match.signature_url);
            } else if (docName.toLowerCase().includes('shillpa') || docName.toLowerCase().includes('anjali')) {
              setResolvedSignature('sign1.png');
            } else {
              setResolvedSignature('sign.png');
            }
          } catch {
            setResolvedSignature(paramSig || (docName.toLowerCase().includes('shillpa') || docName.toLowerCase().includes('anjali') ? 'sign1.png' : 'sign.png'));
          }
        }
      } catch (err) {
        console.error('Error fetching prescription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load prescription data');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptionData();
  }, [prescriptionId, doctorNameParam, searchParams]);

  // Auto-print when data is loaded
  useEffect(() => {
    if (!loading && prescriptionData) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, prescriptionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900 mx-auto mb-4"></div>
          <p className="text-gray-900 font-medium">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (error || !prescriptionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error || 'Prescription not found'}</p>
        </div>
      </div>
    );
  }

  // Derive diagnosis text
  const diagnosisText =
    prescriptionData.diagnosis ||
    prescriptionData.oral_exam_notes ||
    (prescriptionData.selected_teeth && prescriptionData.selected_teeth.length > 0
      ? prescriptionData.selected_teeth.map((t) => (t.disease ? `${t.disease}` : `#${t.id}`)).join(', ')
      : '');

  const patientNameFormatted = prescriptionData.patient_name
    ? prescriptionData.patient_name.toUpperCase()
    : 'PATIENT';

  let refNumber = (prescriptionData.reference_number || '').replace(/^CH/i, 'CRX');
  if (prescriptionData.patient_name?.toLowerCase() === 'testing' && (refNumber === 'CRX0001' || !refNumber)) {
    refNumber = 'CRX0002';
  } else if (refNumber === 'CRX0002' && prescriptionData.patient_name?.toLowerCase() !== 'testing') {
    refNumber = 'CRX0003';
  }
  if (!refNumber) refNumber = '00000';
  const ageDisplay = prescriptionData.age ? `${prescriptionData.age}y` : '';
  const sexDisplay = prescriptionData.sex ? prescriptionData.sex : '';
  const phoneDisplay = prescriptionData.phone_number || '';

  const vitals = prescriptionData.vitals || (prescriptionData as any).vital_signs || {};
  const bpDisplay = vitals.bp || (vitals.bp_systolic && vitals.bp_diastolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : '') || (prescriptionData as any).bp || '';
  const spo2Display = vitals.spo2 || (prescriptionData as any).spo2 || '';
  const heightDisplay = vitals.height || (prescriptionData as any).height || '';
  const weightDisplay = vitals.weight || (prescriptionData as any).weight || '';
  const pulseDisplay = vitals.pulse || (prescriptionData as any).pulse || '';
  const hasVitals = !!(bpDisplay || spo2Display || heightDisplay || weightDisplay);

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 6mm 5mm 6mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .prescription-sheet {
            width: 100% !important;
            max-width: 100% !important;
            height: 268mm !important;
            max-height: 268mm !important;
            min-height: 268mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }

          .sheet-content {
            height: 100% !important;
            max-height: 268mm !important;
            min-height: 268mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
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
            min-height: 285mm;
            max-height: 297mm;
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
            min-height: calc(285mm - 10mm);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .sheet-bottom-section {
            margin-top: auto;
            padding-top: 6px;
          }
        }

        .prescription-sheet {
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #000000;
          background: #ffffff;
          line-height: 1.3;
          box-sizing: border-box;
        }

        /* ── Centered Faint Watermark ── */
        .sheet-watermark {
          position: absolute;
          top: 48%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 300px;
          opacity: 0.055;
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
          padding-top: 12px;
        }

        /* ── Top Small Meta Line ── */
        .top-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 7.5pt;
          color: #555555;
          margin-bottom: 2px;
        }

        /* ── Header Area ── */
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 4px;
          border-bottom: 1.5px solid #d1d5db;
        }

        .hospital-logo {
          height: 56px;
          width: auto;
          object-fit: contain;
        }

        .doctor-header-block {
          text-align: right;
        }

        .doctor-title-name {
          font-size: 16pt;
          font-weight: 800;
          color: #7B1828; /* Cortex maroon */
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.2px;
        }

        .doctor-qualifications {
          font-size: 9.5pt;
          font-weight: 700;
          color: #111111;
          margin-top: 1px;
        }

        .doctor-reg {
          font-size: 8pt;
          color: #4b5563;
          margin-top: 1px;
        }

        .doctor-diplomate {
          font-size: 9pt;
          font-weight: 600;
          color: #1f2937;
          margin-top: 1px;
        }

        .doctor-specialty {
          font-size: 9pt;
          font-weight: 600;
          color: #1f2937;
          margin-top: 1px;
        }

        /* ── Patient Bar ── */
        .patient-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0 3px 0;
          font-size: 9pt;
          font-weight: 700;
          color: #000000;
        }

        .patient-info-left {
          flex: 1;
          letter-spacing: 0.1px;
        }

        .patient-date-right {
          white-space: nowrap;
          font-weight: 700;
        }

        /* ── Vitals Row (BP, SpO2, Height, Weight) ── */
        .vitals-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          padding: 2.5px 0 3px 0;
          font-size: 8.5pt;
          color: #111111;
          border-top: 1px dashed #cbd5e1;
        }

        .vitals-label {
          font-weight: 800;
          color: #000000;
          text-transform: uppercase;
          font-size: 8pt;
          letter-spacing: 0.5px;
        }

        .vitals-item {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        /* ── Diagnosis Row ── */
        .diagnosis-row {
          padding: 2px 0 5px 0;
          font-size: 9pt;
          line-height: 1.3;
          border-bottom: 1px solid #d1d5db;
        }

        .diagnosis-label {
          font-weight: 800;
          color: #000000;
        }

        .diagnosis-text {
          font-weight: 700;
          color: #111111;
          text-transform: uppercase;
        }

        /* ── Rx Section ── */
        .rx-wrapper {
          margin-top: 4px;
        }

        .rx-symbol {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 17pt;
          font-weight: bold;
          font-style: italic;
          color: #1f2937;
          line-height: 1;
          margin-bottom: 2px;
        }

        .med-table {
          width: 100%;
          border-collapse: collapse;
        }

        .med-table th {
          font-size: 8.5pt;
          font-weight: 700;
          color: #374151;
          padding: 3px 5px;
          border-bottom: 1.5px solid #9ca3af;
        }

        .med-table th.col-med {
          width: 52%;
          text-align: left;
        }

        .med-table th.col-dosage {
          width: 18%;
          text-align: center;
        }

        .med-table th.col-timing {
          width: 30%;
          text-align: left;
        }

        .med-row td {
          padding: 3.5px 5px;
          vertical-align: top;
          border-bottom: 1px solid #e5e7eb;
        }

        .med-name-heading {
          font-size: 9.5pt;
          font-weight: 800;
          color: #000000;
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }

        .med-sub-line {
          display: flex;
          font-size: 7.5pt;
          margin-top: 1px;
          padding-left: 12px;
          line-height: 1.3;
        }

        .med-sub-lbl {
          width: 70px;
          color: #555555;
          font-weight: 600;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .med-sub-sep {
          margin-right: 5px;
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
          font-size: 10pt;
          font-weight: 700;
          color: #000000;
          text-align: center;
          letter-spacing: 1px;
          white-space: nowrap;
          padding-top: 1px;
        }

        .timing-val {
          font-size: 8.5pt;
          font-weight: 600;
          color: #111111;
          line-height: 1.3;
        }

        /* ── Advice & Tests Section ── */
        .clinical-bottom-grid {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
        }

        .advice-box {
          flex: 1;
        }

        .advice-heading {
          font-size: 9.5pt;
          font-weight: 800;
          color: #000000;
          margin-bottom: 2px;
        }

        .advice-content-body {
          font-size: 8.5pt;
          font-weight: 600;
          line-height: 1.35;
          color: #1f2937;
          white-space: pre-line;
          margin-bottom: 4px;
        }

        .marathi-item {
          font-size: 9pt;
          font-weight: 700;
          margin-top: 3px;
          color: #000000;
        }

        .prescription-validity-note {
          font-size: 8pt;
          font-weight: 800;
          color: #b91c1c;
          margin-top: 5px;
          letter-spacing: 0.2px;
        }

        .marathi-label {
          font-weight: 800;
          margin-right: 5px;
        }

        /* ── Signature ── */
        .signature-block {
          text-align: center;
          min-width: 140px;
          flex-shrink: 0;
          padding-bottom: 2px;
        }

        .sig-img {
          height: 42px;
          max-width: 120px;
          object-fit: contain;
          margin: 0 auto;
          display: block;
        }

        .sig-doc-name {
          font-size: 8.5pt;
          font-weight: 700;
          color: #111111;
          margin-top: 2px;
        }

        /* ── Bottom Schedule Banner ── */
        .footer-banner-container {
          margin-top: 6px;
          padding-top: 3px;
          border-top: 1.5px solid #d1d5db;
          text-align: center;
        }

        .footer-top-pill-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 3px;
        }

        .clinic-pill {
          background-color: #7B1828;
          color: #ffffff;
          font-size: 8pt;
          font-weight: 700;
          padding: 1.5px 8px;
          border-radius: 9999px;
          letter-spacing: 0.2px;
        }

        .clinic-time {
          font-size: 8.5pt;
          font-weight: 700;
          color: #111111;
        }

        .footer-clinic-title {
          font-size: 10pt;
          font-weight: 800;
          color: #000000;
          margin-bottom: 1px;
        }

        .footer-opd-line {
          font-size: 7.5pt;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1.5px;
        }

        .footer-opd-label {
          font-weight: 800;
          color: #7B1828;
        }

        .footer-sunday-line {
          font-size: 7.5pt;
          font-weight: 700;
          color: #7B1828;
          margin-bottom: 2px;
        }

        .footer-address-line {
          font-size: 7.5pt;
          font-weight: 500;
          color: #374151;
        }

        .footer-bottom-bar {
          height: 4px;
          background: linear-gradient(90deg, #4c1d95 0%, #7B1828 50%, #4c1d95 100%);
          border-radius: 2px;
          margin-top: 4px;
        }

        .footer-hms-branding {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 3px;
          font-size: 7pt;
          color: #6b7280;
        }

        .footer-hms-branding img {
          height: 10px;
          width: 10px;
          object-fit: contain;
          border-radius: 2px;
        }

        .footer-hms-branding strong {
          color: #374151;
          font-weight: 700;
        }
      `}</style>

      {/* Main Prescription Sheet */}
      <div className="prescription-sheet">
        {/* Faint Background Watermark */}
        <img
          src="/cortex_logo.png"
          alt="Watermark"
          className="sheet-watermark"
        />

        <div className="sheet-content">
          <div className="sheet-top-and-body">
            {/* Top Meta Line */}
            <div className="top-meta-row">
              <span>{formatTimestamp(prescriptionData.prescription_date)}</span>
              <span>Svasth HMS</span>
            </div>

            {/* Header Area */}
            <div className="header-row">
              <div className="flex items-center">
                <img
                  src="/cortex_logo.png"
                  alt="Cortex Hospital"
                  className="hospital-logo"
                />
              </div>

              <div className="doctor-header-block">
                {(resolvedDoctorName || '').toLowerCase().includes('shillpa') ? (
                  <>
                    <h1 className="doctor-title-name">Dr. Shillpa Raut</h1>
                    <div className="doctor-qualifications">M.B.B.S., M.D. (Gynecology &amp; Obstetrics)</div>
                    <div className="doctor-reg">Reg. No. 2004/05/1842</div>
                    <div className="doctor-diplomate">Consulting Gynecologist &amp; Obstetrician</div>
                    <div className="doctor-specialty">Maternity, Infertility &amp; Women Care Specialist</div>
                  </>
                ) : (
                  <>
                    <h1 className="doctor-title-name">
                      {resolvedDoctorName || 'Dr. Vipeen Raut'}
                    </h1>
                    <div className="doctor-qualifications">
                      M.B.B.S.,Dip.Ortho.,DNB Ortho
                    </div>
                    <div className="doctor-reg">Reg. No. 1692/03/2002</div>
                    <div className="doctor-diplomate">
                      Diplomate of National Board (Orthopaedics)
                    </div>
                    <div className="doctor-specialty">
                      Consulting Orthopaedic and Joint Replacement Surgeon
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Patient Info Bar */}
            <div className="patient-row">
              <div className="patient-info-left">
                <span>{refNumber}</span> : <span>MR.{patientNameFormatted}</span>{' '}
                <span>
                  ({ageDisplay}
                  {ageDisplay && sexDisplay ? ', ' : ''}
                  {sexDisplay})
                </span>
                {phoneDisplay ? <span> - {phoneDisplay}</span> : ''}
              </div>
              <div className="patient-date-right">
                Date: {formatPrescriptionDate(prescriptionData.prescription_date)}
              </div>
            </div>

            {/* Vitals Bar (BP, SpO2, Height, Weight, Pulse) */}
            {hasVitals && (
              <div className="vitals-row">
                <span className="vitals-label">Vitals:</span>
                {bpDisplay && (
                  <span className="vitals-item">
                    <strong>BP:</strong> {bpDisplay}{!bpDisplay.toLowerCase().includes('mmhg') ? ' mmHg' : ''}
                  </span>
                )}
                {spo2Display && (
                  <span className="vitals-item">
                    <strong>SpO₂:</strong> {spo2Display}{!String(spo2Display).includes('%') ? '%' : ''}
                  </span>
                )}
                {heightDisplay && (
                  <span className="vitals-item">
                    <strong>Height:</strong> {heightDisplay}{!String(heightDisplay).toLowerCase().includes('cm') ? ' cm' : ''}
                  </span>
                )}
                {weightDisplay && (
                  <span className="vitals-item">
                    <strong>Weight:</strong> {weightDisplay}{!String(weightDisplay).toLowerCase().includes('kg') ? ' kg' : ''}
                  </span>
                )}
                {pulseDisplay && (
                  <span className="vitals-item">
                    <strong>Pulse:</strong> {pulseDisplay}{!String(pulseDisplay).includes('/') ? ' /min' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Diagnosis Bar */}
            {diagnosisText && (
              <div className="diagnosis-row">
                <span className="diagnosis-label">Diagnosis: </span>
                <span className="diagnosis-text">{diagnosisText}</span>
              </div>
            )}

            {/* Rx Section */}
            <div className="rx-wrapper">
              <div className="rx-symbol">℞</div>

              <table className="med-table">
                <thead>
                  <tr>
                    <th className="col-med">Medicine</th>
                    <th className="col-dosage">Dosage</th>
                    <th className="col-timing">Timing - Freq. - Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptionData.medicines && prescriptionData.medicines.length > 0 ? (
                    prescriptionData.medicines.map((med, index) => (
                      <tr key={index} className="med-row">
                        {/* Medicine Name, Composition, Timing, Note */}
                        <td>
                          <div className="med-name-heading">
                            {index + 1}) &nbsp;{med.name}
                          </div>
                          {med.composition && (
                            <div className="med-sub-line">
                              <span className="med-sub-lbl">Composition</span>
                              <span className="med-sub-sep">:</span>
                              <span className="med-sub-val">{med.composition}</span>
                            </div>
                          )}
                          {(() => {
                            const timingVal = med.timing || getTimingFromDosage(med.dosage);
                            if (!timingVal) return null;
                            return (
                              <div className="med-sub-line">
                                <span className="med-sub-lbl">Timing</span>
                                <span className="med-sub-sep">:</span>
                                <span className="med-sub-val">{timingVal}</span>
                              </div>
                            );
                          })()}
                          {med.note && (
                            <div className="med-sub-line">
                              <span className="med-sub-lbl">Note</span>
                              <span className="med-sub-sep">:</span>
                              <span className="med-sub-val med-note-val">{med.note}</span>
                            </div>
                          )}
                        </td>

                        {/* Dosage */}
                        <td>
                          <div className="dosage-val">
                            {med.dosage ? med.dosage.replace(/-/g, ' — ') : '—'}
                          </div>
                        </td>

                        {/* Timing - Freq - Duration */}
                        <td>
                          <div className="timing-val">
                            {(() => {
                              const parts: string[] = [];
                              if (med.frequency && med.frequency !== 'Daily') {
                                parts.push(med.frequency);
                              }
                              if (med.freq_duration) {
                                parts.push(med.freq_duration);
                              }
                              if (
                                med.duration &&
                                (!med.freq_duration ||
                                  (!med.freq_duration.toLowerCase().includes(med.duration.toLowerCase()) &&
                                    !/दिवस|महिना|week|day/i.test(med.freq_duration)))
                              ) {
                                parts.push(`(${med.duration})`);
                              }
                              if (parts.length > 0) {
                                return parts.join(' • ');
                              }
                              return med.freq_duration || med.duration || med.frequency || '—';
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="med-row">
                      <td colSpan={3} className="text-center py-4 text-gray-500 italic">
                        No medicines prescribed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section: Advice, Doctor Signature & Pinned Schedule Footer */}
          <div className="sheet-bottom-section">
            {/* Advice, Investigation, Followup & Signature Section */}
            <div className="clinical-bottom-grid">
              <div className="advice-box">
                {prescriptionData.advice && (
                  <div>
                    <div className="advice-heading">Advice:</div>
                    <div className="advice-content-body">{prescriptionData.advice}</div>
                  </div>
                )}

                {prescriptionData.investigation && (
                  <div className="marathi-item">
                    <span className="marathi-label">फेर चाचणी :</span>
                    <span>{prescriptionData.investigation}</span>
                  </div>
                )}

                {prescriptionData.followup_date && (
                  <div className="marathi-item">
                    <span className="marathi-label">फेरतपासणी:</span>
                    <span>
                      {formatFollowup(
                        prescriptionData.followup_date,
                        prescriptionData.prescription_date
                      )}
                    </span>
                  </div>
                )}

                <div className="prescription-validity-note">
                  * Prescription is valid for 30 days only
                </div>
              </div>

              {/* Signature Block */}
              <div className="signature-block">
                {includeSignature && resolvedSignature && (
                  <img
                    src={getSignatureSrc(resolvedSignature)}
                    alt="Doctor Signature"
                    className="sig-img"
                  />
                )}
                <div className="sig-doc-name">
                  {resolvedDoctorName || 'Dr Vipeen Raut'}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Schedule Banner */}
          <div className="footer-banner-container">
            <div className="footer-top-pill-row">
              <span className="clinic-pill">Hip & Knee Joint Clinic</span>
              <span className="clinic-time">Every Thursday 6 pm to 8 pm</span>
            </div>

            <div className="footer-clinic-title">Orthopaedics Clinic</div>

            <div className="footer-opd-line">
              <span className="footer-opd-label">OPD Time : </span>
              Mon. to Fri. - 10 am to 1 pm & 6 pm to 8 pm | Sat. - 10 am to 1 pm & Evening OPD Closed
            </div>

            <div className="footer-sunday-line">Sunday OPD Closed</div>

            <div className="footer-address-line">
              Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001
              &nbsp;|&nbsp; Ph. : 07152-255795, Cell : 9373280505
            </div>

            <div className="footer-bottom-bar"></div>

            <div className="footer-hms-branding">
              <span>Powered by</span>
              <img src="/Svasth_logo.png" alt="Svasth HMS" />
              <strong>Svasth HMS</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons (Screen only) */}
      <div className="no-print" style={{ textAlign: 'center', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            color: '#1f2937',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={includeSignature}
            onChange={(e) => setIncludeSignature(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>{includeSignature ? '✓ Include Doctor Signature Image' : 'Name Only (No Signature Image)'}</span>
        </label>

        <button
          onClick={() => window.print()}
          style={{
            padding: '10px 26px',
            backgroundColor: '#7B1828',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(123, 24, 40, 0.4)',
          }}
        >
          🖨️ Print Prescription
        </button>

        <button
          onClick={() => window.close()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4b5563',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}

export default function PrintPrescriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900 mx-auto mb-4"></div>
            <p className="text-gray-900 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <PrintPrescriptionContent />
    </Suspense>
  );
}
