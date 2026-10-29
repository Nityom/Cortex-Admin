'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAllMedicines, deductMedicineStock, addMedicine as createMedicineService } from '@/services/medicine';
import { Medicine } from '@/services/medicine';
import { getAllTemplates, getTemplateById, saveTemplate as saveTemplateService, PrescriptionTemplate } from '@/services/templates';
import { addPrescription, Prescription, getPrescriptionById, updatePrescription } from '@/services/prescription';
import { getOrCreatePatient, getPatientByPhoneNumber, getPatientByReference, getNextPatientReference } from '@/services/patients';
import { Patient } from '@/types/patient';
import { getCurrentUser } from '@/services/adminuser';
import { createBill, Bill, getBillByPrescriptionId, updateBill } from '@/services/bills';
import { deductInventoryStock } from '@/services/inventory';
import { getEnabledConsumablesForDeduction } from '@/services/consumables';
import { deductStockForTreatments } from '@/services/treatmentLinks';
import { materialTransactionService } from '@/services/registers';
import { doctorService } from '@/services/doctors';
import { Doctor } from '@/types/doctor';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';
import { generatePrescriptionPdfBlob } from '@/lib/generate-prescription-client';
import MedicineSearchInput from '@/components/MedicineSearchInput';
import DiagnosisSearchInput from '@/components/DiagnosisSearchInput';
import HealthPlixMedicineTable from '@/components/HealthPlixMedicineTable';
import HealthPlixDrawingBoard from '@/components/HealthPlixDrawingBoard';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import { DosageSchedule } from '@/services/prescription';
import {
  Edit2,
  Copy,
  FileText,
  Undo2,
  Trash2,
  Plus,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Video,
  PhoneCall,
  Save,
  Printer,
  MessageCircle,
  Mail,
  RotateCcw,
  User,
  Phone,
  Activity,
  CheckCircle2,
  BookmarkPlus,
  FolderOpen,
  X,
  BookmarkCheck,
  ArrowRight,
} from 'lucide-react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
}
const convexClient = new ConvexHttpClient(convexUrl);

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
  start_from?: string;
  to_date?: string;
  details?: string;
  schedules?: DosageSchedule[];
}

const MEDICINE_FREQUENCY_OPTIONS = [
  "Stat",
  "Daily",
  "Weekly",
  "Fortnight",
  "Thrice weekly",
  "Bi weekly",
  "Monthly",
] as const;

const DURATION_PRESETS = [
  { label: '3 days', value: '3 days', marathiDays: '3 दिवस' },
  { label: '4 days', value: '4 days', marathiDays: '4 दिवस' },
  { label: '7 days', value: '7 days', marathiDays: '7 दिवस' },
  { label: '10 days', value: '10 days', marathiDays: '10 दिवस' },
  { label: '15 days', value: '15 days', marathiDays: '15 दिवस' },
  { label: '1 month', value: '1 month', marathiDays: '1 महिना' },
  { label: '90 days', value: '90 days', marathiDays: '90 दिवस' },
  { label: '180 days', value: '180 days', marathiDays: '180 दिवस' },
] as const;

// Define dental disease options
const DENTAL_DISEASES = [
  "Dental Caries",
  "Gingivitis",
  "Periodontitis",
  "Pulpitis",
  "Dental Abscess",
  "Tooth Fracture",
  "Root Canal Infection",
  "Enamel Erosion",
  "Dental Hypersensitivity",
  "Malocclusion",
  "Impacted Tooth",
  "Dental Fluorosis",
  "Bruxism (Teeth Grinding)",
  "Temporomandibular Joint Disorder (TMJ)",
  "Oral Candidiasis",
  "Dental Plaque",
  "Dental Calculus",
  "Tooth Discoloration"
];

// Define quadrants
const DENTAL_QUADRANTS = [
  { id: 1, name: "Upper Right Quadrant" },
  { id: 2, name: "Upper Left Quadrant" },
  { id: 3, name: "Lower Left Quadrant" },
  { id: 4, name: "Lower Right Quadrant" }
];

// Define tooth numbers by quadrant with additional teeth
const TEETH_BY_QUADRANT = {
  1: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ],
  2: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ],
  3: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ],
  4: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ]
};

// Treatment plan item with catalog reference, cost, and optional notes
interface TreatmentPlanItem {
  name: string;
  cost: number;
  notes?: string;
}

// Helper to format tooth identification consistently as in the diagnosis dropdown list (e.g. "16 - Tooth 6", "1A - Tooth A")
const getToothDropdownFormat = (id: string | number): string => {
  const str = String(id).trim();
  if (!str || str.toLowerCase().startsWith('general') || str.startsWith('-')) return 'General';
  const quad = str[0];
  const tooth = str.slice(1);
  if (!tooth) return str;
  return `${str} - Tooth ${tooth}`;
};

// Define ToothData interface to match the prescription service
interface ToothData {
  id: number | string;
  type: string;
  category: string;
  disease: string;
  name?: string;
}

interface FormData {
  patientName: string;
  age: string;
  sex: string;
  phoneNumber: string;
  date: string;
  cc: string;
  mh: string;
  investigation: string;
  de: string;
  treatmentPlan: TreatmentPlanItem[];
  advice: string;
  followupDate: string;
  reference_number?: string;
  bp?: string;
  spo2?: string;
  height?: string;
  weight?: string;
  pulse?: string;
  temperature?: string;
}

interface TreatmentItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date?: string;
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

function formatPrescriptionDate(dateStr?: string): string {
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
  const fDate = new Date(followupDate);
  if (isNaN(fDate.getTime())) return followupDate;

  const daysOfWeek = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const dayName = daysOfWeek[fDate.getDay()];
  const formattedDate = `${String(fDate.getDate()).padStart(2, '0')}/${String(fDate.getMonth() + 1).padStart(2, '0')}/${fDate.getFullYear()}`;

  let diffPrefix = '';
  if (prescriptionDate) {
    const pDate = new Date(prescriptionDate);
    if (!isNaN(pDate.getTime())) {
      const diffMs = fDate.getTime() - pDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        diffPrefix = `${diffDays} दिवसानंतर `;
      }
    }
  }

  return `${diffPrefix}(${formattedDate} - ${dayName})`;
}

