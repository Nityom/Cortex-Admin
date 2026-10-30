'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAllMedicines, Medicine } from '@/services/medicine';
import {
  getAllTemplates,
  getTemplateById,
  saveTemplate as saveTemplateService,
  PrescriptionTemplate,
} from '@/services/templates';
import {
  addPrescription,
  Prescription,
  getPrescriptionById,
  updatePrescription,
  MedicineEntry,
  getPrescriptionsByPatient,
} from '@/services/prescription';
import {
  getOrCreatePatient,
  getPatientByPhoneNumber,
  updatePatient,
} from '@/services/patients';
import { doctorService } from '@/services/doctors';
import { Doctor } from '@/types/doctor';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';
import {
  autoRecordMedicineStock,
  deductPrescriptionConsumables,
  deductPrescriptionTreatments,
  syncPrescriptionBill,
  updateLocalOpdQueue,
} from '@/services/prescriptionPersistence';
import {
  DEFAULT_RX_SECTION_ORDER,
  PrescriptionSectionKey,
} from '@/components/prescription/PrescriptionSectionsContainer';
import { PrescriptionEmailModalData } from '@/components/prescription/PrescriptionEmailModal';
import { updateBill } from '@/services/bills';
import { paymentTransactionService } from '@/services/payment-transactions';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
}
const convexClient = new ConvexHttpClient(convexUrl);

export interface FormData {
  patientName: string;
  email?: string;
  age: string;
  sex: string;
  phoneNumber: string;
  date: string;
  cc: string;
  mh: string;
  investigation: string;
  de: string;
  advice: string;
  followupDate: string;
  reference_number?: string;
  token?: string;
  bp?: string;
  spo2?: string;
  height?: string;
  weight?: string;
  pulse?: string;
  temperature?: string;
}

export interface TreatmentItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date?: string;
}

