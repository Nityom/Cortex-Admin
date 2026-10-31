'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPrescriptionById } from '@/services/prescription';
import { doctorService } from '@/services/doctors';
import { hospitalConfig, getDoctorProfile } from '@/config/hospital';

interface DosageSchedule {
  dosage: string;
  unit?: string;
  time?: string;
  when?: string;
  where?: string;
  frequency?: string;
  duration?: string;
  start_from?: string;
  to_date?: string;
  details?: string;
  notes?: string;
}

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
  unit?: string;
  when?: string;
  where?: string;
  schedules?: DosageSchedule[];
}

interface PrescriptionData {
  id: string;
  patient_name: string;
  phone_number: string;
  age: string;
  sex: string;
  reference_number?: string;
  token?: string;
  prescription_date: string;
  chief_complaint?: string;
  medical_history?: string;
  investigation?: string;
  diagnosis?: string;
  treatment_plan?: any[];
  oral_exam_notes?: string;
  findings?: string;
  clinical_findings?: string;
  diet_exercise?: string;
  referral_doctor?: string;
  drawing_data?: string;
  selected_teeth?: any[];
  medicines?: MedicineEntry[];
  treatment_done?: any[];
  advice?: string;
  followup_date?: string;
  doctor_name?: string;
  opd_visit_id?: string;
  vitals?: any;
  section_order?: string[];
  enabled_sections?: Record<string, boolean>;
}