const PrescriptionPage = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [patientReferenceNumber, setPatientReferenceNumber] = useState<string | undefined>(undefined);
  const [opdVisitId, setOpdVisitId] = useState<string | null>(null);
  const [opdVisit, setOpdVisit] = useState<any>(null);

  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    age: '',
    sex: '',
    phoneNumber: '',
    date: new Date().toISOString().slice(0, 10),
    cc: '',
    mh: '',
    investigation: '',
    de: '',
    treatmentPlan: [],
    advice: '',
    followupDate: '',
    bp: '',
    spo2: '',
    height: '',
    weight: '',
    pulse: '',
    temperature: '',
  });

  const [treatmentItems, setTreatmentItems] = useState<TreatmentItem[]>([]);
  const [newTreatmentStep, setNewTreatmentStep] = useState('');
  const [ioparCount, setIoparCount] = useState<number>(1);
  const [xrayCount, setXrayCount] = useState<number>(1);
  const [bloodCount, setBloodCount] = useState<number>(1);
  const [sugarCount, setSugarCount] = useState<number>(1);
  const XRAY_PRICE = 200;

  // HealthPlix Complaints list
  interface ComplaintRow {
    id: string;
    complaint: string;
    frequency: string;
    severity: string;
    duration: string;
    date: string;
  }
  const [complaintsList, setComplaintsList] = useState<ComplaintRow[]>([]);
  const [newComplaintText, setNewComplaintText] = useState('');
  const [newComplaintFreq, setNewComplaintFreq] = useState('');
  const [newComplaintSeverity, setNewComplaintSeverity] = useState('');
  const [newComplaintDuration, setNewComplaintDuration] = useState('');

  // HealthPlix Findings text
  const [findingsText, setFindingsText] = useState('');

  // HealthPlix Vitals state
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulseVal, setPulseVal] = useState('');
  const [heightVal, setHeightVal] = useState('');
  const [weightVal, setWeightVal] = useState('');
  const [tempVal, setTempVal] = useState('');
  const [bmiVal, setBmiVal] = useState('');
  const [waistHipVal, setWaistHipVal] = useState('');
  const [spo2Val, setSpo2Val] = useState('');
  const [lmpDate, setLmpDate] = useState('');
  const [eddDate, setEddDate] = useState('');
  const [gestationalWeeks, setGestationalWeeks] = useState('');
  const [gestationalDays, setGestationalDays] = useState('');

  // Auto-calculate BMI
  const displayBmi = useMemo(() => {
    const h = parseFloat(heightVal);
    const w = parseFloat(weightVal);
    if (h > 0 && w > 0) {
      const hM = h / 100;
      return (w / (hM * hM)).toFixed(1);
    }
    return bmiVal || '';
  }, [heightVal, weightVal, bmiVal]);

  useEffect(() => {
    if (displayBmi) {
      setBmiVal(displayBmi);
    }
  }, [displayBmi]);

  // HealthPlix Diagnoses list
  interface DiagnosisRow {
    id: string;
    diagnosis: string;
    snomed_code: string;
    duration: string;
    date: string;
  }
  const [diagnosesList, setDiagnosesList] = useState<DiagnosisRow[]>([]);
  const [newDiagnosisCode, setNewDiagnosisCode] = useState('');
  const [newDiagnosisDuration, setNewDiagnosisDuration] = useState('');

  // HealthPlix Next Visit duration
  const [followupCount, setFollowupCount] = useState<string>('25');
  const [followupUnit, setFollowupUnit] = useState<'Days' | 'Weeks' | 'Months'>('Days');

  // HealthPlix Notes
  const [drNotes, setDrNotes] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [procedureAdvice, setProcedureAdvice] = useState('');

  // HealthPlix Tests Requested
  interface TestRow {
    id: string;
    name: string;
    by_when: string;
  }
  const [testsRequested, setTestsRequested] = useState<TestRow[]>([]);
  const [newTestName, setNewTestName] = useState('');
  const [newTestByWhen, setNewTestByWhen] = useState('');

  // HealthPlix Referral
  const [referralDocName, setReferralDocName] = useState('');
  const [referralSpeciality, setReferralSpeciality] = useState('Orthopaedics');
  const [referralPhone, setReferralPhone] = useState('');
  const [referralEmail, setReferralEmail] = useState('');

  // HealthPlix Diet & Exercise
  const [dietExercise, setDietExercise] = useState('');

  // HealthPlix Investigations
  const [investigationText, setInvestigationText] = useState('');

  // HealthPlix Past Medication, Systemic Exam, General Exam
  const [pastMedication, setPastMedication] = useState('');
  const [systemicExam, setSystemicExam] = useState('');
  const [generalExam, setGeneralExam] = useState('');

  // HealthPlix Drawing Board
  const [drawingDataUrl, setDrawingDataUrl] = useState('');

  // Toggle dental arch
  const [showDentalChart, setShowDentalChart] = useState(false);

  // Active language in bottom bar
  const [selectedLanguage, setSelectedLanguage] = useState('Marathi');

  // HealthPlix active tab
  const [activeTab, setActiveTab] = useState<'1st Visit' | 'View Past' | 'Record'>('1st Visit');

  // Template Management States
  const [isLoadTemplateModalOpen, setIsLoadTemplateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateCategoryInput, setTemplateCategoryInput] = useState('Orthopaedics');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('All');
  const [savedTemplatesList, setSavedTemplatesList] = useState<PrescriptionTemplate[]>([]);
  const [templateToast, setTemplateToast] = useState<string | null>(null);

  const showTemplateToast = (msg: string) => {
    setTemplateToast(msg);
    setTimeout(() => setTemplateToast(null), 3500);
  };

  const refreshTemplates = useCallback(() => {
    setSavedTemplatesList(getAllTemplates());
  }, []);

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isStaffUser, setIsStaffUser] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          console.error('No user session found');
          return;
        }

        if (user.email) {
          setUserEmail(user.email);
          setIsStaffUser(user.email === 'staff@shahi.com');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();
  }, []);

  const [medicines, setMedicines] = useState<MedicineEntry[]>([]);
  // New states for teeth selection
  const [selectedTeethNumbers, setSelectedTeethNumbers] = useState<string[]>([]);
  const [selectedDisease, setSelectedDisease] = useState<string>('');
  const [selectedTeeth, setSelectedTeeth] = useState<ToothData[]>([]);
  const [toothSelectionMode, setToothSelectionMode] = useState<'ARCH' | 'DROPDOWN'>('ARCH');

  // State for oral examination notes
  const [oralExamNotes, setOralExamNotes] = useState<string>('');

  // States for managing disease and treatment lists
  const [dentalDiseases, setDentalDiseases] = useState<string[]>(DENTAL_DISEASES);
  const [newDiseaseName, setNewDiseaseName] = useState<string>('');
  const [showAddDiseaseForm, setShowAddDiseaseForm] = useState<boolean>(false);
  const [dentalProcedures, setDentalProcedures] = useState<{ id: number; name: string; price: number }[]>([]);
  const [newTreatmentName, setNewTreatmentName] = useState<string>('');
  const [newTreatmentPrice, setNewTreatmentPrice] = useState<string>('');
  const [showAddTreatmentForm, setShowAddTreatmentForm] = useState<boolean>(false);

  const [medicineOptions, setMedicineOptions] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amountPaid: 0,
    paymentMethod: 'Cash',
    discountPercent: 0,
  });

  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>('Dr. Vipeen Raut');
  const [selectedDoctor, setSelectedDoctor] = useState<'kautilya' | 'anjali'>('kautilya');
  const [showAllMedicines, setShowAllMedicines] = useState<boolean>(false);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);

  // Switch and remember active doctor across tabs & sessions
  const handleDoctorSelect = (docName: string) => {
    setSelectedDoctorName(docName);
    if (docName.toLowerCase().includes('shillpa') || docName.toLowerCase().includes('anjali')) {
      setSelectedDoctor('anjali');
    } else {
      setSelectedDoctor('kautilya');
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cortex_active_doctor', docName);
      } catch (e) {
        console.error('Failed to save active doctor to localStorage:', e);
      }
    }
  };

  // Auto-save new medicine to central medicine database and memory list
  const autoSaveMedicineIfNew = useCallback(async (medName: string, composition?: string) => {
    const trimmed = (medName || '').trim();
    if (!trimmed) return;
    const exists = medicineOptions.some(m => m.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      try {
        const newMed: Medicine = {
          name: trimmed.toUpperCase(),
          composition: composition?.trim() || '',
          doctor_name: selectedDoctorName || 'Both Doctors',
        };
        await createMedicineService(newMed);
        setMedicineOptions(prev => [...prev, newMed]);
        showTemplateToast('Auto-saved new medicine: ' + newMed.name);
      } catch (err) {
        console.warn('Auto-saving new medicine failed:', err);
      }
    }
  }, [medicineOptions, selectedDoctorName]);

  // Apply a selected prescription template to the current consultation
  const applyPrescriptionTemplate = useCallback((tmpl: PrescriptionTemplate) => {
    if (!tmpl) return;

    // 1. Diagnosis
    if (tmpl.diagnosis) {
      setFormData(prev => ({ ...prev, de: tmpl.diagnosis }));
      setDiagnosesList(prev => {
        if (!prev.some(d => d.diagnosis.toLowerCase() === tmpl.diagnosis.toLowerCase())) {
          return [
            ...prev,
            {
              id: String(Date.now()),
              diagnosis: tmpl.diagnosis,
              snomed_code: '',
              duration: '',
              date: formData.date || new Date().toISOString().slice(0, 10),
            },
          ];
        }
        return prev;
      });
    }

    // 2. Medicines with complete schedules
    if (tmpl.medicines && tmpl.medicines.length > 0) {
      setMedicines(JSON.parse(JSON.stringify(tmpl.medicines)));
      // Auto-save any medicine in this template to the medicine database if missing
      tmpl.medicines.forEach(m => {
        if (m.name) autoSaveMedicineIfNew(m.name, m.composition);
      });
    }

    // 3. Complaints
    if (tmpl.complaints && tmpl.complaints.length > 0) {
      const cRows: ComplaintRow[] = tmpl.complaints.map((c, i) => ({
        id: 'tc_' + Date.now() + '_' + i,
        complaint: c.complaint,
        frequency: c.frequency || '',
        severity: c.severity || '',
        duration: c.duration || '',
        date: formData.date || new Date().toISOString().slice(0, 10),
      }));
      setComplaintsList(cRows);
      setFormData(prev => ({ ...prev, cc: tmpl.complaints!.map(c => c.complaint).join(', ') }));
    }

    // 4. Advice, Findings, Vitals & Clinical Notes
    if (tmpl.advice) setFormData(prev => ({ ...prev, advice: tmpl.advice! }));
    if (tmpl.findings) setFindingsText(tmpl.findings);
    if (tmpl.dr_notes) setDrNotes(tmpl.dr_notes);
    if (tmpl.quick_notes) setQuickNotes(tmpl.quick_notes);
    if (tmpl.procedure_advice) setProcedureAdvice(tmpl.procedure_advice);
    if (tmpl.diet_exercise) setDietExercise(tmpl.diet_exercise);
    if (tmpl.investigations) setInvestigationText(tmpl.investigations);
    if (tmpl.general_examinations) setGeneralExam(tmpl.general_examinations);
    if (tmpl.past_medications) setPastMedication(tmpl.past_medications);
    if (tmpl.drawing_board) setDrawingDataUrl(tmpl.drawing_board);

    // Vitals
    if (tmpl.vitals) {
      if (tmpl.vitals.bp_systolic) setBpSystolic(tmpl.vitals.bp_systolic);
      if (tmpl.vitals.bp_diastolic) setBpDiastolic(tmpl.vitals.bp_diastolic);
      if (tmpl.vitals.pulse) setPulseVal(tmpl.vitals.pulse);
      if (tmpl.vitals.height) setHeightVal(tmpl.vitals.height);
      if (tmpl.vitals.weight) setWeightVal(tmpl.vitals.weight);
      if (tmpl.vitals.temperature) setTempVal(tmpl.vitals.temperature);
      if (tmpl.vitals.bmi) setBmiVal(tmpl.vitals.bmi);
      if (tmpl.vitals.waist_hip) setWaistHipVal(tmpl.vitals.waist_hip);
      if (tmpl.vitals.spo2) setSpo2Val(tmpl.vitals.spo2);
      if (tmpl.vitals.lmp) setLmpDate(tmpl.vitals.lmp);
      if (tmpl.vitals.edd) setEddDate(tmpl.vitals.edd);
      if (tmpl.vitals.gestational_weeks) setGestationalWeeks(tmpl.vitals.gestational_weeks);
      if (tmpl.vitals.gestational_days) setGestationalDays(tmpl.vitals.gestational_days);
    }

    // 5. Tests
    if (tmpl.tests_requested && tmpl.tests_requested.length > 0) {
      setTestsRequested(tmpl.tests_requested.map((t, i) => ({
        id: 'tt_' + Date.now() + '_' + i,
        name: t.name,
        by_when: t.by_when || '',
      })));
    }

    // 6. Follow-up
    if (tmpl.followup_count) {
      setFollowupCount(tmpl.followup_count);
      if (tmpl.followup_unit) setFollowupUnit(tmpl.followup_unit);
      const num = parseInt(tmpl.followup_count, 10);
      if (!isNaN(num) && num > 0) {
        const d = new Date();
        const unit = tmpl.followup_unit || 'Days';
        if (unit === 'Days') d.setDate(d.getDate() + num);
        else if (unit === 'Weeks') d.setDate(d.getDate() + num * 7);
        else if (unit === 'Months') d.setMonth(d.getMonth() + num);
        setFormData(prev => ({ ...prev, followupDate: d.toISOString().slice(0, 10) }));
      }
    }

    showTemplateToast('Applied template: ' + tmpl.name);
  }, [autoSaveMedicineIfNew, formData.date]);

  // On mount: remember last active doctor and prefill from OPD queue / URL params
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Remember last active doctor
    try {
      const savedDoc = localStorage.getItem('cortex_active_doctor');
      if (savedDoc) {
        setSelectedDoctorName(savedDoc);
        if (savedDoc.toLowerCase().includes('shillpa') || savedDoc.toLowerCase().includes('anjali')) {
          setSelectedDoctor('anjali');
        } else {
          setSelectedDoctor('kautilya');
        }
      }
    } catch (e) {
      console.error('Error reading active doctor:', e);
    }

    // 2. Read query params if arriving from OPD Management or Patient list
    try {
      const params = new URLSearchParams(window.location.search);
      const qDoc = params.get('doctorName') || params.get('doctor');
      if (qDoc) {
        setSelectedDoctorName(qDoc);
        if (qDoc.toLowerCase().includes('shillpa') || qDoc.toLowerCase().includes('anjali')) {
          setSelectedDoctor('anjali');
        } else {
          setSelectedDoctor('kautilya');
        }
        try {
          localStorage.setItem('cortex_active_doctor', qDoc);
        } catch (_) { }
      }

      const qName = params.get('patientName') || params.get('name');
      const qPhone = params.get('phoneNumber') || params.get('phone');
      const qAge = params.get('age');
      const qSex = params.get('sex');
      let qRef = params.get('reference_number') || params.get('uhid') || params.get('reference');
      if (qRef) {
        qRef = qRef.replace(/^CH/i, 'CRX');
        if (qName?.toLowerCase() === 'testing' && (qRef === 'CRX0001' || qRef === 'CH0001')) {
          qRef = 'CRX0002';
        } else if (qRef === 'CRX0002' && qName?.toLowerCase() !== 'testing') {
          // CRX0002 is already assigned to patient Testing. Any new patient must start at CRX0003
          qRef = 'CRX0003';
        }
      }
      // Check for templateId from query params
      const qTmplId = params.get('templateId');
      if (qTmplId) {
        const tmpl = getTemplateById(qTmplId);
        if (tmpl) {
          setTimeout(() => applyPrescriptionTemplate(tmpl), 150);
        }
      }

      const qBp = params.get('bp');
      const qPulse = params.get('pulse');
      const qSpo2 = params.get('spo2');
      const qHeight = params.get('height');
      const qWeight = params.get('weight');

      if (qName || qPhone || qRef) {
        setFormData(prev => ({
          ...prev,
          patientName: qName || prev.patientName,
          phoneNumber: qPhone || prev.phoneNumber,
          age: qAge || prev.age,
          sex: qSex || prev.sex,
          reference_number: qRef || (prev.reference_number ? prev.reference_number.replace(/^CH/i, 'CRX') : ''),
          bp: qBp || prev.bp,
          pulse: qPulse || prev.pulse,
          spo2: qSpo2 || prev.spo2,
          height: qHeight || prev.height,
          weight: qWeight || prev.weight,
        }));
        if (qRef) {
          setPatientReferenceNumber(qRef);
        } else if (qPhone) {
          getPatientByPhoneNumber(qPhone).then(async (pt) => {
            if (pt) {
              let ref = (pt.reference_number || '').replace(/^CH/i, 'CRX');
              if (pt.name?.toLowerCase() === 'testing' && (ref === 'CRX0001' || !ref)) {
                ref = 'CRX0002';
              } else if (ref === 'CRX0002' && pt.name?.toLowerCase() !== 'testing') {
                ref = 'CRX0003';
              }
              if (ref) {
                setFormData(p => ({ ...p, reference_number: ref }));
                setPatientReferenceNumber(ref);
              }
            } else {
              const nextRef = await getNextPatientReference();
              setFormData(p => ({ ...p, reference_number: nextRef }));
              setPatientReferenceNumber(nextRef);
            }
          }).catch(console.error);
        }
      }
    } catch (e) {
      console.error('Error parsing URL query params in prescription page:', e);
    }
  }, []);

  const filteredMedicineOptions = medicineOptions.filter((med) => {
    if (showAllMedicines) return true;
    const doc = med.doctor_name || 'Both Doctors';
    if (doc === 'Both Doctors' || doc === 'All Doctors' || !doc) return true;
    return doc.toLowerCase() === (selectedDoctorName || '').toLowerCase();
  });

  // Registration / Consultation charge & Doctor Discount (Forwarded to Billing, not printed on prescription)
  const [applyConsultationCharge, setApplyConsultationCharge] = useState<boolean>(false);
  const [consultationCharge, setConsultationCharge] = useState<number>(400);
  const [consultationDiscount, setConsultationDiscount] = useState<number>(0);
  const [isNewPatient, setIsNewPatient] = useState<boolean>(true);
  const [treatmentDiscount, setTreatmentDiscount] = useState<number>(0);

  // Treatment Done entry state
  const [selectedTreatmentName, setSelectedTreatmentName] = useState<string>('');
  const [selectedTreatmentPrice, setSelectedTreatmentPrice] = useState<string>('');
  const [selectedTreatmentQty, setSelectedTreatmentQty] = useState<number>(1);
  const [selectedTreatmentDate, setSelectedTreatmentDate] = useState<string>('');

  // Save procedure name and charge to local custom procedure catalog
  const saveProcedureToCatalog = useCallback((name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDentalProcedures((prev) => {
      const existingIdx = prev.findIndex((p) => p.name.toLowerCase() === trimmed.toLowerCase());
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], price };
      } else {
        const newId = Math.max(...prev.map((p) => p.id), 0) + 1;
        updated = [...prev, { id: newId, name: trimmed, price }];
      }
      try {
        localStorage.setItem('cortex_custom_procedures_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Load custom procedures saved in localStorage on mount
  useEffect(() => {
    try {
      const savedProcs = localStorage.getItem('cortex_custom_procedures_v1');
      if (savedProcs) {
        const parsed = JSON.parse(savedProcs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validProcs = parsed
            .filter((p: any) => p && p.name && p.name.trim())
            .map((p: any) => ({
              id: p.id || Math.random(),
              name: p.name.trim(),
              price: Number(p.price) || 0,
            }));
          setDentalProcedures(validProcs);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Treatment plan catalog search
  const [tpSearchQuery, setTpSearchQuery] = useState('');
  const [showTpDropdown, setShowTpDropdown] = useState(false);
  // Custom cost/notes for a pending plan-item addition
  const [tpPendingName, setTpPendingName] = useState('');
  const [tpPendingCost, setTpPendingCost] = useState<number>(0);
  const [tpPendingNotes, setTpPendingNotes] = useState('');

  // Track last loaded CC to detect changes and reset dependent fields
  const [prevLoadedCC, setPrevLoadedCC] = useState<string>('');

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const data = await getAllMedicines();
        setMedicineOptions(data);
      } catch (err) {
        console.error('Failed to fetch medicines:', err);
      }
    };

    const fetchDoctorsList = async () => {
      try {
        const list = await doctorService.list({ status: 'ACTIVE' });
        if (list && list.length > 0) {
          setAvailableDoctors(list);
          if (!selectedDoctorName) {
            setSelectedDoctorName(list[0].name);
          }
        } else {
          const defaults: Doctor[] = [
            { name: 'Dr. Vipeen Raut', doctor_type: 'MAIN', status: 'ACTIVE', signature_url: '/sign.png' },
            { name: 'Dr. Shillpa Raut', doctor_type: 'MAIN', status: 'ACTIVE', signature_url: '/sign1.png' },
          ];
          setAvailableDoctors(defaults);
        }
      } catch (err) {
        console.error('Failed to fetch doctors list:', err);
      }
    };

    fetchMedicines();
    fetchDoctorsList();

    // Cleanup function to revoke object URL when component unmounts
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    // Reset the success message after 3 seconds
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // When CC field loses focus and the value changed from what was prefilled,
  // clear all dependent clinical fields so the doctor starts fresh.
  const handleCCBlur = () => {
    if (prevLoadedCC && formData.cc.trim() !== prevLoadedCC.trim()) {
      setPrevLoadedCC('');
      setFormData(prevData => ({
        ...prevData,
        investigation: '',
        de: '',
        treatmentPlan: [],
      }));
      setOralExamNotes('');
      setSelectedTeeth([]);
      setTreatmentItems([]);
    }
  };

  // Handle phone number change with patient lookup
  const handlePhoneNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;

    setFormData(prevData => ({ ...prevData, phoneNumber: phoneNumber }));

    if (phoneNumber.length >= 10) {
      try {
        const existingPatient = await getPatientByPhoneNumber(phoneNumber);

        if (existingPatient) {
          setIsNewPatient(false);
          setConsultationCharge(200);
          let ref = (existingPatient.reference_number || '').replace(/^CH/i, 'CRX');
          if (ref === 'CRX0002' && existingPatient.name?.toLowerCase() !== 'testing') {
            ref = 'CRX0003';
          }
          setFormData(prevData => ({
            ...prevData,
            patientName: existingPatient.name,
            age: existingPatient.age?.toString() || '',
            sex: existingPatient.sex || '',
            phoneNumber: existingPatient.phone_number,
            reference_number: ref,
          }));
          setPatientReferenceNumber(ref);

          // Pre-fill clinical fields from the latest prescription
          try {
            const latestRx = await convexClient.query(api.prescriptions.getLatestByPhone, { phone_number: phoneNumber });
            if (latestRx) {
              const safeParse = (data: any, fallback: any = []) => {
                if (typeof data === 'string') { try { return JSON.parse(data); } catch { return fallback; } }
                return data || fallback;
              };
              const normTreatmentPlan = (raw: any): TreatmentPlanItem[] => {
                if (!Array.isArray(raw)) return [];
                return raw.map((item: any) => {
                  if (typeof item === 'string') return { name: item, cost: 0, notes: '' };
                  return { name: item.name || String(item), cost: item.cost || 0, notes: item.notes || '' };
                });
              };

              const loadedCC = latestRx.chief_complaint || '';
              setPrevLoadedCC(loadedCC);

              setFormData(prevData => ({
                ...prevData,
                cc: loadedCC,
                mh: latestRx.medical_history || '',
                investigation: latestRx.investigation || '',
                de: latestRx.diagnosis || '',
                treatmentPlan: normTreatmentPlan(safeParse(latestRx.treatment_plan)),
              }));

              if (latestRx.oral_exam_notes) setOralExamNotes(latestRx.oral_exam_notes);

              const teethRaw = safeParse(latestRx.selected_teeth);
              if (Array.isArray(teethRaw) && teethRaw.length > 0) {
                setSelectedTeeth(teethRaw.map((t: any) => ({
                  id: t.id, type: t.type || 'Permanent', category: t.category || '', disease: t.disease || '',
                })));
              }

              const medsRaw = safeParse(latestRx.medicines);
              if (Array.isArray(medsRaw) && medsRaw.length > 0) setMedicines(medsRaw);

              const doneRaw = safeParse(latestRx.treatment_done);
              if (Array.isArray(doneRaw) && doneRaw.length > 0) {
                setTreatmentItems(doneRaw.map((item: any) => ({
                  id: item.id || Math.random(),
                  description: item.description || '',
                  quantity: item.quantity || 1,
                  unitPrice: item.unit_price || item.unitPrice || 0,
                  total: item.total || 0,
                  date: item.date,
                })));
              }
            }
          } catch (rxError) {
            console.error('Error fetching latest prescription for prefill:', rxError);
          }
        } else {
          // Patient not found in DB -> New patient
          setIsNewPatient(true);
          setConsultationCharge(400);
        }
      } catch (error) {
        console.error('Error fetching patient by phone:', error);
      }
    }
  };

  // Helper function to parse dosage (e.g., "1-0-1" = 2 pills/day, "1-2-1" = 4 pills/day)
  const parseDosage = (dosage: string): number => {
    if (!dosage) return 0;

    // Try to match pattern like "1-0-1" or "1-2-1"
    const dosagePattern = dosage.match(/(\d+)-(\d+)-(\d+)/);
    if (dosagePattern) {
      const morning = parseInt(dosagePattern[1]) || 0;
      const afternoon = parseInt(dosagePattern[2]) || 0;
      const evening = parseInt(dosagePattern[3]) || 0;
      return morning + afternoon + evening;
    }

    // Try pattern like "1-1" (twice a day)
    const twicePattern = dosage.match(/(\d+)-(\d+)/);
    if (twicePattern) {
      const first = parseInt(twicePattern[1]) || 0;
      const second = parseInt(twicePattern[2]) || 0;
      return first + second;
    }

    // Try single number
    const singleNumber = dosage.match(/(\d+)/);
    if (singleNumber) {
      return parseInt(singleNumber[1]) || 0;
    }

    return 0;
  };

  // Helper function to parse duration (e.g., "3 days" = 3, "1 week" = 7, "2 weeks" = 14)
  const parseDuration = (duration: string): number => {
    if (!duration) return 0;

    const lowerDuration = duration.toLowerCase();

    // Match patterns like "3 days", "7 days"
    const daysPattern = lowerDuration.match(/(\d+)\s*(?:day|days)/);
    if (daysPattern) {
      return parseInt(daysPattern[1]) || 0;
    }

    // Match patterns like "1 week", "2 weeks"
    const weeksPattern = lowerDuration.match(/(\d+)\s*(?:week|weeks)/);
    if (weeksPattern) {
      return (parseInt(weeksPattern[1]) || 0) * 7;
    }

    // Match patterns like "1 month", "2 months"
    const monthsPattern = lowerDuration.match(/(\d+)\s*(?:month|months)/);
    if (monthsPattern) {
      return (parseInt(monthsPattern[1]) || 0) * 30;
    }

    // Try just a number (assume days)
    const numberOnly = lowerDuration.match(/(\d+)/);
    if (numberOnly) {
      return parseInt(numberOnly[1]) || 0;
    }

    return 0;
  };

  // Calculate quantity based on dosage and duration
  const calculateQuantity = (dosage: string, duration: string): number => {
    const pillsPerDay = parseDosage(dosage);
    const numberOfDays = parseDuration(duration);
    return pillsPerDay * numberOfDays;
  };

  const handleMedicineChange = (index: number, field: keyof MedicineEntry, value: string | number) => {
    setMedicines(prevMedicines => {
      const updatedMedicines = [...prevMedicines];
      updatedMedicines[index] = {
        ...updatedMedicines[index],
        [field]: value
      };

      // Auto-populate composition when medicine name changes
      if (field === 'name') {
        const found = medicineOptions.find(m => m.name.toLowerCase() === String(value).toLowerCase());
        if (found?.composition) {
          updatedMedicines[index].composition = found.composition;
        }
      }

      // Auto-calculate quantity when dosage or duration changes
      if (field === 'dosage' || field === 'duration') {
        const medicine = updatedMedicines[index];
        const calculatedQty = calculateQuantity(
          field === 'dosage' ? String(value) : medicine.dosage,
          field === 'duration' ? String(value) : (medicine.duration || '')
        );
        if (calculatedQty > 0) {
          updatedMedicines[index].quantity = calculatedQty;
        }
      }

      return updatedMedicines;
    });
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      {
        name: '',
        composition: '',
        dosage: '1-0-1',
        frequency: 'Daily',
        timing: '1 - नाश्ता नंतर, 1 - रात्री जेवणानंतर',
        freq_duration: 'जेवणानंतर - दररोज - 5 दिवस',
        duration: '5 days',
        note: '',
      }
    ]);
  };
  const removeMedicine = (index: number) => {
    const updatedMedicines = [...medicines];
    updatedMedicines.splice(index, 1);
    setMedicines(updatedMedicines);
  };

  const handleDurationSelect = (index: number, durationVal: string, marathiText?: string) => {
    handleMedicineChange(index, 'duration', durationVal);
    setMedicines(prev => {
      const updated = [...prev];
      const curMed = updated[index];
      if (curMed) {
        let fd = curMed.freq_duration || 'जेवणानंतर - दररोज - 5 दिवस';
        if (marathiText && /दिवस|महिना/.test(fd)) {
          fd = fd.replace(/\d+\s*(?:दिवस|महिना)/, marathiText);
        } else if (/days|day|month/i.test(fd)) {
          fd = fd.replace(/\d+\s*(?:days|day|months|month)/i, durationVal);
        } else {
          fd = `${fd} - ${durationVal}`;
        }
        updated[index] = { ...curMed, duration: durationVal, freq_duration: fd };
      }
      return updated;
    });
  };

  // Handler for adding a tooth (or a general, non-tooth-specific diagnosis) to the selected list
  const handleAddTeeth = () => {
    if (!selectedDisease) return;

    if (selectedTeethNumbers?.length) {
      const newTeeth = selectedTeethNumbers.map(toothId => {
        const quadrant = parseInt(toothId[0]);
        const toothPart = toothId.slice(1);
        const isDeciduous = isNaN(Number(toothPart));
        const quadrantName = DENTAL_QUADRANTS.find(q => q.id === quadrant)?.name || `Quadrant ${quadrant}`;

        return {
          id: toothId,
          type: isDeciduous ? 'Deciduous' : 'Permanent',
          category: quadrantName,
          disease: selectedDisease,
          name: `${toothId} - Tooth ${toothPart}`
        };
      });

      setSelectedTeeth([...selectedTeeth, ...newTeeth]);
      setSelectedTeethNumbers([]);
    } else {
      // Not tied to a specific tooth (e.g. Braces treatment, general diagnosis)
      setSelectedTeeth([...selectedTeeth, {
        id: `General-${Date.now()}`,
        type: 'N/A',
        category: 'General',
        disease: selectedDisease,
        name: 'General'
      }]);
    }

    setSelectedDisease('');
  };

  // Handler for removing a tooth from selection
  const handleRemoveTooth = (toothId: number | string) => {
    setSelectedTeeth(teeth => teeth.filter(tooth => tooth.id !== toothId));
  };

  // Handler for adding a new disease to the list
  const handleAddNewDisease = () => {
    if (newDiseaseName.trim() && !dentalDiseases.includes(newDiseaseName.trim())) {
      setDentalDiseases([...dentalDiseases, newDiseaseName.trim()]);
      setNewDiseaseName('');
      setShowAddDiseaseForm(false);
    }
  };

  // Handler for adding a new treatment to the list
  const handleAddNewTreatment = () => {
    if (newTreatmentName.trim() && newTreatmentPrice.trim()) {
      const price = parseFloat(newTreatmentPrice) || 0;
      const newId = Math.max(...dentalProcedures.map(p => p.id), 0) + 1;
      const newProcedure = {
        id: newId,
        name: newTreatmentName.trim(),
        price
      };
      setDentalProcedures([...dentalProcedures, newProcedure]);
      setNewTreatmentName('');
      setNewTreatmentPrice('');
      setShowAddTreatmentForm(false);
    }
  };

  // Handler for removing a disease from the list
  const handleRemoveDisease = (disease: string) => {
    setDentalDiseases(dentalDiseases.filter(d => d !== disease));
  };

  // Handler for removing a treatment from the list
  const handleRemoveTreatment = (treatmentId: number) => {
    setDentalProcedures(dentalProcedures.filter(t => t.id !== treatmentId));
  };


  // Add function to load prescription data
  const loadPrescriptionData = useCallback(async (id: string) => {
    try {

      const prescription = await getPrescriptionById(id);
      if (prescription) {


        // Helper to safely parse JSON strings that might come from the PHP migration
        const safeParse = (data: any, fallback: any = []) => {
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (e) {
              return fallback;
            }
          }
          return data || fallback;
        };

        if (prescription.medicines) {
          const medicinesRaw = safeParse(prescription.medicines);
          if (Array.isArray(medicinesRaw) && medicinesRaw.length > 0) {
            setMedicines(medicinesRaw);
          }
        }

        if (prescription.selected_teeth) {
          const selectedTeethRaw = safeParse(prescription.selected_teeth);
          if (Array.isArray(selectedTeethRaw) && selectedTeethRaw.length > 0) {
            const mappedTeeth = selectedTeethRaw.map((tooth: any) => ({
              id: tooth.id,
              type: tooth.type || 'Permanent',
              category: tooth.category || '',
              disease: tooth.disease || ''
            }));
            setSelectedTeeth(mappedTeeth);
          }
        }

        if (prescription.treatment_done) {
          const treatmentDoneRaw = safeParse(prescription.treatment_done);
          if (Array.isArray(treatmentDoneRaw) && treatmentDoneRaw.length > 0) {
            const mappedItems = treatmentDoneRaw.map((item: any) => ({
              id: item.id || Math.random(),
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || item.unitPrice || 0,
              total: item.total || 0,
              date: item.date
            }));
            setTreatmentItems(mappedItems);
          }
        }

        // Also ensure treatment plan is safely parsed in the main formData setting
        const treatmentPlanRaw = safeParse(prescription.treatment_plan);
        const normTreatmentPlan = (raw: any[]): TreatmentPlanItem[] =>
          raw.map((item: any) => {
            if (typeof item === 'string') return { name: item, cost: 0, notes: '' };
            return { name: item.name || String(item), cost: item.cost || 0, notes: item.notes || '' };
          });

        setFormData({
          patientName: prescription.patient_name || '',
          age: prescription.age ? prescription.age.toString() : '',
          sex: prescription.sex || '',
          phoneNumber: prescription.phone_number || '',
          date: prescription.prescription_date || '',
          cc: prescription.chief_complaint || '',
          mh: prescription.medical_history || '',
          investigation: prescription.investigation || '',
          de: prescription.diagnosis || '',
          treatmentPlan: Array.isArray(treatmentPlanRaw) ? normTreatmentPlan(treatmentPlanRaw) : [],
          advice: prescription.advice || '',
          followupDate: prescription.followup_date || '',
          reference_number: prescription.reference_number || '',
          bp: (prescription.vitals?.bp || (prescription.vitals?.bp_systolic && prescription.vitals?.bp_diastolic ? `${prescription.vitals.bp_systolic}/${prescription.vitals.bp_diastolic}` : '') || (prescription as any).bp || ''),
          spo2: String(prescription.vitals?.spo2 || (prescription as any).spo2 || ''),
          height: String(prescription.vitals?.height || (prescription as any).height || ''),
          weight: String(prescription.vitals?.weight || (prescription as any).weight || ''),
          pulse: String(prescription.vitals?.pulse || (prescription as any).pulse || ''),
          temperature: String(prescription.vitals?.temperature || (prescription as any).temperature || ''),
        });

        // Set reference number in separate state
        setPatientReferenceNumber(prescription.reference_number || '');

        if (prescription.doctor_name) {
          setSelectedDoctorName(prescription.doctor_name);
        }

        if (prescription.oral_exam_notes) {
          setOralExamNotes(prescription.oral_exam_notes);
          setFindingsText(prescription.oral_exam_notes);
          setDrNotes(prescription.oral_exam_notes);
        }

        if (prescription.investigation) {
          setInvestigationText(prescription.investigation);
        }

        // Populate HealthPlix complaints
        if (prescription.chief_complaint) {
          const parts = prescription.chief_complaint.split(',').map((s: string) => s.trim()).filter(Boolean);
          setComplaintsList(parts.map((p: string, i: number) => ({
            id: `c_${i}`,
            complaint: p,
            frequency: '',
            severity: '',
            duration: '',
            date: prescription.prescription_date || '',
          })));
        }

        // Populate HealthPlix diagnoses
        if (prescription.diagnosis) {
          const parts = prescription.diagnosis.split(',').map((s: string) => s.trim()).filter(Boolean);
          setDiagnosesList(parts.map((p: string, i: number) => ({
            id: `d_${i}`,
            diagnosis: p,
            snomed_code: '',
            duration: '',
            date: prescription.prescription_date || '',
          })));
        }

        // Populate HealthPlix vitals
        const pv = prescription.vitals || {};
        if (pv.bp) {
          const bparts = String(pv.bp).split('/');
          setBpSystolic(bparts[0]?.trim() || '');
          setBpDiastolic(bparts[1]?.trim() || '');
        } else {
          setBpSystolic(pv.bp_systolic || '');
          setBpDiastolic(pv.bp_diastolic || '');
        }
        setPulseVal(pv.pulse || '');
        setHeightVal(pv.height || '');
        setWeightVal(pv.weight || '');
        setTempVal(pv.temperature || '');
        setBmiVal(pv.bmi || '');
        setWaistHipVal(pv.waist_hip || '');
        setSpo2Val(pv.spo2 || '');
        setLmpDate(pv.lmp || '');
        setEddDate(pv.edd || '');

        // Existing prescription -> patient is not new, consultation defaults to 200
        setIsNewPatient(false);
        setConsultationCharge(200);

        try {
          const bData = await getBillByPrescriptionId(id);
          const b = Array.isArray(bData) ? bData[0] : bData;
          if (b) {
            if (b.discount_amount) setTreatmentDiscount(b.discount_amount);
            const bItems = typeof b.items === 'string' ? JSON.parse(b.items) : (b.items || []);
            const regItem = bItems.find(
              (it: any) =>
                it.item_type === 'consultation' ||
                (it.description &&
                  (it.description.toLowerCase().includes('consultation') ||
                    it.description.toLowerCase().includes('registration')))
            );
            if (regItem) {
              setApplyConsultationCharge(true);
              setConsultationCharge(regItem.unit_price || regItem.total || 200);
            }
          }
        } catch {
          // ignore error fetching bill on initial load
        }
      }
    } catch (error) {
      console.error('Error loading prescription:', error);
      alert('Failed to load prescription data');
    }
  }, []);

  // Modified function to save prescription to the database
  const savePrescriptionToDatabase = async () => {
    try {
      setSaving(true);

      // Prepare patient data
      const patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'reference_number'> = {
        name: formData.patientName,
        age: parseInt(formData.age, 10),
        sex: formData.sex,
        phone_number: formData.phoneNumber
      };


      let patient;
      try {
        patient = await getOrCreatePatient(patientData);

      } catch (patientError) {
        console.error('Error in getOrCreatePatient:', patientError);
        throw new Error(`Failed to create patient: ${patientError instanceof Error ? patientError.message : 'Unknown error'}`);
      }

      if (!patient) {
        throw new Error('Patient creation returned null or undefined');
      }

      // Check if reference_number exists, if not try to fetch the patient again
      if (!patient.reference_number) {
        console.warn('Patient missing reference_number on first creation, attempting to fetch by phone...');
        try {
          const refetchedPatient = await getPatientByPhoneNumber(formData.phoneNumber);
          if (refetchedPatient && refetchedPatient.reference_number) {

            patient = refetchedPatient;
          } else {
            console.error('Patient still missing reference_number after refetch:', patient);
            throw new Error('Patient created but missing reference number. The database may not have saved correctly. Please try again or contact support.');
          }
        } catch (refetchError) {
          console.error('Error refetching patient:', refetchError);
          throw new Error('Patient created but reference number could not be retrieved. Please refresh the page and try again.');
        }
      }

      // Auto-save any newly typed medicines to the central medicine list
      for (const med of medicines) {
        if (med.name && med.name.trim()) {
          await autoSaveMedicineIfNew(med.name, med.composition);
        }
      }

      // Update form data with the patient's reference number
      setFormData(prev => ({
        ...prev,
        reference_number: patient.reference_number
      }));
      setPatientReferenceNumber(patient.reference_number);


      const bpFull = bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic}` : (formData.bp || '');
      const allComplaints = complaintsList.length > 0 ? complaintsList.map(c => c.complaint).join(', ') : formData.cc;
      const allDiagnoses = diagnosesList.length > 0 ? diagnosesList.map(d => d.diagnosis).join(', ') : formData.de;

      const prescriptionData: Prescription = {
        patient_name: formData.patientName,
        phone_number: formData.phoneNumber,
        age: formData.age,
        sex: formData.sex,
        reference_number: patient.reference_number,
        prescription_date: formData.date,
        chief_complaint: allComplaints,
        medical_history: formData.mh,
        investigation: investigationText || formData.investigation,
        diagnosis: allDiagnoses,
        treatment_plan: formData.treatmentPlan,
        oral_exam_notes: findingsText || oralExamNotes || undefined,
        dr_notes: drNotes || undefined,
        selected_teeth: selectedTeeth,
        medicines: medicines,
        treatment_done: treatmentItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          date: item.date
        })),
        advice: formData.advice,
        followup_date: formData.followupDate || undefined,
        doctor_name: selectedDoctorName || 'Dr. Vipeen Raut',
        opd_visit_id: opdVisitId || undefined,
        vitals: {
          ...(opdVisit?.vitals || {}),
          bp: bpFull,
          bp_systolic: bpSystolic || formData.bp?.split('/')[0]?.trim(),
          bp_diastolic: bpDiastolic || formData.bp?.split('/')[1]?.trim(),
          pulse: pulseVal || formData.pulse,
          height: heightVal || formData.height,
          weight: weightVal || formData.weight,
          temperature: tempVal || formData.temperature,
          spo2: spo2Val || formData.spo2,
          bmi: bmiVal,
          waist_hip: waistHipVal,
          lmp: lmpDate,
          edd: eddDate,
          gestational_age: gestationalWeeks ? `${gestationalWeeks}w ${gestationalDays}d` : '',
        },
      };

      let savedPrescription;
      if (isEditMode && prescriptionId && prescriptionId !== "undefined" && prescriptionId !== "null") {
        // Update existing prescription (images are handled separately in IndexedDB)
        savedPrescription = await updatePrescription(prescriptionId, prescriptionData);
      } else {
        // Create new prescription
        savedPrescription = await addPrescription(prescriptionData);
        if (savedPrescription?.id) {
          setPrescriptionId(savedPrescription.id);
          setIsEditMode(true);
        }
      }

      // If consultation is linked to an OPD visit, mark visit as Completed in Convex
      if (opdVisitId) {
        try {
          if ((api as any).opd?.updateVisitStatus) {
            await convexClient.mutation((api as any).opd.updateVisitStatus, {
              id: opdVisitId as any,
              status: 'Completed',
              doctor_name: selectedDoctorName || 'Dr. Vipeen Raut',
              notes: `Consultation completed & prescription recorded`,
              staff_name: selectedDoctorName || 'Doctor',
            });
          }
        } catch (opdStatusErr) {
          console.warn('Could not update OPD visit to Completed in Convex:', opdStatusErr);
        }
      }

      // Mark OPD queue item as Completed in local storage
      try {
        const qRaw = localStorage.getItem("cortex_opd_queue_v1");
        if (qRaw) {
          const q = JSON.parse(qRaw);
          let matched = false;
          const updatedQ = q.map((item: any) => {
            const isMatch =
              (opdVisitId && item.id === opdVisitId) ||
              (patient?.reference_number && item.uhid === patient?.reference_number) ||
              (formData.phoneNumber && item.phone === formData.phoneNumber);
            if (isMatch) {
              matched = true;
              return { ...item, status: "Completed" };
            }
            return item;
          });
          if (matched) {
            localStorage.setItem("cortex_opd_queue_v1", JSON.stringify(updatedQ));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new CustomEvent("cortex_queue_updated"));
          }
        }
      } catch (queueErr) {
        console.warn("Could not update local OPD queue status to Completed:", queueErr);
      }

      // Auto-record medicine sales when prescription is saved
      if (medicines.length > 0 && savedPrescription?.id && patient?.id) {
        try {

          const salePromises = medicines
            .filter(med => med.name && med.dosage)
            .map(async (med) => {
              try {
                // Find the medicine in medicineOptions to get the ID

                const medicineDetail = medicineOptions.find(m => m.name.toLowerCase() === med.name.toLowerCase());
                if (!medicineDetail || !medicineDetail.id) {
                  console.log(`ℹ️ Medicine "${med.name}" not in inventory master or stock not tracked`);
                  return;
                }

                // If stock is tracked, deduct
                if (medicineDetail.quantity !== undefined && medicineDetail.quantity !== null && medicineDetail.quantity > 0) {
                  const quantity = med.quantity && med.quantity > 0
                    ? med.quantity
                    : (() => {
                      const quantityMatch = (med.dosage || '').toString().match(/[\d.]+/);
                      return quantityMatch ? parseFloat(quantityMatch[0]) : 1;
                    })();

                  if (quantity > 0) {
                    await deductMedicineStock([{ name: medicineDetail.name, quantity: quantity }]);
                  }
                }
              } catch (error) {
                console.warn(`Note: stock deduction skipped for ${med.name}:`, error);
              }
            });

          const results = await Promise.allSettled(salePromises);
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failCount = results.filter(r => r.status === 'rejected').length;
          // console.log(`✅ Medicine sales recording completed: ${successCount} successful, ${failCount} failed`);

          // if (successCount > 0) {
          //   alert(`✅ ${successCount} medicine sale(s) recorded successfully!`);
          // }
        } catch (salesError) {
          console.error('Error during medicine sales recording:', salesError);
          // Don't throw error - prescription is saved, sales recording is secondary
        }
      }

      // Auto-deduct consumable items from inventory for each patient
      // Only deduct for new prescriptions, not when editing existing ones
      if (!isEditMode && savedPrescription?.id) {
        try {
          // Get consumable items from database (managed via Consumable Settings page)
          const consumableItems = await getEnabledConsumablesForDeduction();

          if (consumableItems.length === 0) {
            console.log('⚠️ No consumable items configured. Please add items in Consumable Settings.');
          } else {
            console.log('📦 Deducting consumable items from inventory...');
            const deductionResults = await deductInventoryStock(consumableItems);

            // Log results
            deductionResults.forEach(result => {
              if (result.status === 'success') {
                console.log(`✅ ${result.name}: ${result.message}`);
              } else if (result.status === 'warning') {
                console.warn(`⚠️ ${result.name}: ${result.message}`);
              } else {
                console.error(`❌ ${result.name}: ${result.message}`);
              }
            });

            // Log usage to material transactions for auditing (do NOT record as retail direct sales)
            try {
              const today = new Date().toISOString().split('T')[0];
              const usagePromises = consumableItems.map(async (item) => {
                const result = deductionResults.find(r => r.name === item.name && r.status === 'success');
                if (result) {
                  try {
                    const itemRate = (result as any).rate || 0;
                    await materialTransactionService.record({
                      material_name: item.name,
                      subdivision: 'Consumable',
                      transaction_type: 'USAGE',
                      quantity: item.quantity,
                      rate: itemRate,
                      transaction_date: today,
                      notes: `Used during visit for prescription - ${formData.patientName}`,
                    });
                  } catch (error) {
                    console.warn(`Usage log skipped for ${item.name}:`, error);
                  }
                }
              });
              await Promise.allSettled(usagePromises);
            } catch (usageError) {
              console.error('Error logging consumable usage:', usageError);
            }

            // Check if any items had warnings or errors
            const warnings = deductionResults.filter(r => r.status === 'warning');
            const errors = deductionResults.filter(r => r.status === 'error');

            if (warnings.length > 0 || errors.length > 0) {
              const warningMsg = warnings.map(w => `${w.name}: ${w.message}`).join('\n');
              const errorMsg = errors.map(e => `${e.name}: ${e.message}`).join('\n');
              const combinedMsg = [
                warnings.length > 0 ? `⚠️ Low Stock Warnings:\n${warningMsg}` : '',
                errors.length > 0 ? `❌ Errors:\n${errorMsg}` : ''
              ].filter(m => m).join('\n\n');

              if (combinedMsg) {
                alert(`Prescription saved, but inventory issues detected:\n\n${combinedMsg}\n\nPlease restock these items.`);
              }
            }
          }
        } catch (consumableError) {
          console.error('Error deducting consumable items:', consumableError);
          // Don't throw error - prescription is saved, consumable deduction is secondary
          alert('Prescription saved successfully, but failed to deduct some consumable items from inventory. Please check inventory manually.');
        }
      }

      // Auto-deduct inventory materials linked to treatments done (e.g. Tooth Extraction -> Syringe, Lignox)
      if (!isEditMode && savedPrescription?.id && treatmentItems.length > 0) {
        try {
          const treatmentsToDeduct = treatmentItems
            .filter((t) => t.description && t.description.trim())
            .map((t) => ({
              name: t.description.trim(),
              quantity: Number(t.quantity) || 1,
            }));

          if (treatmentsToDeduct.length > 0) {
            console.log('📦 Auto-deducting treatment-linked materials from inventory...', treatmentsToDeduct);
            const deductionRes = await deductStockForTreatments(
              treatmentsToDeduct,
              formData.patientName,
              savedPrescription.id,
              formData.date || undefined
            );

            if (deductionRes?.results && deductionRes.results.length > 0) {
              const warnings = deductionRes.results.filter((r) => r.status === 'warning');
              const errors = deductionRes.results.filter((r) => r.status === 'error');

              if (warnings.length > 0 || errors.length > 0) {
                const warningMsg = warnings.map((w) => `⚠️ ${w.treatmentName}: ${w.itemName} (${w.message})`).join('\n');
                const errorMsg = errors.map((e) => `❌ ${e.treatmentName}: ${e.itemName} (${e.message})`).join('\n');
                const combinedMsg = [warningMsg, errorMsg].filter(Boolean).join('\n\n');
                alert(`Prescription saved, but inventory stock alerts for treatments performed:\n\n${combinedMsg}`);
              }
            }
          }
        } catch (treatmentDeductError) {
          console.error('Error auto-deducting treatment-linked inventory materials:', treatmentDeductError);
        }
      }

      // Always ensure a bill exists for the prescription
      if (savedPrescription?.id && patient?.id) {
        try {
          const consultationFee = applyConsultationCharge
            ? Number(consultationCharge) || 0
            : 0;

          // Treatment Done items
          const treatmentDoneItems = treatmentItems.map((item, index) => ({
            id: index + 2,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.unitPrice * item.quantity,
            item_type: 'procedure' as const,
            date: item.date
          }));

          // Medicine items
          const medicineItems = medicines
            .filter(med => med.name && med.quantity && med.quantity > 0)
            .map((med, index) => {
              const medicineDetail = medicineOptions.find(m => m.name === med.name);
              const unitPrice = medicineDetail?.price || 0;
              const quantity = med.quantity || 1;
              return {
                id: treatmentItems.length + index + 2,
                description: `${med.name} (${med.dosage})`,
                quantity: quantity,
                unit_price: unitPrice,
                total: unitPrice * quantity,
                item_type: 'medicine' as const
              };
            });

          const treatmentTotal = treatmentDoneItems.reduce((s, i) => s + i.total, 0);
          const medicineTotal = medicineItems.reduce((s, i) => s + i.total, 0);
          const grossAmount = consultationFee + treatmentTotal + medicineTotal;
          const discountAmt = Math.min(Number(treatmentDiscount) || 0, grossAmount);
          const totalAmount = Math.max(0, grossAmount - discountAmt);

          const billItems = [
            ...(consultationFee > 0 ? [{
              id: 1,
              description: isNewPatient ? 'New Patient Registration Fee' : 'Consultation Fee',
              quantity: 1,
              unit_price: consultationFee,
              total: consultationFee,
              item_type: 'consultation' as const
            }] : []),
            ...treatmentDoneItems,
            ...medicineItems
          ];

          let existingBill = null;
          try {
            existingBill = await getBillByPrescriptionId(savedPrescription.id);
          } catch (e) {
            console.log('No existing bill found or error fetching it, proceeding to create.');
          }

          if (existingBill && existingBill.id) {
            // Update existing bill with new items and amounts
            await updateBill(existingBill.id, {
              total_amount: totalAmount,
              discount_amount: discountAmt,
              items: billItems
            });
            console.log('Bill updated successfully with consultation fee, treatments, and medicines');
          } else {
            // Create new bill
            const billData: Bill = {
              prescription_id: savedPrescription.id,
              patient_id: patient.id,
              reference_number: patient.reference_number || '',
              total_amount: totalAmount,
              paid_amount: 0,
              payment_status: 'PENDING',
              discount_amount: discountAmt,
              items: billItems
            };

            await createBill(billData);
            console.log('Bill auto-created successfully with consultation fee, treatments, and medicines');
          }
        } catch (billError) {
          console.error('Failed to auto-create or update bill:', billError);
          // Don't throw error - prescription is saved, bill creation is secondary
        }
      }

      setSaveSuccess(true);
      return savedPrescription;
    } catch (err) {
      console.error('Failed to save prescription:', err);

      // Extract the error message properly
      let errorMessage = 'An unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }

      alert('Failed to save prescription: ' + errorMessage);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save to database first to ensure the prescription record is secured
      await savePrescriptionToDatabase();

      // 2. Client-side PDF generation for hidden preview (non-blocking if fonts/unicode fail)
      try {
        const teethInfo = selectedTeeth.length > 0
          ? selectedTeeth.reduce((acc, tooth) => {
            const isGeneral = tooth.category === 'General' || String(tooth.id).startsWith('General');
            const label = isGeneral ? tooth.disease : `#${getToothDropdownFormat(tooth.id)} (${tooth.disease})`;
            return `${acc}${acc ? ', ' : ''}${label}`;
          }, '')
          : '';

        const prescriptionData = {
          ...formData,
          referenceNumber: formData.reference_number || patientReferenceNumber || '',
          medicines: medicines.length > 0 ? medicines : undefined,
          dentalNotation: teethInfo,
          oralExamination: formData.de,
          diagnosisNotes: oralExamNotes,
          investigation: formData.investigation,
          treatmentPlan: formData.treatmentPlan.map(item =>
            `${item.name}${item.cost ? ` (Rs.${item.cost})` : ''}${item.notes ? ' - ' + item.notes : ''}`
          ),
          treatmentPlanTotal: formData.treatmentPlan.reduce((sum, item) => sum + (Number(item.cost) || 0), 0),
          treatmentDone: treatmentItems.map(item => ({
            description: item.description,
            date: item.date,
          })),
        };

        const blob = await generatePrescriptionPdfBlob(prescriptionData as any);
        if (pdfUrl) {
          window.URL.revokeObjectURL(pdfUrl);
        }
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (pdfErr) {
        console.warn('PDF blob generation skipped or failed (hospital uses letterhead print):', pdfErr);
      }
    } catch (err) {
      console.error('Prescription save error:', err);
      let errorMessage = 'Failed to save prescription. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl || !formData.patientName) return;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `prescription-${formData.patientName}-${formData.date}.pdf`;
    a.click();
  };

  const handlePrint = () => {
    if (!pdfUrl) return;

    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handlePrintablePrescription = async () => {
    let currentId = prescriptionId;

    const docObj = availableDoctors.find((d) => d.name.toLowerCase() === (selectedDoctorName || '').toLowerCase());
    const docName = docObj?.name || selectedDoctorName || (selectedDoctor === 'anjali' ? 'Dr. Shillpa Raut' : 'Dr. Vipeen Raut');
    const sigFile = docObj?.signature_url || (docName.toLowerCase().includes('anjali') ? 'sign1.png' : 'sign.png');

    // Create printable snapshot for instant rendering / fallback
    const printableSnapshot = {
      id: currentId || 'draft',
      patient_name: formData.patientName,
      phone_number: formData.phoneNumber,
      age: formData.age,
      sex: formData.sex,
      reference_number: formData.reference_number || patientReferenceNumber || '',
      prescription_date: formData.date || new Date().toISOString().slice(0, 10),
      chief_complaint: formData.cc,
      medical_history: formData.mh,
      investigation: formData.investigation,
      diagnosis: formData.de,
      treatment_plan: formData.treatmentPlan,
      oral_exam_notes: oralExamNotes,
      selected_teeth: selectedTeeth,
      medicines: medicines,
      treatment_done: treatmentItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
        date: item.date,
      })),
      advice: formData.advice,
      followup_date: formData.followupDate,
      doctor_name: docName,
      vitals: {
        ...(opdVisit?.vitals || {}),
        ...(formData.bp ? { bp: formData.bp } : {}),
        ...(formData.spo2 ? { spo2: formData.spo2 } : {}),
        ...(formData.height ? { height: formData.height } : {}),
        ...(formData.weight ? { weight: formData.weight } : {}),
        ...(formData.pulse ? { pulse: formData.pulse } : {}),
        ...(formData.temperature ? { temperature: formData.temperature } : {}),
      },
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cortex_printable_prescription', JSON.stringify(printableSnapshot));
      } catch (storageErr) {
        console.warn('Could not store printable snapshot in localStorage:', storageErr);
      }
    }

    // If not saved yet and patient name exists, auto-save first
    if (!currentId && formData.patientName) {
      try {
        const saved = await savePrescriptionToDatabase();
        if (saved?.id) {
          currentId = saved.id;
          printableSnapshot.id = saved.id;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('cortex_printable_prescription', JSON.stringify(printableSnapshot));
            } catch (_) { }
          }
        }
      } catch (saveErr) {
        console.warn('Auto-save before print encountered an error, falling back to local snapshot:', saveErr);
      }
    }

    const finalId = currentId || prescriptionId || 'draft';
    window.open(`/print-prescription?prescriptionId=${finalId}&signature=${encodeURIComponent(sigFile)}&doctorName=${encodeURIComponent(docName)}&includeSignature=${includeSignature}`, '_blank');
  };

  // Function to generate and print bill with payment details
  const toggleBillForm = async () => {
    if (!prescriptionId) {
      alert('Please save the prescription first before generating a bill.');
      return;
    }

    if (!patientReferenceNumber) {
      alert('Patient reference number is missing. Please save the prescription again or refresh the page.');
      return;
    }

    try {
      // Fetch the bill by prescription ID
      const billData = await getBillByPrescriptionId(prescriptionId);

      console.log('Fetched bill data:', billData);

      // getBillByPrescriptionId returns an array, get the first bill
      let bill = Array.isArray(billData) ? billData[0] : billData;

      // If no bill exists yet, create one now from whatever data we have
      if (!bill || !bill.id) {
        if (!patientReferenceNumber) {
          alert('Patient reference number is missing. Please save the prescription again.');
          return;
        }
        try {
          const consultationItem = applyConsultationCharge && consultationCharge > 0 ? [{
            id: 1,
            description: isNewPatient ? 'New Patient Registration Fee' : `Consultation Fee (${selectedDoctorName})`,
            quantity: 1,
            unit_price: consultationCharge,
            total: consultationCharge,
            item_type: 'consultation' as const,
          }] : [];
          const planItems = formData.treatmentPlan
            .filter(tp => tp.cost > 0)
            .map((tp, i) => ({
              id: consultationItem.length + i + 1,
              description: tp.name + (tp.notes ? ` (${tp.notes})` : ''),
              quantity: 1,
              unit_price: tp.cost,
              total: tp.cost,
              item_type: 'procedure' as const,
            }));
          const doneItems = treatmentItems.map((item, i) => ({
            id: consultationItem.length + planItems.length + i + 1,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total,
            item_type: 'procedure' as const,
            date: item.date,
          }));
          const allItems = [...consultationItem, ...planItems, ...doneItems];
          if (allItems.length === 0) {
            alert('Please enable registration/consultation fee or add at least one treatment item before generating a bill.');
            return;
          }
          const gross = allItems.reduce((s, i) => s + i.total, 0);
          const disc = Math.min(Number(treatmentDiscount) || 0, gross);
          const total = Math.max(0, gross - disc);
          // Find patient id from a fresh patient lookup
          const pt = await getPatientByReference(patientReferenceNumber);
          if (!pt?.id) {
            alert('Patient not found. Please save the prescription first.');
            return;
          }
          const created = await createBill({
            prescription_id: prescriptionId!,
            patient_id: pt.id,
            reference_number: patientReferenceNumber,
            total_amount: total,
            paid_amount: 0,
            payment_status: 'PENDING',
            discount_amount: disc,
            items: allItems,
          });
          bill = created;
        } catch (createErr) {
          console.error('Failed to auto-create bill:', createErr);
          alert('Failed to create bill. Please save the prescription first.');
          return;
        }
      }

      console.log('Using bill:', bill);

      // Set current bill and payment details
      setCurrentBill(bill);
      setPaymentDetails({
        amountPaid: bill.paid_amount || 0,
        paymentMethod: bill.payment_method || 'Cash',
        discountPercent: bill.discount_percent || 0,
      });

      // Show payment modal
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Failed to generate bill. Please save the prescription first.');
    }
  };

  // Function to update payment and print bill
  const handlePrintBill = async () => {
    if (!currentBill) return;

    try {
      const discountAmt = Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100);
      const newTotal = Math.round(Number(currentBill.total_amount) - discountAmt);
      const safePaid = Math.round(Math.min(Math.max(paymentDetails.amountPaid, 0), newTotal));

      await updateBill(currentBill.id, {
        paid_amount: safePaid,
        payment_method: paymentDetails.paymentMethod,
        discount_percent: paymentDetails.discountPercent,
        discount_amount: discountAmt,
        total_amount: newTotal,
        balance_amount: Math.max(newTotal - safePaid, 0),
      });

      // Close modal
      setShowPaymentModal(false);

      // Build signature params from selected doctor
      const docObj = availableDoctors.find((d) => d.name.toLowerCase() === (selectedDoctorName || '').toLowerCase());
      const docName = docObj?.name || selectedDoctorName || 'Dr. Vipeen Raut';
      const sigFile = docObj?.signature_url || (docName.toLowerCase().includes('anjali') ? 'sign1.png' : 'sign.png');

      // Open new printable bill page (fresh fetch ensures updated balance)
      window.open(`/print-bill?billId=${currentBill.id}&signature=${encodeURIComponent(sigFile)}&doctorName=${encodeURIComponent(docName)}`, '_blank');
    } catch (error) {
      console.error('Error updating bill:', error);
      alert('Failed to update bill payment details.');
    }
  };

  // Helper to build URL to Hospital Billing module pre-filled
  const getBillingUrl = () => {
    const params = new URLSearchParams({
      tab: 'opd',
      prescriptionId: prescriptionId || '',
      patientName: formData.patientName || '',
      phoneNumber: formData.phoneNumber || '',
      uhid: formData.reference_number || patientReferenceNumber || '',
      age: formData.age || '',
      sex: formData.sex || '',
      doctorName: selectedDoctorName || 'Dr. Vipeen Raut',
      opdVisitId: opdVisitId || '',
    });
    return `/admin/billing?${params.toString()}`;
  };

  // Modified useEffect to include pdfUrl in dependencies  // Only run this effect once on mount to prefill form data from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isEdit = params.get('edit') === 'true';
      const id = params.get('id') || params.get('prescriptionId');

      if (id && id !== 'undefined' && id !== 'null') {
        setIsEditMode(true);
        setPrescriptionId(id);
        loadPrescriptionData(id);
      } else {
        const phoneFromUrl = params.get('phone') || params.get('phoneNumber') || '';
        const newFormData = {
          patientName: params.get('patientName') || '',
          age: params.get('age') || '',
          sex: params.get('sex') || '',
          phoneNumber: phoneFromUrl,
          date: params.get('date') || new Date().toISOString().slice(0, 10),
          cc: params.get('chiefComplaint') || '',
          mh: params.get('medicalHistory') || '',
          de: params.get('diagnosis') || '',
          advice: params.get('advice') || '',
          followupDate: params.get('followupDate') || '',
        };

        setFormData(prev => ({ ...prev, ...newFormData }));

        // If a phone number was passed via URL, prefill clinical fields from latest prescription
        if (phoneFromUrl && phoneFromUrl.length >= 10) {
          (async () => {
            try {
              const latestRx = await convexClient.query(api.prescriptions.getLatestByPhone, { phone_number: phoneFromUrl });
              if (latestRx) {
                const safeParse = (data: any, fallback: any = []) => {
                  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return fallback; } }
                  return data || fallback;
                };
                const normTreatmentPlan = (raw: any): TreatmentPlanItem[] => {
                  if (!Array.isArray(raw)) return [];
                  return raw.map((item: any) => {
                    if (typeof item === 'string') return { name: item, cost: 0, notes: '' };
                    return { name: item.name || String(item), cost: item.cost || 0, notes: item.notes || '' };
                  });
                };

                const loadedCC = latestRx.chief_complaint || '';
                setPrevLoadedCC(loadedCC);

                setFormData(prevData => ({
                  ...prevData,
                  cc: loadedCC,
                  mh: latestRx.medical_history || prevData.mh,
                  investigation: latestRx.investigation || '',
                  de: latestRx.diagnosis || '',
                  treatmentPlan: normTreatmentPlan(safeParse(latestRx.treatment_plan)),
                }));

                if (latestRx.oral_exam_notes) setOralExamNotes(latestRx.oral_exam_notes);

                const teethRaw = safeParse(latestRx.selected_teeth);
                if (Array.isArray(teethRaw) && teethRaw.length > 0) {
                  setSelectedTeeth(teethRaw.map((t: any) => ({
                    id: t.id, type: t.type || 'Permanent', category: t.category || '', disease: t.disease || '',
                  })));
                }

                const medsRaw = safeParse(latestRx.medicines);
                if (Array.isArray(medsRaw) && medsRaw.length > 0) setMedicines(medsRaw);

                const doneRaw = safeParse(latestRx.treatment_done);
                if (Array.isArray(doneRaw) && doneRaw.length > 0) {
                  setTreatmentItems(doneRaw.map((item: any) => ({
                    id: item.id || Math.random(),
                    description: item.description || '',
                    quantity: item.quantity || 1,
                    unitPrice: item.unit_price || item.unitPrice || 0,
                    total: item.total || 0,
                    date: item.date,
                  })));
                }
              }
            } catch (rxError) {
              console.error('Error prefilling clinical fields from URL phone:', rxError);
            }
          })();
        }

        // Check for OPD visit ID passed from OPD Queue
        const opdParam = params.get('opdVisitId') || params.get('visitId');
        if (opdParam) {
          setOpdVisitId(opdParam);
          (async () => {
            try {
              const opdApi = (api as any).opd;
              const vData: any = opdApi?.getVisitById ? await convexClient.query(opdApi.getVisitById, { id: opdParam as any, visitId: opdParam }) : null;
              if (vData) {
                setOpdVisit(vData);
                const vit = vData.vitals || {};
                setFormData(prev => ({
                  ...prev,
                  patientName: vData.patient_name || prev.patientName,
                  age: String(vData.age || prev.age),
                  sex: vData.gender || prev.sex,
                  phoneNumber: vData.phone_number || prev.phoneNumber,
                  reference_number: vData.uhid || prev.reference_number,
                  date: vData.visit_date || prev.date,
                  cc: prev.cc || vData.notes || '',
                  bp: (vit.bp || (vit.bp_systolic && vit.bp_diastolic ? `${vit.bp_systolic}/${vit.bp_diastolic}` : '') || prev.bp || ''),
                  spo2: String(vit.spo2 || prev.spo2 || ''),
                  height: String(vit.height || prev.height || ''),
                  weight: String(vit.weight || prev.weight || ''),
                  pulse: String(vit.pulse || prev.pulse || ''),
                  temperature: String(vit.temperature || prev.temperature || ''),
                }));
                if (vData.uhid) {
                  setPatientReferenceNumber(vData.uhid);
                }
                if (vData.doctor_name) {
                  setSelectedDoctorName(vData.doctor_name);
                }
                if (vData.total_charges && vData.total_charges > 0) {
                  setApplyConsultationCharge(false);
                }
                if ((vData.status === 'Registered' || vData.status === 'Waiting') && (api as any).opd?.updateVisitStatus) {
                  await convexClient.mutation((api as any).opd.updateVisitStatus, {
                    id: opdParam as any,
                    status: 'In Consultation',
                    doctor_name: vData.doctor_name,
                    staff_name: vData.doctor_name || 'Consulting Doctor',
                  });
                }
              }
            } catch (err) {
              console.warn('Error loading OPD visit in consultation:', err);
            }
          })();
        }
      }
    }
  }, [loadPrescriptionData]); // Include loadPrescriptionData as a dependency

  return (
    <div className="w-full max-w-[1850px] mx-auto mt-2 sm:mt-4 p-2 sm:p-4">
      {isStaffUser ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-2xl">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Restricted</h1>
            <p className="text-gray-600">You don&apos;t have permission to access the prescription page.</p>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700 border-b pb-4">
            {isEditMode ? 'Edit Prescription' : 'Create Prescription'}
          </h2>
          {userEmail && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Logged in as: <span className="font-medium text-gray-900">{userEmail}</span></p>
            </div>
          )}
          {/* Success Message & Next Steps Action Banner */}
          {saveSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-base">Prescription Saved Successfully!</h3>
                  <p className="text-xs text-emerald-700">
                    Clinical record recorded for <strong>{formData.patientName || 'Patient'}</strong> {formData.reference_number ? `(UHID: ${formData.reference_number})` : ''}.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrintablePrescription}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Prescription
                </button>

                <a
                  href="/admin/opd"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <span>← OPD Queue</span>
                </a>
              </div>
            </div>
          )}

          {/* OPD Consultation Context Banner */}
          {opdVisit && (
            <div className="mb-6 bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 text-white rounded-xl p-4 shadow-lg border border-teal-700/60">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-800/80 pb-3 mb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 font-mono font-bold text-xs rounded border border-teal-500/30">
                    OPD TOKEN: {opdVisit.opd_number}
                  </span>
                  <span className="px-2 py-0.5 bg-white/10 text-slate-200 font-mono text-xs rounded">
                    UHID: {opdVisit.uhid}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-200 font-semibold text-xs rounded">
                    Visit #{opdVisit.visit_number}
                  </span>
                  <span className="text-teal-200 font-medium">
                    {opdVisit.department}
                  </span>
                  <span className="text-slate-300">
                    • Doctor: <strong className="text-white">{opdVisit.doctor_name}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={`/print-opd-card?visitId=${opdVisit._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-teal-200 rounded-lg flex items-center space-x-1 border border-teal-500/30 transition"
                  >
                    <span>Print OPD Card</span>
                  </a>
                  <a
                    href="/admin/opd"
                    className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg flex items-center space-x-1 shadow transition"
                  >
                    <span>← OPD Queue</span>
                  </a>
                </div>
              </div>

              {/* Vitals Summary Strip */}
              {opdVisit.vitals && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-teal-300 mb-2 flex items-center justify-between">
                    <span>Recorded Patient Vitals & Clinical Baseline</span>
                    {opdVisit.vitals.allergies && (
                      <span className="text-red-300 font-bold normal-case bg-red-950/60 border border-red-800/80 px-2 py-0.5 rounded">
                        ⚠️ ALLERGY: {opdVisit.vitals.allergies}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                    <div className="bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-300 uppercase font-semibold">Weight</div>
                      <div className="font-black text-white text-sm">{opdVisit.vitals.weight ? `${opdVisit.vitals.weight} kg` : '—'}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-300 uppercase font-semibold">Height</div>
                      <div className="font-black text-white text-sm">{opdVisit.vitals.height ? `${opdVisit.vitals.height} cm` : '—'}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-300 uppercase font-semibold">BMI</div>
                      <div className="font-black text-teal-300 text-sm">{opdVisit.vitals.bmi || '—'}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-300 uppercase font-semibold">BP (mmHg)</div>
                      <div className="font-black text-white text-sm">
                        {opdVisit.vitals.bp_systolic && opdVisit.vitals.bp_diastolic
                          ? `${opdVisit.vitals.bp_systolic}/${opdVisit.vitals.bp_diastolic}`
                          : '—'}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-300 uppercase font-semibold">Pulse</div>
                      <div className="font-black text-white text-sm">{opdVisit.vitals.pulse ? `${opdVisit.vitals.pulse} /min` : '—'}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-300 uppercase font-semibold">Temp</div>
                      <div className="font-black text-white text-sm">{opdVisit.vitals.temperature ? `${opdVisit.vitals.temperature} °F` : '—'}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 border border-white/10 text-center">
                      <div className="text-[10px] text-slate-300 uppercase font-semibold">SpO₂ / Sugar</div>
                      <div className="font-black text-white text-sm">
                        {opdVisit.vitals.spo2 ? `${opdVisit.vitals.spo2}%` : '—'}
                        {opdVisit.vitals.blood_sugar ? ` | ${opdVisit.vitals.blood_sugar}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Doctor Indicator & Quick Switcher (Light Theme) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xl shadow-xs">
                🩺
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Currently Attending & Signing Doctor
                  </span>
                  <span className="text-xs text-slate-400 font-medium">(Saved automatically)</span>
                </div>
                <div className="text-xl font-black tracking-tight text-slate-900 mt-1 flex flex-wrap items-center gap-2">
                  <span>{selectedDoctorName}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-sans">
                    {selectedDoctorName.toLowerCase().includes('shillpa') ? 'Obstetrics & Gynaecology' : 'Orthopaedics & Joint Replacement'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
              <span className="text-xs font-bold text-slate-500 pl-2">Switch Doctor:</span>
              <button
                type="button"
                onClick={() => handleDoctorSelect('Dr. Vipeen Raut')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedDoctorName === 'Dr. Vipeen Raut'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
              >
                Dr. Vipeen Raut (Ortho)
              </button>
              <button
                type="button"
                onClick={() => handleDoctorSelect('Dr. Shillpa Raut')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedDoctorName === 'Dr. Shillpa Raut'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
              >
                Dr. Shillpa Raut (Gynae)
              </button>
            </div>
          </div>

          {/* HealthPlix Doctor EHR Form Shell */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* HealthPlix Top Navigation Bar */}


            {/* Patient Banner (HealthPlix IMG_0902) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {formData.patientName || 'Patient Name'}
                  </h2>
                  <span className="text-sm font-semibold text-slate-600">
                    ({formData.age || '—'} Y, {formData.sex || 'Male'})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const tag = prompt('Add tag for patient (e.g. Diabetic, VIP, Ortho, ANC):');
                      if (tag) alert('Tag added: ' + tag);
                    }}
                    className="text-xs px-2 py-0.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition"
                  >
                    + tag
                  </button>
                  {formData.phoneNumber && (
                    <a
                      href={'tel:' + formData.phoneNumber}
                      className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold hover:bg-blue-100 flex items-center gap-1 transition"
                    >
                      <PhoneCall className="w-3 h-3" /> Call
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                  <div>
                    UHID / Ref:{' '}
                    <span className="font-bold text-slate-800">
                      {formData.reference_number || 'Auto-generated on save'}
                    </span>
                  </div>
                  <div>
                    Phone: <span className="font-bold text-slate-800">{formData.phoneNumber || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Editable Patient Details Bar */}
              <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase">Name *</label>
                  <input
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleChange}
                    required
                    placeholder="Patient Name"
                    className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase">Phone Number</label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handlePhoneNumberChange}
                    placeholder="Phone Number"
                    className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Years"
                    className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase">Gender</label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase">Visit Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase">Doctor</label>
                  <select
                    value={selectedDoctorName}
                    onChange={(e) => handleDoctorSelect(e.target.value)}
                    className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-teal-500"
                  >
                    {availableDoctors.map((doc) => (
                      <option key={doc.id || doc._id || doc.name} value={doc.name}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Sub-Banner Visit Controls (IMG_0902) */}
            <div className="bg-slate-100/90 border border-slate-200 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('1st Visit')}
                  className={activeTab === '1st Visit' ? 'px-3 py-1 rounded font-semibold transition bg-white text-slate-900 shadow-xs border border-slate-200' : 'px-3 py-1 rounded font-semibold transition text-slate-600 hover:text-slate-900'}
                >
                  1st Visit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('View Past')}
                  className={activeTab === 'View Past' ? 'px-3 py-1 rounded font-semibold transition bg-white text-slate-900 shadow-xs border border-slate-200' : 'px-3 py-1 rounded font-semibold transition text-slate-600 hover:text-slate-900'}
                >
                  View Past
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Record')}
                  className="px-3 py-1 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                >
                  🎙 Record
                </button>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    refreshTemplates();
                    setIsLoadTemplateModalOpen(true);
                  }}
                  className="hover:text-blue-700 flex items-center gap-1.5 font-bold transition text-xs"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Load template</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateNameInput(formData.de ? formData.de + ' Protocol' : '');
                    setIsSaveTemplateModalOpen(true);
                  }}
                  className="hover:text-purple-700 flex items-center gap-1.5 font-bold transition text-xs"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Save as template</span>
                </button>
              </div>
            </div>

            {/* Main Clinical Two-Column / Stacked Layout */}
            <div className="space-y-5">
              {/* 1. History (Spacious Multi-line History with Quick Chips) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      History
                    </label>
                    <span className="text-[11px] text-slate-400">Medical / Surgical / Family history</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const item = prompt('Add Medical / Surgical History item:');
                      if (item) {
                        setFormData(prev => ({
                          ...prev,
                          mh: prev.mh ? prev.mh + ', ' + item.trim() : item.trim()
                        }));
                      }
                    }}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                    title="Add History item"
                  >
                    +
                  </button>
                </div>
                <textarea
                  name="mh"
                  value={formData.mh}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Record patient medical, surgical, allergy and drug history (e.g. Hypertension 5 yrs on Telmisartan, Type 2 Diabetes, NKDA, Previous appendectomy 2021)..."
                  className="w-full min-h-[90px] p-3 text-sm leading-relaxed border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-2xs"
                />
                {/* History Quick-Select Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Quick Add:</span>
                  {['HTN', 'Type 2 Diabetes', 'Hypothyroidism', 'Asthma', 'CAD / IHD', 'Previous Surgery', 'NKDA (No Drug Allergies)'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (!formData.mh.includes(chip)) {
                          setFormData(prev => ({
                            ...prev,
                            mh: prev.mh ? `${prev.mh}, ${chip}` : chip
                          }));
                        }
                      }}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Complaints Table (HealthPlix IMG_0902) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-slate-800">Complaints</label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Complaints" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Add Complaint Row"
                        className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                        onClick={() => {
                          if (!newComplaintText.trim()) return;
                          setComplaintsList(prev => [
                            ...prev,
                            {
                              id: String(Date.now()),
                              complaint: newComplaintText.trim(),
                              frequency: newComplaintFreq,
                              severity: newComplaintSeverity,
                              duration: newComplaintDuration,
                              date: formData.date || new Date().toISOString().slice(0, 10),
                            }
                          ]);
                          setNewComplaintText('');
                          setNewComplaintFreq('');
                          setNewComplaintSeverity('');
                          setNewComplaintDuration('');
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="complaints"
                        sectionTitle="Complaints"
                        currentValue={complaintsList}
                        onApplyPreset={(val) => {
                          if (Array.isArray(val)) {
                            setComplaintsList(prev => [
                              ...prev,
                              ...val.map((x: any, i: number) => ({
                                id: 'tc_' + Date.now() + '_' + i,
                                complaint: x.complaint,
                                frequency: x.frequency || '',
                                severity: x.severity || '',
                                duration: x.duration || '',
                                date: formData.date || new Date().toISOString().slice(0, 10),
                              })),
                            ]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        title="Reset / Clear All Complaints"
                        className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                        onClick={() => setComplaintsList([])}
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-slate-50 text-slate-600 font-semibold py-2 px-3 border-b border-slate-200">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Complaints</div>
                    <div className="col-span-2">Frequency</div>
                    <div className="col-span-2">Severity</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  {/* Existing Complaints */}
                  {complaintsList.map((c, idx) => (
                    <div key={c.id} className="grid grid-cols-12 items-center py-2 px-3 border-b border-slate-100 hover:bg-slate-50/50">
                      <div className="col-span-1 text-slate-400">{idx + 1}</div>
                      <div className="col-span-4 font-semibold text-slate-800">{c.complaint}</div>
                      <div className="col-span-2 text-slate-600">{c.frequency || '—'}</div>
                      <div className="col-span-2 text-slate-600">{c.severity || '—'}</div>
                      <div className="col-span-2 text-slate-600">{c.duration || '—'}</div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => setComplaintsList(prev => prev.filter(x => x.id !== c.id))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Inline Add Complaint Row */}
                  <div className="grid grid-cols-12 items-center py-1.5 px-3 bg-slate-50/30 gap-2">
                    <div className="col-span-1 text-slate-400 font-mono">{complaintsList.length + 1}</div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={newComplaintText}
                        onChange={(e) => setNewComplaintText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!newComplaintText.trim()) return;
                            setComplaintsList(prev => [
                              ...prev,
                              {
                                id: String(Date.now()),
                                complaint: newComplaintText.trim(),
                                frequency: newComplaintFreq,
                                severity: newComplaintSeverity,
                                duration: newComplaintDuration,
                                date: formData.date || new Date().toISOString().slice(0, 10),
                              }
                            ]);
                            setNewComplaintText('');
                            setNewComplaintFreq('');
                            setNewComplaintSeverity('');
                            setNewComplaintDuration('');
                          }
                        }}
                        placeholder="Add Complaints (e.g. Joint pain in right knee, fever, headache, back pain)..."
                        className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={newComplaintFreq}
                        onChange={(e) => setNewComplaintFreq(e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded text-slate-700 bg-white"
                      >
                        <option value="">Frequency...</option>
                        <option value="Continuous">Continuous</option>
                        <option value="Intermittent">Intermittent</option>
                        <option value="Occasionally">Occasionally</option>
                        <option value="Night time">Night time</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={newComplaintSeverity}
                        onChange={(e) => setNewComplaintSeverity(e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded text-slate-700 bg-white"
                      >
                        <option value="">Severity...</option>
                        <option value="Mild">Mild</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newComplaintDuration}
                        onChange={(e) => setNewComplaintDuration(e.target.value)}
                        placeholder="e.g. 3 days"
                        className="w-full p-1.5 border border-slate-200 rounded text-slate-700 bg-white"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newComplaintText.trim()) return;
                          setComplaintsList(prev => [
                            ...prev,
                            {
                              id: String(Date.now()),
                              complaint: newComplaintText.trim(),
                              frequency: newComplaintFreq,
                              severity: newComplaintSeverity,
                              duration: newComplaintDuration,
                              date: formData.date || new Date().toISOString().slice(0, 10),
                            }
                          ]);
                          setNewComplaintText('');
                          setNewComplaintFreq('');
                          setNewComplaintSeverity('');
                          setNewComplaintDuration('');
                        }}
                        className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Findings (HealthPlix IMG_0902) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Findings
                  </label>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button type="button" title="Edit Findings" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <SectionTemplatePicker
                      sectionKey="findings"
                      sectionTitle="Findings"
                      currentValue={findingsText}
                      onApplyPreset={(val) => setFindingsText(prev => prev ? prev + '\n' + val : val)}
                    />
                    <button
                      type="button"
                      title="Reset / Clear Findings"
                      className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      onClick={() => setFindingsText('')}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  rows={3}
                  placeholder="Clinical findings, general examination, range of motion, swelling, tenderness, systemic signs..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* 4. Vitals Sequentially Arranged (HealthPlix IMG_0902) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Vitals
                  </label>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button type="button" title="Edit Vitals" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Reset / Clear All Vitals"
                      className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      onClick={() => {
                        setBpSystolic('');
                        setBpDiastolic('');
                        setPulseVal('');
                        setHeightVal('');
                        setWeightVal('');
                        setTempVal('');
                        setBmiVal('');
                        setWaistHipVal('');
                        setSpo2Val('');
                        setLmpDate('');
                        setEddDate('');
                        setGestationalWeeks('');
                        setGestationalDays('');
                      }}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Row 1: BP, Pulse, Height, Weight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* BP */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">BP (Blood Pressure)</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="text"
                          value={bpSystolic}
                          onChange={(e) => setBpSystolic(e.target.value)}
                          placeholder="120"
                          title="Systolic BP (mmHg)"
                          className="w-1/2 min-w-0 py-2 px-2.5 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center text-slate-300 font-bold px-0.5 select-none">/</span>
                        <input
                          type="text"
                          value={bpDiastolic}
                          onChange={(e) => setBpDiastolic(e.target.value)}
                          placeholder="80"
                          title="Diastolic BP (mmHg)"
                          className="w-1/2 min-w-0 py-2 px-2.5 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                          mmHg
                        </span>
                      </div>
                    </div>

                    {/* Pulse */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pulse</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="text"
                          value={pulseVal}
                          onChange={(e) => setPulseVal(e.target.value)}
                          placeholder="72"
                          title="Pulse Rate (bpm)"
                          className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                          bpm
                        </span>
                      </div>
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Height</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="text"
                          value={heightVal}
                          onChange={(e) => setHeightVal(e.target.value)}
                          placeholder="170"
                          title="Height (cm)"
                          className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                          cm
                        </span>
                      </div>
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Weight</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="text"
                          value={weightVal}
                          onChange={(e) => setWeightVal(e.target.value)}
                          placeholder="65"
                          title="Weight (kg)"
                          className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Temperature, BMI, Waist/Hip, SPO2, LMP */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Temperature</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="text"
                          value={tempVal}
                          onChange={(e) => setTempVal(e.target.value)}
                          placeholder="98.4"
                          title="Body Temperature (°F)"
                          className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                          °F
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">BMI</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden shadow-xs">
                        <input
                          type="text"
                          value={displayBmi}
                          readOnly
                          placeholder="—"
                          title="Body Mass Index (Kg/m²)"
                          className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-extrabold text-teal-800 bg-transparent outline-none cursor-default"
                        />
                        <span className="inline-flex items-center px-2 py-2 bg-slate-100 border-l border-slate-200 text-xs font-semibold text-slate-500 select-none">
                          Kg/m²
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Waist/Hip</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="text"
                          value={waistHipVal}
                          onChange={(e) => setWaistHipVal(e.target.value)}
                          placeholder="0.85"
                          title="Waist to Hip Ratio"
                          className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center px-2 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                          ratio
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">SPO2</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="text"
                          value={spo2Val}
                          onChange={(e) => setSpo2Val(e.target.value)}
                          placeholder="98"
                          title="Blood Oxygen Saturation (SPO2 %)"
                          className="flex-1 min-w-0 py-2 px-3 text-center text-sm font-bold text-slate-800 outline-none"
                        />
                        <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">LMP</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="date"
                          value={lmpDate}
                          onChange={(e) => setLmpDate(e.target.value)}
                          title="Last Menstrual Period (LMP Date)"
                          className="flex-1 min-w-0 py-2 px-3 text-xs font-bold text-slate-800 outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: EDD & Gestational Age */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">EDD (Estimated Due Date)</label>
                      <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                        <input
                          type="date"
                          value={eddDate}
                          onChange={(e) => setEddDate(e.target.value)}
                          title="Estimated Due Date (EDD Date)"
                          className="flex-1 min-w-0 py-2 px-3 text-xs font-bold text-slate-800 outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-1 md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Gestational Age</label>
                      <div className="grid grid-cols-2 gap-3 max-w-md">
                        <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                          <input
                            type="text"
                            value={gestationalWeeks}
                            onChange={(e) => setGestationalWeeks(e.target.value)}
                            placeholder="Weeks"
                            title="Gestational Age (Weeks)"
                            className="flex-1 min-w-0 py-2 px-2.5 text-center text-sm font-bold text-slate-800 outline-none"
                          />
                          <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                            Weeks
                          </span>
                        </div>
                        <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                          <input
                            type="text"
                            value={gestationalDays}
                            onChange={(e) => setGestationalDays(e.target.value)}
                            placeholder="Days"
                            title="Gestational Age (Days)"
                            className="flex-1 min-w-0 py-2 px-2.5 text-center text-sm font-bold text-slate-800 outline-none"
                          />
                          <span className="inline-flex items-center px-2.5 py-2 bg-slate-50 border-l border-slate-100 text-xs font-semibold text-slate-500 select-none">
                            Days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Diagnosis (HealthPlix IMG_0902 & IMG_0905) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-slate-800">Diagnosis</label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Diagnosis" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Add Diagnosis"
                        className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                        onClick={() => {
                          const diag = prompt('Add Diagnosis:');
                          if (diag) {
                            setDiagnosesList(prev => [
                              ...prev,
                              {
                                id: String(Date.now()),
                                diagnosis: diag.trim(),
                                snomed_code: '',
                                duration: '',
                                date: formData.date || new Date().toISOString().slice(0, 10),
                              }
                            ]);
                            setFormData(prev => ({ ...prev, de: prev.de ? prev.de + ', ' + diag.trim() : diag.trim() }));
                          }
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="diagnosis"
                        sectionTitle="Diagnosis"
                        currentValue={formData.de}
                        align="left"
                        onApplyPreset={(val) => {
                          const str = typeof val === 'string' ? val : (Array.isArray(val) ? val.join(', ') : JSON.stringify(val));
                          setFormData(prev => ({
                            ...prev,
                            de: prev.de ? prev.de + ', ' + str : str,
                          }));
                          setDiagnosesList(prev => [
                            ...prev,
                            {
                              id: String(Date.now()),
                              diagnosis: str,
                              snomed_code: '',
                              duration: '',
                              date: formData.date || new Date().toISOString().slice(0, 10),
                            }
                          ]);
                        }}
                      />
                      <button
                        type="button"
                        title="Reset / Clear Diagnosis"
                        className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                        onClick={() => {
                          setDiagnosesList([]);
                          setFormData(prev => ({ ...prev, de: '' }));
                        }}
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* HealthPlix Diagnosis Table (IMG_0902) */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs mb-3">
                  <div className="grid grid-cols-12 bg-slate-50 text-slate-700 font-semibold py-2 px-3 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Diagnosis</div>
                    <div className="col-span-2">SNOMED Code</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  {diagnosesList.length === 0 ? (
                    <div className="py-2.5 px-3 text-slate-400 italic text-xs bg-white">
                      1 &nbsp;&nbsp; Add Diagnosis using the search bar below or presets icon above
                    </div>
                  ) : (
                    diagnosesList.map((d, idx) => (
                      <div key={d.id} className="grid grid-cols-12 items-center py-2 px-3 border-b border-slate-100 bg-white hover:bg-slate-50/50">
                        <div className="col-span-1 text-slate-400 font-mono">{idx + 1}</div>
                        <div className="col-span-5 font-bold text-slate-800">{d.diagnosis}</div>
                        <div className="col-span-2 text-slate-500 font-mono text-[11px]">{d.snomed_code || '—'}</div>
                        <div className="col-span-2 text-slate-600">{d.duration || '—'}</div>
                        <div className="col-span-1 text-slate-600 text-[11px]">{d.date || formData.date}</div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = diagnosesList.filter(x => x.id !== d.id);
                              setDiagnosesList(updated);
                              setFormData(prev => ({
                                ...prev,
                                de: updated.map(x => x.diagnosis).join(', '),
                              }));
                            }}
                            className="text-rose-500 hover:text-rose-700 font-bold p-0.5 rounded cursor-pointer"
                            title="Remove diagnosis"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Auto-suggest Diagnosis Input */}
                <div className="mb-1">
                  <DiagnosisSearchInput
                    value={formData.de}
                    onChange={(newVal) => {
                      setFormData(prev => ({ ...prev, de: newVal }));
                      if (newVal.trim() && !diagnosesList.some(d => d.diagnosis.toLowerCase() === newVal.trim().toLowerCase())) {
                        setDiagnosesList(prev => [
                          ...prev,
                          {
                            id: String(Date.now()),
                            diagnosis: newVal.trim(),
                            snomed_code: '',
                            duration: '',
                            date: formData.date || new Date().toISOString().slice(0, 10),
                          }
                        ]);
                      }
                    }}
                    prescriptionId={prescriptionId || undefined}
                    placeholder="Type to search diagnosis with autocomplete (e.g. Closed fracture distal tibia, Osteoarthritis right knee, ANC 24 weeks, Hypertension)..."
                  />
                </div>


              </div>

              {/* 6. Procedure Done (Treatment Done with billing sync & new patient fee) */}
              <div className="bg-gradient-to-br from-teal-50/70 to-emerald-50/40 border border-teal-200 rounded-xl p-4 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-teal-200/80 gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
                      <span title="Edit Procedure Done" className="inline-flex">
                        <Edit2 className="w-4 h-4 text-teal-700" />
                      </span>
                      Procedure done / Treatment Done
                    </label>
                    <SectionTemplatePicker
                      sectionKey="procedure_done"
                      sectionTitle="Procedure Done"
                      currentValue={dentalProcedures}
                      onApplyPreset={(val) => {
                        if (val && val.name) {
                          setSelectedTreatmentName(val.name);
                          setSelectedTreatmentPrice(String(val.price || 0));
                          setSelectedTreatmentQty(val.qty || 1);
                          saveProcedureToCatalog(val.name, val.price || 0);
                        }
                      }}
                    />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                      Optional
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                      Forwarded to Billing Only
                    </span>
                  </div>
                </div>

                {/* Registration / Consultation Fee Checkbox */}
                <div className="p-3 bg-white/95 rounded-lg border border-teal-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyConsultationCharge}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setApplyConsultationCharge(checked);
                        if (checked && (!consultationCharge || consultationCharge === 0)) {
                          setConsultationCharge(isNewPatient ? 400 : 200);
                        }
                      }}
                      className="mt-0.5 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Add {isNewPatient ? 'New Patient Registration' : 'Follow-up Consultation'} Charge
                        </span>
                        <span
                          className={isNewPatient ? 'text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300' : 'text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-300'}
                        >
                          {isNewPatient ? 'New Patient (₹400)' : 'Re-visit / Existing Patient (₹200)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isNewPatient
                          ? 'Patient not in database — new registration fee defaults to ₹400.'
                          : 'Patient already in database — follow-up consultation fee defaults to ₹200.'}
                      </p>
                    </div>
                  </label>

                  {applyConsultationCharge && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Charge (₹):</span>
                      <input
                        type="number"
                        min="0"
                        value={consultationCharge || ''}
                        onChange={(e) => setConsultationCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-20 p-1.5 text-xs font-bold border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  )}
                </div>

                {/* Procedure Entry Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Treatment / Procedure Name
                    </label>
                    <input
                      type="text"
                      list="clinical-procedure-datalist"
                      value={selectedTreatmentName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTreatmentName(val);
                        const matched = dentalProcedures.find(
                          (p) => p.name.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (matched && matched.price > 0) {
                          setSelectedTreatmentPrice(String(matched.price));
                        }
                      }}
                      placeholder="Type or select procedure (e.g. Joint Aspiration, POP Cast, USG Scan, Wound Dressing)..."
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                    />
                    <datalist id="clinical-procedure-datalist">
                      {dentalProcedures.map((proc) => (
                        <option key={proc.id} value={proc.name}>
                          ₹{proc.price}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Charge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedTreatmentPrice}
                      onChange={(e) => setSelectedTreatmentPrice(e.target.value)}
                      placeholder="0"
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedTreatmentQty}
                      onChange={(e) => setSelectedTreatmentQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-white text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={selectedTreatmentDate || formData.date}
                      onChange={(e) => setSelectedTreatmentDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => {
                        const nameTrimmed = selectedTreatmentName.trim();
                        if (!nameTrimmed) return;
                        const priceNum = parseFloat(selectedTreatmentPrice) || 0;
                        const qtyNum = Number(selectedTreatmentQty) || 1;

                        const newItem: TreatmentItem = {
                          id: Date.now(),
                          description: nameTrimmed,
                          quantity: qtyNum,
                          unitPrice: priceNum,
                          total: priceNum * qtyNum,
                          date: selectedTreatmentDate || formData.date || new Date().toISOString().slice(0, 10),
                        };

                        setTreatmentItems([...treatmentItems, newItem]);
                        saveProcedureToCatalog(nameTrimmed, priceNum);

                        setSelectedTreatmentName('');
                        setSelectedTreatmentPrice('');
                        setSelectedTreatmentQty(1);
                      }}
                      disabled={!selectedTreatmentName.trim()}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Treatment Items Table */}
                {treatmentItems.length > 0 && (
                  <div className="bg-white rounded-lg border border-teal-200 overflow-hidden text-xs">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Treatment</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {treatmentItems.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-slate-400 font-mono">{index + 1}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{item.description}</td>
                            <td className="px-3 py-2 text-slate-500">{item.date || formData.date}</td>
                            <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-bold">₹{item.unitPrice}</td>
                            <td className="px-3 py-2 text-right font-bold text-teal-800">₹{item.total}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setTreatmentItems(prev => prev.filter((_, i) => i !== index))}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>


              {/* 7. Medicine Table (HealthPlix IMG_0903, IMG_0904, IMG_0905, IMG_0910 with wide spreadsheet grid) */}
              <div className="w-full">
                <HealthPlixMedicineTable
                  medicines={medicines}
                  onChange={setMedicines}
                  medicineOptions={filteredMedicineOptions}
                  prescriptionDate={formData.date}
                  onAutoSaveMedicine={autoSaveMedicineIfNew}
                />
              </div>

              {/* 8. Next Visit (HealthPlix IMG_0903) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Next Visit
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-500 font-semibold">No of</span>
                  <input
                    type="number"
                    min="1"
                    value={followupCount}
                    onChange={(e) => {
                      const count = e.target.value;
                      setFollowupCount(count);
                      const num = parseInt(count, 10);
                      if (!isNaN(num) && num > 0) {
                        const d = new Date();
                        if (followupUnit === 'Days') d.setDate(d.getDate() + num);
                        else if (followupUnit === 'Weeks') d.setDate(d.getDate() + num * 7);
                        else if (followupUnit === 'Months') d.setMonth(d.getMonth() + num);
                        setFormData(prev => ({ ...prev, followupDate: d.toISOString().slice(0, 10) }));
                      }
                    }}
                    className="w-16 p-2 border border-slate-200 rounded text-center font-bold text-slate-800"
                  />

                  <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    {(['Days', 'Weeks', 'Months'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          setFollowupUnit(unit);
                          const num = parseInt(followupCount, 10);
                          if (!isNaN(num) && num > 0) {
                            const d = new Date();
                            if (unit === 'Days') d.setDate(d.getDate() + num);
                            else if (unit === 'Weeks') d.setDate(d.getDate() + num * 7);
                            else if (unit === 'Months') d.setMonth(d.getMonth() + num);
                            setFormData(prev => ({ ...prev, followupDate: d.toISOString().slice(0, 10) }));
                          }
                        }}
                        className={followupUnit === unit ? 'px-3 py-1 rounded text-xs font-semibold transition bg-white text-slate-900 shadow-xs' : 'px-3 py-1 rounded text-xs font-semibold transition text-slate-600 hover:text-slate-900'}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>

                  <span className="text-slate-400 font-semibold">Or</span>

                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={formData.followupDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, followupDate: e.target.value }))}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 9. Dr Notes & Quick Notes (HealthPlix IMG_0903 & IMG_0904) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dr Notes (Private doctor remarks - NOT printed on prescription) */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        Dr Notes
                      </label>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Private • Not printed on prescription
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Dr Notes" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="dr_notes"
                        sectionTitle="Dr Notes"
                        currentValue={drNotes}
                        onApplyPreset={(val) => setDrNotes(prev => prev ? prev + '\n' + val : val)}
                      />
                      <button type="button" title="Reset / Clear Dr Notes" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setDrNotes('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={drNotes}
                    onChange={(e) => setDrNotes(e.target.value)}
                    rows={3}
                    placeholder="Doctor private remarks / internal clinical notes (e.g. Patient reluctant for surgery, follow up in OPD personally)..."
                    className="w-full min-h-[85px] p-3 text-sm leading-relaxed border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  />
                </div>

                {/* Quick Notes */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Quick Notes
                    </label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Quick Notes" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="quick_notes"
                        sectionTitle="Quick Notes"
                        currentValue={quickNotes}
                        onApplyPreset={(val) => setQuickNotes(prev => prev ? prev + '\n' + val : val)}
                      />
                      <button type="button" title="Reset / Clear Quick Notes" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setQuickNotes('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    rows={3}
                    placeholder="Brief clinical quick notes..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* 10. Procedure Advice & Advice (HealthPlix IMG_0904) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Procedure Advice */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Procedure Advice
                    </label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Procedure Advice" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="procedure_done"
                        sectionTitle="Procedure Advice"
                        currentValue={procedureAdvice}
                        onApplyPreset={(val) => {
                          const text = typeof val === 'string' ? val : val.name ? `Procedure advice: ${val.name}` : '';
                          setProcedureAdvice(prev => prev ? prev + '\n' + text : text);
                        }}
                      />
                      <button type="button" title="Reset / Clear Procedure Advice" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setProcedureAdvice('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={procedureAdvice}
                    onChange={(e) => setProcedureAdvice(e.target.value)}
                    rows={3}
                    placeholder="Pre/post procedure advice..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* General Advice */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Advice
                    </label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Advice" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="advice"
                        sectionTitle="Advice"
                        currentValue={formData.advice}
                        onApplyPreset={(val) => setFormData(prev => ({ ...prev, advice: prev.advice ? prev.advice + '\n' + val : val }))}
                      />
                      <button type="button" title="Reset / Clear Advice" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, advice: '' }))}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    name="advice"
                    value={formData.advice}
                    onChange={handleChange}
                    rows={3}
                    placeholder="General advice for patient (e.g. warm saline rinses, drink plenty of fluids)..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <span>*</span> Prescription is valid for 30 days only
                  </p>
                </div>
              </div>

              {/* 11. Tests Requested (HealthPlix IMG_0904) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Tests Requested
                  </label>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button type="button" title="Edit Tests Requested" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <SectionTemplatePicker
                      sectionKey="tests_requested"
                      sectionTitle="Tests Requested"
                      currentValue={testsRequested}
                      onApplyPreset={(val) => {
                        if (Array.isArray(val)) {
                          setTestsRequested(prev => [
                            ...prev,
                            ...val.map((t: any, i: number) => ({ id: 'tt_' + Date.now() + '_' + i, name: t.name, by_when: t.by_when || 'Next Visit' }))
                          ]);
                        }
                      }}
                    />
                    <button type="button" title="Reset / Clear Tests" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setTestsRequested([])}>
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-slate-50 text-slate-600 font-semibold py-2 px-3 border-b border-slate-200">
                    <div className="col-span-1">#</div>
                    <div className="col-span-6">Tests Requested</div>
                    <div className="col-span-4">By When</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  {testsRequested.map((t, idx) => (
                    <div key={t.id} className="grid grid-cols-12 items-center py-2 px-3 border-b border-slate-100 hover:bg-slate-50/50">
                      <div className="col-span-1 text-slate-400">{idx + 1}</div>
                      <div className="col-span-6 font-semibold text-slate-800">{t.name}</div>
                      <div className="col-span-4 text-slate-600">{t.by_when || '—'}</div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => setTestsRequested(prev => prev.filter(x => x.id !== t.id))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Inline Add Test */}
                  <div className="grid grid-cols-12 items-center py-1.5 px-3 bg-slate-50/30 gap-2">
                    <div className="col-span-1 text-slate-400 font-mono">{testsRequested.length + 1}</div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={newTestName}
                        onChange={(e) => setNewTestName(e.target.value)}
                        placeholder="Add Tests (e.g. CBC, Blood Sugar, OPG)..."
                        className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={newTestByWhen}
                        onChange={(e) => setNewTestByWhen(e.target.value)}
                        placeholder="e.g. Next Visit or Before Monday"
                        className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTestName.trim()) return;
                          setTestsRequested(prev => [
                            ...prev,
                            { id: String(Date.now()), name: newTestName.trim(), by_when: newTestByWhen.trim() }
                          ]);
                          setNewTestName('');
                          setNewTestByWhen('');
                        }}
                        className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 12. Referred To (HealthPlix IMG_0904 & IMG_0906) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Referred to
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Doctor Name</label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-semibold">Dr.</span>
                      <input
                        type="text"
                        value={referralDocName}
                        onChange={(e) => setReferralDocName(e.target.value)}
                        placeholder="Doctor Name"
                        className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Speciality</label>
                    <select
                      value={referralSpeciality}
                      onChange={(e) => setReferralSpeciality(e.target.value)}
                      className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 bg-white"
                    >
                      <option value="Orthopaedics">Orthopaedics</option>
                      <option value="Gynaecology">Gynaecology</option>
                      <option value="General Medicine">General Medicine</option>
                      <option value="General Surgery">General Surgery</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="ENT">ENT</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Physiotherapy">Physiotherapy</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Phone No</label>
                    <input
                      type="text"
                      value={referralPhone}
                      onChange={(e) => setReferralPhone(e.target.value)}
                      placeholder="+91 Number"
                      className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={referralEmail}
                      onChange={(e) => setReferralEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (referralDocName.trim()) {
                          alert('Referral to Dr. ' + referralDocName + ' (' + referralSpeciality + ') noted.');
                        }
                      }}
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 13. Diet and Exercise & Investigations (HealthPlix IMG_0904 & IMG_0906) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Diet & Exercise */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Diet and Exercise
                    </label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Diet and Exercise" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="diet_exercise"
                        sectionTitle="Diet & Exercise"
                        currentValue={dietExercise}
                        onApplyPreset={(val) => setDietExercise(prev => prev ? prev + '\n' + val : val)}
                      />
                      <button type="button" title="Reset / Clear Diet & Exercise" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setDietExercise('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={dietExercise}
                    onChange={(e) => setDietExercise(e.target.value)}
                    rows={3}
                    placeholder="Soft diet, avoid sugary snacks, 30 min daily walk..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Investigations */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Investigations
                    </label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Investigations" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="investigations"
                        sectionTitle="Investigations"
                        currentValue={investigationText}
                        onApplyPreset={(val) => setInvestigationText(prev => prev ? prev + '\n' + val : val)}
                      />
                      <button type="button" title="Reset / Clear Investigations" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setInvestigationText('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={investigationText}
                    onChange={(e) => setInvestigationText(e.target.value)}
                    rows={2}
                    placeholder="e.g. OPG, IOPAR wrt 16, CBCT, Blood sugar..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />

                </div>
              </div>

              {/* 14. Past Medication & Examinations (HealthPlix IMG_0906) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Past Medication */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800">Past Medication</label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Past Medication" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="past_medications"
                        sectionTitle="Past Medication"
                        currentValue={pastMedication}
                        onApplyPreset={(val) => setPastMedication(prev => prev ? prev + '\n' + val : val)}
                      />
                      <button type="button" title="Reset / Clear Past Medication" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setPastMedication('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={pastMedication}
                    onChange={(e) => setPastMedication(e.target.value)}
                    rows={2}
                    placeholder="Past Medications..."
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                {/* Systemic Examination */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800">Systemic Examination</label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit Systemic Examination" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" title="Reset / Clear Systemic Examination" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setSystemicExam('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={systemicExam}
                    onChange={(e) => setSystemicExam(e.target.value)}
                    rows={2}
                    placeholder="CVS, RS, CNS findings..."
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                {/* General Examinations */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-800">General Examinations</label>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" title="Edit General Examinations" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <SectionTemplatePicker
                        sectionKey="general_examinations"
                        sectionTitle="General Examinations"
                        currentValue={generalExam}
                        onApplyPreset={(val) => setGeneralExam(prev => prev ? prev + '\n' + val : val)}
                      />
                      <button type="button" title="Reset / Clear General Examinations" className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer" onClick={() => setGeneralExam('')}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={generalExam}
                    onChange={(e) => setGeneralExam(e.target.value)}
                    rows={2}
                    placeholder="Pallor, Icterus, Cyanosis, Clubbing, Lymphadenopathy, Edema..."
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* 15. Drawing Board (HealthPlix IMG_0906 & IMG_0908) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Drawing Board
                  </label>
                  <div className="flex items-center gap-2">
                    <SectionTemplatePicker
                      sectionKey="drawing_board"
                      sectionTitle="Drawing Board"
                      currentValue={drawingDataUrl}
                      onApplyPreset={(val) => setDrawingDataUrl(val)}
                      align="right"
                    />
                    <span className="text-xs text-slate-400">Sketch clinical diagrams or annotate anatomical regions</span>
                  </div>
                </div>

                <HealthPlixDrawingBoard
                  onChange={setDrawingDataUrl}
                  value={drawingDataUrl}
                  storageKey={prescriptionId ? `cortex_drawing_${prescriptionId}` : 'cortex_drawing_draft'}
                />
              </div>

              {/* Doctor / Signature Selector Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Attending & Signing Doctor
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableDoctors.map((doc) => {
                    const isSelected = (selectedDoctorName || '').toLowerCase() === doc.name.toLowerCase();
                    return (
                      <div
                        key={doc.id || doc._id || doc.name}
                        onClick={() => handleDoctorSelect(doc.name)}
                        className={isSelected ? 'p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600' : 'p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="doctor_selection_radio"
                            checked={isSelected}
                            onChange={() => { }}
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
                  <span className="font-semibold text-slate-600">Prescription Print Signature Mode:</span>
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIncludeSignature(true)}
                      className={includeSignature ? 'px-2.5 py-1 rounded text-xs font-semibold transition bg-blue-600 text-white shadow-xs' : 'px-2.5 py-1 rounded text-xs font-semibold transition text-slate-600 hover:bg-slate-100'}
                    >
                      ✓ With Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeSignature(false)}
                      className={!includeSignature ? 'px-2.5 py-1 rounded text-xs font-semibold transition bg-blue-600 text-white shadow-xs' : 'px-2.5 py-1 rounded text-xs font-semibold transition text-slate-600 hover:bg-slate-100'}
                    >
                      Without Sign (Name Only)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Restored to clean original layout) */}
            <div className="flex flex-col items-center gap-3 mt-8 pb-10">
              <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-xl">
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="flex-1 px-8 py-3.5 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : saving ? 'Saving Prescription...' : isEditMode ? 'Update Prescription' : 'Save Prescription'}
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
              </div>
            </div>
            {/* Toast Notification */}
            {templateToast && (
              <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{templateToast}</span>
              </div>
            )}

            {/* Load Template Modal */}
            {isLoadTemplateModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Load Prescription Template</h3>
                        <p className="text-[11px] text-slate-500">Select a template to auto-populate diagnosis, medicines, and advice.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLoadTemplateModalOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        placeholder="Search template name, diagnosis, medicine..."
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <select
                      value={templateCategoryFilter}
                      onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                      className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                    >
                      <option value="All">All Specialties</option>
                      <option value="Orthopaedics">Orthopaedics</option>
                      <option value="Gynaecology">Gynaecology</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>

                  <div className="p-4 overflow-y-auto space-y-2.5 flex-1 max-h-[50vh]">
                    {savedTemplatesList
                      .filter(t => {
                        if (templateCategoryFilter !== 'All' && t.category !== templateCategoryFilter) return false;
                        if (!templateSearchQuery.trim()) return true;
                        const q = templateSearchQuery.toLowerCase();
                        return t.name.toLowerCase().includes(q) || (t.diagnosis || '').toLowerCase().includes(q) || (t.medicines || []).some(m => m.name.toLowerCase().includes(q));
                      })
                      .map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition flex items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {tmpl.category || 'General'}
                              </span>
                              <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600">
                                {tmpl.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-600 truncate">
                              <strong>Diag:</strong> {tmpl.diagnosis || 'None'} • <strong>Meds:</strong> {tmpl.medicines?.length || 0} drugs
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              applyPrescriptionTemplate(tmpl);
                              setIsLoadTemplateModalOpen(false);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    {savedTemplatesList.length === 0 && (
                      <p className="text-center py-6 text-slate-400 text-xs">No templates found.</p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                    <a
                      href="/admin/templates"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      Manage All Templates in Full View <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsLoadTemplateModalOpen(false)}
                      className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Template Modal */}
            {isSaveTemplateModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <BookmarkPlus className="w-5 h-5 text-purple-600" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Save as Prescription Template</h3>
                        <p className="text-[11px] text-slate-500">Save current medicines, diagnosis, and advice as a reusable template.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSaveTemplateModalOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        value={templateNameInput}
                        onChange={(e) => setTemplateNameInput(e.target.value)}
                        placeholder="e.g. Knee OA Standard Protocol"
                        className="w-full p-2.5 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Specialty
                        </label>
                        <select
                          value={templateCategoryInput}
                          onChange={(e) => setTemplateCategoryInput(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg font-semibold bg-white"
                        >
                          <option value="Orthopaedics">Orthopaedics</option>
                          <option value="Gynaecology">Gynaecology</option>
                          <option value="General Medicine">General Medicine</option>
                          <option value="Pediatrics">Pediatrics</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Doctor
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={selectedDoctorName}
                          className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg font-semibold text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1.5 text-[11px]">
                      <span className="font-bold text-purple-900 block">Template Content Preview:</span>
                      <p className="text-slate-700"><strong>Diagnosis:</strong> {formData.de || 'None'}</p>
                      <p className="text-slate-700"><strong>Medicines:</strong> {medicines.length} items with dosages & schedules</p>
                      <p className="text-slate-700"><strong>Advice:</strong> {formData.advice ? formData.advice.slice(0, 60) + '...' : 'None'}</p>
                      <p className="text-slate-700"><strong>Follow-up:</strong> {followupCount} {followupUnit}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsSaveTemplateModalOpen(false)}
                        className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!templateNameInput.trim()) {
                            alert('Please enter a template name.');
                            return;
                          }
                          const saved = saveTemplateService({
                            name: templateNameInput.trim(),
                            category: templateCategoryInput,
                            doctor_name: selectedDoctorName,
                            diagnosis: formData.de || '',
                            medicines: medicines,
                            complaints: complaintsList.map(c => ({
                              complaint: c.complaint,
                              frequency: c.frequency,
                              severity: c.severity,
                              duration: c.duration,
                            })),
                            findings: findingsText,
                            vitals: {
                              bp_systolic: bpSystolic,
                              bp_diastolic: bpDiastolic,
                              pulse: pulseVal,
                              height: heightVal,
                              weight: weightVal,
                              temperature: tempVal,
                              bmi: bmiVal,
                              waist_hip: waistHipVal,
                              spo2: spo2Val,
                              lmp: lmpDate,
                              edd: eddDate,
                              gestational_weeks: gestationalWeeks,
                              gestational_days: gestationalDays,
                            },
                            advice: formData.advice,
                            dr_notes: drNotes,
                            quick_notes: quickNotes,
                            procedure_advice: procedureAdvice,
                            diet_exercise: dietExercise,
                            investigations: investigationText,
                            general_examinations: generalExam,
                            past_medications: pastMedication,
                            drawing_board: drawingDataUrl,
                            tests_requested: testsRequested.map(t => ({ name: t.name, by_when: t.by_when })),
                            followup_count: followupCount,
                            followup_unit: followupUnit,
                          });
                          refreshTemplates();
                          setIsSaveTemplateModalOpen(false);
                          showTemplateToast('Template "' + saved.name + '" saved successfully!');
                        }}
                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-xs transition"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Prescription Preview Section - Exact 1-to-1 Printable Letterhead Replica */}
          <div className="mt-12 mb-8">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Prescription Live Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Exact print representation as printed on hospital letterhead
                </p>
              </div>
              <button
                type="button"
                onClick={handlePrintablePrescription}
                disabled={loading || saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Download
              </button>
            </div>

            {/* Letterhead Container */}
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl border border-slate-300 relative overflow-hidden p-6 sm:p-9 font-sans text-slate-900 transition">
              {/* Background Watermark */}
              <img
                src="/cortex_logo.png"
                alt="Watermark"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 opacity-[0.04] pointer-events-none select-none"
              />

              {/* Top Meta Row */}
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono border-b border-slate-200 pb-1.5 mb-3">
                <span>{formData.date ? `${formatPrescriptionDate(formData.date)} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Live Preview'}</span>
                <span className="font-bold text-slate-700">Svasth HMS</span>
              </div>

              {/* Header Area */}
              <div className="flex justify-between items-start pb-3 border-b-2 border-slate-800 gap-4">
                <div className="flex items-center pt-1">
                  <img
                    src="/cortex_logo.png"
                    alt="Cortex Hospital"
                    className="h-16 w-auto object-contain"
                  />
                </div>

                <div className="text-right">
                  {(selectedDoctorName || '').toLowerCase().includes('shillpa') ? (
                    <>
                      <h1 className="text-xl sm:text-2xl font-black text-[#7B1828] tracking-tight leading-tight">
                        Dr. Shillpa Raut
                      </h1>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">M.B.B.S., M.D. (Gynecology &amp; Obstetrics)</div>
                      <div className="text-[11px] text-slate-500">Reg. No. 2004/05/1842</div>
                      <div className="text-xs font-semibold text-slate-800">Consulting Gynecologist &amp; Obstetrician</div>
                      <div className="text-xs font-semibold text-slate-800">Maternity, Infertility &amp; Women Care Specialist</div>
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl sm:text-2xl font-black text-[#7B1828] tracking-tight leading-tight">
                        {selectedDoctorName || 'Dr. Vipeen Raut'}
                      </h1>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">
                        M.B.B.S.,Dip.Ortho.,DNB Ortho
                      </div>
                      <div className="text-[11px] text-slate-500">Reg. No. 1692/03/2002</div>
                      <div className="text-xs font-semibold text-slate-800">
                        Diplomate of National Board (Orthopaedics)
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        Consulting Orthopaedic and Joint Replacement Surgeon
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Patient Bar */}
              <div className="flex flex-wrap justify-between items-center py-2 text-xs sm:text-sm font-bold text-black border-b border-slate-300">
                <div className="flex-1 min-w-[240px]">
                  <span>{formData.reference_number || patientReferenceNumber || 'CRX0001'}</span> : <span>MR./MS. {(formData.patientName || 'PATIENT NAME').toUpperCase()}</span>{' '}
                  <span className="font-medium text-slate-700">
                    ({formData.age ? `${formData.age} Y` : '—'}
                    {formData.age && formData.sex ? ', ' : ''}
                    {formData.sex || ''})
                  </span>
                  {formData.phoneNumber ? <span className="font-normal text-slate-600"> - Ph: {formData.phoneNumber}</span> : ''}
                </div>
                <div className="whitespace-nowrap font-bold text-slate-900">
                  Date: {formatPrescriptionDate(formData.date || new Date().toISOString().slice(0, 10))}
                </div>
              </div>

              {/* Vitals Row (BP, SpO2, Height, Weight, Pulse) */}
              {(formData.bp || formData.spo2 || formData.height || formData.weight || formData.pulse) && (
                <div className="flex flex-wrap items-center gap-3 py-1.5 text-xs text-slate-800 border-b border-dashed border-slate-300 bg-slate-50/60 px-2 rounded mt-1">
                  <span className="font-black text-black uppercase tracking-wider text-[11px]">Vitals:</span>
                  {formData.bp && (
                    <span className="inline-flex items-center gap-1">
                      <strong>BP:</strong> {formData.bp}{!formData.bp.toLowerCase().includes('mmhg') ? ' mmHg' : ''}
                    </span>
                  )}
                  {formData.spo2 && (
                    <span className="inline-flex items-center gap-1">
                      <strong>SpO₂:</strong> {formData.spo2}{!String(formData.spo2).includes('%') ? '%' : ''}
                    </span>
                  )}
                  {formData.height && (
                    <span className="inline-flex items-center gap-1">
                      <strong>Height:</strong> {formData.height}{!String(formData.height).toLowerCase().includes('cm') ? ' cm' : ''}
                    </span>
                  )}
                  {formData.weight && (
                    <span className="inline-flex items-center gap-1">
                      <strong>Weight:</strong> {formData.weight}{!String(formData.weight).toLowerCase().includes('kg') ? ' kg' : ''}
                    </span>
                  )}
                  {formData.pulse && (
                    <span className="inline-flex items-center gap-1">
                      <strong>Pulse:</strong> {formData.pulse}{!String(formData.pulse).includes('/') ? ' /min' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Diagnosis Row */}
              {formData.de && (
                <div className="py-2 text-xs sm:text-sm border-b border-slate-300">
                  <span className="font-extrabold text-black">Diagnosis: </span>
                  <span className="font-bold text-slate-900 uppercase">{formData.de}</span>
                </div>
              )}

              {/* Rx Section */}
              <div className="mt-3">
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
                                  <span className="font-semibold text-slate-500 uppercase">Composition:</span> {med.composition}
                                </div>
                              )}
                              {(() => {
                                const timingVal = med.timing || getTimingFromDosage(med.dosage);
                                if (!timingVal) return null;
                                return (
                                  <div className="text-[11px] text-slate-800 pl-4 mt-0.5">
                                    <span className="font-semibold text-slate-500 uppercase">Timing:</span> {timingVal}
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
                                if (med.frequency && med.frequency !== 'Daily') parts.push(med.frequency);
                                if (med.freq_duration) parts.push(med.freq_duration);
                                if (
                                  med.duration &&
                                  (!med.freq_duration ||
                                    (!med.freq_duration.toLowerCase().includes(med.duration.toLowerCase()) &&
                                      !/दिवस|महिना|week|day/i.test(med.freq_duration)))
                                ) {
                                  parts.push(`(${med.duration})`);
                                }
                                return parts.join(' • ') || med.freq_duration || med.duration || med.frequency || '—';
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

              {/* Advice, Followup & Doctor Signature Block */}
              <div className="mt-5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-4">
                <div className="flex-1 text-xs">
                  {formData.advice && (
                    <div className="mb-2">
                      <div className="font-bold text-black uppercase tracking-wider text-[11px]">Advice:</div>
                      <div className="text-slate-800 font-medium whitespace-pre-line mt-0.5">{formData.advice}</div>
                    </div>
                  )}

                  {formData.investigation && (
                    <div className="text-slate-900 font-bold mt-1">
                      <span className="font-extrabold mr-1.5">फेर चाचणी :</span>
                      <span>{formData.investigation}</span>
                    </div>
                  )}

                  {formData.followupDate && (
                    <div className="text-slate-900 font-bold mt-1">
                      <span className="font-extrabold mr-1.5">फेरतपासणी:</span>
                      <span>{formatFollowup(formData.followupDate, formData.date)}</span>
                    </div>
                  )}

                  <div className="text-rose-700 font-extrabold text-[11px] tracking-wide mt-2">
                    * Prescription is valid for 30 days only
                  </div>
                </div>

                {/* Signature Box */}
                <div className="text-center min-w-[150px] shrink-0 pb-1">
                  {includeSignature && (
                    <div className="mb-1">
                      <img
                        src={
                          (() => {
                            const docObj = availableDoctors.find((d) => d.name.toLowerCase() === (selectedDoctorName || '').toLowerCase());
                            const sig = docObj?.signature_url;
                            if (!sig) return (selectedDoctorName || '').toLowerCase().includes('anjali') ? '/sign1.png' : '/sign.png';
                            if (sig.startsWith('data:') || sig.startsWith('http://') || sig.startsWith('https://')) return sig;
                            return `/${sig.replace(/^\//, '')}`;
                          })()
                        }
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

              {/* Bottom Schedule Banner */}
              <div className="mt-5 pt-3 border-t-2 border-slate-300 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5 flex-wrap">
                  <span className="bg-[#7B1828] text-white text-[11px] font-bold px-3 py-0.5 rounded-full">
                    Hip &amp; Knee Joint Clinic
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Every Thursday 6 pm to 8 pm
                  </span>
                </div>

                <div className="text-xs sm:text-sm font-extrabold text-black">
                  Orthopaedics Clinic
                </div>

                <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                  <span className="font-bold text-[#7B1828]">OPD Time : </span>
                  Mon. to Fri. - 10 am to 1 pm &amp; 6 pm to 8 pm | Sat. - 10 am to 1 pm &amp; Evening OPD Closed
                </div>

                <div className="text-[11px] font-bold text-[#7B1828] mt-0.5">
                  Sunday OPD Closed
                </div>

                <div className="text-[10px] text-slate-600 mt-1">
                  Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001 &nbsp;|&nbsp; Ph. : 07152-255795, Cell : 9373280505
                </div>

                <div className="h-1 bg-gradient-to-r from-purple-800 via-[#7B1828] to-purple-800 rounded mt-2"></div>

                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                  <span>Powered by</span>
                  <img src="/Svasth_logo.png" alt="Svasth HMS" className="h-2.5 w-auto inline-block" />
                  <strong className="text-slate-600">Svasth HMS</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden iframe for PDF preview/loading */}
          {pdfUrl && (
            <div className="hidden">
              <iframe
                src={pdfUrl}
                title="Prescription PDF"
              />
            </div>
          )}

          {/* Payment Details Modal */}
          {showPaymentModal && currentBill && (
            <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Payment Details</h3>

                {(() => {
                  const origTotal = Number(currentBill.total_amount);
                  const discAmt = Math.round((origTotal * paymentDetails.discountPercent) / 100);
                  const payable = Math.round(origTotal - discAmt);
                  const balance = Math.max(payable - Math.round(paymentDetails.amountPaid), 0);
                  return (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Total Amount: <span className="font-bold text-gray-900">₹{origTotal.toLocaleString('en-IN')}</span></p>
                      {paymentDetails.discountPercent > 0 && (
                        <p className="text-sm text-gray-600 mb-1">Discount ({paymentDetails.discountPercent}%): <span className="font-bold text-green-600">- ₹{discAmt.toLocaleString('en-IN')}</span></p>
                      )}
                      <p className="text-sm text-gray-600 mb-1">Payable: <span className="font-bold text-gray-900">₹{payable.toLocaleString('en-IN')}</span></p>
                      <p className="text-sm text-gray-600 mb-4">Balance Due: <span className="font-bold text-red-600">₹{balance.toLocaleString('en-IN')}</span></p>
                    </div>
                  );
                })()}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={paymentDetails.discountPercent}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, discountPercent: Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 100) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={Math.round(Number(currentBill.total_amount) - Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100))}
                    step="1"
                    value={paymentDetails.amountPaid}
                    onChange={(e) => {
                      const payable = Math.round(Number(currentBill.total_amount) - Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100));
                      const val = Math.round(Math.min(Math.max(parseFloat(e.target.value) || 0, 0), payable));
                      setPaymentDetails({ ...paymentDetails, amountPaid: val });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    Payment Status:
                    {(() => {
                      const payable = Math.round(Number(currentBill.total_amount) - Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100));
                      const status = paymentDetails.amountPaid === 0 ? 'PENDING' : paymentDetails.amountPaid >= payable ? 'PAID' : 'PARTIAL';
                      const cls = status === 'PENDING' ? 'bg-red-100 text-red-700' : status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                      return <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${cls}`}>{status}</span>;
                    })()}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintBill}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Print Bill
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PrescriptionPage;