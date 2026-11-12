'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Edit2, Undo2, Trash2, Check, Sparkles, Stethoscope } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import AutoResizeTextarea from './AutoResizeTextarea';
import {
  getComplaintSuggestions,
  saveMultipleComplaints,
  autoSavePrescriptionComplaint,
} from '@/services/prescription';
import { getAllTemplates, PrescriptionTemplate, cleanTemplateName } from '@/services/templates';
import { getSectionCustomTemplates } from '@/services/clinicalSectionPresets';

export interface ComplaintRow {
  id: string;
  complaint: string;
  frequency: string;
  severity: string;
  duration: string;
  date: string;
}

export interface LinkedComplaint {
  type: 'template' | 'db';
  name: string;
  label?: string;
  templateObj?: PrescriptionTemplate;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Load real suggestions from Convex DB (actual past complaints entered in the clinic)
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

  // Reactive listener for template updates
  const [templateVersion, setTemplateVersion] = useState(0);
  const [highlightedComplaintIdx, setHighlightedComplaintIdx] = useState(0);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (!e.detail?.sectionKey || e.detail.sectionKey === 'complaints') {
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

  // Compute live suggestions strictly from real DB records and user templates
  const filteredSuggestions = useMemo(() => {
    const q = currentQuery.trim().toLowerCase();
    const list: LinkedComplaint[] = [];
    const seen = new Set<string>();

    // 1. Saved Custom Section Templates (localStorage + Convex DB)
    try {
      const customComplaints = getSectionCustomTemplates('complaints');
      for (const tmpl of customComplaints) {
        const tmplName = tmpl.name.trim();
        let dataStr = '';
        if (Array.isArray(tmpl.data)) {
          dataStr = tmpl.data
            .map((c: any) => (typeof c === 'string' ? c : c.complaint || c.name || ''))
            .filter(Boolean)
            .join(', ');
        } else if (typeof tmpl.data === 'string') {
          dataStr = tmpl.data.trim();
        } else if (tmpl.data && typeof tmpl.data === 'object') {
          dataStr = tmpl.data.complaint || tmpl.data.name || '';
        }
        const textToUse = dataStr || tmplName;
        const searchStr = `${tmplName} ${textToUse}`.toLowerCase();
        if (!q || searchStr.includes(q)) {
          const key = `custom_tmpl_${tmpl.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              type: 'template',
              name: textToUse,
              label: cleanTemplateName(tmplName),
            });
          }
        }
      }
    } catch {}

    // 2. User-created Master Templates
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
              label: cleanTemplateName(tmpl.name),
              templateObj: tmpl,
            });
          }
        }
      }
    } catch {}

    // 3. Real Saved Complaints from Convex DB
    for (const name of dbSuggestions) {
      const key = name.trim().toLowerCase();
      if (!seen.has(key)) {
        if (!q || key.includes(q)) {
          seen.add(key);
          list.push({
            type: 'db',
            name: name.trim(),
            label: name.trim(),
          });
        }
      }
    }

    // Sort: templates first, then alphabetical / matching
    list.sort((a, b) => {
      if (a.type === 'template' && b.type !== 'template') return -1;
      if (b.type === 'template' && a.type !== 'template') return 1;
      if (q) {
        const aStarts = (a.label || a.name).toLowerCase().startsWith(q);
        const bStarts = (b.label || b.name).toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      return (a.label || a.name).localeCompare(b.label || b.name);
    });

    if (!q) return list.slice(0, 10);
    return list.slice(0, 15);
  }, [currentQuery, dbSuggestions, templateVersion]);

  const handleSelectSuggestion = (item: LinkedComplaint) => {
    if (item.type === 'template' && item.templateObj && onApplyMasterTemplate) {
      onApplyMasterTemplate(item.templateObj);
    }

    const complaintText = (item.templateObj ? item.name : item.name).trim();
    const currentVal = (ccSummary !== undefined ? ccSummary : complaintsList.map((c) => c.complaint).join(', ')).trim();

    // Cleanly replace partial search query so search characters never prepend or merge with template
    let updatedText = '';
    const parts = currentVal.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      parts[parts.length - 1] = complaintText;
      updatedText = parts.join(', ');
    } else {
      updatedText = complaintText;
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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Left Pill Badge: Chief Complaint */}
        <div className="px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-50/90 flex items-center gap-2 shrink-0 select-none shadow-2xs w-full sm:w-52">
          <Stethoscope className="w-4 h-4 text-slate-700 shrink-0" />
          <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">Chief Complaint</span>
        </div>

        {/* Right Pill/Box: Actions + Input + Clear */}
        <div className="relative flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 shadow-2xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
          {/* Action Icons: Edit, Folder (Templates), Undo */}
          <div className="flex items-center gap-1 text-slate-400 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              title="Edit Chief Complaint"
              className="p-1 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <SectionTemplatePicker
              sectionKey="complaints"
              sectionTitle="Complaints"
              currentValue={activeValue}
              category={isGynae ? 'Obstetrics & Gynaecology' : 'Orthopaedics'}
              align="right"
              onApplyPreset={(val) => {
                const text =
                  typeof val === 'string'
                    ? val
                    : Array.isArray(val)
                    ? val.map((x: any) => (typeof x === 'string' ? x : x.complaint || x.name || JSON.stringify(x))).join(', ')
                    : String(val);
                const updated = text.trim();
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
                setCurrentQuery('');
              }}
            />
            <button
              type="button"
              title="Restore Previous Prescription Complaints"
              className="p-1 rounded hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer"
              onClick={onRestorePreviousComplaints || handleClearAll}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" />

          {/* Input Field with Auto-Suggest */}
          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={activeValue}
              onChange={(e) => {
                const val = e.target.value.replace(/^[\s,]+/, '');
                if (onUpdateCcSummary) onUpdateCcSummary(val);

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
                setHighlightedComplaintIdx(0);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (showSuggestions && filteredSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedComplaintIdx((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedComplaintIdx((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = filteredSuggestions[highlightedComplaintIdx >= 0 ? highlightedComplaintIdx : 0];
                    if (target) {
                      handleSelectSuggestion(target);
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    return;
                  }
                }
              }}
              placeholder="Add chief complaint..."
              className="w-full bg-transparent border-none outline-none text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400"
            />

            {/* Live Autocomplete suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsBoxRef}
                className="absolute left-0 top-full mt-2 w-full min-w-[280px] sm:min-w-[340px] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-[9999]"
              >
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/95 backdrop-blur-xs">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Suggestions (Enter to pick)
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
                  {filteredSuggestions.map((item, i) => {
                    const isSelected = highlightedComplaintIdx === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(item);
                        }}
                        onMouseEnter={() => setHighlightedComplaintIdx(i)}
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
              title="Clear Chief Complaint"
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
