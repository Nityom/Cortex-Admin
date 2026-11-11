'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Edit2, Plus, Undo2, Trash2, Check, Sparkles } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import AutoResizeTextarea from './AutoResizeTextarea';
import {
  getComplaintSuggestions,
  saveMultipleComplaints,
  autoSavePrescriptionComplaint,
} from '@/services/prescription';
import { getAllTemplates, PrescriptionTemplate } from '@/services/templates';
import { CLINICAL_SECTION_PRESETS, getSectionCustomTemplates } from '@/services/clinicalSectionPresets';

export interface ComplaintRow {
  id: string;
  complaint: string;
  frequency: string;
  severity: string;
  duration: string;
  date: string;
}

export interface LinkedComplaint {
  type?: 'template' | 'preset' | 'catalog' | 'db';
  name: string;
  label?: string;
  category?: 'Orthopaedics' | 'Obstetrics & Gynaecology' | 'General' | string;
  templateObj?: PrescriptionTemplate;
}

// Built-in curated clinical complaints for Orthopaedics, Gynaecology, and General Medicine
const CLINICAL_COMPLAINTS_CATALOG: LinkedComplaint[] = [
  // Orthopaedics (Dr. Vipeen Raut)
  { name: 'Knee pain', category: 'Orthopaedics' },
  { name: 'Left knee pain', category: 'Orthopaedics' },
  { name: 'Right knee pain', category: 'Orthopaedics' },
  { name: 'Bilateral knee pain', category: 'Orthopaedics' },
  { name: 'Lower back pain', category: 'Orthopaedics' },
  { name: 'Severe backache radiating to legs', category: 'Orthopaedics' },
  { name: 'Neck pain and stiffness', category: 'Orthopaedics' },
  { name: 'Cervical pain radiating to arms', category: 'Orthopaedics' },
  { name: 'Shoulder pain (Right)', category: 'Orthopaedics' },
  { name: 'Shoulder pain (Left)', category: 'Orthopaedics' },
  { name: 'Frozen shoulder / Restricted movements', category: 'Orthopaedics' },
  { name: 'Joint pain with swelling', category: 'Orthopaedics' },
  { name: 'Morning stiffness in small joints', category: 'Orthopaedics' },
  { name: 'Sciatica / Tingling & numbness in legs', category: 'Orthopaedics' },
  { name: 'Heel pain (worse in morning on standing)', category: 'Orthopaedics' },
  { name: 'Ankle pain and swelling', category: 'Orthopaedics' },
  { name: 'Difficulty in walking & weight bearing', category: 'Orthopaedics' },
  { name: 'Wrist pain / Tenderness', category: 'Orthopaedics' },
  { name: 'Tennis elbow / Lateral elbow pain', category: 'Orthopaedics' },
  { name: 'Post-fall knee / ankle swelling', category: 'Orthopaedics' },
  { name: 'Muscle spasm and cramps in calves', category: 'Orthopaedics' },

  // Obstetrics & Gynaecology (Dr. Shillpa Raut)
  { name: 'Lower abdominal pain', category: 'Obstetrics & Gynaecology' },
  { name: 'White discharge (foul smelling / pruritus)', category: 'Obstetrics & Gynaecology' },
  { name: 'Irregular menstrual periods', category: 'Obstetrics & Gynaecology' },
  { name: 'Heavy menstrual bleeding (Menorrhagia)', category: 'Obstetrics & Gynaecology' },
  { name: 'Severe painful menstruation (Dysmenorrhea)', category: 'Obstetrics & Gynaecology' },
  { name: 'Amenorrhea / Missed periods', category: 'Obstetrics & Gynaecology' },
  { name: 'Nausea and morning vomiting in pregnancy', category: 'Obstetrics & Gynaecology' },
  { name: 'Burning sensation during micturition', category: 'Obstetrics & Gynaecology' },
  { name: 'Decreased fetal movements', category: 'Obstetrics & Gynaecology' },
  { name: 'Generalized weakness and fatigue', category: 'Obstetrics & Gynaecology' },
  { name: 'Backache during pregnancy', category: 'Obstetrics & Gynaecology' },
  { name: 'Pelvic heaviness and dragging pain', category: 'Obstetrics & Gynaecology' },
  { name: 'Vaginal itching and irritation', category: 'Obstetrics & Gynaecology' },

  // General & Systemic
  { name: 'Fever with chills', category: 'General' },
  { name: 'Headache', category: 'General' },
  { name: 'Body ache & generalized fatigue', category: 'General' },
  { name: 'Loss of appetite', category: 'General' },
  { name: 'Hyperacidity & gastric discomfort', category: 'General' },
  { name: 'Cough and sore throat', category: 'General' },
];

