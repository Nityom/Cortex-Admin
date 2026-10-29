'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Undo2, Trash2, Check, Loader2, Search } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import {
  getDiagnosisSuggestions,
  saveMultipleDiagnoses,
  autoSavePrescriptionDiagnosis,
} from '@/services/prescription';

export interface DiagnosisRow {
  id: string;
  diagnosis: string;
  snomed_code: string;
  duration: string;
  date: string;
}

export interface LinkedDiagnosis {
  name: string;
  snomed_code: string;
  duration: string;
  category?: string;
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
}

export default function PrescriptionDiagnosisSection({
  diagnosesList,
  setDiagnosesList,
  diagnosisSummary,
  onUpdateDiagnosisSummary,
  date = new Date().toISOString().slice(0, 10),
  prescriptionId,
}: PrescriptionDiagnosisSectionProps) {
  // Inline Add Row state
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newSnomed, setNewSnomed] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [dbSuggestions, setDbSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge built-in catalog + saved custom linkages + Convex DB suggestions
  const mergedSuggestions = useMemo(() => {
    const q = newDiagnosis.trim().toLowerCase();
    const customLinks = getCustomDiagnosisLinks();
    const map = new Map<string, LinkedDiagnosis>();

    // 1. Add from built-in clinical catalog
    for (const item of CLINICAL_DIAGNOSES_CATALOG) {
      map.set(item.name.toLowerCase(), item);
    }

    // 2. Add from custom linkages
    for (const [key, val] of Object.entries(customLinks)) {
      if (!map.has(key)) {
        map.set(key, {
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

    // 3. Add from Convex DB suggestions
    for (const name of dbSuggestions) {
      const key = name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: name.trim(),
          snomed_code: '',
          duration: '',
        });
      }
    }

    const all = Array.from(map.values());
    if (!q) {
      return all.slice(0, 15);
    }

    return all
      .filter((item) => item.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 15);
  }, [newDiagnosis, dbSuggestions]);

  // When selecting a suggestion, auto-fill all 3 linked fields and add to table!
  const handleSelectSuggestion = (item: LinkedDiagnosis) => {
    const snomed = item.snomed_code || newSnomed.trim();
    const duration = item.duration || newDuration.trim();

    const newRow: DiagnosisRow = {
      id: 'diag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      diagnosis: item.name,
      snomed_code: snomed,
      duration: duration,
      date: date || new Date().toISOString().slice(0, 10),
    };

    const updated = [...diagnosesList, newRow];
    setDiagnosesList(updated);
    onUpdateDiagnosisSummary(updated.map((d) => d.diagnosis).filter(Boolean).join(', '));
    scheduleAutoSave(updated);

    // Save custom link of all 3 fields together
    saveCustomDiagnosisLink(item.name, snomed, duration);

    setNewDiagnosis('');
    setNewSnomed('');
    setNewDuration('');
    setShowSuggestions(false);
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
    if (diagnosesList.length > 0) {
      if (!confirm('Are you sure you want to clear all diagnoses from the list?')) {
        return;
      }
    }
    setDiagnosesList([]);
    onUpdateDiagnosisSummary('');
    scheduleAutoSave([]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            Diagnosis
          </label>

          {/* Auto-save status indicator */}
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 animate-pulse border border-blue-200">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Auto-saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 transition">
              <Check className="w-2.5 h-2.5" />
              Auto-saved
            </span>
          )}

          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              title="Focus inline Add Diagnosis"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              onClick={() => inlineInputRef.current?.focus()}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <SectionTemplatePicker
              sectionKey="diagnosis"
              sectionTitle="Diagnosis"
              currentValue={diagnosisSummary}
              align="left"
              onApplyPreset={(val) => {
                const str =
                  typeof val === 'string'
                    ? val
                    : Array.isArray(val)
                    ? val.join(', ')
                    : JSON.stringify(val);
                const matched = CLINICAL_DIAGNOSES_CATALOG.find(
                  (c) => c.name.toLowerCase() === str.toLowerCase()
                );
                const updated: DiagnosisRow = {
                  id: 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                  diagnosis: str,
                  snomed_code: matched?.snomed_code || '',
                  duration: matched?.duration || '',
                  date: date || new Date().toISOString().slice(0, 10),
                };
                const nextList = [...diagnosesList, updated];
                setDiagnosesList(nextList);
                onUpdateDiagnosisSummary(nextList.map((d) => d.diagnosis).filter(Boolean).join(', '));
                scheduleAutoSave(nextList);
              }}
            />
            <button
              type="button"
              title="Reset / Clear Diagnosis List"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              onClick={handleClearAll}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {diagnosesList.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Trash2 className="w-3 h-3" />
            Clear List ({diagnosesList.length})
          </button>
        )}
      </div>

      {/* HealthPlix Diagnosis Table - Fully Editable with Auto-save */}
      <div className="border border-slate-200 rounded-lg overflow-visible text-xs">
        <div className="grid grid-cols-12 bg-slate-50 text-slate-700 font-semibold py-2 px-3 border-b border-slate-200 text-[11px] uppercase tracking-wider rounded-t-lg">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Diagnosis (Click to edit)</div>
          <div className="col-span-2">SNOMED / ICD</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {/* Existing Diagnoses Rows with Inline Editing */}
        {diagnosesList.length === 0 ? (
          <div className="py-2.5 px-3 text-slate-400 italic text-xs bg-white">
            No diagnosis added yet. Type below and press Enter or use the template picker above.
          </div>
        ) : (
          diagnosesList.map((d, idx) => (
            <div
              key={d.id}
              className="grid grid-cols-12 items-center py-1.5 px-3 border-b border-slate-100 bg-white hover:bg-slate-50/50 gap-2"
            >
              <div className="col-span-1 text-slate-400 font-mono">{idx + 1}</div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={d.diagnosis}
                  onChange={(e) => handleUpdateRow(d.id, 'diagnosis', e.target.value)}
                  onBlur={() => triggerAutoSave(diagnosesList)}
                  className="w-full p-1 text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-100/70 focus:bg-white border border-transparent hover:border-slate-300 focus:border-teal-500 rounded outline-none transition"
                  title="Click to edit diagnosis name"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={d.snomed_code}
                  onChange={(e) => handleUpdateRow(d.id, 'snomed_code', e.target.value)}
                  onBlur={() => triggerAutoSave(diagnosesList)}
                  placeholder="—"
                  className="w-full p-1 text-xs font-mono text-slate-600 bg-transparent hover:bg-slate-100/70 focus:bg-white border border-transparent hover:border-slate-300 focus:border-teal-500 rounded outline-none transition"
                  title="Click to edit SNOMED / ICD code"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={d.duration}
                  onChange={(e) => handleUpdateRow(d.id, 'duration', e.target.value)}
                  onBlur={() => triggerAutoSave(diagnosesList)}
                  placeholder="—"
                  className="w-full p-1 text-xs text-slate-700 bg-transparent hover:bg-slate-100/70 focus:bg-white border border-transparent hover:border-slate-300 focus:border-teal-500 rounded outline-none transition"
                  title="Click to edit duration"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="text"
                  value={d.date || date}
                  onChange={(e) => handleUpdateRow(d.id, 'date', e.target.value)}
                  onBlur={() => triggerAutoSave(diagnosesList)}
                  className="w-full p-1 text-[11px] font-mono text-slate-600 bg-transparent hover:bg-slate-100/70 focus:bg-white border border-transparent hover:border-slate-300 focus:border-teal-500 rounded outline-none transition"
                  title="Click to edit date"
                />
              </div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => handleRemove(d.id)}
                  className="text-rose-500 hover:text-rose-700 font-bold p-1 rounded hover:bg-rose-50 cursor-pointer"
                  title="Remove diagnosis"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}

        {/* Inline Add Diagnosis Row */}
        <div className="relative grid grid-cols-12 items-center py-1.5 px-3 bg-slate-50/70 gap-2 border-t border-slate-200">
          <div className="col-span-1 text-slate-400 font-mono font-bold">
            {diagnosesList.length + 1}
          </div>
          <div className="col-span-5 relative">
            <input
              ref={inlineInputRef}
              type="text"
              value={newDiagnosis}
              onChange={(e) => {
                setNewDiagnosis(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDiagnosis();
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              placeholder="Add diagnosis (e.g. Osteoarthritis, Diabetes, Lumbar spondylosis)..."
              className="w-full p-1.5 text-xs border border-slate-300 rounded text-slate-800 bg-white focus:ring-1 focus:ring-teal-500 outline-none"
            />

            {/* Quick Autocomplete dropdown for inline input - NEVER clipped */}
            {showSuggestions && mergedSuggestions.length > 0 && (
              <div
                ref={suggestionsBoxRef}
                className={`absolute left-0 w-[420px] max-w-lg bg-white border border-slate-300 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-[100] ${
                  openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                }`}
              >
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/95 backdrop-blur-xs">
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3 text-slate-400" />
                    Clinical Suggestions (Auto-fills 3 fields)
                  </span>
                  <span>Click / Enter</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {mergedSuggestions.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(item);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 transition cursor-pointer flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.snomed_code && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono font-bold border border-blue-200">
                            {item.snomed_code}
                          </span>
                        )}
                        {item.duration && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                            {item.duration}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="col-span-2">
            <input
              type="text"
              value={newSnomed}
              onChange={(e) => setNewSnomed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDiagnosis();
                }
              }}
              placeholder="SNOMED / ICD"
              className="w-full p-1.5 text-xs border border-slate-300 rounded text-slate-700 bg-white outline-none"
            />
          </div>
          <div className="col-span-2">
            <input
              type="text"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDiagnosis();
                }
              }}
              placeholder="Duration (e.g. 2 weeks)"
              className="w-full p-1.5 text-xs border border-slate-300 rounded text-slate-700 bg-white outline-none"
            />
          </div>
          <div className="col-span-1 text-slate-500 text-[11px] font-mono">
            {date || 'Today'}
          </div>
          <div className="col-span-1 text-right">
            <button
              type="button"
              onClick={handleAddDiagnosis}
              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs cursor-pointer shadow-xs transition"
              title="Add diagnosis to table"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
