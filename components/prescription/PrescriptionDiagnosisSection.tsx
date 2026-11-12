'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Undo2, Trash2, Check, Loader2, Search, Sparkles, Folder } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import {
  getDiagnosisSuggestions,
  saveMultipleDiagnoses,
  autoSavePrescriptionDiagnosis,
} from '@/services/prescription';
import { getAllTemplates, PrescriptionTemplate, cleanTemplateName } from '@/services/templates';
import { CLINICAL_SECTION_PRESETS, getSectionCustomTemplates } from '@/services/clinicalSectionPresets';
import AutoResizeTextarea from './AutoResizeTextarea';

export interface DiagnosisRow {
  id: string;
  diagnosis: string;
  snomed_code: string;
  duration: string;
  date: string;
}

export interface LinkedDiagnosis {
  type?: 'catalog' | 'template' | 'preset' | 'db';
  name: string;
  snomed_code: string;
  duration: string;
  category?: string;
  label?: string;
  templateObj?: PrescriptionTemplate;
}

// Built-in clinical catalog linking Diagnosis + SNOMED/ICD + Duration
export const CLINICAL_DIAGNOSES_CATALOG: LinkedDiagnosis[] = [
  // Orthopaedics & Spine
  { name: 'Osteoarthritis Bilateral Knees', snomed_code: 'M17.0', duration: '1 month', category: 'Orthopaedics' },
  { name: 'Osteoarthritis Right Knee (Grade II)', snomed_code: 'M17.1', duration: '1 month', category: 'Orthopaedics' },
  { name: 'Osteoarthritis Left Knee (Grade II)', snomed_code: 'M17.1', duration: '1 month', category: 'Orthopaedics' },
  { name: 'Lumbar Spondylosis with Radiculopathy / Sciatica', snomed_code: 'M47.816', duration: '3 weeks', category: 'Orthopaedics' },
  { name: 'Cervical Spondylosis with Brachialgia', snomed_code: 'M47.812', duration: '3 weeks', category: 'Orthopaedics' },
  { name: 'Mechanical Low Back Ache (Lumbago)', snomed_code: 'M54.5', duration: '2 weeks', category: 'Orthopaedics' },
  { name: 'Degenerative Disc Disease Lumbar Spine', snomed_code: 'M51.3', duration: '1 month', category: 'Orthopaedics' },
  { name: 'Anterior Cruciate Ligament (ACL) Tear Knee', snomed_code: 'S83.5', duration: '2 months', category: 'Orthopaedics' },
  { name: 'Meniscal Tear Medial / Lateral Knee', snomed_code: 'S83.2', duration: '6 weeks', category: 'Orthopaedics' },
  { name: 'Distal Radius Fracture (Colles Fracture)', snomed_code: 'S52.5', duration: '6 weeks', category: 'Orthopaedics' },
  { name: 'Closed Fracture Shaft of Femur', snomed_code: 'S72.3', duration: '3 months', category: 'Orthopaedics' },
  { name: 'Closed Fracture Distal End Tibia', snomed_code: 'S82.3', duration: '8 weeks', category: 'Orthopaedics' },
  { name: 'Frozen Shoulder (Adhesive Capsulitis)', snomed_code: 'M75.0', duration: '2 months', category: 'Orthopaedics' },
  { name: 'Rotator Cuff Tendinitis / Subacromial Impingement', snomed_code: 'M75.1', duration: '4 weeks', category: 'Orthopaedics' },
  { name: 'Plantar Fasciitis with Calcaneal Spur', snomed_code: 'M72.2', duration: '3 weeks', category: 'Orthopaedics' },
  { name: 'Carpal Tunnel Syndrome', snomed_code: 'G56.0', duration: '1 month', category: 'Orthopaedics' },
  { name: 'De Quervain\'s Tenosynovitis', snomed_code: 'M65.4', duration: '3 weeks', category: 'Orthopaedics' },
  { name: 'Tennis Elbow (Lateral Epicondylitis)', snomed_code: 'M77.1', duration: '4 weeks', category: 'Orthopaedics' },
  { name: 'Golfer\'s Elbow (Medial Epicondylitis)', snomed_code: 'M77.0', duration: '4 weeks', category: 'Orthopaedics' },
  { name: 'Trigger Finger / Tendonitis', snomed_code: 'M65.3', duration: '2 weeks', category: 'Orthopaedics' },
  { name: 'Ankle Sprain (ATFL Ligament Injury)', snomed_code: 'S93.4', duration: '2 weeks', category: 'Orthopaedics' },
  { name: 'Gouty Arthritis / Hyperuricemia', snomed_code: 'M10.9', duration: '1 month', category: 'Orthopaedics' },
  { name: 'Ankylosing Spondylitis', snomed_code: 'M45.9', duration: 'Chronic', category: 'Orthopaedics' },
  { name: 'Rheumatoid Arthritis (Seropositive)', snomed_code: 'M05.9', duration: 'Chronic', category: 'Orthopaedics' },
  { name: 'Osteoporosis / Low Bone Density', snomed_code: 'M81.0', duration: '3 months', category: 'Orthopaedics' },
  { name: 'Dislocation of Shoulder Joint (Anterior)', snomed_code: 'S43.0', duration: '4 weeks', category: 'Orthopaedics' },

  // General Medicine & Systemic
  { name: 'Diabetes Mellitus Type 2', snomed_code: 'E11.9', duration: 'Chronic', category: 'General Medicine' },
  { name: 'Essential Primary Hypertension', snomed_code: 'I10', duration: 'Chronic', category: 'General Medicine' },
  { name: 'Dyslipidemia / Hypercholesterolemia', snomed_code: 'E78.5', duration: 'Chronic', category: 'General Medicine' },
  { name: 'Hypothyroidism', snomed_code: 'E03.9', duration: 'Chronic', category: 'General Medicine' },
  { name: 'Acute Gastroenteritis / Dehydration', snomed_code: 'A09', duration: '5 days', category: 'General Medicine' },
  { name: 'Gastroesophageal Reflux Disease (GERD) / Dyspepsia', snomed_code: 'K21.9', duration: '2 weeks', category: 'General Medicine' },
  { name: 'Acute Viral Fever with Myalgia', snomed_code: 'B34.9', duration: '5 days', category: 'General Medicine' },
  { name: 'Upper Respiratory Tract Infection (URTI)', snomed_code: 'J06.9', duration: '5 days', category: 'General Medicine' },
  { name: 'Acute Bronchitis with Productive Cough', snomed_code: 'J20.9', duration: '7 days', category: 'General Medicine' },
  { name: 'Bronchial Asthma with Exacerbation', snomed_code: 'J45.9', duration: '1 month', category: 'General Medicine' },
  { name: 'Iron Deficiency Anemia', snomed_code: 'D50.9', duration: '3 months', category: 'General Medicine' },
  { name: 'Urinary Tract Infection (UTI)', snomed_code: 'N39.0', duration: '7 days', category: 'General Medicine' },
  { name: 'Migraine / Tension Headache', snomed_code: 'G43.9', duration: '2 weeks', category: 'General Medicine' },
  { name: 'Deep Vein Thrombosis (DVT)', snomed_code: 'I82.9', duration: '3 months', category: 'General Medicine' },
  { name: 'Soft Tissue Injury / Contusion', snomed_code: 'T14.0', duration: '10 days', category: 'General Medicine' },
];