interface PrescriptionComplaintsSectionProps {
  complaintsList: ComplaintRow[];
  setComplaintsList: React.Dispatch<React.SetStateAction<ComplaintRow[]>>;
  date?: string;
  onUpdateCcSummary?: (summary: string) => void;
  isGynae?: boolean;
  ccSummary?: string;
  onRestorePreviousComplaints?: () => void;
  prescriptionId?: string;
  onApplyMasterTemplate?: (tmpl: PrescriptionTemplate) => void;
}

export default function PrescriptionComplaintsSection({
  complaintsList,
  setComplaintsList,
  date = new Date().toISOString().slice(0, 10),
  onUpdateCcSummary,
  isGynae = false,
  ccSummary,
  onRestorePreviousComplaints,
  prescriptionId,
  onApplyMasterTemplate,
}: PrescriptionComplaintsSectionProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [currentQuery, setCurrentQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dbSuggestions, setDbSuggestions] = useState<string[]>([]);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save logic
  const triggerAutoSave = useCallback(
    async (summaryStr: string) => {
      const items = summaryStr
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);

      setSaveStatus('saving');
      try {
        // 1. Save terms to Convex master catalog for autocomplete suggestions
        if (items.length > 0) {
          await saveMultipleComplaints(items, isGynae ? 'Obstetrics & Gynaecology' : 'Orthopaedics');
        }

        // 2. Auto-save complaint to active Convex prescription document
        if (
          prescriptionId &&
          prescriptionId !== 'undefined' &&
          prescriptionId !== 'null' &&
          !prescriptionId.startsWith('TMP-')
        ) {
          await autoSavePrescriptionComplaint(prescriptionId, summaryStr);
        }

        // 3. Save draft to localStorage
        try {
          localStorage.setItem('cortex_complaints_draft', summaryStr);
          localStorage.setItem(
            'cortex_complaints_list_draft',
            JSON.stringify(
              items.map((item, idx) => ({
                id: `c_${Date.now()}_${idx}`,
                complaint: item,
                frequency: '',
                severity: '',
                duration: '',
                date: date || new Date().toISOString().slice(0, 10),
              }))
            )
          );
        } catch {}

        setSaveStatus('saved');
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (err) {
        console.error('Complaints auto-save failed:', err);
        setSaveStatus('idle');
      }
    },
    [isGynae, prescriptionId, date]
  );

  const scheduleAutoSave = useCallback(
    (summaryStr: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        triggerAutoSave(summaryStr);
      }, 800);
    },
    [triggerAutoSave]
  );

  // Load suggestions from Convex
  useEffect(() => {
    let isMounted = true;
    getComplaintSuggestions()
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setDbSuggestions(res);
        }
      })
      .catch((err) => console.warn('Could not load complaint suggestions:', err));
    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live filtered suggestions
  const filteredSuggestions = useMemo(() => {
    const q = currentQuery.trim().toLowerCase();
    const list: LinkedComplaint[] = [];
    const seen = new Set<string>();

    // 1. Templates matching query
    try {
      const allTemplates = getAllTemplates();
      for (const tmpl of allTemplates) {
        const matchName = tmpl.name.toLowerCase();
        const tmplCc = Array.isArray(tmpl.complaints)
          ? tmpl.complaints.map((c: any) => (typeof c === 'string' ? c : c.complaint || '')).join(', ')
          : '';
        const matchCc = tmplCc.toLowerCase();
        if (!q || matchName.includes(q) || matchCc.includes(q)) {
          const key = `tmpl_${tmpl.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              type: 'template',
              name: tmplCc || tmpl.name,
              label: `⭐ [Template] ${tmpl.name}${tmplCc ? ` (${tmplCc})` : ''}`,
              category: tmpl.category || 'Template',
              templateObj: tmpl,
            });
          }
        }
      }
    } catch {}

    // 2. Section Presets
    try {
      const presets = [
        ...(CLINICAL_SECTION_PRESETS.complaints || []),
        ...getSectionCustomTemplates('complaints'),
      ];
      for (const p of presets) {
        const pDataStr = typeof p.data === 'string' ? p.data : p.name;
        if (!q || p.name.toLowerCase().includes(q) || pDataStr.toLowerCase().includes(q)) {
          const key = `preset_${p.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              type: 'preset',
              name: pDataStr,
              label: `⚡ [Preset] ${p.name}`,
              category: p.category || 'Preset',
            });
          }
        }
      }
    } catch {}

    // 3. Built-in Catalog items
    for (const item of CLINICAL_COMPLAINTS_CATALOG) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        if (!q || key.includes(q)) {
          seen.add(key);
          list.push({ ...item, type: 'catalog' });
        }
      }
    }

    // 4. Convex DB Learned suggestions
    for (const name of dbSuggestions) {
      const key = name.trim().toLowerCase();
      if (!seen.has(key)) {
        if (!q || key.includes(q)) {
          seen.add(key);
          list.push({
            type: 'db',
            name: name.trim(),
            category: 'Learned',
          });
        }
      }
    }

    const sortFn = (a: LinkedComplaint, b: LinkedComplaint) => {
      // Priority 1: Match current doctor's specialty
      const aCat = (a.category || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const aMatches = isGynae
        ? aCat.includes('gyn') || aCat.includes('obs')
        : aCat.includes('ortho') || aCat.includes('joint') || aCat.includes('spine');
      const bMatches = isGynae
        ? bCat.includes('gyn') || bCat.includes('obs')
        : bCat.includes('ortho') || bCat.includes('joint') || bCat.includes('spine');

      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;

      // Priority 2: Master Templates & Presets
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

    if (!q) return list.sort(sortFn).slice(0, 12);
    return list.sort(sortFn).slice(0, 15);
  }, [currentQuery, dbSuggestions, isGynae]);

  const handleSelectSuggestion = (item: LinkedComplaint) => {
    if (item.type === 'template' && item.templateObj && onApplyMasterTemplate) {
      onApplyMasterTemplate(item.templateObj);
    }

    const complaintText = (item.templateObj ? item.name : item.name).trim();
    const currentVal = (ccSummary !== undefined ? ccSummary : complaintsList.map((c) => c.complaint).join(', ')).trim();

    // Replace partial query at the end or append
    let updatedText = '';
    const parts = currentVal.split(',');
    if (parts.length > 0 && parts[parts.length - 1].trim().toLowerCase() === currentQuery.trim().toLowerCase()) {
      parts[parts.length - 1] = ' ' + complaintText;
      updatedText = parts.join(',').replace(/^[\s,]+/, '').trim();
    } else {
      updatedText = currentVal ? `${currentVal.replace(/,\s*$/, '')}, ${complaintText}` : complaintText;
    }

    if (onUpdateCcSummary) onUpdateCcSummary(updatedText);
    const newRows = updatedText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((txt, idx) => ({
        id: `c_${Date.now()}_${idx}`,
        complaint: txt,
        frequency: '',
        severity: '',
        duration: '',
        date: date || new Date().toISOString().slice(0, 10),
      }));

    setComplaintsList(newRows);
    scheduleAutoSave(updatedText);
    setShowSuggestions(false);
    setCurrentQuery('');
  };

  const handleClearAll = () => {
    setComplaintsList([]);
    if (onUpdateCcSummary) onUpdateCcSummary('');
    scheduleAutoSave('');
  };

  const activeValue = (
    ccSummary !== undefined
      ? ccSummary
      : complaintsList.map((c) => c.complaint).filter(Boolean).join(', ')
  ).replace(/^[\s,]+/, '');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 transition">
              <Check className="w-2.5 h-2.5" />
              Auto-saved
            </span>
          )}

          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              type="button"
              title="Edit Complaints"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <SectionTemplatePicker
              sectionKey="complaints"
              sectionTitle="Complaints"
              currentValue={activeValue}
              category={isGynae ? 'Obstetrics & Gynaecology' : 'Orthopaedics'}
              align="left"
              onApplyPreset={(val) => {
                const text =
                  typeof val === 'string'
                    ? val
                    : Array.isArray(val)
                    ? val.map((x: any) => (typeof x === 'string' ? x : x.complaint || x.name || JSON.stringify(x))).join(', ')
                    : String(val);
                const updated = activeValue ? `${activeValue.replace(/,\s*$/, '')}, ${text.trim()}` : text.trim();
                if (onUpdateCcSummary) onUpdateCcSummary(updated);
                const newRows = updated
                  .split(/[\n,;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((txt, idx) => ({
                    id: `c_${Date.now()}_${idx}`,
                    complaint: txt,
                    frequency: '',
                    severity: '',
                    duration: '',
                    date: date || new Date().toISOString().slice(0, 10),
                  }));
                setComplaintsList(newRows);
                scheduleAutoSave(updated);
              }}
            />
            <button
              type="button"
              title="Restore Previous Prescription Complaints"
              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
              onClick={onRestorePreviousComplaints || handleClearAll}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {activeValue && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Trash2 className="w-3 h-3" />
            Clear Complaints
          </button>
        )}
      </div>

      <div className="relative">
        <AutoResizeTextarea
          value={activeValue}
          onChange={(e) => {
            const val = e.target.value.replace(/^[\s,]+/, '');
            if (onUpdateCcSummary) onUpdateCcSummary(val);

            // Extract the word being typed after the last comma
            const parts = val.split(',');
            const typingPart = parts[parts.length - 1]?.trim() || '';
            setCurrentQuery(typingPart);
            setShowSuggestions(true);

            if (val.trim()) {
              const newRows = val
                .split(/[\n,;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((txt, idx) => ({
                  id: `c_${Date.now()}_${idx}`,
                  complaint: txt,
                  frequency: '',
                  severity: '',
                  duration: '',
                  date: date || new Date().toISOString().slice(0, 10),
                }));
              setComplaintsList(newRows);
            } else {
              setComplaintsList([]);
            }
            scheduleAutoSave(val);
          }}
          onFocus={() => {
            const parts = activeValue.split(',');
            setCurrentQuery(parts[parts.length - 1]?.trim() || '');
            setShowSuggestions(true);
          }}
          minRows={1}
          placeholder={
            isGynae
              ? 'Enter chief complaints (e.g. Lower abdominal pain, white discharge, irregular periods, nausea)...'
              : 'Enter chief complaints (e.g. Knee pain, lower back pain, neck stiffness, shoulder pain)...'
          }
          className="w-full p-2.5 text-sm sm:text-base border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed"
        />

        {/* Live Autocomplete suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsBoxRef}
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-[100]"
          >
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/95 backdrop-blur-xs">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Auto-suggest (Templates & Chief Complaints)
              </span>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredSuggestions.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.type === 'template' ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                        ⭐ Template
                      </span>
                    ) : item.type === 'preset' ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                        ⚡ Preset
                      </span>
                    ) : item.category?.toLowerCase().includes('ortho') ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold shrink-0 border border-blue-200">
                        Ortho
                      </span>
                    ) : item.category?.toLowerCase().includes('gyn') || item.category?.toLowerCase().includes('obs') ? (
                      <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 text-[10px] font-bold shrink-0 border border-pink-200">
                        Gynae
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold shrink-0 border border-emerald-200">
                        Complaint
                      </span>
                    )}
                    <span className="font-semibold text-slate-800 truncate">
                      {item.label || item.name}
                    </span>
                  </div>
                  {item.category && (
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {item.category}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
