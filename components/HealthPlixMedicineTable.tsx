'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  Calendar,
  RotateCcw,
  Copy,
  BookmarkPlus,
  FolderOpen,
  Search,
  Check,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import MedicineSearchInput from './MedicineSearchInput';
import SectionTemplatePicker from './SectionTemplatePicker';
import { Medicine } from '@/services/medicine';
import { MedicineEntry, DosageSchedule } from '@/services/prescription';
import {
  CLINICAL_SECTION_PRESETS,
  ClinicalSectionPreset,
  getSectionCustomTemplates,
  saveSectionCustomTemplate,
  deleteSectionCustomTemplate,
} from '@/services/clinicalSectionPresets';

interface HealthPlixMedicineTableProps {
  medicines: MedicineEntry[];
  onChange: (medicines: MedicineEntry[]) => void;
  medicineOptions: Medicine[];
  prescriptionDate?: string;
  onOpenLoadTemplate?: () => void;
  onOpenSaveTemplate?: () => void;
  onAutoSaveMedicine?: (name: string, composition?: string) => void;
}

const DOSAGE_OPTIONS = ['0-0-1', '1-0-0', '1-0-1', '1-1-1', '0-1-0', '1-1-0', '0-0-2', '1-0-2', 'Stat', 'SOS', 'As Directed'];
const UNIT_OPTIONS = ['tab', 'cap', 'ml', 'lotion', 'ointment', 'drops', 'sachet', 'spray', 'syrup', 'inj'];
const TIME_OPTIONS = ['', 'Morning', 'Afternoon', 'Night', 'Bedtime', 'Morning & Night', '8 Hourly', '12 Hourly'];
const WHEN_OPTIONS = ['After Food', 'Before Food', 'With Food', 'Empty Stomach', 'At Bedtime', 'As Directed'];
const WHERE_OPTIONS = ['', 'oral', 'face', 'scalp', 'affected area', 'skin', 'left eye', 'right eye', 'throat', 'joints', 'chest', 'back'];
const FREQUENCY_OPTIONS = ['daily', 'alternate day', 'twice a week', 'thrice a week', 'weekly', 'once a month', 'SOS'];
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '15 days', '21 days', '25 days', '1 month', '2 months', '3 months'];

export interface LinkedMedicineProfile {
  name?: string;
  dosage?: string;
  unit?: string;
  time?: string;
  when?: string;
  where?: string;
  frequency?: string;
  duration?: string;
  details?: string;
  notes?: string;
}

const DEFAULT_LINKED_MEDICINES: Record<string, LinkedMedicineProfile> = {
  PARACETAMOL: { dosage: '1-0-1', unit: 'tab', time: 'Morning & Night', when: 'After Food', where: 'oral', frequency: 'daily', duration: '5 days', notes: 'नाश्ता / जेवणानंतर' },
  'DOLO 650': { dosage: '1-0-1', unit: 'tab', time: 'Morning & Night', when: 'After Food', where: 'oral', frequency: 'daily', duration: '5 days', notes: 'ताप किंवा अंगदुखी असल्यास' },
  'PAN 40': { dosage: '1-0-0', unit: 'tab', time: 'Morning', when: 'Empty Stomach', where: 'oral', frequency: 'daily', duration: '15 days', notes: 'सकाळी उपाशीपोटी' },
  'PANTOCID 40': { dosage: '1-0-0', unit: 'tab', time: 'Morning', when: 'Empty Stomach', where: 'oral', frequency: 'daily', duration: '15 days', notes: 'सकाळी उपाशीपोटी' },
  'ZERODOL-SP': { dosage: '1-0-1', unit: 'tab', time: 'Morning & Night', when: 'After Food', where: 'oral', frequency: 'daily', duration: '5 days', notes: 'जेवणानंतर पाण्यासोबत' },
  'ZERODOL-P': { dosage: '1-0-1', unit: 'tab', time: 'Morning & Night', when: 'After Food', where: 'oral', frequency: 'daily', duration: '5 days', notes: 'जेवणानंतर' },
  'CHYMORAL FORTE': { dosage: '1-0-1', unit: 'tab', time: 'Morning & Night', when: 'Before Food', where: 'oral', frequency: 'daily', duration: '5 days', notes: 'सूज कमी होण्यासाठी' },
  'SHELCAL 500': { dosage: '0-1-0', unit: 'tab', time: 'Afternoon', when: 'After Food', where: 'oral', frequency: 'daily', duration: '1 month', notes: 'दुपारी जेवणानंतर' },
  TRAMADOL: { dosage: 'SOS', unit: 'tab', time: 'Night', when: 'After Food', where: 'oral', frequency: 'SOS', duration: '3 days', notes: 'तीव्र वेदना असल्यास' },
  ULTRACET: { dosage: 'SOS', unit: 'tab', time: 'Night', when: 'After Food', where: 'oral', frequency: 'SOS', duration: '3 days', notes: 'तीव्र वेदनेसाठी' },
  VOLINI: { dosage: '0-0-1', unit: 'ointment', time: 'Night', when: 'As Directed', where: 'affected area', frequency: 'daily', duration: '15 days', notes: 'Apply gently on affected joint' },
  OMNIGEL: { dosage: '0-0-1', unit: 'ointment', time: 'Night', when: 'As Directed', where: 'affected area', frequency: 'daily', duration: '15 days', notes: 'Apply gently on affected area' },
  THIOCHEST: { dosage: '1-0-1', unit: 'cap', time: 'Morning & Night', when: 'After Food', where: 'oral', frequency: 'daily', duration: '5 days', notes: 'स्नायूंच्या आखडणेवर' },
  'AUGMENTIN 625': { dosage: '1-0-1', unit: 'tab', time: 'Morning & Night', when: 'After Food', where: 'oral', frequency: 'daily', duration: '5 days', notes: 'Full antibiotic course' },
};