export function usePrescriptionForm() {
  const router = useRouter();

  // Basic Page State
  const [isEditMode, setIsEditMode] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [patientReferenceNumber, setPatientReferenceNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opdVisitId, setOpdVisitId] = useState<string | null>(null);

  // Reorderable section order for form, live preview, and printout
  const [rxSectionOrder, setRxSectionOrder] = useState<PrescriptionSectionKey[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clear old stale storage keys so users automatically get the updated default clinical sequence
        localStorage.removeItem('cortex_rx_sections_order');
        localStorage.removeItem('cortex_rx_sections_order_v2');
        localStorage.removeItem('cortex_rx_sections_order_v3');

        const saved = localStorage.getItem('cortex_rx_sections_order_v4');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const existing = new Set(parsed);
            const complete = [...parsed];
            for (const k of DEFAULT_RX_SECTION_ORDER) {
              if (!existing.has(k)) complete.push(k);
            }
            return complete;
          }
        }
      } catch {}
    }
    return DEFAULT_RX_SECTION_ORDER;
  });

  const resetSectionOrder = useCallback(() => {
    setRxSectionOrder(DEFAULT_RX_SECTION_ORDER);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cortex_rx_sections_order_v4');
        localStorage.removeItem('cortex_rx_sections_order');
      } catch {}
    }
  }, []);

  // Remembered print section checkboxes (persisted to device localStorage)
  const [enabledPrintSections, setEnabledPrintSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cortex_rx_print_enabled_sections');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return {
              header_footer: true,
              vitals: true,
              complaints: true,
              diagnosis: true,
              history: true,
              findings: true,
              drawing_board: true,
              medicines: true,
              clinical_notes: true,
              next_visit: true,
              signature: true,
              ...parsed,
            };
          }
        }
      } catch {}
    }
    return {
      header_footer: true,
      vitals: true,
      complaints: true,
      diagnosis: true,
      history: true,
      findings: true,
      drawing_board: true,
      medicines: true,
      clinical_notes: true,
      next_visit: true,
      signature: true,
    };
  });

  const saveEnabledPrintSections = useCallback(
    (
      updaterOrVal:
        | Record<string, boolean>
        | ((prev: Record<string, boolean>) => Record<string, boolean>)
    ) => {
      setEnabledPrintSections((prev) => {
        const next =
          typeof updaterOrVal === 'function' ? updaterOrVal(prev) : updaterOrVal;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              'cortex_rx_print_enabled_sections',
              JSON.stringify(next)
            );
          } catch {}
        }
        return next;
      });
    },
    []
  );

  // Print Modal with section checkboxes and live preview
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Email Prescription Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSuccessPrompt, setEmailSuccessPrompt] = useState(false);

  // Active top navigation tab ('1st Visit' vs 'View Past')
  const [activeTab, setActiveTab] = useState<'1st Visit' | 'View Past'>('1st Visit');

  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    email: '',
    age: '',
    sex: 'Male',
    phoneNumber: '',
    date: todayDate,
    cc: '',
    mh: '',
    investigation: '',
    de: '',
    advice: '',
    followupDate: '',
  });

  // Doctor Selector State
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>('Dr. Vipeen Raut');
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [includeSignature, setIncludeSignature] = useState(true);

  // Consultation & Billing State
  const [isNewPatient, setIsNewPatient] = useState(true);
  const [applyConsultationCharge, setApplyConsultationCharge] = useState(true);
  const [consultationCharge, setConsultationCharge] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDoc = localStorage.getItem('cortex_active_doctor') || 'Dr. Vipeen Raut';
        const isGynae = savedDoc.toLowerCase().includes('shilpa') || savedDoc.toLowerCase().includes('shillpa');
        return isGynae ? 200 : 400;
      } catch {}
    }
    return 400;
  });
  const [treatmentDiscount, setTreatmentDiscount] = useState<string | number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amountPaid: 0,
    discountPercent: 0,
    paymentMethod: 'Cash',
  });

  // Past Visits Modal
  const [isPastVisitsModalOpen, setIsPastVisitsModalOpen] = useState(false);

  // Complaints & Findings
  const [complaintsList, setComplaintsList] = useState<any[]>([]);
  const [findingsText, setFindingsText] = useState('');

  // Vitals State
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
      const hM = h > 3 ? h / 100 : h;
      return (w / (hM * hM)).toFixed(1);
    }
    return bmiVal || '';
  }, [heightVal, weightVal, bmiVal]);

  useEffect(() => {
    if (displayBmi) setBmiVal(displayBmi);
  }, [displayBmi]);

  // Auto-calculate EDD (Naegele's rule: LMP + 280 days) & Gestational Age (from LMP to visit date)
  useEffect(() => {
    if (!lmpDate) {
      return;
    }
    try {
      const lmp = new Date(lmpDate);
      if (isNaN(lmp.getTime())) return;

      // EDD = LMP + 280 days (40 weeks)
      const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
      const yyyy = edd.getFullYear();
      const mm = String(edd.getMonth() + 1).padStart(2, '0');
      const dd = String(edd.getDate()).padStart(2, '0');
      setEddDate(`${yyyy}-${mm}-${dd}`);

      // Gestational Age = difference from LMP to visit date (or today)
      const visitDate = formData.date ? new Date(formData.date) : new Date();
      const diffMs = visitDate.getTime() - lmp.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays >= 0) {
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        setGestationalWeeks(String(weeks));
        setGestationalDays(String(days));
      } else {
        setGestationalWeeks('');
        setGestationalDays('');
      }
    } catch (err) {
      console.warn('Error calculating EDD / GA:', err);
    }
  }, [lmpDate, formData.date]);

  // Diagnosis State
  const [diagnosesList, setDiagnosesList] = useState<any[]>([]);

  // Procedure Done State
  const [dentalProcedures, setDentalProcedures] = useState<{ id: number; name: string; price: number }[]>([]);
  const [treatmentItems, setTreatmentItems] = useState<TreatmentItem[]>([]);

  // Medicines State
  const [medicines, setMedicines] = useState<MedicineEntry[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<Medicine[]>([]);

  // Clinical Notes & Other Sections
  const [drNotes, setDrNotes] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [procedureAdvice, setProcedureAdvice] = useState('');
  const [dietExercise, setDietExercise] = useState('');
  const [investigationText, setInvestigationText] = useState('');
  const [testsRequested, setTestsRequested] = useState<any[]>([]);
  const [followupCount, setFollowupCount] = useState('5');
  const [followupUnit, setFollowupUnit] = useState('Days');
  const [pastMedication, setPastMedication] = useState('');
  const [systemicExam, setSystemicExam] = useState('');
  const [generalExam, setGeneralExam] = useState('');
  const [referralDocName, setReferralDocName] = useState('');
  const [referralSpeciality, setReferralSpeciality] = useState('');
  const [referralPhone, setReferralPhone] = useState('');
  const [referralEmail, setReferralEmail] = useState('');

  // Drawing Board
  const [drawingDataUrl, setDrawingDataUrl] = useState('');

  // Master Prescription Template Modals
  const [isLoadTemplateModalOpen, setIsLoadTemplateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [savedTemplatesList, setSavedTemplatesList] = useState<PrescriptionTemplate[]>([]);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('All');
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateCategoryInput, setTemplateCategoryInput] = useState('Orthopaedics');

  // Toast State
  const [templateToastMessage, setTemplateToastMessage] = useState<string | null>(null);

  const showTemplateToast = (msg: string) => {
    setTemplateToastMessage(msg);
    setTimeout(() => setTemplateToastMessage(null), 3000);
  };

  const refreshTemplates = useCallback(() => {
    setSavedTemplatesList(getAllTemplates());
  }, []);

  // Switch Doctor Handler
  const handleDoctorSelect = (docName: string) => {
    setSelectedDoctorName(docName);
    const isGynae = docName.toLowerCase().includes('shilpa') || docName.toLowerCase().includes('shillpa');
    setConsultationCharge(isNewPatient ? (isGynae ? 200 : 400) : (isGynae ? 100 : 200));
    try {
      localStorage.setItem('cortex_active_doctor', docName);
    } catch {}
  };

  // Medicine Filter & Auto-save
  const filteredMedicineOptions = useMemo(() => {
    return medicineOptions.filter((med) => {
      const doc = med.doctor_name || 'Both Doctors';
      if (selectedDoctorName === 'Dr. Vipeen Raut') {
        return doc === 'Dr. Vipeen Raut' || doc === 'Both Doctors';
      } else if (selectedDoctorName === 'Dr. Shillpa Raut') {
        return doc === 'Dr. Shillpa Raut' || doc === 'Both Doctors';
      }
      return true;
    });
  }, [medicineOptions, selectedDoctorName]);

  const autoSaveMedicineIfNew = useCallback(
    async (medName: string, composition?: string) => {
      const trimmed = (medName || '').trim();
      if (!trimmed) return;
      const exists = medicineOptions.some(
        (m) => m.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!exists) {
        try {
          const newMed: Medicine = {
            name: trimmed,
            composition: composition?.trim() || '',
            price: 0,
            quantity: 100,
            doctor_name: selectedDoctorName || 'Both Doctors',
          };
          const { addMedicine } = await import('@/services/medicine');
          const savedId = await addMedicine(newMed);
          if (savedId) {
            setMedicineOptions((prev) => [{ ...newMed, id: String(savedId) }, ...prev]);
          }
        } catch (err) {
          console.warn('Auto-save medicine skipped:', err);
        }
      }
    },
    [medicineOptions, selectedDoctorName]
  );

  // Procedure Catalog Handler
  const saveProcedureToCatalog = useCallback((name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDentalProcedures((prev) => {
      const existingIdx = prev.findIndex((p) => p.name.toLowerCase() === trimmed.toLowerCase());
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], price };
        try {
          localStorage.setItem('cortex_custom_procedures_v1', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      const newId = Math.max(...prev.map((p) => p.id), 0) + 1;
      const updated = [...prev, { id: newId, name: trimmed, price }];
      try {
        localStorage.setItem('cortex_custom_procedures_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Handle Tab Click (1st Visit vs View Past)
  const handleTabChange = (tab: '1st Visit' | 'View Past') => {
    setActiveTab(tab);
    if (tab === 'View Past') {
      setIsPastVisitsModalOpen(true);
    } else {
      setIsNewPatient(true);
      setConsultationCharge(400);
      showTemplateToast('1st Visit Mode: Consultation fee set to ₹400');
    }
  };

  // Load Past Prescription into Form
  const handleLoadPastPrescription = (pastRx: any) => {
    if (!pastRx) return;

    if (pastRx.diagnosis) {
      setFormData((prev) => ({ ...prev, de: pastRx.diagnosis }));
      setDiagnosesList([{ id: 'd_past_1', diagnosis: pastRx.diagnosis, snomed_code: '', duration: '', date: '' }]);
    }
    if (pastRx.chief_complaint) {
      setFormData((prev) => ({ ...prev, cc: pastRx.chief_complaint }));
      setComplaintsList([
        { id: 'c_past_1', complaint: pastRx.chief_complaint, frequency: 'Regular', severity: 'Moderate', duration: '' },
      ]);
    }
    if (pastRx.medicines) {
      const meds = Array.isArray(pastRx.medicines)
        ? pastRx.medicines
        : typeof pastRx.medicines === 'string'
        ? JSON.parse(pastRx.medicines)
        : [];
      if (meds.length > 0) setMedicines(meds);
    }
    if (pastRx.advice) {
      setFormData((prev) => ({ ...prev, advice: pastRx.advice }));
    }
    if (pastRx.vitals) {
      const v = pastRx.vitals;
      if (v.bp_systolic) setBpSystolic(v.bp_systolic);
      if (v.bp_diastolic) setBpDiastolic(v.bp_diastolic);
      if (v.pulse) setPulseVal(v.pulse);
      if (v.spo2) setSpo2Val(v.spo2);
      if (v.weight) setWeightVal(v.weight);
      if (v.height) setHeightVal(v.height);
      if (v.temperature) setTempVal(v.temperature);
      if (v.lmp) setLmpDate(v.lmp);
      if (v.edd) setEddDate(v.edd);
      if (v.gestational_age) {
        const parts = String(v.gestational_age).split(' ');
        if (parts[0]) setGestationalWeeks(parts[0].replace(/\D/g, ''));
        if (parts[2]) setGestationalDays(parts[2].replace(/\D/g, ''));
      }
    }

    setIsNewPatient(false);
    setConsultationCharge(200);

    const visitDateStr = pastRx.prescription_date || 'past consultation';
    showTemplateToast(`Loaded records from visit (${visitDateStr}) into active prescription!`);
  };

  // Apply Master Prescription Template
  const applyPrescriptionTemplate = useCallback(
    (tmpl: PrescriptionTemplate) => {
      if (tmpl.diagnosis) {
        setFormData((prev) => ({ ...prev, de: tmpl.diagnosis }));
      }
      if (tmpl.diagnoses_list && tmpl.diagnoses_list.length > 0) {
        setDiagnosesList(
          tmpl.diagnoses_list.map((d, i) => ({
            id: d.id || `diag_${Date.now()}_${i}`,
            diagnosis: d.diagnosis,
            snomed_code: d.snomed_code || '',
            duration: d.duration || '',
            date: d.date || '',
          }))
        );
      } else if (tmpl.diagnosis) {
        setDiagnosesList([
          {
            id: `diag_${Date.now()}`,
            diagnosis: tmpl.diagnosis,
            snomed_code: '',
            duration: '',
            date: '',
          },
        ]);
      }

      if (tmpl.complaints && tmpl.complaints.length > 0) {
        setComplaintsList(
          tmpl.complaints.map((c, i) => ({
            id: `cmp_${Date.now()}_${i}`,
            complaint: c.complaint,
            frequency: c.frequency || 'Daily',
            severity: c.severity || 'Moderate',
            duration: c.duration || '',
          }))
        );
        const summary = tmpl.complaints.map((c) => c.complaint).join(', ');
        setFormData((prev) => ({ ...prev, cc: summary }));
      }

      if (tmpl.medicines && tmpl.medicines.length > 0) {
        setMedicines(JSON.parse(JSON.stringify(tmpl.medicines)));
      }

      if (tmpl.advice) setFormData((prev) => ({ ...prev, advice: tmpl.advice! }));
      if (tmpl.dr_notes) setDrNotes(tmpl.dr_notes);
      if (tmpl.quick_notes) setQuickNotes(tmpl.quick_notes);
      if (tmpl.procedure_advice) setProcedureAdvice(tmpl.procedure_advice);
      if (tmpl.diet_exercise) setDietExercise(tmpl.diet_exercise);
      if (tmpl.investigations) setInvestigationText(tmpl.investigations);
      if (tmpl.general_examinations) setGeneralExam(tmpl.general_examinations);
      if (tmpl.past_medications) setPastMedication(tmpl.past_medications);

      if (tmpl.tests_requested && tmpl.tests_requested.length > 0) {
        setTestsRequested(
          tmpl.tests_requested.map((t, i) => ({
            id: `tst_${Date.now()}_${i}`,
            name: t.name,
            by_when: t.by_when || 'Next Visit',
          }))
        );
      }

      if (tmpl.followup_count) setFollowupCount(tmpl.followup_count);
      if (tmpl.followup_unit) setFollowupUnit(tmpl.followup_unit);

      showTemplateToast(`Template "${tmpl.name}" applied successfully!`);
      setIsLoadTemplateModalOpen(false);
    },
    []
  );

  // Save Master Template
  const handleSavePrescriptionTemplate = () => {
    if (!templateNameInput.trim()) {
      alert('Please enter a template name.');
      return;
    }
    const saved = saveTemplateService({
      name: templateNameInput.trim(),
      diagnosis: formData.de || diagnosesList.map((d) => d.diagnosis).join(', '),
      category: templateCategoryInput || 'Orthopaedics',
      doctor_name: selectedDoctorName,
      complaints: complaintsList.map((c) => ({
        complaint: c.complaint,
        frequency: c.frequency,
        severity: c.severity,
        duration: c.duration,
      })),
      findings: findingsText,
      medicines: medicines,
      advice: formData.advice,
      dr_notes: drNotes,
      quick_notes: quickNotes,
      procedure_advice: procedureAdvice,
      diet_exercise: dietExercise,
      investigations: investigationText,
      general_examinations: generalExam,
      past_medications: pastMedication,
      followup_count: followupCount,
      followup_unit: followupUnit as 'Days' | 'Weeks' | 'Months',
    });

    refreshTemplates();
    setIsSaveTemplateModalOpen(false);
    setTemplateNameInput('');
    showTemplateToast(`Saved "${saved.name}" to Master Templates!`);
  };

  // Form Field Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Phone Lookup & Patient Auto-fill
  const handlePhoneNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;
    setFormData((prev) => ({ ...prev, phoneNumber }));

    if (phoneNumber.length === 10) {
      try {
        const existingPatient = await getPatientByPhoneNumber(phoneNumber);
        if (existingPatient) {
          setFormData((prev) => ({
            ...prev,
            patientName: existingPatient.name || prev.patientName,
            age: existingPatient.age ? existingPatient.age.toString() : prev.age,
            sex: existingPatient.sex || prev.sex,
            reference_number: existingPatient.reference_number || prev.reference_number,
            email: (existingPatient as any).email || prev.email || '',
          }));
          if (existingPatient.reference_number) {
            setPatientReferenceNumber(existingPatient.reference_number);
          }
          setIsNewPatient(false);

          // Check if patient visited within 10 days
          let isWithin10Days = false;
          if (existingPatient.reference_number) {
            try {
              const pastRx = await getPrescriptionsByPatient(existingPatient.reference_number);
              if (pastRx && pastRx.length > 0) {
                const sorted = pastRx.sort((a, b) => new Date(b.prescription_date).getTime() - new Date(a.prescription_date).getTime());
                const lastDate = sorted[0].prescription_date;
                const diffDays = (new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24);
                isWithin10Days = diffDays >= 0 && diffDays <= 10;
              }
            } catch {}
          }

          const isGynae = (selectedDoctorName || '').toLowerCase().includes('shilpa') || (selectedDoctorName || '').toLowerCase().includes('shillpa');
          const fee = isGynae
            ? (isWithin10Days ? 100 : 200)
            : (isWithin10Days ? 200 : 400);

          setConsultationCharge(fee);
          showTemplateToast(`Patient Found: ${existingPatient.name} (${isWithin10Days ? 'Follow-up within 10 days' : 'Re-visit'}: ₹${fee})`);
        } else {
          setIsNewPatient(true);
          const isGynae = (selectedDoctorName || '').toLowerCase().includes('shilpa') || (selectedDoctorName || '').toLowerCase().includes('shillpa');
          setConsultationCharge(isGynae ? 200 : 400);
        }
      } catch (err) {
        console.error('Error fetching patient by phone:', err);
      }
    }
  };

  // Save Prescription to Database & Convex
  const savePrescriptionToDatabase = async (): Promise<any> => {
    try {
      setSaving(true);

      const patientData = {
        name: formData.patientName,
        age: parseInt(formData.age, 10) || 0,
        sex: formData.sex,
        phone_number: formData.phoneNumber,
        email: formData.email?.trim() || undefined,
      };

      const patient = await getOrCreatePatient(patientData);
      if (!patient || !patient.reference_number) {
        throw new Error('Could not retrieve or create patient record with reference number.');
      }

      if (patient.id && formData.email?.trim() && formData.email.trim() !== (patient as any).email) {
        try {
          await updatePatient(patient.id, { email: formData.email.trim() });
          (patient as any).email = formData.email.trim();
        } catch (err) {
          console.error('Failed to sync patient email:', err);
        }
      }

      setFormData((prev) => ({ ...prev, reference_number: patient.reference_number }));
      setPatientReferenceNumber(patient.reference_number);

      // Auto-save any new medicines typed
      for (const med of medicines) {
        if (med.name && med.name.trim()) {
          await autoSaveMedicineIfNew(med.name, med.composition);
        }
      }

      const bpFull = bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic}` : formData.bp || '';
      const allComplaints = complaintsList.length > 0 ? complaintsList.map((c) => c.complaint).filter(Boolean).join(', ') : formData.cc;
      const allDiagnoses = diagnosesList.length > 0 ? diagnosesList.map((d) => d.diagnosis).filter(Boolean).join(', ') : formData.de;
      const allAdvice = [formData.advice, procedureAdvice].filter(Boolean).join('\n');
      const allInvestigations = [
        investigationText || formData.investigation,
        ...testsRequested.map((t) => `${t.name}${t.by_when ? ` (By: ${t.by_when})` : ''}`),
      ].filter(Boolean).join(', ');
      const allFindings = [findingsText, generalExam, systemicExam].filter(Boolean).join('\n');

      const prescriptionData: Prescription = {
        patient_name: formData.patientName,
        phone_number: formData.phoneNumber,
        age: formData.age,
        sex: formData.sex,
        reference_number: patient.reference_number,
        email: formData.email?.trim() || undefined,
        prescription_date: formData.date,
        chief_complaint: allComplaints,
        medical_history: formData.mh,
        investigation: allInvestigations || undefined,
        diagnosis: allDiagnoses,
        oral_exam_notes: allFindings || undefined,
        dr_notes: drNotes || undefined,
        medicines: medicines,
        treatment_done: treatmentItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          date: item.date,
        })),
        advice: allAdvice || undefined,
        followup_date: formData.followupDate || undefined,
        doctor_name: selectedDoctorName || 'Dr. Vipeen Raut',
        opd_visit_id: opdVisitId || undefined,
        vitals: {
          bp: bpFull,
          bp_systolic: bpSystolic,
          bp_diastolic: bpDiastolic,
          pulse: pulseVal,
          height: heightVal,
          weight: weightVal,
          temperature: tempVal,
          spo2: spo2Val,
          bmi: bmiVal,
          waist_hip: waistHipVal,
          lmp: lmpDate,
          edd: eddDate,
          gestational_age: gestationalWeeks ? `${gestationalWeeks}w ${gestationalDays}d` : '',
        },
      };

      let savedPrescription;
      if (isEditMode && prescriptionId && prescriptionId !== 'undefined' && prescriptionId !== 'null') {
        savedPrescription = await updatePrescription(prescriptionId, prescriptionData);
      } else {
        savedPrescription = await addPrescription(prescriptionData);
        if (savedPrescription?.id) {
          setPrescriptionId(savedPrescription.id);
          setIsEditMode(true);
        }
      }

      // Update OPD status if visit was linked
      if (opdVisitId && (api as any).opd?.updateVisitStatus) {
        try {
          await convexClient.mutation((api as any).opd.updateVisitStatus, {
            id: opdVisitId as any,
            status: 'Completed',
            doctor_name: selectedDoctorName || 'Dr. Vipeen Raut',
            notes: 'Consultation completed & prescription recorded',
            staff_name: selectedDoctorName || 'Doctor',
          });
        } catch {}
      }

      updateLocalOpdQueue(opdVisitId || undefined, patient.reference_number, formData.phoneNumber);

      // Secondary tasks (Stock deduction & Billing)
      await autoRecordMedicineStock(medicines, medicineOptions);
      await deductPrescriptionConsumables(formData.patientName, isEditMode);
      await deductPrescriptionTreatments(treatmentItems, formData.patientName, savedPrescription?.id || '', formData.date);
      await syncPrescriptionBill({
        prescriptionId: savedPrescription?.id || '',
        patientId: patient.id,
        referenceNumber: patient.reference_number,
        isNewPatient,
        applyConsultationCharge,
        consultationCharge,
        treatmentItems,
        medicines,
        medicineOptions,
        treatmentDiscount,
      });

      return savedPrescription;
    } catch (err: any) {
      console.error('Failed to save prescription:', err);
      alert('Failed to save prescription: ' + (err.message || String(err)));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const getEmailModalData = useCallback((): PrescriptionEmailModalData => {
    const allComplaints = complaintsList.length > 0
      ? complaintsList.map((c) => c.complaint).filter(Boolean).join(', ')
      : formData.cc;
    const allDiagnoses = diagnosesList.length > 0
      ? diagnosesList.map((d) => d.diagnosis).filter(Boolean).join(', ')
      : formData.de;
    const allAdvice = [formData.advice, procedureAdvice].filter(Boolean).join('\n');
    const allInvestigations = [
      investigationText || formData.investigation,
      ...testsRequested.map((t) => `${t.name}${t.by_when ? ` (By: ${t.by_when})` : ''}`),
    ].filter(Boolean).join(', ');

    return {
      patientName: formData.patientName,
      phoneNumber: formData.phoneNumber,
      email: (formData as any).email || '',
      age: formData.age,
      gender: formData.sex || (formData as any).gender,
      referenceNumber: formData.reference_number || patientReferenceNumber,
      doctorName: selectedDoctorName,
      prescriptionDate: formData.date,
      chiefComplaint: allComplaints,
      diagnosis: allDiagnoses,
      medicalHistory: formData.mh,
      findings: findingsText || (formData as any).findings,
      advice: allAdvice,
      dietExercise: dietExercise,
      investigation: allInvestigations,
      followupDate: formData.followupDate,
      medicines: medicines,
      vitals: {
        bp: bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic}` : (bpSystolic || formData.bp || ''),
        pulse: pulseVal,
        spo2: spo2Val,
        height: heightVal,
        weight: weightVal,
        temp: tempVal,
        bmi: displayBmi || bmiVal,
        lmp: lmpDate,
        edd: eddDate,
        gestational_age: gestationalWeeks ? `${gestationalWeeks} weeks${gestationalDays ? ` ${gestationalDays} days` : ''}` : '',
      },
    };
  }, [
    formData,
    patientReferenceNumber,
    selectedDoctorName,
    complaintsList,
    diagnosesList,
    procedureAdvice,
    investigationText,
    testsRequested,
    dietExercise,
    medicines,
    bpSystolic,
    bpDiastolic,
    pulseVal,
    spo2Val,
    heightVal,
    weightVal,
    tempVal,
    displayBmi,
    bmiVal,
    lmpDate,
    eddDate,
    gestationalWeeks,
    gestationalDays,
  ]);

  const handleOpenEmailModal = () => {
    setIsEmailModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const saved = await savePrescriptionToDatabase();
      if (saved) {
        showTemplateToast('Prescription saved successfully!');
        setEmailSuccessPrompt(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Open Print Confirmation Popup with Section Options & Preview
  const handlePrintablePrescription = () => {
    setIsPrintModalOpen(true);
  };

  // Execute Final Prescription Print (called from Print Confirmation Modal)
  const executePrintPrescription = async (enabledSections?: Record<string, boolean>) => {
    const finalEnabledSections = enabledSections || enabledPrintSections;
    if (finalEnabledSections) {
      saveEnabledPrintSections(finalEnabledSections);
    }
    let currentId = prescriptionId;
    const docObj = availableDoctors.find(
      (d) => d.name.toLowerCase() === (selectedDoctorName || '').toLowerCase()
    );
    const docName = docObj?.name || selectedDoctorName || 'Dr. Vipeen Raut';

    const allComplaints = complaintsList.length > 0
      ? complaintsList.map((c) => c.complaint).filter(Boolean).join(', ')
      : formData.cc;
    const allDiagnoses = diagnosesList.length > 0
      ? diagnosesList.map((d) => d.diagnosis).filter(Boolean).join(', ')
      : formData.de;
    const allAdvice = [formData.advice, procedureAdvice].filter(Boolean).join('\n');
    const allInvestigations = [
      investigationText || formData.investigation,
      ...testsRequested.map((t) => `${t.name}${t.by_when ? ` (By: ${t.by_when})` : ''}`),
    ].filter(Boolean).join(', ');
    const allFindings = [findingsText, generalExam, systemicExam].filter(Boolean).join('\n');

    const printableSnapshot = {
      id: currentId || 'draft',
      patient_name: formData.patientName,
      phone_number: formData.phoneNumber,
      age: formData.age,
      sex: formData.sex,
      reference_number: formData.reference_number || patientReferenceNumber || '',
      token: formData.token,
      prescription_date: formData.date || new Date().toISOString().slice(0, 10),
      chief_complaint: allComplaints,
      medical_history: formData.mh,
      findings: allFindings,
      clinical_findings: allFindings,
      investigation: allInvestigations,
      diagnosis: allDiagnoses,
      medicines: medicines,
      advice: allAdvice,
      diet_exercise: dietExercise,
      referral_doctor: referralDocName
        ? `${referralDocName}${referralSpeciality ? ` (${referralSpeciality})` : ''}${referralPhone ? ` - ${referralPhone}` : ''}`
        : '',
      followup_date: formData.followupDate,
      doctor_name: docName,
      drawing_data: drawingDataUrl,
      vitals: {
        bp: bpSystolic && bpDiastolic ? `${bpSystolic}/${bpDiastolic}` : (bpSystolic || formData.bp || ''),
        bp_systolic: bpSystolic,
        bp_diastolic: bpDiastolic,
        pulse: pulseVal,
        spo2: spo2Val,
        height: heightVal,
        weight: weightVal,
        temperature: tempVal,
        bmi: displayBmi || bmiVal,
        waist_hip: waistHipVal,
        lmp: lmpDate,
        edd: eddDate,
        gestational_age: gestationalWeeks ? `${gestationalWeeks} weeks${gestationalDays ? ` ${gestationalDays} days` : ''}` : '',
      },
      section_order: rxSectionOrder,
      enabled_sections: finalEnabledSections || {},
      // Note: Doctor notes (drNotes) and treatment done (treatmentItems) are intentionally excluded from prescription print
    };

    try {
      localStorage.setItem('cortex_printable_prescription', JSON.stringify(printableSnapshot));
    } catch {}

    if (!currentId && formData.patientName) {
      const saved = await savePrescriptionToDatabase();
      if (saved?.id) currentId = saved.id;
    }

    setIsPrintModalOpen(false);

    const hasSig = finalEnabledSections ? finalEnabledSections.signature !== false : includeSignature;
    const hasHeaderFooter = finalEnabledSections ? finalEnabledSections.header_footer !== false : true;
    const printUrl = `/print-prescription?id=${encodeURIComponent(currentId || 'draft')}&autoPrint=true&withSignature=${hasSig ? 'true' : 'false'}&headerFooter=${hasHeaderFooter ? 'true' : 'false'}`;
    window.open(printUrl, '_blank');
  };

  const handlePrintBill = async () => {
    if (!currentBill) return;

    // Save payment details to the bill if payment amount was entered
    if (currentBill.id && paymentDetails.amountPaid > 0) {
      try {
        const origTotal = Number(currentBill.total_amount) || 0;
        const discAmt = Math.round((origTotal * (paymentDetails.discountPercent || 0)) / 100);
        const payable = Math.max(0, origTotal - discAmt);
        const paid = Math.min(payable, Number(paymentDetails.amountPaid) || 0);
        const balance = Math.max(0, payable - paid);
        const status = paid >= payable ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

        await updateBill(currentBill.id, {
          paid_amount: paid,
          balance_amount: balance,
          payment_status: status,
          discount_percent: paymentDetails.discountPercent,
          discount_amount: discAmt,
        });

        // Record payment transaction
        try {
          await paymentTransactionService.create({
            bill_id: currentBill.id,
            patient_id: currentBill.patient_id || 'PATIENT',
            amount: paid,
            payment_method: paymentDetails.paymentMethod || 'Cash',
            payment_date: new Date().toISOString().split('T')[0],
            notes: `Prescription payment collected: ${paymentDetails.paymentMethod || 'Cash'}`,
          });
        } catch (e) {
          console.warn('Payment transaction log warning:', e);
        }
      } catch (err) {
        console.error('Failed to update bill payment status:', err);
      }
    }

    setShowPaymentModal(false);
    const printUrl = `/print-bill?id=${encodeURIComponent(currentBill.id || '')}&prescriptionId=${encodeURIComponent(prescriptionId || '')}`;
    window.open(printUrl, '_blank');
  };

  // Initial Load from URL & Services
  useEffect(() => {
    const initPage = async () => {
      try {
        const meds = await getAllMedicines();
        setMedicineOptions(meds);

        const docs = await doctorService.list({ status: 'ACTIVE' });
        if (docs && docs.length > 0) setAvailableDoctors(docs);

        const savedProcs = localStorage.getItem('cortex_custom_procedures_v1');
        if (savedProcs) {
          const parsed = JSON.parse(savedProcs);
          if (Array.isArray(parsed)) setDentalProcedures(parsed);
        }

        const params = new URLSearchParams(window.location.search);
        const qId = params.get('id') || params.get('prescriptionId');
        const qName = params.get('patientName') || params.get('name');
        const qPhone = params.get('phoneNumber') || params.get('phone');
        const qEmail = params.get('email');
        const qAge = params.get('age');
        const qSex = params.get('sex');
        const qTmplId = params.get('templateId');
        const qOpdId = params.get('opdVisitId') || params.get('visitId');
        const qDoctor = params.get('doctorName') || params.get('doctor') || params.get('doc');

        if (qOpdId) setOpdVisitId(qOpdId);
        if (qDoctor) {
          setSelectedDoctorName(qDoctor);
          const isGynae = qDoctor.toLowerCase().includes('shilpa') || qDoctor.toLowerCase().includes('shillpa');
          setConsultationCharge(isGynae ? 200 : 400);
        }

        if (qId) {
          setIsEditMode(true);
          setPrescriptionId(qId);
          const existing = await getPrescriptionById(qId);
          if (existing) {
            if (existing.doctor_name) setSelectedDoctorName(existing.doctor_name);
            let patientEmail = (existing as any).email || '';
            if (!patientEmail && existing.phone_number) {
              try {
                const pat = await getPatientByPhoneNumber(existing.phone_number);
                if (pat?.email) {
                  patientEmail = pat.email;
                }
              } catch {}
            }
            if (existing.reference_number) {
              setPatientReferenceNumber(existing.reference_number);
            }
            setFormData({
              patientName: existing.patient_name || '',
              email: patientEmail,
              age: existing.age ? String(existing.age) : '',
              sex: existing.sex || 'Male',
              phoneNumber: existing.phone_number || '',
              date: existing.prescription_date || new Date().toISOString().slice(0, 10),
              cc: existing.chief_complaint || '',
              mh: existing.medical_history || '',
              investigation: existing.investigation || '',
              de: existing.diagnosis || '',
              advice: existing.advice || '',
              followupDate: existing.followup_date || '',
              reference_number: existing.reference_number,
            });
            if (existing.medicines) {
              const parsedMeds = typeof existing.medicines === 'string' ? JSON.parse(existing.medicines) : existing.medicines;
              if (Array.isArray(parsedMeds)) setMedicines(parsedMeds);
            }
            if (existing.vitals) {
              const v = existing.vitals;
              if (v.bp_systolic) setBpSystolic(v.bp_systolic);
              if (v.bp_diastolic) setBpDiastolic(v.bp_diastolic);
              if (v.pulse) setPulseVal(v.pulse);
              if (v.weight) setWeightVal(v.weight);
              if (v.height) setHeightVal(v.height);
              if (v.spo2) setSpo2Val(v.spo2);
              if (v.temperature) setTempVal(v.temperature);
              if (v.lmp) setLmpDate(v.lmp);
              if (v.edd) setEddDate(v.edd);
              if (v.gestational_age) {
                const parts = String(v.gestational_age).split(' ');
                if (parts[0]) setGestationalWeeks(parts[0].replace(/\D/g, ''));
                if (parts[2]) setGestationalDays(parts[2].replace(/\D/g, ''));
              }
            }
          }
        } else {
          const qToken = params.get('token') || params.get('tokenNumber');
          if (qName || qPhone || qAge || qSex || qToken || qEmail) {
            setFormData((prev) => ({
              ...prev,
              patientName: qName || prev.patientName,
              phoneNumber: qPhone || prev.phoneNumber,
              email: qEmail || (prev as any).email || '',
              age: qAge || prev.age,
              sex: qSex || prev.sex,
              token: qToken || prev.token,
            }));
          }
          const qBp = params.get('bp');
          if (qBp) {
            const parts = qBp.split('/');
            if (parts.length === 2) {
              setBpSystolic(parts[0].trim());
              setBpDiastolic(parts[1].trim());
            } else {
              setBpSystolic(qBp.trim());
            }
          }
          const qPulse = params.get('pulse');
          if (qPulse) setPulseVal(qPulse);
          const qSpo2 = params.get('spo2');
          if (qSpo2) setSpo2Val(qSpo2);
          const qHeight = params.get('height');
          if (qHeight) setHeightVal(qHeight);
          const qWeight = params.get('weight');
          if (qWeight) setWeightVal(qWeight);
          const qLmp = params.get('lmp');
          if (qLmp) setLmpDate(qLmp);

          if (qPhone && qPhone.length === 10) {
            const existingPatient = await getPatientByPhoneNumber(qPhone);
            if (existingPatient) {
              setIsNewPatient(false);
              setConsultationCharge(200);
              if (existingPatient.email) {
                setFormData((prev) => ({ ...prev, email: existingPatient.email }));
              }
            }
          }
          if (qTmplId) {
            const tmpl = getTemplateById(qTmplId);
            if (tmpl) applyPrescriptionTemplate(tmpl);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    initPage();
  }, [applyPrescriptionTemplate]);

  return {
    // Basic Form
    formData,
    setFormData,
    handleChange,
    handlePhoneNumberChange,
    isEditMode,
    prescriptionId,
    patientReferenceNumber,
    loading,
    saving,
    todayDate,
    activeTab,
    handleTabChange,

    // Doctors
    selectedDoctorName,
    availableDoctors,
    handleDoctorSelect,
    includeSignature,
    setIncludeSignature,

    // Consultation & Billing
    isNewPatient,
    setIsNewPatient,
    consultationCharge,
    setConsultationCharge,
    applyConsultationCharge,
    setApplyConsultationCharge,
    treatmentDiscount,
    setTreatmentDiscount,
    showPaymentModal,
    setShowPaymentModal,
    currentBill,
    setCurrentBill,
    paymentDetails,
    setPaymentDetails,
    handlePrintBill,

    // Past Visits Modal
    isPastVisitsModalOpen,
    setIsPastVisitsModalOpen,
    handleLoadPastPrescription,

    // Complaints & Findings
    complaintsList,
    setComplaintsList,
    findingsText,
    setFindingsText,

    // Vitals
    bpSystolic,
    setBpSystolic,
    bpDiastolic,
    setBpDiastolic,
    pulseVal,
    setPulseVal,
    heightVal,
    setHeightVal,
    weightVal,
    setWeightVal,
    tempVal,
    setTempVal,
    bmiVal,
    setBmiVal,
    waistHipVal,
    setWaistHipVal,
    spo2Val,
    setSpo2Val,
    lmpDate,
    setLmpDate,
    eddDate,
    setEddDate,
    gestationalWeeks,
    setGestationalWeeks,
    gestationalDays,
    setGestationalDays,

    // Diagnosis & Procedures
    diagnosesList,
    setDiagnosesList,
    dentalProcedures,
    treatmentItems,
    setTreatmentItems,
    saveProcedureToCatalog,

    // Medicines
    medicines,
    setMedicines,
    medicineOptions,
    filteredMedicineOptions,
    autoSaveMedicineIfNew,

    // Clinical Notes & Sections
    drNotes,
    setDrNotes,
    quickNotes,
    setQuickNotes,
    procedureAdvice,
    setProcedureAdvice,
    dietExercise,
    setDietExercise,
    investigationText,
    setInvestigationText,
    testsRequested,
    setTestsRequested,
    followupCount,
    setFollowupCount,
    followupUnit,
    setFollowupUnit,
    pastMedication,
    setPastMedication,
    systemicExam,
    setSystemicExam,
    generalExam,
    setGeneralExam,
    referralDocName,
    setReferralDocName,
    referralSpeciality,
    setReferralSpeciality,
    referralPhone,
    setReferralPhone,
    referralEmail,
    setReferralEmail,

    // Drawing Board
    drawingDataUrl,
    setDrawingDataUrl,

    // Templates
    isLoadTemplateModalOpen,
    setIsLoadTemplateModalOpen,
    isSaveTemplateModalOpen,
    setIsSaveTemplateModalOpen,
    savedTemplatesList,
    templateCategoryFilter,
    setTemplateCategoryFilter,
    templateNameInput,
    setTemplateNameInput,
    templateCategoryInput,
    setTemplateCategoryInput,
    applyPrescriptionTemplate,
    handleSavePrescriptionTemplate,
    refreshTemplates,

    // Section Layout & Print Confirmation Modal
    rxSectionOrder,
    setRxSectionOrder,
    resetSectionOrder,
    enabledPrintSections,
    setEnabledPrintSections,
    saveEnabledPrintSections,
    isPrintModalOpen,
    setIsPrintModalOpen,
    executePrintPrescription,

    // Email Prescription Modal
    isEmailModalOpen,
    setIsEmailModalOpen,
    emailSuccessPrompt,
    setEmailSuccessPrompt,
    handleOpenEmailModal,
    getEmailModalData,

    // Actions & Handlers
    handleSubmit,
    handlePrintablePrescription,

    // Toast
    templateToastMessage,
    showTemplateToast,
  };
}
