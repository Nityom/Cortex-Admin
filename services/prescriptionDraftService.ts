export interface PrescriptionDraftData {
  id: string;
  savedAt: string;
  timestamp: number;
  patientKey: string;
  patientName: string;
  phoneNumber: string;
  age: string;
  sex: string;
  date: string;
  email?: string;
  reference_number?: string;
  token?: string;
  selectedDoctorName?: string;
  isNewPatient?: boolean;
  consultationCharge?: number;
  // Clinical notes & sections
  complaintsList: any[];
  diagnosesList: any[];
  findingsText: string;
  medicines: any[];
  advice: string;
  procedureAdvice: string;
  drNotes: string;
  quickNotes: string;
  dietExercise: string;
  investigationText: string;
  testsRequested: any[];
  followupDate?: string;
  followupCount?: string;
  followupUnit?: string;
  pastMedication?: string;
  systemicExam?: string;
  generalExam?: string;
  referralDocName?: string;
  referralSpeciality?: string;
  referralPhone?: string;
  referralEmail?: string;
  drawingDataUrl?: string;
  treatmentItems?: any[];
  // Vitals
  bpSystolic?: string;
  bpDiastolic?: string;
  pulseVal?: string;
  heightVal?: string;
  weightVal?: string;
  tempVal?: string;
  bmiVal?: string;
  spo2Val?: string;
  waistHipVal?: string;
  lmpDate?: string;
  eddDate?: string;
  gestationalWeeks?: string;
  gestationalDays?: string;
  showObstetrics?: boolean;
}

export interface PrescriptionDraftSummary {
  id: string;
  patientKey: string;
  patientName: string;
  phoneNumber: string;
  age: string;
  sex: string;
  savedAt: string;
  timestamp: number;
  medicinesCount: number;
  diagnosesCount: number;
  complaintsCount: number;
  diagnosisPreview: string;
  medicinesPreview: string;
}

export function getPatientKey(formData: { phoneNumber?: string; reference_number?: string; patientName?: string }): string {
  const phone = (formData.phoneNumber || '').trim();
  if (phone) return `phone_${phone}`;
  const ref = (formData.reference_number || '').trim();
  if (ref) return `ref_${ref}`;
  const name = (formData.patientName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (name) return `name_${name}`;
  return 'active_session';
}

export function hasMeaningfulDraftContent(draft: Partial<PrescriptionDraftData>): boolean {
  if (!draft) return false;
  if (Array.isArray(draft.medicines) && draft.medicines.some((m) => m && m.name && m.name.trim())) return true;
  if (Array.isArray(draft.diagnosesList) && draft.diagnosesList.some((d) => d && (d.diagnosis || d.name))) return true;
  if (Array.isArray(draft.complaintsList) && draft.complaintsList.some((c) => c && (c.complaint || c.name))) return true;
  if (draft.advice && draft.advice.trim().length > 0) return true;
  if (draft.findingsText && draft.findingsText.trim().length > 0) return true;
  if (draft.drNotes && draft.drNotes.trim().length > 0) return true;
  if (draft.quickNotes && draft.quickNotes.trim().length > 0) return true;
  if (draft.procedureAdvice && draft.procedureAdvice.trim().length > 0) return true;
  if (Array.isArray(draft.testsRequested) && draft.testsRequested.length > 0) return true;
  if (draft.bpSystolic || draft.bpDiastolic || draft.pulseVal || draft.weightVal || draft.spo2Val || draft.tempVal) return true;
  return false;
}

export function savePrescriptionDraft(draft: PrescriptionDraftData): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(draft);
    localStorage.setItem(`cortex_rx_draft_${draft.patientKey}`, serialized);
    localStorage.setItem('cortex_rx_active_draft', serialized);

    // Update draft index list
    const existingIndex = getAllPrescriptionDraftsIndex();
    const medicinesList = Array.isArray(draft.medicines) ? draft.medicines : [];
    const validMeds = medicinesList.filter((m) => m && m.name && m.name.trim());
    const medNames = validMeds.slice(0, 3).map((m) => m.name.trim()).join(', ');

    const diagList = Array.isArray(draft.diagnosesList) ? draft.diagnosesList : [];
    const diagStr = diagList.map((d) => d.diagnosis || d.name).filter(Boolean).slice(0, 2).join(', ');

    const summary: PrescriptionDraftSummary = {
      id: draft.id,
      patientKey: draft.patientKey,
      patientName: draft.patientName || 'Unnamed Patient',
      phoneNumber: draft.phoneNumber || '',
      age: draft.age || '',
      sex: draft.sex || 'Male',
      savedAt: draft.savedAt,
      timestamp: draft.timestamp,
      medicinesCount: validMeds.length,
      diagnosesCount: diagList.length,
      complaintsCount: (draft.complaintsList || []).length,
      diagnosisPreview: diagStr,
      medicinesPreview: medNames + (validMeds.length > 3 ? ` +${validMeds.length - 3} more` : ''),
    };

    const filteredIndex = existingIndex.filter((item) => item.patientKey !== draft.patientKey && item.id !== draft.id);
    const updatedIndex = [summary, ...filteredIndex].slice(0, 15);
    localStorage.setItem('cortex_rx_drafts_index', JSON.stringify(updatedIndex));

    window.dispatchEvent(new CustomEvent('cortex_rx_draft_changed', { detail: { patientKey: draft.patientKey } }));
  } catch (err) {
    console.warn('Could not save prescription draft:', err);
  }
}

export function getPrescriptionDraft(patientKey: string): PrescriptionDraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`cortex_rx_draft_${patientKey}`);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function getActivePrescriptionDraft(): PrescriptionDraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cortex_rx_active_draft');
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function getAllPrescriptionDraftsIndex(): PrescriptionDraftSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cortex_rx_drafts_index');
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function deletePrescriptionDraft(patientKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`cortex_rx_draft_${patientKey}`);

    const activeRaw = localStorage.getItem('cortex_rx_active_draft');
    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);
        if (active.patientKey === patientKey) {
          localStorage.removeItem('cortex_rx_active_draft');
        }
      } catch {}
    }

    const existingIndex = getAllPrescriptionDraftsIndex();
    const updatedIndex = existingIndex.filter((item) => item.patientKey !== patientKey);
    localStorage.setItem('cortex_rx_drafts_index', JSON.stringify(updatedIndex));

    window.dispatchEvent(new CustomEvent('cortex_rx_draft_changed', { detail: { patientKey } }));
  } catch (err) {
    console.warn('Could not delete prescription draft:', err);
  }
}

export function clearAllPrescriptionDrafts(): void {
  if (typeof window === 'undefined') return;
  try {
    const index = getAllPrescriptionDraftsIndex();
    index.forEach((item) => {
      localStorage.removeItem(`cortex_rx_draft_${item.patientKey}`);
    });
    localStorage.removeItem('cortex_rx_active_draft');
    localStorage.removeItem('cortex_rx_drafts_index');
    window.dispatchEvent(new CustomEvent('cortex_rx_draft_changed', { detail: {} }));
  } catch (err) {
    console.warn('Could not clear all prescription drafts:', err);
  }
}

export function formatDraftTime(timestamp: number): string {
  if (!timestamp) return 'Just now';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1 min ago';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