const getCustomMedicineLinks = (): Record<string, LinkedMedicineProfile> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('cortex_custom_medicine_links_v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCustomMedicineLink = (name: string, profile: Partial<LinkedMedicineProfile>) => {
  if (typeof window === 'undefined' || !name.trim()) return;
  try {
    const map = getCustomMedicineLinks();
    const key = name.trim().toUpperCase();
    map[key] = { ...(map[key] || {}), ...profile };
    localStorage.setItem('cortex_custom_medicine_links_v1', JSON.stringify(map));
  } catch {}
};

const getLinkedMedicineDefaults = (name: string): LinkedMedicineProfile => {
  const cleanName = name.trim().toUpperCase();
  const customMap = getCustomMedicineLinks();

  if (customMap[cleanName]) return customMap[cleanName];
  if (DEFAULT_LINKED_MEDICINES[cleanName]) return DEFAULT_LINKED_MEDICINES[cleanName];

  for (const [k, v] of Object.entries(customMap)) {
    if (cleanName.includes(k) || k.includes(cleanName)) return v;
  }
  for (const [k, v] of Object.entries(DEFAULT_LINKED_MEDICINES)) {
    if (cleanName.includes(k) || k.includes(cleanName)) return v;
  }

  const isLotion = cleanName.includes('LOTION') || cleanName.includes('GEL') || cleanName.includes('OINTMENT');
  const isCap = cleanName.includes('CAP');
  const isDrops = cleanName.includes('DROP');
  const isSyp = cleanName.includes('SYP') || cleanName.includes('SYRUP');

  return {
    dosage: '0-0-1',
    unit: isLotion ? 'ointment' : isCap ? 'cap' : isDrops ? 'drops' : isSyp ? 'ml' : 'tab',
    time: '',
    when: 'After Food',
    where: isLotion ? 'affected area' : 'oral',
    frequency: 'daily',
    duration: '15 days',
    details: '',
    notes: '',
  };
};

const NOTE_PRESETS = [
  'केसांच्या मुळाशी',
  'नाश्ता नंतर',
  'दुपारी जेवणानंतर',
  'रात्री जेवणानंतर',
  'पाण्यासोबत घ्यावे',
  'दूधासोबत घ्यावे',
  'गरज भासल्यास',
  'Take with plenty of water',
  'Apply gently on affected area',
];

// Helper to format any date into clean uniform DD/MM/YYYY
function formatToDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) return clean.replace(/-/g, '/');
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(clean);
  if (isNaN(d.getTime())) return clean;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to compute end date given a start date and duration string