const getSignatureSrc = (sig?: string) => {
  if (!sig || typeof sig !== 'string') return '/sign.png';
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
  if (!dosage || typeof dosage !== 'string') return '';
  const trimmed = dosage.trim();
  const clean = trimmed.toLowerCase();

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

  const parts = trimmed.split('-').map(p => p.trim());
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

function PrintPrescriptionContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescriptionId') || searchParams.get('id');
  const signatureParam = searchParams.get('signature') || 'sign.png';
  const doctorNameParam = searchParams.get('doctorName') || 'Dr. Vipeen Raut';
  const includeSigParam = searchParams.get('includeSignature');
  const headerFooterParam = searchParams.get('headerFooter');

  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [includeSignature, setIncludeSignature] = useState<boolean>(includeSigParam !== 'false');
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState<boolean>(() => {
    if (headerFooterParam !== null) return headerFooterParam !== 'false';
    return true;
  });

  // Configurable letterhead paper margins in mm
  const [margins, setMargins] = useState<{ top: number; bottom: number; left: number; right: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cortex_rx_letterhead_margins');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { top: 38, bottom: 15, left: 7, right: 7 };
  });

  const updateMargin = (key: 'top' | 'bottom' | 'left' | 'right', val: number) => {
    setMargins((prev) => {
      const next = { ...prev, [key]: val };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cortex_rx_letterhead_margins', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const [resolvedSignature, setResolvedSignature] = useState<string>(signatureParam);
  const [resolvedDoctorName, setResolvedDoctorName] = useState<string>(doctorNameParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prescriptionData?.enabled_sections?.header_footer !== undefined && headerFooterParam === null) {
      setIncludeHeaderFooter(prescriptionData.enabled_sections.header_footer !== false);
    }
  }, [prescriptionData, headerFooterParam]);

  useEffect(() => {
    let isMounted = true;

    const fetchPrescriptionData = async () => {
      try {
        let data: any = null;

        // 1. Try fetching from Convex if valid ID provided
        if (prescriptionId && prescriptionId !== 'draft' && prescriptionId !== 'null' && prescriptionId !== 'undefined') {
          try {
            data = await getPrescriptionById(prescriptionId);
          } catch (fetchErr) {
            console.warn('Could not fetch prescription from Convex:', fetchErr);
          }
        }

        // 2. If Convex returned null or prescriptionId is draft/unsaved, fallback to localStorage
        if (!data && typeof window !== 'undefined') {
          try {
            const localRaw = localStorage.getItem('cortex_printable_prescription');
            if (localRaw) {
              const parsedLocal = JSON.parse(localRaw);
              if (
                !prescriptionId ||
                prescriptionId === 'draft' ||
                parsedLocal.id === prescriptionId ||
                parsedLocal._id === prescriptionId ||
                !parsedLocal.id
              ) {
                data = parsedLocal;
              }
            }
          } catch (storageErr) {
            console.warn('Could not load prescription snapshot from localStorage:', storageErr);
          }
        }

        if (!data) {
          if (!prescriptionId) {
            setError('No prescription ID provided');
          } else {
            setError('Prescription not found');
          }
          if (isMounted) setLoading(false);
          return;
        }

        // 3. Helper to safely parse JSON strings
        const safeParseJson = (val: any, fallback: any = []) => {
          if (typeof val === 'string') {
            try {
              const res = JSON.parse(val);
              return res ?? fallback;
            } catch {
              return fallback;
            }
          }
          return val ?? fallback;
        };

        // 4. Normalize data to prevent any .map() or rendering type errors
        const rawMedicines = safeParseJson(data.medicines, []);
        const rawSelectedTeeth = safeParseJson(data.selected_teeth, []);
        const rawTreatmentPlan = safeParseJson(data.treatment_plan, []);
        const rawTreatmentDone = safeParseJson(data.treatment_done, []);
        const rawVitals = typeof data.vitals === 'string'
          ? safeParseJson(data.vitals, {})
          : (data.vitals || (data as any).vital_signs || {});

        const normalizedMedicines: MedicineEntry[] = Array.isArray(rawMedicines)
          ? rawMedicines.map((m: any) => {
              if (typeof m === 'string') return { name: m, dosage: '' };
              return {
                name: String(m?.name || ''),
                dosage: String(m?.dosage || ''),
                frequency: m?.frequency ? String(m.frequency) : undefined,
                duration: m?.duration ? String(m.duration) : undefined,
                quantity: typeof m?.quantity === 'number' ? m.quantity : undefined,
                composition: m?.composition ? String(m.composition) : undefined,
                timing: m?.timing ? String(m.timing) : undefined,
                freq_duration: m?.freq_duration ? String(m.freq_duration) : undefined,
                note: m?.note ? String(m.note) : undefined,
              };
            })
          : [];

        const normalizedSelectedTeeth = Array.isArray(rawSelectedTeeth)
          ? rawSelectedTeeth.map((t: any) => ({
              id: t?.id ?? '',
              type: t?.type || 'Permanent',
              category: t?.category || '',
              disease: t?.disease || '',
            }))
          : [];

        const normalizedData: PrescriptionData = {
          ...data,
          id: data.id || data._id || prescriptionId || '',
          patient_name: data.patient_name || data.patientName || '',
          phone_number: data.phone_number || data.phoneNumber || '',
          age: String(data.age || ''),
          sex: data.sex || '',
          reference_number: data.reference_number || data.referenceNumber || '',
          prescription_date: data.prescription_date || data.date || new Date().toISOString(),
          chief_complaint: data.chief_complaint || data.cc || '',
          medical_history: data.medical_history || data.mh || '',
          findings: data.findings || data.clinical_findings || data.oral_exam_notes || '',
          investigation: data.investigation || '',
          diagnosis: data.diagnosis || data.de || '',
          treatment_plan: Array.isArray(rawTreatmentPlan) ? rawTreatmentPlan : [],
          oral_exam_notes: data.oral_exam_notes || data.diagnosisNotes || '',
          selected_teeth: normalizedSelectedTeeth,
          medicines: normalizedMedicines,
          treatment_done: [], // EXCLUDED: Treatment done is strictly excluded from prescription printout
          advice: data.advice || '',
          diet_exercise: data.diet_exercise || data.dietExercise || '',
          referral_doctor: data.referral_doctor || data.referralDoctor || '',
          drawing_data: data.drawing_data || data.drawingDataUrl || '',
          followup_date: data.followup_date || data.followupDate || '',
          doctor_name: data.doctor_name || data.doctorName || '',
          vitals: rawVitals,
          section_order: Array.isArray(data.section_order) ? data.section_order : undefined,
          enabled_sections: typeof data.enabled_sections === 'object' ? data.enabled_sections : undefined,
        };

        if (isMounted) {
          setPrescriptionData(normalizedData);

          const docName = searchParams.get('doctorName') || normalizedData.doctor_name || doctorNameParam;
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
        }
      } catch (err) {
        console.error('Error fetching prescription:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load prescription data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPrescriptionData();

    return () => {
      isMounted = false;
    };
  }, [prescriptionId, doctorNameParam, signatureParam]);

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

  // Derive diagnosis text (Dr Notes are strictly internal and excluded from prescription printout)
  const diagnosisText =
    prescriptionData.diagnosis ||
    (Array.isArray(prescriptionData.selected_teeth) && prescriptionData.selected_teeth.length > 0
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
  const bpDisplay = vitals.bp || (vitals.bp_systolic && vitals.bp_diastolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : '') || (vitals.bp_systolic ? `${vitals.bp_systolic}` : '') || (prescriptionData as any).bp || '';
  const spo2Display = vitals.spo2 || (prescriptionData as any).spo2 || '';
  const heightDisplay = vitals.height || (prescriptionData as any).height || '';
  const weightDisplay = vitals.weight || (prescriptionData as any).weight || '';
  const pulseDisplay = vitals.pulse || (prescriptionData as any).pulse || '';
  const tempDisplay = vitals.temperature || vitals.temp || (prescriptionData as any).temp || '';
  const bmiDisplay = vitals.bmi || (prescriptionData as any).bmi || '';
  const lmpDisplay = vitals.lmp || (prescriptionData as any).lmp || '';
  const eddDisplay = vitals.edd || (prescriptionData as any).edd || '';
  const gaDisplay = vitals.gestational_age || vitals.ga || (prescriptionData as any).gestational_age || '';
  const hasVitals = !!(bpDisplay || spo2Display || heightDisplay || weightDisplay || pulseDisplay || tempDisplay || bmiDisplay || lmpDisplay || eddDisplay || gaDisplay);

  const formatLmpOrEdd = (val?: string) => {
    if (!val) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const chiefComplaintText = prescriptionData.chief_complaint?.trim();
  const medicalHistoryText = prescriptionData.medical_history?.trim();
  const findingsText = (prescriptionData.findings || prescriptionData.clinical_findings || prescriptionData.oral_exam_notes || '').trim();
  const drawingData = prescriptionData.drawing_data?.trim();

  const enabledSections = (prescriptionData.enabled_sections && Object.keys(prescriptionData.enabled_sections).length > 0)
    ? prescriptionData.enabled_sections
    : (() => {
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('cortex_rx_print_enabled_sections');
            if (saved) return JSON.parse(saved);
          } catch {}
        }
        return {};
      })();
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
  const effectiveOrder = prescriptionData.section_order && prescriptionData.section_order.length > 0
    ? prescriptionData.section_order.filter((k) => k !== 'procedure')
    : DEFAULT_PRINT_ORDER;

  const renderVitals = () => {
    if (enabledSections.vitals === false || !hasVitals) return null;
    return (
      <div key="vitals" className="vitals-row">
        <span className="vitals-label">Vitals:</span>
        {bpDisplay && (
          <span className="vitals-item">
            <strong>BP:</strong> {bpDisplay}{!bpDisplay.toLowerCase().includes('mmhg') ? ' mmHg' : ''}
          </span>
        )}
        {pulseDisplay && (
          <span className="vitals-item">
            <strong>Pulse:</strong> {pulseDisplay}{!String(pulseDisplay).includes('/') ? ' /min' : ''}
          </span>
        )}
        {spo2Display && (
          <span className="vitals-item">
            <strong>SpO₂:</strong> {spo2Display}{!String(spo2Display).includes('%') ? '%' : ''}
          </span>
        )}
        {tempDisplay && (
          <span className="vitals-item">
            <strong>Temp:</strong> {tempDisplay}{!String(tempDisplay).toLowerCase().includes('f') && !String(tempDisplay).toLowerCase().includes('c') ? ' °F' : ''}
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
        {bmiDisplay && (
          <span className="vitals-item">
            <strong>BMI:</strong> {bmiDisplay}
          </span>
        )}
        {lmpDisplay && (
          <span className="vitals-item">
            <strong>LMP:</strong> {formatLmpOrEdd(lmpDisplay)}
          </span>
        )}
        {eddDisplay && (
          <span className="vitals-item">
            <strong>EDD:</strong> {formatLmpOrEdd(eddDisplay)}
          </span>
        )}
        {gaDisplay && (
          <span className="vitals-item">
            <strong>Gestational Age:</strong> {gaDisplay}
          </span>
        )}
      </div>
    );
  };

  const renderComplaints = () => {
    if (enabledSections.complaints === false || !chiefComplaintText) return null;
    return (
      <div key="complaints" className="clinical-strip-section">
        <div className="clinical-strip-row">
          <span className="clinical-strip-lbl">Chief Complaints:</span>
          <span className="clinical-strip-val">{chiefComplaintText}</span>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    if (enabledSections.history === false || !medicalHistoryText) return null;
    return (
      <div key="history" className="clinical-strip-section">
        <div className="clinical-strip-row">
          <span className="clinical-strip-lbl">Medical History:</span>
          <span className="clinical-strip-val">{medicalHistoryText}</span>
        </div>
      </div>
    );
  };

  const renderFindings = () => {
    if (enabledSections.findings === false || !findingsText) return null;
    return (
      <div key="findings" className="clinical-strip-section">
        <div className="clinical-strip-row">
          <span className="clinical-strip-lbl">Clinical Examination:</span>
          <span className="clinical-strip-val">{findingsText}</span>
        </div>
      </div>
    );
  };

  const renderDiagnosis = () => {
    if (enabledSections.diagnosis === false || !diagnosisText) return null;
    return (
      <div key="diagnosis" className="diagnosis-row">
        <span className="diagnosis-label">Diagnosis: </span>
        <span className="diagnosis-text">{diagnosisText}</span>
      </div>
    );
  };

  const renderDrawingBoard = () => {
    if (enabledSections.drawing_board === false) return null;
    if (!drawingData || (!drawingData.startsWith('data:image') && !drawingData.startsWith('http') && drawingData.length < 500)) return null;
    return (
      <div key="drawing_board" className="clinical-sketch-row">
        <span className="clinical-strip-lbl">Clinical Sketch:</span>
        <img src={drawingData} alt="Clinical Sketch" className="clinical-sketch-img" />
      </div>
    );
  };

  const renderMedicines = () => {
    if (enabledSections.medicines === false) return null;
    return (
      <div key="medicines" className="rx-wrapper">
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
            {Array.isArray(prescriptionData.medicines) && prescriptionData.medicines.length > 0 ? (
              prescriptionData.medicines.map((med, index) => (
                <tr key={index} className="med-row">
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
                      const timingVal = med.timing || (typeof med.dosage === 'string' ? getTimingFromDosage(med.dosage) : '');
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
                  <td>
                    {med.schedules && med.schedules.length > 1 ? (
                      <div className="space-y-1">
                        {med.schedules.map((s, si) => (
                          <div key={si} className="dosage-val">
                            {s.dosage ? String(s.dosage).replace(/-/g, ' — ') : '—'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="dosage-val">
                        {med.dosage ? String(med.dosage).replace(/-/g, ' — ') : '—'}
                      </div>
                    )}
                  </td>
                  <td>
                    {med.schedules && med.schedules.length > 1 ? (
                      <div className="space-y-1.5">
                        {med.schedules.map((s, si) => (
                          <div key={si} className="timing-val text-[8.5pt]">
                            <span className="font-bold">{s.frequency || 'Daily'}</span>
                            {s.duration ? ` • ${s.duration}` : ''}
                            {s.when ? ` • ${s.when}` : ''}
                            {s.where ? ` • ${s.where}` : ''}
                            {s.notes ? ` (${s.notes})` : ''}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="timing-val">
                        {(() => {
                          const parts: string[] = [];
                          if (med.frequency && med.frequency !== 'Daily') {
                            parts.push(String(med.frequency));
                          }
                          if (med.freq_duration) {
                            parts.push(String(med.freq_duration));
                          }
                          if (
                            med.duration &&
                            (!med.freq_duration ||
                              (!String(med.freq_duration).toLowerCase().includes(String(med.duration).toLowerCase()) &&
                                !/दिवस|महिना|week|day/i.test(String(med.freq_duration))))
                          ) {
                            parts.push(`(${med.duration})`);
                          }
                          if (parts.length > 0) {
                            return parts.join(' • ');
                          }
                          return med.freq_duration ? String(med.freq_duration) : (med.duration ? String(med.duration) : (med.frequency ? String(med.frequency) : '—'));
                        })()}
                      </div>
                    )}
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
    );
  };

  const renderClinicalNotes = () => {
    if (enabledSections.clinical_notes === false) return null;
    const hasAny = !!(prescriptionData.advice || prescriptionData.diet_exercise || prescriptionData.referral_doctor || prescriptionData.investigation);
    if (!hasAny) return null;
    return (
      <div key="clinical_notes" className="advice-box" style={{ marginTop: '6px' }}>
        {prescriptionData.advice && (
          <div>
            <div className="advice-heading">Advice:</div>
            <div className="advice-content-body">{prescriptionData.advice}</div>
          </div>
        )}
        {prescriptionData.diet_exercise && (
          <div className="marathi-item">
            <span className="marathi-label">Diet &amp; Exercise:</span>
            <span>{prescriptionData.diet_exercise}</span>
          </div>
        )}
        {prescriptionData.referral_doctor && (
          <div className="marathi-item">
            <span className="marathi-label">Referred To:</span>
            <span>{prescriptionData.referral_doctor}</span>
          </div>
        )}
        {prescriptionData.investigation && (
          <div className="marathi-item">
            <span className="marathi-label">फेर चाचणी / Tests :</span>
            <span>{prescriptionData.investigation}</span>
          </div>
        )}
      </div>
    );
  };

  const renderNextVisit = () => {
    if (enabledSections.next_visit === false || !prescriptionData.followup_date) return null;
    return (
      <div key="next_visit" className="marathi-item" style={{ marginTop: '4px' }}>
        <span className="marathi-label">फेरतपासणी (Next Visit):</span>
        <span>
          {formatFollowup(
            prescriptionData.followup_date,
            prescriptionData.prescription_date
          )}
        </span>
      </div>
    );
  };

  const renderSignature = () => {
    if (enabledSections.signature === false) return null;
    return (
      <div key="signature" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
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
    );
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: ${includeHeaderFooter ? '5mm 6mm 5mm 6mm' : `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`};
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
            height: ${includeHeaderFooter ? '268mm' : `calc(297mm - ${margins.top + margins.bottom}mm)`} !important;
            max-height: ${includeHeaderFooter ? '268mm' : `calc(297mm - ${margins.top + margins.bottom}mm)`} !important;
            min-height: ${includeHeaderFooter ? '268mm' : `calc(297mm - ${margins.top + margins.bottom}mm)`} !important;
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
            max-height: ${includeHeaderFooter ? '268mm' : `calc(297mm - ${margins.top + margins.bottom}mm)`} !important;
            min-height: ${includeHeaderFooter ? '268mm' : `calc(297mm - ${margins.top + margins.bottom}mm)`} !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
          }

          .sheet-bottom-section {
            margin-top: ${includeHeaderFooter ? 'auto' : '10px'} !important;
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
            padding: 24px 0 60px 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .prescription-sheet {
            width: 210mm;
            min-height: 297mm;
            max-width: 210mm;
            margin: 0 auto 40px auto;
            background: #ffffff;
            box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
            padding: ${includeHeaderFooter ? '5mm 7mm 8mm 7mm' : `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`};
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
          }

          .sheet-content {
            height: 100%;
            min-height: calc(297mm - ${includeHeaderFooter ? '10mm' : `${margins.top + margins.bottom}mm`});
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }

          .sheet-bottom-section {
            margin-top: ${includeHeaderFooter ? 'auto' : '16px'};
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

        /* ── Clinical Strip (Complaints, History, Findings) ── */
        .clinical-strip-section {
          padding: 3px 0 3px 0;
          font-size: 8.5pt;
          line-height: 1.35;
          border-top: 1px dashed #cbd5e1;
          border-bottom: 1px solid #d1d5db;
        }

        .clinical-strip-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 1.5px;
        }

        .clinical-strip-lbl {
          font-weight: 800;
          color: #000000;
          font-size: 8pt;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }

        .clinical-strip-val {
          font-weight: 600;
          color: #111111;
        }

        .clinical-sketch-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 3px 0;
          border-bottom: 1px dashed #cbd5e1;
        }

        .clinical-sketch-img {
          max-height: 70px;
          max-width: 150px;
          object-fit: contain;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #ffffff;
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
          justify-content: center;
          gap: 5px;
          margin-top: 10px;
          padding-top: 4px;
          font-size: 7.5pt;
          color: #64748b;
          text-align: center;
        }

        .footer-hms-branding img {
          height: 12px;
          width: auto;
          object-fit: contain;
          border-radius: 2px;
          display: inline-block;
          vertical-align: middle;
        }

        .footer-hms-branding strong {
          color: #0d9488;
          font-weight: 800;
        }
      `}</style>

      {/* Main Prescription Sheet */}
      <div className="prescription-sheet">
        {/* Faint Background Watermark (Only rendered on plain paper with Header & Footer) */}
        {includeHeaderFooter && (
          <img
            src="/cortex_logo.png"
            alt="Watermark"
            className="sheet-watermark"
          />
        )}

        <div className="sheet-content">
          <div className="sheet-top-and-body">
            {/* Top Meta Line */}
            {includeHeaderFooter && (
              <div className="top-meta-row">
                <span>{formatTimestamp(prescriptionData.prescription_date)}</span>
                <span>Svasth HMS</span>
              </div>
            )}

            {/* Header Area or Pre-printed Letterhead Top Spacing */}
            {includeHeaderFooter ? (
              <div className="header-row">
                <div className="flex items-center">
                  <img
                    src={hospitalConfig.branding.logoUrl}
                    alt={hospitalConfig.name}
                    className="hospital-logo"
                  />
                </div>

                <div className="doctor-header-block">
                  {(() => {
                    const activeDoc = getDoctorProfile(resolvedDoctorName);
                    return (
                      <>
                        <h1 className="doctor-title-name">
                          {activeDoc?.name || resolvedDoctorName || 'Consulting Physician'}
                        </h1>
                        <div className="doctor-qualifications">
                          {activeDoc?.degrees || ''}
                        </div>
                        {activeDoc?.registrationNumber && (
                          <div className="doctor-reg">Reg. No. {activeDoc.registrationNumber}</div>
                        )}
                        {activeDoc?.designation && (
                          <div className="doctor-diplomate">
                            {activeDoc.designation}
                          </div>
                        )}
                        <div className="doctor-specialty">
                          {activeDoc?.specialty === 'gynecology'
                            ? 'Maternity, Infertility & Women Care Specialist'
                            : activeDoc?.designation || hospitalConfig.tagline}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {/* Patient Info Bar */}
            <div className="patient-row">
              <div className="patient-info-left">
                <span>{refNumber}</span>
                {prescriptionData.token ? (
                  <span style={{ marginLeft: '4px', fontSize: '8pt', fontWeight: 'bold' }}>
                    [Token #{prescriptionData.token}]
                  </span>
                ) : null}{' '}
                : <span>MR.{patientNameFormatted}</span>{' '}
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

            {/* Dynamic Body Sections in Doctor Custom Order */}
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

          {/* Bottom Section: Validity Note */}
          <div className="sheet-bottom-section">
            <div className="prescription-validity-note">
              * Prescription is valid for 30 days only
            </div>
          </div>

          {/* Footer Schedule Banner (Only rendered on plain paper with Header & Footer) */}
          {includeHeaderFooter && (
            <div className="footer-banner-container">
              {hospitalConfig.schedule.clinicDetails && (
                <div className="footer-top-pill-row">
                  <span className="clinic-pill">{hospitalConfig.schedule.clinicDetails.split('•')[0]?.trim()}</span>
                  <span className="clinic-time">{hospitalConfig.schedule.clinicDetails.split('•')[1]?.trim() || ''}</span>
                </div>
              )}

              <div className="footer-clinic-title">{hospitalConfig.tagline}</div>

              <div className="footer-opd-line">
                <span className="footer-opd-label">OPD Time : </span>
                {hospitalConfig.schedule.opdTimings}
              </div>

              {hospitalConfig.schedule.sundayStatus && (
                <div className="footer-sunday-line">{hospitalConfig.schedule.sundayStatus}</div>
              )}

              <div className="footer-address-line">
                {hospitalConfig.address.fullFormatted}
                &nbsp;|&nbsp; Ph. : {hospitalConfig.contacts.phones.join(', ')}
              </div>

              <div className="footer-bottom-bar"></div>
            </div>
          )}

          {/* Centered Powered by Svasth-HMS Line at Bottom */}
          {hospitalConfig.branding.poweredBySvasth && (
            <div className="footer-hms-branding">
              <span>Powered by</span>
              <img src={hospitalConfig.branding.svasthLogoUrl} alt="Svasth HMS" />
              <strong>Svasth-HMS</strong>
            </div>
          )}
        </div>
      </div>

      {/* Buttons & Checkbox Controls (Screen only) */}
      <div className="no-print" style={{ textAlign: 'center', padding: '24px 0', marginTop: '40px', marginBottom: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
        {/* Header & Footer Toggle Checkbox */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: includeHeaderFooter ? '#f0fdfa' : '#fffbeb',
            padding: '10px 18px',
            borderRadius: '8px',
            border: `1.5px solid ${includeHeaderFooter ? '#0d9488' : '#f59e0b'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            color: includeHeaderFooter ? '#0f766e' : '#b45309',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={includeHeaderFooter}
            onChange={(e) => setIncludeHeaderFooter(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>
            {includeHeaderFooter
              ? '✓ With Header & Footer (Plain Paper)'
              : 'Without Header & Footer (Letterhead Paper)'}
          </span>
        </label>

        {/* Doctor Signature Checkbox */}
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

        {/* Letterhead Paper Margins (mm) Controls */}
        {!includeHeaderFooter && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1.5px solid #f59e0b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              fontSize: '12px',
              fontWeight: '600',
              color: '#334155',
            }}
          >
            <span style={{ fontWeight: '800', color: '#b45309' }}>📐 Margins (mm):</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Top:
              <input
                type="number"
                min="0"
                max="120"
                value={margins.top}
                onChange={(e) => updateMargin('top', Number(e.target.value) || 0)}
                style={{ width: '48px', padding: '3px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Bottom:
              <input
                type="number"
                min="0"
                max="120"
                value={margins.bottom}
                onChange={(e) => updateMargin('bottom', Number(e.target.value) || 0)}
                style={{ width: '48px', padding: '3px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Left:
              <input
                type="number"
                min="0"
                max="80"
                value={margins.left}
                onChange={(e) => updateMargin('left', Number(e.target.value) || 0)}
                style={{ width: '44px', padding: '3px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Right:
              <input
                type="number"
                min="0"
                max="80"
                value={margins.right}
                onChange={(e) => updateMargin('right', Number(e.target.value) || 0)}
                style={{ width: '44px', padding: '3px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </label>
          </div>
        )}

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