const getCustomDiagnosisLinks = (): Record<string, { snomed: string; duration: string }> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('cortex_custom_diagnosis_links_v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCustomDiagnosisLink = (name: string, snomed: string, duration: string) => {
  if (typeof window === 'undefined' || !name.trim()) return;
  try {
    const map = getCustomDiagnosisLinks();
    map[name.trim().toLowerCase()] = { snomed: snomed.trim(), duration: duration.trim() };
    localStorage.setItem('cortex_custom_diagnosis_links_v1', JSON.stringify(map));
  } catch {}
};

interface PrescriptionDiagnosisSectionProps {
  diagnosesList: DiagnosisRow[];
  setDiagnosesList: React.Dispatch<React.SetStateAction<DiagnosisRow[]>>;
  diagnosisSummary: string;
  onUpdateDiagnosisSummary: (summary: string) => void;
  date?: string;
  prescriptionId?: string;
  isGynae?: boolean;
  onApplyMasterTemplate?: (tmpl: PrescriptionTemplate) => void;
  onRestorePreviousDiagnosis?: () => void;
}

export default function PrescriptionDiagnosisSection({
  diagnosesList,
  setDiagnosesList,
  diagnosisSummary,
  onUpdateDiagnosisSummary,
  date = new Date().toISOString().slice(0, 10),
  prescriptionId,
  isGynae = false,
  onApplyMasterTemplate,
  onRestorePreviousDiagnosis,
}: PrescriptionDiagnosisSectionProps) {
  // Inline Add Row state
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newSnomed, setNewSnomed] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [dbSuggestions, setDbSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Gynae mode template & diagnosis suggestions state
  const [gynaeQuery, setGynaeQuery] = useState('');
  const [showGynaeSuggestions, setShowGynaeSuggestions] = useState(false);
  const [highlightedDiagIdx, setHighlightedDiagIdx] = useState(0);
  const gynaeBoxRef = useRef<HTMLDivElement>(null);

  const inlineInputRef = useRef<HTMLInputElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save logic directly from table
  const triggerAutoSave = useCallback(
    async (currentList: DiagnosisRow[]) => {
      const names = currentList.map((d) => d.diagnosis.trim()).filter((n) => n.length >= 2);
      const summaryStr = names.join(', ');

      setSaveStatus('saving');
      try {
        // 1. Auto-save terms to Convex master catalog for autocomplete suggestions
        if (names.length > 0) {
          await saveMultipleDiagnoses(names);
        }

        // 2. Auto-save diagnosis to active Convex prescription document
        if (
          prescriptionId &&
          prescriptionId !== 'undefined' &&
          prescriptionId !== 'null' &&
          !prescriptionId.startsWith('TMP-')
        ) {
          await autoSavePrescriptionDiagnosis(prescriptionId, summaryStr);
        }

        // 3. Save draft to localStorage
        try {
          localStorage.setItem('cortex_diagnosis_draft', summaryStr);
          localStorage.setItem('cortex_diagnoses_list_draft', JSON.stringify(currentList));
        } catch {}

        setSaveStatus('saved');
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (err) {
        console.error('Diagnosis auto-save failed:', err);
        setSaveStatus('idle');
      }
    },
    [prescriptionId]
  );

  const scheduleAutoSave = useCallback(
    (currentList: DiagnosisRow[]) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        triggerAutoSave(currentList);
      }, 600);
    },
    [triggerAutoSave]
  );

  // Load suggestions from Convex
  useEffect(() => {
    getDiagnosisSuggestions(newDiagnosis, 30)
      .then((res) => {
        if (res && res.length > 0) setDbSuggestions(res);
      })
      .catch(() => {});
  }, [newDiagnosis]);

  // Detect upward vs downward dropdown positioning to avoid clipping
  useEffect(() => {
    if (showSuggestions && inlineInputRef.current && typeof window !== 'undefined') {
      const rect = inlineInputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 250 && rect.top > 250);
    }
  }, [showSuggestions, newDiagnosis]);

  // Click outside to close inline suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(e.target as Node) &&
        inlineInputRef.current &&
        !inlineInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (
        gynaeBoxRef.current &&
        !gynaeBoxRef.current.contains(e.target as Node)
      ) {
        setShowGynaeSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge built-in catalog + saved custom linkages + master templates + section presets + Convex DB suggestions
  const mergedSuggestions = useMemo(() => {
    const q = newDiagnosis.trim().toLowerCase();
    const customLinks = getCustomDiagnosisLinks();
    const map = new Map<string, LinkedDiagnosis>();

    // 1. Add Master Templates matching query
    try {
      const allTemplates = getAllTemplates();
      for (const tmpl of allTemplates) {
        const matchName = tmpl.name.toLowerCase();
        const matchDiag = (tmpl.diagnosis || '').toLowerCase();
        if (!q || matchName.includes(q) || matchDiag.includes(q)) {
          const key = `tmpl_${tmpl.id}`;
          map.set(key, {
            type: 'template',
            name: tmpl.diagnosis ? tmpl.diagnosis.split(',')[0].trim() || tmpl.name : tmpl.name,
            label: cleanTemplateName(tmpl.name),
            snomed_code: '',
            duration: '',
            category: tmpl.category || 'Template',
            templateObj: tmpl,
          });
        }
      }
    } catch {}

    // 2. Add Section Presets
    try {
      const presets = [
        ...(CLINICAL_SECTION_PRESETS.diagnosis || []),
        ...getSectionCustomTemplates('diagnosis'),
      ];
      for (const p of presets) {
        const pDataStr = typeof p.data === 'string' ? p.data : p.name;
        if (!q || p.name.toLowerCase().includes(q) || pDataStr.toLowerCase().includes(q)) {
          const key = `preset_${p.id}`;
          map.set(key, {
            type: 'preset',
            name: pDataStr,
            label: cleanTemplateName(p.name),
            snomed_code: '',
            duration: '',
            category: p.category || 'Preset',
          });
        }
      }
    } catch {}

    // 3. Add from built-in clinical catalog
    for (const item of CLINICAL_DIAGNOSES_CATALOG) {
      if (!map.has(item.name.toLowerCase())) {
        map.set(item.name.toLowerCase(), { ...item, type: 'catalog' });
      }
    }

    // 4. Add from custom linkages
    for (const [key, val] of Object.entries(customLinks)) {
      if (!map.has(key)) {
        map.set(key, {
          type: 'catalog',
          name: key.toUpperCase(),
          snomed_code: val.snomed || '',
          duration: val.duration || '',
        });
      } else {
        const existing = map.get(key)!;
        if (val.snomed) existing.snomed_code = val.snomed;
        if (val.duration) existing.duration = val.duration;
      }
    }

    // 5. Add from Convex DB suggestions
    for (const name of dbSuggestions) {
      const key = name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          type: 'db',
          name: name.trim(),
          snomed_code: '',
          duration: '',
        });
      }
    }

    const all = Array.from(map.values());
    const sortFn = (a: LinkedDiagnosis, b: LinkedDiagnosis) => {
      // Priority 1: Match current doctor's specialty
      const aCat = (a.category || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const aMatchesCat = isGynae
        ? aCat.includes('gyn') || aCat.includes('obs') || aCat.includes('anc')
        : aCat.includes('ortho') || aCat.includes('joint') || aCat.includes('spine');
      const bMatchesCat = isGynae
        ? bCat.includes('gyn') || bCat.includes('obs') || bCat.includes('anc')
        : bCat.includes('ortho') || bCat.includes('joint') || bCat.includes('spine');

      if (aMatchesCat && !bMatchesCat) return -1;
      if (!aMatchesCat && bMatchesCat) return 1;

      // Priority 2: Master Templates
      if (a.type === 'template' && b.type !== 'template') return -1;
      if (b.type === 'template' && a.type !== 'template') return 1;
      if (a.type === 'preset' && b.type !== 'preset') return -1;
      if (b.type === 'preset' && a.type !== 'preset') return 1;

      if (q) {
        const aStarts = (a.label || a.name).toLowerCase().startsWith(q);
        const bStarts = (b.label || b.name).toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      return (a.label || a.name).localeCompare(b.label || b.name);
    };

    if (!q) {
      return all.sort(sortFn).slice(0, 15);
    }

    return all
      .filter((item) => {
        const n = (item.label || item.name).toLowerCase();
        return n.includes(q);
      })
      .sort(sortFn)
      .slice(0, 15);
  }, [newDiagnosis, dbSuggestions, isGynae]);

  // When selecting a suggestion, auto-fill linked fields or apply template!
  const handleSelectSuggestion = (item: LinkedDiagnosis) => {
    if (item.type === 'template' && item.templateObj && onApplyMasterTemplate) {
      onApplyMasterTemplate(item.templateObj);
    }

    const diagText = item.templateObj?.diagnosis || item.name;
    const snomed = item.snomed_code || newSnomed.trim();
    const duration = item.duration || newDuration.trim();

    const newRow: DiagnosisRow = {
      id: 'diag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      diagnosis: diagText,
      snomed_code: snomed,
      duration: duration,
      date: date || new Date().toISOString().slice(0, 10),
    };

    const updated = [...diagnosesList, newRow];
    setDiagnosesList(updated);
    onUpdateDiagnosisSummary(updated.map((d) => d.diagnosis).filter(Boolean).join(', '));
    scheduleAutoSave(updated);

    if (item.type === 'catalog' || item.type === 'db') {
      saveCustomDiagnosisLink(item.name, snomed, duration);
    }

    setNewDiagnosis('');
    setNewSnomed('');
    setNewDuration('');
    setShowSuggestions(false);
  };

  const [templateVersion, setTemplateVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (!e.detail?.sectionKey || e.detail.sectionKey === 'diagnosis') {
        setTemplateVersion((v) => v + 1);
      }
    };
    window.addEventListener('cortex_section_templates_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('cortex_section_templates_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Suggestions for Gynae mode (templates, presets, diagnoses)
  const gynaeSuggestions = useMemo(() => {
    const q = gynaeQuery.trim().toLowerCase();
    const list: LinkedDiagnosis[] = [];

    // Master templates
    try {
      const allTemplates = getAllTemplates();
      for (const tmpl of allTemplates) {
        const matchName = tmpl.name.toLowerCase();
        const matchDiag = (tmpl.diagnosis || '').toLowerCase();
        if (!q || matchName.includes(q) || matchDiag.includes(q)) {
          list.push({
            type: 'template',
            name: tmpl.diagnosis || tmpl.name,
            label: cleanTemplateName(tmpl.name),
            snomed_code: '',
            duration: '',
            category: tmpl.category || 'Template',
            templateObj: tmpl,
          });
        }
      }
    } catch {}

    // Presets & Saved Templates
    try {
      const presets = [
        ...getSectionCustomTemplates('diagnosis'),
        ...(CLINICAL_SECTION_PRESETS.diagnosis || []),
      ];
      for (const p of presets) {
        const pDataStr = typeof p.data === 'string' ? p.data : p.name;
        if (!q || p.name.toLowerCase().includes(q) || pDataStr.toLowerCase().includes(q)) {
          list.push({
            type: 'preset',
            name: pDataStr,
            label: cleanTemplateName(p.name),
            snomed_code: '',
            duration: '',
            category: p.category || 'Saved Template',
          });
        }
      }
    } catch {}

    // Built-in catalog & Convex suggestions
    for (const c of CLINICAL_DIAGNOSES_CATALOG) {
      if (!q || c.name.toLowerCase().includes(q)) {
        list.push({ ...c, type: 'catalog' });
      }
    }
    for (const d of dbSuggestions) {
      if (!q || d.toLowerCase().includes(q)) {
        list.push({ name: d, snomed_code: '', duration: '', type: 'db' });
      }
    }

    const sortFn = (a: LinkedDiagnosis, b: LinkedDiagnosis) => {
      if (a.type === 'preset' && b.type !== 'preset') return -1;
      if (b.type === 'preset' && a.type !== 'preset') return 1;
      if (a.type === 'template' && b.type !== 'template') return -1;
      if (b.type === 'template' && a.type !== 'template') return 1;

      const aCat = (a.category || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const aMatches = isGynae
        ? aCat.includes('gyn') || aCat.includes('obs')
        : aCat.includes('ortho') || aCat.includes('spine') || aCat.includes('joint');
      const bMatches = isGynae
        ? bCat.includes('gyn') || bCat.includes('obs')
        : bCat.includes('ortho') || bCat.includes('spine') || bCat.includes('joint');

      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;

      return 0;
    };

    if (!q) return list.sort(sortFn).slice(0, 10);
    return list
      .sort(sortFn)
      .slice(0, 15);
  }, [gynaeQuery, dbSuggestions, isGynae, templateVersion]);

  const handleSelectGynaeSuggestion = (item: LinkedDiagnosis) => {
    if (item.type === 'template' && item.templateObj && onApplyMasterTemplate) {
      onApplyMasterTemplate(item.templateObj);
    }

    const diagText = (item.templateObj?.diagnosis || item.name || '').trim();
    const current = (diagnosisSummary || '').trim();
    let updatedText = '';
    const parts = current.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      parts[parts.length - 1] = diagText;
      updatedText = parts.join(', ');
    } else {
      updatedText = diagText;
    }

    onUpdateDiagnosisSummary(updatedText);
    const singleRow: DiagnosisRow = {
      id: 'diag_1',
      diagnosis: updatedText,
      snomed_code: item.snomed_code || '',
      duration: item.duration || '',
      date: date || new Date().toISOString().slice(0, 10),
    };
    setDiagnosesList([singleRow]);
    scheduleAutoSave([singleRow]);
    setShowGynaeSuggestions(false);
    setGynaeQuery('');
  };

  const handleAddDiagnosis = () => {
    const textToAdd = newDiagnosis.trim();
    if (!textToAdd) return;

    // Check if there are default linked fields for this diagnosis name
    const customLinks = getCustomDiagnosisLinks();
    const matchedCatalog = CLINICAL_DIAGNOSES_CATALOG.find(
      (c) => c.name.toLowerCase() === textToAdd.toLowerCase()
    );
    const matchedCustom = customLinks[textToAdd.toLowerCase()];

    const finalSnomed = newSnomed.trim() || matchedCustom?.snomed || matchedCatalog?.snomed_code || '';
    const finalDuration = newDuration.trim() || matchedCustom?.duration || matchedCatalog?.duration || '';

    const newRow: DiagnosisRow = {
      id: 'diag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      diagnosis: textToAdd,
      snomed_code: finalSnomed,
      duration: finalDuration,
      date: date || new Date().toISOString().slice(0, 10),
    };

    const updated = [...diagnosesList, newRow];
    setDiagnosesList(updated);
    onUpdateDiagnosisSummary(updated.map((d) => d.diagnosis).filter(Boolean).join(', '));
    scheduleAutoSave(updated);

    // Save linkage of all 3 fields together
    saveCustomDiagnosisLink(textToAdd, finalSnomed, finalDuration);

    setNewDiagnosis('');
    setNewSnomed('');
    setNewDuration('');
    setShowSuggestions(false);
  };

  const handleUpdateRow = (id: string, field: keyof DiagnosisRow, val: string) => {
    const updated = diagnosesList.map((row) =>
      row.id === id ? { ...row, [field]: val } : row
    );
    setDiagnosesList(updated);
    onUpdateDiagnosisSummary(updated.map((d) => d.diagnosis).filter(Boolean).join(', '));
    scheduleAutoSave(updated);

    // Auto-save linkage of all 3 fields when updated
    const target = updated.find((r) => r.id === id);
    if (target && target.diagnosis.trim()) {
      saveCustomDiagnosisLink(target.diagnosis, target.snomed_code, target.duration);
    }
  };

  const handleRemove = (id: string) => {
    const updated = diagnosesList.filter((x) => x.id !== id);
    setDiagnosesList(updated);
    onUpdateDiagnosisSummary(updated.map((x) => x.diagnosis).filter(Boolean).join(', '));
    scheduleAutoSave(updated);
  };

  const handleClearAll = () => {
    if (!isGynae && diagnosesList.length > 0) {
      if (!confirm('Are you sure you want to clear all diagnoses from the list?')) {
        return;
      }
    }
    setDiagnosesList([]);
    onUpdateDiagnosisSummary('');
    scheduleAutoSave([]);
  };

  const activeVal = (
    diagnosisSummary !== undefined
      ? diagnosisSummary
      : diagnosesList.map((d) => d.diagnosis).join(', ')
  ).replace(/^[\s,]+/, '');

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Left Pill Badge: Diagnosis / Condition */}
        <div className="px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-50/90 flex items-center gap-2 shrink-0 select-none shadow-2xs w-full sm:w-52">
          <Folder className="w-4 h-4 text-slate-700 shrink-0" />
          <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">Diagnosis / Condition</span>
        </div>

        {/* Right Pill/Box: Actions + Input + Clear */}
        <div className="relative flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 shadow-2xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
          {/* Action Icons: Folder (Templates), Undo */}
          <div className="flex items-center gap-1 text-slate-400 shrink-0">
            <SectionTemplatePicker
              sectionKey="diagnosis"
              sectionTitle="Diagnosis"
              currentValue={activeVal}
              category={isGynae ? 'Obstetrics & Gynaecology' : 'Orthopaedics'}
              align="right"
              onApplyPreset={(val) => {
                const text =
                  typeof val === 'string'
                    ? val
                    : Array.isArray(val)
                    ? val.map((x: any) => (typeof x === 'string' ? x : x.diagnosis || x.name || JSON.stringify(x))).join(', ')
                    : JSON.stringify(val);
                const updatedText = text.trim();
                onUpdateDiagnosisSummary(updatedText);
                const singleRow: DiagnosisRow = {
                  id: 'diag_1',
                  diagnosis: updatedText,
                  snomed_code: '',
                  duration: '',
                  date: date || new Date().toISOString().slice(0, 10),
                };
                setDiagnosesList([singleRow]);
                scheduleAutoSave([singleRow]);
                setGynaeQuery('');
              }}
            />
            <button
              type="button"
              title="Restore Previous Prescription Diagnosis"
              className="p-1 rounded hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer"
              onClick={onRestorePreviousDiagnosis || handleClearAll}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" />

          {/* Input Field with Auto-Suggest */}
          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={inlineInputRef}
              type="text"
              value={activeVal}
              onChange={(e) => {
                const val = e.target.value.replace(/^[\s,]+/, '');
                onUpdateDiagnosisSummary(val);
                const parts = val.split(',');
                const currentTyping = parts[parts.length - 1].trim();
                setGynaeQuery(currentTyping);
                setShowGynaeSuggestions(true);
                if (val.trim()) {
                  const singleRow: DiagnosisRow = {
                    id: 'diag_1',
                    diagnosis: val,
                    snomed_code: '',
                    duration: '',
                    date: date || new Date().toISOString().slice(0, 10),
                  };
                  setDiagnosesList([singleRow]);
                  scheduleAutoSave([singleRow]);
                } else {
                  setDiagnosesList([]);
                  scheduleAutoSave([]);
                }
              }}
              onFocus={() => {
                const parts = (diagnosisSummary || '').split(',');
                setGynaeQuery(parts[parts.length - 1]?.trim() || '');
                setHighlightedDiagIdx(0);
                setShowGynaeSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (showGynaeSuggestions && gynaeSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedDiagIdx((prev) => (prev < gynaeSuggestions.length - 1 ? prev + 1 : 0));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedDiagIdx((prev) => (prev > 0 ? prev - 1 : gynaeSuggestions.length - 1));
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = gynaeSuggestions[highlightedDiagIdx >= 0 ? highlightedDiagIdx : 0];
                    if (target) {
                      handleSelectGynaeSuggestion(target);
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    setShowGynaeSuggestions(false);
                    return;
                  }
                }
              }}
              placeholder="Add diagnosis / condition..."
              className="w-full bg-transparent border-none outline-none text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400"
            />

            {/* Live Autocomplete suggestions dropdown */}
            {showGynaeSuggestions && gynaeSuggestions.length > 0 && (
              <div
                ref={gynaeBoxRef}
                className="absolute left-0 top-full mt-2 w-full min-w-[280px] sm:min-w-[340px] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-[9999]"
              >
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/95 backdrop-blur-xs">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Suggestions (Enter to pick)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGynaeSuggestions(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {gynaeSuggestions.map((item, i) => {
                    const isSelected = highlightedDiagIdx === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectGynaeSuggestion(item);
                        }}
                        onMouseEnter={() => setHighlightedDiagIdx(i)}
                        className={`w-full text-left px-3.5 py-2.5 text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-950 font-bold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="truncate">
                          {cleanTemplateName(item.label || item.name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Clear Button */}
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <div className="w-px h-4 bg-slate-200" />
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear Diagnosis"
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