function calculateEndDate(startDateStr: string | undefined, durationStr: string | undefined): string {
  const baseDate = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(baseDate.getTime())) return '';
  if (!durationStr) return '';

  let daysToAdd = 0;
  const matchNum = durationStr.match(/\d+/);
  if (matchNum) {
    const num = parseInt(matchNum[0], 10);
    if (/month/i.test(durationStr)) {
      daysToAdd = num * 30;
    } else if (/week/i.test(durationStr)) {
      daysToAdd = num * 7;
    } else {
      daysToAdd = num;
    }
  }

  if (daysToAdd === 0) return '';
  const endDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const yyyy = endDate.getFullYear();
  const mm = String(endDate.getMonth() + 1).padStart(2, '0');
  const dd = String(endDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizePresetMedicines(rawList: any[], baseDate?: string): MedicineEntry[] {
  if (!Array.isArray(rawList)) return [];
  const validBase = baseDate || new Date().toISOString().slice(0, 10);
  return rawList.map((m, idx) => {
    const dur = m.duration || '15 days';
    const sFrom = m.start_from || validBase;
    const sTo = m.to_date || calculateEndDate(sFrom, dur);
    const schedules: DosageSchedule[] =
      m.schedules && m.schedules.length > 0
        ? m.schedules.map((s: any, sIdx: number) => ({
            id: s.id || `sch_p_${Date.now()}_${idx}_${sIdx}`,
            dosage: s.dosage || m.dosage || '1-0-1',
            unit: s.unit || m.unit || 'tab',
            time: s.time || m.time || '',
            when: s.when || m.when || 'After Food',
            where: s.where || m.where || '',
            frequency: s.frequency || m.frequency || 'daily',
            duration: s.duration || dur,
            start_from: s.start_from || sFrom,
            to_date: s.to_date || calculateEndDate(s.start_from || sFrom, s.duration || dur),
            details: s.details || '',
            notes: s.notes || s.note || m.note || m.notes || '',
          }))
        : [
            {
              id: `sch_p_${Date.now()}_${idx}`,
              dosage: m.dosage || '1-0-1',
              unit: m.unit || 'tab',
              time: m.time || '',
              when: m.when || 'After Food',
              where: m.where || '',
              frequency: m.frequency || 'daily',
              duration: dur,
              start_from: sFrom,
              to_date: sTo,
              details: m.details || '',
              notes: m.note || m.notes || '',
            },
          ];

    return {
      name: m.name || '',
      dosage: m.dosage || schedules[0].dosage || '1-0-1',
      unit: m.unit || schedules[0].unit || 'tab',
      when: m.when || schedules[0].when || 'After Food',
      where: m.where || schedules[0].where || '',
      frequency: m.frequency || schedules[0].frequency || 'daily',
      duration: dur,
      composition: m.composition || '',
      note: m.note || m.notes || schedules[0].notes || '',
      instructions: m.instructions || '',
      start_from: sFrom,
      to_date: sTo,
      schedules,
    };
  });
}

export default function HealthPlixMedicineTable({
  medicines,
  onChange,
  medicineOptions,
  prescriptionDate = new Date().toISOString().slice(0, 10),
  onOpenLoadTemplate,
  onOpenSaveTemplate,
  onAutoSaveMedicine,
}: HealthPlixMedicineTableProps) {
  const [editingCompositionIndex, setEditingCompositionIndex] = useState<number | null>(null);
  const [compositionDraft, setCompositionDraft] = useState<string>('');
  const [newMedSearch, setNewMedSearch] = useState<string>('');

  // Medical Template Dialog states
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isSaveMedicalModalOpen, setIsSaveMedicalModalOpen] = useState(false);
  const [newMedTemplateName, setNewMedTemplateName] = useState('');
  const [newMedTemplateCat, setNewMedTemplateCat] = useState('General Medicine');
  const [medModalTab, setMedModalTab] = useState<'presets' | 'saved'>('presets');
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [savedMedTemplates, setSavedMedTemplates] = useState<ClinicalSectionPreset[]>([]);
  const [medToastMessage, setMedToastMessage] = useState<string | null>(null);
  const [medSaveStatus, setMedSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const medStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerMedAutoSaved = useCallback(() => {
    setMedSaveStatus('saved');
    if (medStatusTimerRef.current) clearTimeout(medStatusTimerRef.current);
    medStatusTimerRef.current = setTimeout(() => {
      setMedSaveStatus('idle');
    }, 2200);
  }, []);

  const loadSavedMedTemplates = useCallback(() => {
    const list = getSectionCustomTemplates('medicines');
    setSavedMedTemplates(list);
  }, []);

  useEffect(() => {
    if (isMedicalModalOpen || isSaveMedicalModalOpen) {
      loadSavedMedTemplates();
    }
  }, [isMedicalModalOpen, isSaveMedicalModalOpen, loadSavedMedTemplates]);

  const showMedToast = (msg: string) => {
    setMedToastMessage(msg);
    setTimeout(() => setMedToastMessage(null), 2500);
  };

  const handleApplyMedPreset = (presetData: any[], mode: 'replace' | 'append' = 'replace') => {
    const normalized = normalizePresetMedicines(presetData, prescriptionDate);
    if (mode === 'replace') {
      onChange(normalized);
      showMedToast(`Loaded ${normalized.length} medicines into table`);
    } else {
      onChange([...medicines, ...normalized]);
      showMedToast(`Added ${normalized.length} medicines to table`);
    }
    setTimeout(() => {
      setIsMedicalModalOpen(false);
    }, 350);
  };

  const handleSaveMedTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedTemplateName.trim()) {
      showMedToast('Please enter a medical template name');
      return;
    }
    if (medicines.length === 0) {
      showMedToast('No medicines to save in template');
      return;
    }
    saveSectionCustomTemplate('medicines', newMedTemplateName.trim(), medicines, newMedTemplateCat);
    loadSavedMedTemplates();
    setNewMedTemplateName('');
    showMedToast('Medical template saved successfully!');
    setMedModalTab('saved');
    setTimeout(() => {
      setIsSaveMedicalModalOpen(false);
    }, 500);
  };

  const handleDeleteMedTemplate = (id: string, name: string) => {
    if (confirm(`Delete medical template "${name}"?`)) {
      deleteSectionCustomTemplate('medicines', id);
      loadSavedMedTemplates();
      showMedToast(`Deleted "${name}"`);
    }
  };

  // Ensure every medicine has at least 1 schedule in its `schedules` array
  const normalizeMedicineSchedules = (med: MedicineEntry): DosageSchedule[] => {
    if (med.schedules && med.schedules.length > 0) {
      return med.schedules;
    }
    return [
      {
        id: 'sch_init',
        dosage: med.dosage || '0-0-1',
        unit: med.unit || (med.dosage && /ml|syp/i.test(med.name) ? 'ml' : 'tab'),
        time: '',
        when: med.when || 'After Food',
        where: med.where || '',
        frequency: med.frequency || 'daily',
        duration: med.duration || '5 days',
        start_from: med.start_from || prescriptionDate,
        to_date: med.to_date || calculateEndDate(prescriptionDate, med.duration || '5 days'),
        details: med.details || '',
        notes: med.note || '',
      },
    ];
  };

  // Add a new sub-schedule for a medicine (+ button clicked)
  const handleAddSchedule = (medIndex: number) => {
    const updated = [...medicines];
    const target = updated[medIndex];
    const currentSchedules = normalizeMedicineSchedules(target);

    // Default the new schedule to complementary/alternate timing
    const lastSch = currentSchedules[currentSchedules.length - 1];
    const newSch: DosageSchedule = {
      id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dosage: lastSch.dosage === '0-0-1' ? '1-0-0' : '0-0-1',
      unit: lastSch.unit || 'tab',
      time: '',
      when: lastSch.when || 'After Food',
      where: lastSch.where || '',
      frequency: lastSch.frequency === 'daily' ? 'alternate day' : 'daily',
      duration: lastSch.duration || '25 days',
      start_from: lastSch.start_from || prescriptionDate,
      to_date: calculateEndDate(lastSch.start_from || prescriptionDate, lastSch.duration || '25 days'),
      details: '',
      notes: '',
    };

    target.schedules = [...currentSchedules, newSch];
    // Keep top-level in sync
    target.dosage = target.schedules.map(s => s.dosage).join(' / ');
    target.frequency = target.schedules.map(s => s.frequency).join(' / ');
    target.duration = target.schedules.map(s => s.duration).join(' / ');
    onChange(updated);
  };

  // Remove a schedule or entire medicine if only 1 schedule left
  const handleRemoveSchedule = (medIndex: number, schIndex: number) => {
    const updated = [...medicines];
    const target = updated[medIndex];
    const currentSchedules = normalizeMedicineSchedules(target);

    if (currentSchedules.length <= 1) {
      // Remove entire medicine
      updated.splice(medIndex, 1);
    } else {
      currentSchedules.splice(schIndex, 1);
      target.schedules = currentSchedules;
      target.dosage = currentSchedules[0].dosage;
      target.frequency = currentSchedules[0].frequency;
      target.duration = currentSchedules[0].duration;
    }
    onChange(updated);
  };

  // Delete whole medicine
  const handleDeleteMedicine = (medIndex: number) => {
    const updated = [...medicines];
    updated.splice(medIndex, 1);
    onChange(updated);
  };

  // Update a schedule field
  const handleUpdateSchedule = (
    medIndex: number,
    schIndex: number,
    field: keyof DosageSchedule,
    value: string
  ) => {
    const updated = [...medicines];
    const target = updated[medIndex];
    const currentSchedules = normalizeMedicineSchedules(target);
    const sch = { ...currentSchedules[schIndex], [field]: value };

    // Auto calculate to_date when duration or start_from changes
    if (field === 'duration' || field === 'start_from') {
      const start = field === 'start_from' ? value : sch.start_from || prescriptionDate;
      const dur = field === 'duration' ? value : sch.duration;
      sch.to_date = calculateEndDate(start, dur);
    }

    currentSchedules[schIndex] = sch;
    target.schedules = currentSchedules;

    // Sync primary fields for backwards compatibility with letterhead & billing
    if (schIndex === 0) {
      if (field === 'dosage') target.dosage = value;
      if (field === 'frequency') target.frequency = value;
      if (field === 'duration') target.duration = value;
      if (field === 'notes') target.note = value;
      if (field === 'when') target.when = value;
      if (field === 'where') target.where = value;
      if (field === 'unit') target.unit = value;
    } else {
      target.dosage = currentSchedules.map(s => s.dosage).join(' / ');
      target.frequency = currentSchedules.map(s => s.frequency).join(' / ');
      target.duration = currentSchedules.map(s => s.duration).join(' / ');
    }

    onChange(updated);

    // Auto-save linkage of all 10 related fields for this medicine
    if (target.name) {
      saveCustomMedicineLink(target.name, {
        dosage: sch.dosage,
        unit: sch.unit,
        time: sch.time,
        when: sch.when,
        where: sch.where,
        frequency: sch.frequency,
        duration: sch.duration,
        details: sch.details || target.composition,
        notes: sch.notes || target.note,
      });
      triggerMedAutoSaved();
    }
  };

  // Add new medicine from bottom row
  const handleSelectNewMedicine = (med: Medicine) => {
    const linked = getLinkedMedicineDefaults(med.name);
    const defaultDuration = linked.duration || '15 days';

    const newEntry: MedicineEntry = {
      name: med.name.toUpperCase(),
      dosage: linked.dosage || '0-0-1',
      unit: linked.unit || 'tab',
      frequency: linked.frequency || 'daily',
      duration: defaultDuration,
      when: linked.when || 'After Food',
      where: linked.where || 'oral',
      composition: med.composition || linked.details || '',
      note: linked.notes || '',
      start_from: prescriptionDate,
      to_date: calculateEndDate(prescriptionDate, defaultDuration),
      schedules: [
        {
          id: `sch_${Date.now()}`,
          dosage: linked.dosage || '0-0-1',
          unit: linked.unit || 'tab',
          time: linked.time || '',
          when: linked.when || 'After Food',
          where: linked.where || 'oral',
          frequency: linked.frequency || 'daily',
          duration: defaultDuration,
          start_from: prescriptionDate,
          to_date: calculateEndDate(prescriptionDate, defaultDuration),
          details: med.composition || linked.details || '',
          notes: linked.notes || '',
        },
      ],
    };

    onChange([...medicines, newEntry]);
    setNewMedSearch('');

    // Auto-save all related fields linked to this medicine
    saveCustomMedicineLink(med.name, {
      dosage: newEntry.dosage,
      unit: newEntry.unit,
      time: linked.time,
      when: newEntry.when,
      where: newEntry.where,
      frequency: newEntry.frequency,
      duration: newEntry.duration,
      details: newEntry.composition,
      notes: newEntry.note,
    });

    if (onAutoSaveMedicine) {
      onAutoSaveMedicine(med.name.toUpperCase(), med.composition || '');
    }
    triggerMedAutoSaved();
  };

  const handleAddNewCustomMedicine = (name: string) => {
    if (!name.trim()) return;
    const linked = getLinkedMedicineDefaults(name);
    const defaultDuration = linked.duration || '15 days';

    const newEntry: MedicineEntry = {
      name: name.trim().toUpperCase(),
      dosage: linked.dosage || '0-0-1',
      unit: linked.unit || 'tab',
      frequency: linked.frequency || 'daily',
      duration: defaultDuration,
      when: linked.when || 'After Food',
      where: linked.where || 'oral',
      composition: linked.details || '',
      note: linked.notes || '',
      start_from: prescriptionDate,
      to_date: calculateEndDate(prescriptionDate, defaultDuration),
      schedules: [
        {
          id: `sch_${Date.now()}`,
          dosage: linked.dosage || '0-0-1',
          unit: linked.unit || 'tab',
          time: linked.time || '',
          when: linked.when || 'After Food',
          where: linked.where || 'oral',
          frequency: linked.frequency || 'daily',
          duration: defaultDuration,
          start_from: prescriptionDate,
          to_date: calculateEndDate(prescriptionDate, defaultDuration),
          details: linked.details || '',
          notes: linked.notes || '',
        },
      ],
    };

    onChange([...medicines, newEntry]);
    setNewMedSearch('');

    // Auto-save all related fields linked to this medicine
    saveCustomMedicineLink(name, {
      dosage: newEntry.dosage,
      unit: newEntry.unit,
      time: linked.time,
      when: newEntry.when,
      where: newEntry.where,
      frequency: newEntry.frequency,
      duration: newEntry.duration,
      details: newEntry.composition,
      notes: newEntry.note,
    });

    if (onAutoSaveMedicine) {
      onAutoSaveMedicine(name.trim().toUpperCase(), '');
    }
    triggerMedAutoSaved();
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-300/80 shadow-xs min-h-[480px] flex flex-col justify-between">
      {/* Full-width Spreadsheet Table matching HealthPlix exact design */}
      <div className="w-full overflow-x-auto min-h-[420px] pb-40">
        <table className="w-full text-left text-sm border-collapse border-b border-slate-200">
          <thead>
            <tr className="bg-[#eef2f7] text-slate-800 font-bold border-b border-slate-300 text-[13px]">
              <th className="py-3 px-3 border-r border-slate-300/70 w-[24%]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold text-sm">Medicine *</span>
                    {medSaveStatus === 'saved' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 transition">
                        <Check className="w-2.5 h-2.5" />
                        Auto-saved
                      </span>
                    )}
                  </div>
                  <SectionTemplatePicker
                    sectionKey="medicines"
                    sectionTitle="Medical"
                    currentValue={medicines}
                    onApplyPreset={(presetMeds) => {
                      if (Array.isArray(presetMeds) && presetMeds.length > 0) {
                        onChange(normalizePresetMedicines(presetMeds, prescriptionDate));
                      }
                    }}
                    align="left"
                  />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[7%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Dosage</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[5%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Unit</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[6%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Time</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[9%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>When</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[6%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Where</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[9%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Frequency</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[7%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Duration</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[9%]">
                <span>Start From</span>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[6%]">
                <span>Details</span>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[10%]">
                <span>Notes</span>
              </th>
              <th className="py-3 px-1 w-[2%] text-center"></th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((med, medIndex) => {
              const schedules = normalizeMedicineSchedules(med);

              return (
                <React.Fragment key={medIndex}>
                  {schedules.map((sch, schIndex) => {
                    const isFirstSchedule = schIndex === 0;
                    const isLastSchedule = schIndex === schedules.length - 1;

                    return (
                      <tr
                        key={`${medIndex}_${schIndex}`}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* 1. Medicine Name & Composition with '+' Button in cell */}
                        <td className="border-r border-b border-slate-200 p-2.5 align-top relative">
                          {isFirstSchedule ? (
                            <div className="flex flex-col justify-between h-full min-h-[48px]">
                              <div>
                                <div className="font-bold text-slate-900 text-sm uppercase tracking-tight">
                                  {med.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCompositionIndex(medIndex);
                                      setCompositionDraft(med.composition || '');
                                    }}
                                    className="text-slate-400 hover:text-slate-700"
                                    title="Edit composition/generic"
                                  >
                                    <Edit2 className="w-3 h-3 inline" />
                                  </button>
                                  {editingCompositionIndex === medIndex ? (
                                    <input
                                      type="text"
                                      value={compositionDraft}
                                      onChange={(e) => setCompositionDraft(e.target.value)}
                                      onBlur={() => {
                                        const updated = [...medicines];
                                        updated[medIndex].composition = compositionDraft;
                                        onChange(updated);
                                        setEditingCompositionIndex(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const updated = [...medicines];
                                          updated[medIndex].composition = compositionDraft;
                                          onChange(updated);
                                          setEditingCompositionIndex(null);
                                        }
                                      }}
                                      autoFocus
                                      className="px-1.5 py-0.5 border border-blue-400 rounded text-xs bg-white outline-none w-full"
                                    />
                                  ) : (
                                    <span className="italic line-clamp-1">
                                      {med.composition || 'Generic name'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* HealthPlix + Button at bottom-right of Medicine cell */}
                              {isLastSchedule && (
                                <div className="flex justify-end mt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddSchedule(medIndex)}
                                    className="w-4 h-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xs flex items-center justify-center transition shadow-2xs border border-slate-300/80 cursor-pointer"
                                    title="Add more frequency / schedule line for this medicine"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between h-full min-h-[48px] pl-3 text-xs text-slate-400 italic">
                              <span>↳ Additional Schedule</span>
                              {isLastSchedule && (
                                <button
                                  type="button"
                                  onClick={() => handleAddSchedule(medIndex)}
                                  className="w-4 h-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xs flex items-center justify-center transition shadow-2xs border border-slate-300/80 cursor-pointer"
                                  title="Add more frequency / schedule line for this medicine"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 2. Dosage */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.dosage || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'dosage', e.target.value)
                            }
                            placeholder=""
                            list={`dosage-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2.5 py-2.5 bg-transparent text-slate-900 text-sm font-bold focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`dosage-list-${medIndex}-${schIndex}`}>
                            {DOSAGE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 3. Unit */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.unit || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'unit', e.target.value)
                            }
                            placeholder=""
                            list={`unit-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`unit-list-${medIndex}-${schIndex}`}>
                            {UNIT_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 4. Time */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.time || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'time', e.target.value)
                            }
                            placeholder=""
                            list={`time-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`time-list-${medIndex}-${schIndex}`}>
                            {TIME_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 5. When */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <select
                            value={sch.when || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'when', e.target.value)
                            }
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none cursor-pointer transition"
                          >
                            <option value="">—</option>
                            {WHEN_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 6. Where */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.where || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'where', e.target.value)
                            }
                            placeholder=""
                            list={`where-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`where-list-${medIndex}-${schIndex}`}>
                            {WHERE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 7. Frequency */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <select
                            value={sch.frequency || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'frequency', e.target.value)
                            }
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none cursor-pointer transition"
                          >
                            <option value="">—</option>
                            {FREQUENCY_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 8. Duration */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.duration || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'duration', e.target.value)
                            }
                            placeholder=""
                            list={`duration-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-semibold focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`duration-list-${medIndex}-${schIndex}`}>
                            {DURATION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 9. Start From & To Date (Uniform DD/MM/YYYY) */}
                        <td className="border-r border-b border-slate-200 p-2 align-top">
                          <div className="flex flex-col justify-center text-xs leading-normal py-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-bold text-xs">From:</span>
                              <input
                                type="date"
                                value={sch.start_from || prescriptionDate}
                                onChange={(e) =>
                                  handleUpdateSchedule(medIndex, schIndex, 'start_from', e.target.value)
                                }
                                className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer focus:bg-white rounded px-1 py-0.5 border border-transparent hover:border-slate-300"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-slate-400 font-bold text-xs">To:</span>
                              <span className="text-slate-900 font-bold text-xs px-1">
                                {formatToDisplayDate(sch.to_date || calculateEndDate(sch.start_from || prescriptionDate, sch.duration)) || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 10. Details */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.details || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'details', e.target.value)
                            }
                            placeholder=""
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                        </td>

                        {/* 11. Notes */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.notes || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'notes', e.target.value)
                            }
                            placeholder=""
                            list={`notes-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2.5 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`notes-list-${medIndex}-${schIndex}`}>
                            {NOTE_PRESETS.map((note) => (
                              <option key={note} value={note} />
                            ))}
                          </datalist>
                        </td>

                        {/* 12. Delete Action */}
                        <td className="border-b border-slate-200 p-1 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveSchedule(medIndex, schIndex)}
                            className="text-slate-300 hover:text-red-600 transition p-1.5 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                            title={schedules.length > 1 ? 'Remove this schedule frequency' : 'Delete medicine from prescription'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Row: Add Medicine (Matching Row 5 in HealthPlix IMG_0910) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="border-r border-b border-slate-200 p-2 align-middle">
                <div className="flex items-center gap-1.5 w-full">
                  <div className="flex-1">
                    <MedicineSearchInput
                      value={newMedSearch}
                      onChangeName={setNewMedSearch}
                      onSelectMedicine={handleSelectNewMedicine}
                      options={medicineOptions}
                      placeholder="Add Medicine"
                      index={medicines.length}
                    />
                  </div>
                  {newMedSearch && !medicineOptions.some(m => m.name.toLowerCase() === newMedSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleAddNewCustomMedicine(newMedSearch)}
                      title={`Add "${newMedSearch}" to prescription`}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition whitespace-nowrap cursor-pointer shadow-2xs"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-b border-slate-200 min-h-[48px] p-0"></td>
            </tr>

            {/* Blank spreadsheet rows to provide generous height and ample room for suggestions */}
            {Array.from({ length: Math.max(0, 4 - medicines.length) }).map((_, i) => (
              <tr key={`blank-row-${i}`} className="h-12 border-b border-slate-100 hover:bg-slate-50/30">
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-r border-slate-200"></td>
                <td className="border-b border-slate-200"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Template & Action Controls (HealthPlix Style Footer) */}
      <div className="py-2 px-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-4 text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => {
            try {
              const lastRx = localStorage.getItem('cortex_last_prescribed_medicines');
              if (lastRx) {
                const parsed = JSON.parse(lastRx);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  onChange([...medicines, ...parsed]);
                }
              }
            } catch {}
          }}
          title="Load Previous Consultation Medicines"
          className="flex items-center gap-1 hover:text-blue-600 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Load Prev</span>
        </button>

        <button
          type="button"
          onClick={() => {
            loadSavedMedTemplates();
            setIsMedicalModalOpen(true);
          }}
          title="Load Medical Template (Drug Regimen)"
          className="flex items-center gap-1 hover:text-blue-600 transition cursor-pointer font-medium"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Load template</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (medicines.length === 0) {
              alert('Please add medicines before saving as medical template.');
              return;
            }
            setNewMedTemplateName('');
            setIsSaveMedicalModalOpen(true);
          }}
          title="Save Current Medicines as Medical Template"
          className="flex items-center gap-1 hover:text-purple-600 transition cursor-pointer font-medium"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-purple-600" />
          <span>Save as template</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('Clear all medicines?')) {
              onChange([]);
            }
          }}
          title="Clear All Medicines from Prescription"
          className="flex items-center gap-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>

      {/* 1. Medical Template Picker Modal */}
      {isMedicalModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Medical Templates & Regimens</h3>
                  <p className="text-xs text-slate-500">
                    Apply standard or saved drug combinations to this prescription table
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMedicalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toast inside modal */}
            {medToastMessage && (
              <div className="mx-5 mt-3 p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{medToastMessage}</span>
              </div>
            )}

            {/* Search and Tabs */}
            <div className="px-5 pt-3 pb-2 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  placeholder="Search medical templates by condition, category, or drug..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMedModalTab('presets')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition text-center ${
                    medModalTab === 'presets'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Clinical Presets ({(CLINICAL_SECTION_PRESETS['medicines'] || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMedModalTab('saved')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition text-center ${
                    medModalTab === 'saved'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Doctor Saved ({savedMedTemplates.length})
                </button>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {medModalTab === 'presets' ? (
                // Filtered Presets
                (CLINICAL_SECTION_PRESETS['medicines'] || [])
                  .filter((p) => {
                    const q = medSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.category && p.category.toLowerCase().includes(q)) ||
                      (p.description && p.description.toLowerCase().includes(q)) ||
                      (Array.isArray(p.data) &&
                        p.data.some(
                          (m: any) =>
                            m.name?.toLowerCase().includes(q) ||
                            m.composition?.toLowerCase().includes(q)
                        ))
                    );
                  })
                  .map((preset) => (
                    <div
                      key={preset.id}
                      className="border border-slate-200 hover:border-blue-300 rounded-xl p-3.5 bg-white hover:bg-blue-50/30 transition shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{preset.name}</span>
                            {preset.category && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {preset.category}
                              </span>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApplyMedPreset(preset.data, 'replace')}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition"
                            title="Replace table with this regimen"
                          >
                            Apply Regimen
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyMedPreset(preset.data, 'append')}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs border border-slate-200 cursor-pointer transition"
                            title="Append these drugs to current list"
                          >
                            + Add to Table
                          </button>
                        </div>
                      </div>

                      {/* Drug items preview */}
                      <div className="bg-slate-50 rounded-lg p-2 space-y-1 text-xs">
                        {Array.isArray(preset.data) &&
                          preset.data.map((m: any, mIdx: number) => (
                            <div key={mIdx} className="flex items-center justify-between text-slate-700">
                              <span className="font-medium text-slate-800">
                                • {m.name} {m.composition ? `(${m.composition})` : ''}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                {m.dosage} | {m.when || m.frequency} | {m.duration}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
              ) : (
                // Doctor Saved Templates
                savedMedTemplates.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <p className="font-semibold text-sm text-slate-600 mb-1">No saved medical templates</p>
                    <p>Click &quot;Save as template&quot; in the medicine table footer to save your favorite combinations.</p>
                  </div>
                ) : (
                  savedMedTemplates
                    .filter((s) => {
                      const q = medSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return s.name.toLowerCase().includes(q);
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        className="border border-purple-200 hover:border-purple-300 rounded-xl p-3.5 bg-white hover:bg-purple-50/20 transition shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                {s.category || 'Custom'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {Array.isArray(s.data) ? `${s.data.length} medicines` : 'Drug list'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyMedPreset(s.data, 'replace')}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition"
                            >
                              Apply Regimen
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyMedPreset(s.data, 'append')}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs border border-slate-200 cursor-pointer transition"
                            >
                              + Add
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMedTemplate(s.id, s.name)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Drugs preview */}
                        {Array.isArray(s.data) && (
                          <div className="bg-purple-50/40 rounded-lg p-2 space-y-1 text-xs">
                            {s.data.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="flex items-center justify-between text-slate-700">
                                <span className="font-medium text-slate-800">• {m.name}</span>
                                <span className="text-slate-500 font-mono text-[11px]">
                                  {m.dosage} | {m.frequency || m.when} | {m.duration}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Medical templates strictly apply drugs only and never overwrite clinical notes or vitals.
              </span>
              <button
                type="button"
                onClick={() => setIsMedicalModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Save Medical Template Modal */}
      {isSaveMedicalModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Save as Medical Template</h3>
                  <p className="text-xs text-slate-500">Save current {medicines.length} medicines as a reusable drug regimen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveMedicalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedTemplate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medical Template Name *</label>
                <input
                  type="text"
                  required
                  value={newMedTemplateName}
                  onChange={(e) => setNewMedTemplateName(e.target.value)}
                  placeholder="e.g. Knee OA Meds, Viral Fever Regimen, Spondylosis Regimen..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category / Specialty</label>
                <select
                  value={newMedTemplateCat}
                  onChange={(e) => setNewMedTemplateCat(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none bg-white cursor-pointer"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Orthopaedics">Orthopaedics</option>
                  <option value="Gynaecology">Gynaecology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Paediatrics">Paediatrics</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Medicines Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medicines to Save ({medicines.length}):</label>
                <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 text-xs">
                  {medicines.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-800">
                      <span className="font-semibold text-slate-900">• {m.name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{m.dosage} | {m.duration}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSaveMedicalModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Save Medical Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

