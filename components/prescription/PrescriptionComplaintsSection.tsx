'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Edit2, Undo2, Trash2, Check, Sparkles } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import AutoResizeTextarea from './AutoResizeTextarea';
import {
  getComplaintSuggestions,
  saveMultipleComplaints,
  autoSavePrescriptionComplaint,
} from '@/services/prescription';
import { getAllTemplates, PrescriptionTemplate } from '@/services/templates';

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

    // 1. User-created Master Templates
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
              templateObj: tmpl,
            });
          }
        }
      }
    } catch {}

    // 2. Real Saved Complaints from Convex DB
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
  }, [currentQuery, dbSuggestions]);

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
          placeholder="Enter chief complaints..."
          className="w-full p-2.5 text-sm sm:text-base border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed"
        />

        {/* Live Autocomplete suggestions dropdown (only shown if there are real saved DB records or templates) */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsBoxRef}
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-[100]"
          >
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/95 backdrop-blur-xs">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Suggestions (Saved Records)
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
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-medium shrink-0 border border-emerald-200">
                        Saved
                      </span>
                    )}
                    <span className="font-semibold text-slate-800 truncate">
                      {item.label || item.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
