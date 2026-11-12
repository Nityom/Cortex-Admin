'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Edit2, Undo2, Sparkles, Plus, Check, X, Search, Trash2, FlaskConical, FileText } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';
import AutoResizeTextarea from './AutoResizeTextarea';
import {
  getSectionCustomTemplates,
  saveSectionCustomTemplate,
  fetchSectionTemplatesFromConvex,
  ClinicalSectionPreset,
} from '@/services/clinicalSectionPresets';
import { getAllTemplates, cleanTemplateName } from '@/services/templates';

export interface TestRequestedItem {
  id: string;
  name: string;
  by_when: string;
}

export function parseTestsFromTemplate(val: any): Array<{ id: string; name: string; by_when: string }> {
  if (!val) return [];

  let rawList: any[] = [];

  if (Array.isArray(val)) {
    rawList = val;
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.tests_requested)) rawList = parsed.tests_requested;
          else if (Array.isArray(parsed.tests)) rawList = parsed.tests;
          else rawList = [parsed];
        }
      } catch {
        // Fall back to splitting
      }
    }

    if (rawList.length === 0 && trimmed) {
      const lines = trimmed.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      rawList = lines.map((line) => {
        const byMatch = line.match(/\((?:by:?\s*)([^)]+)\)/i);
        if (byMatch) {
          const testName = line.replace(/\((?:by:?\s*)([^)]+)\)/i, '').trim();
          return { name: testName, by_when: byMatch[1].trim() };
        }
        return { name: line, by_when: 'Next Visit' };
      });
    }
  } else if (typeof val === 'object') {
    if (Array.isArray(val.tests_requested)) rawList = val.tests_requested;
    else if (Array.isArray(val.tests)) rawList = val.tests;
    else if (val.name) rawList = [val];
  }

  const result: Array<{ id: string; name: string; by_when: string }> = [];
  const now = Date.now();

  rawList.forEach((item: any, idx: number) => {
    if (!item) return;
    if (typeof item === 'string') {
      const cleanName = item.trim();
      if (cleanName) {
        result.push({
          id: `tt_${now}_${idx}`,
          name: cleanName,
          by_when: 'Next Visit',
        });
      }
    } else if (typeof item === 'object') {
      const testName = String(item.name || item.test_name || item.test || item.title || '').trim();
      const byWhen = String(item.by_when || item.byWhen || item.timing || 'Next Visit').trim();
      if (testName) {
        result.push({
          id: `tt_${now}_${idx}`,
          name: testName,
          by_when: byWhen || 'Next Visit',
        });
      }
    }
  });

  return result;
}

interface PrescriptionClinicalNotesSectionProps {
  drNotes: string;
  setDrNotes: React.Dispatch<React.SetStateAction<string>>;
  quickNotes: string;
  setQuickNotes: React.Dispatch<React.SetStateAction<string>>;
  procedureAdvice: string;
  setProcedureAdvice: React.Dispatch<React.SetStateAction<string>>;
  advice: string;
  onUpdateAdvice: (val: string) => void;
  testsRequested: TestRequestedItem[];
  setTestsRequested: React.Dispatch<React.SetStateAction<TestRequestedItem[]>>;
  referralDocName: string;
  setReferralDocName: (val: string) => void;
  referralSpeciality: string;
  setReferralSpeciality: (val: string) => void;
  referralPhone: string;
  setReferralPhone: (val: string) => void;
  referralEmail: string;
  setReferralEmail: (val: string) => void;
  dietExercise: string;
  setDietExercise: React.Dispatch<React.SetStateAction<string>>;
  investigationText: string;
  setInvestigationText: React.Dispatch<React.SetStateAction<string>>;
  pastMedication: string;
  setPastMedication: React.Dispatch<React.SetStateAction<string>>;
  systemicExam: string;
  setSystemicExam: React.Dispatch<React.SetStateAction<string>>;
  generalExam: string;
  setGeneralExam: React.Dispatch<React.SetStateAction<string>>;
  selectedDoctorName?: string;
  onRestorePreviousNote?: (fieldKey: string) => void;
}

export default function PrescriptionClinicalNotesSection({
  drNotes,
  setDrNotes,
  quickNotes,
  setQuickNotes,
  procedureAdvice,
  setProcedureAdvice,
  advice,
  onUpdateAdvice,
  testsRequested,
  setTestsRequested,
  referralDocName,
  setReferralDocName,
  referralSpeciality,
  setReferralSpeciality,
  referralPhone,
  setReferralPhone,
  referralEmail,
  setReferralEmail,
  dietExercise,
  setDietExercise,
  investigationText,
  setInvestigationText,
  pastMedication,
  setPastMedication,
  systemicExam,
  setSystemicExam,
  generalExam,
  setGeneralExam,
  selectedDoctorName,
  onRestorePreviousNote,
}: PrescriptionClinicalNotesSectionProps) {
  const isGynae = (selectedDoctorName || "").toLowerCase().includes("shilpa") || (selectedDoctorName || "").toLowerCase().includes("shillpa") || (selectedDoctorName || "").toLowerCase().includes("gyn");
  const docCategory = isGynae ? "Obstetrics & Gynaecology" : "Orthopaedics";
  const [newTestName, setNewTestName] = useState('');
  const [newTestByWhen, setNewTestByWhen] = useState('Next Visit');
  const [showTestSuggestions, setShowTestSuggestions] = useState(false);
  const [highlightedSuggestionIdx, setHighlightedSuggestionIdx] = useState(0);
  const [savedCustomTests, setSavedCustomTests] = useState<string[]>([]);

  // Advice auto-suggest state
  const [showAdviceSuggestions, setShowAdviceSuggestions] = useState(false);
  const [highlightedAdviceIdx, setHighlightedAdviceIdx] = useState(0);
  const [templateUpdateTrigger, setTemplateUpdateTrigger] = useState(0);

  const testInputRef = useRef<HTMLInputElement>(null);
  const byWhenInputRef = useRef<HTMLInputElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);
  const adviceInputRef = useRef<HTMLInputElement>(null);
  const adviceSuggestionsBoxRef = useRef<HTMLDivElement>(null);

  const loadSavedCustomTests = useCallback(() => {
    const customList = getSectionCustomTemplates('tests_requested');
    const names = new Set<string>();
    customList.forEach((c) => {
      if (Array.isArray(c.data)) {
        c.data.forEach((t: any) => {
          const n = (typeof t === 'string' ? t : t.name || '').trim();
          if (n) names.add(n);
        });
      } else if (c.name) {
        names.add(c.name.trim());
      }
    });
    setSavedCustomTests(Array.from(names));
    return names;
  }, []);

  // Load custom tests saved previously (localStorage + Convex DB sync)
  useEffect(() => {
    const names = loadSavedCustomTests();

    // Also sync from Convex in background
    fetchSectionTemplatesFromConvex('tests_requested')
      .then((convexList) => {
        if (convexList && Array.isArray(convexList)) {
          const convexNames = new Set(names);
          convexList.forEach((c) => {
            if (Array.isArray(c.data)) {
              c.data.forEach((t: any) => {
                const n = (typeof t === 'string' ? t : t.name || '').trim();
                if (n) convexNames.add(n);
              });
            } else if (c.name) {
              convexNames.add(c.name.trim());
            }
          });
          setSavedCustomTests(Array.from(convexNames));
        }
      })
      .catch(() => {});
  }, [loadSavedCustomTests]);

  // Keep all section templates reactively updated
  useEffect(() => {
    const handleUpdate = (e: any) => {
      setTemplateUpdateTrigger((prev) => prev + 1);
      if (!e.detail?.sectionKey || e.detail.sectionKey === 'tests_requested') {
        loadSavedCustomTests();
      }
    };
    window.addEventListener('cortex_section_templates_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('cortex_section_templates_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadSavedCustomTests]);

  // Dismiss suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(target) &&
        testInputRef.current &&
        !testInputRef.current.contains(target)
      ) {
        setShowTestSuggestions(false);
      }
      if (
        adviceSuggestionsBoxRef.current &&
        !adviceSuggestionsBoxRef.current.contains(target) &&
        adviceInputRef.current &&
        !adviceInputRef.current.contains(target)
      ) {
        setShowAdviceSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Suggestions strictly from real saved tests in DB/templates (no hardcoded prefilled catalogs)
  const testSuggestions = useMemo(() => {
    const q = newTestName.trim().toLowerCase();
    const list: Array<{ name: string; tag: string; data?: any }> = [];
    const seen = new Set<string>();

    // 1. Saved custom test templates directly from localStorage
    try {
      const customTemplates = getSectionCustomTemplates('tests_requested');
      for (const tmpl of customTemplates) {
        if (Array.isArray(tmpl.data) && tmpl.data.length > 0) {
          const tmplKey = `tmpl_${tmpl.name.toLowerCase()}`;
          if (!seen.has(tmplKey)) {
            if (!q || tmpl.name.toLowerCase().includes(q)) {
              seen.add(tmplKey);
              list.push({
                name: tmpl.name,
                tag: 'Saved Template',
                data: tmpl.data,
              });
            }
          }
          for (const t of tmpl.data) {
            const testName = String(typeof t === 'string' ? t : t.name || '').trim();
            const key = testName.toLowerCase();
            if (testName && !seen.has(key)) {
              if (!q || key.includes(q)) {
                seen.add(key);
                list.push({ name: testName, tag: 'Saved Test' });
              }
            }
          }
        } else {
          const testName = (typeof tmpl.data === 'string' && tmpl.data.trim() ? tmpl.data : tmpl.name).trim();
          const key = testName.toLowerCase();
          if (testName && !seen.has(key)) {
            if (!q || key.includes(q) || tmpl.name.toLowerCase().includes(q)) {
              seen.add(key);
              list.push({ name: testName, tag: 'Saved Test' });
            }
          }
        }
      }
    } catch {}

    // 2. Tests from real saved custom tests state (synced from DB)
    for (const name of savedCustomTests) {
      const key = name.trim().toLowerCase();
      if (!seen.has(key)) {
        if (!q || key.includes(q)) {
          seen.add(key);
          list.push({ name: name.trim(), tag: 'Saved Test' });
        }
      }
    }

    // 3. Tests from user-created master templates
    try {
      const allTemplates = getAllTemplates();
      for (const tmpl of allTemplates) {
        if (Array.isArray(tmpl.tests_requested)) {
          for (const t of tmpl.tests_requested) {
            const testName = String(typeof t === 'string' ? t : (t as any).name || '').trim();
            const key = testName.toLowerCase();
            if (testName && !seen.has(key)) {
              if (!q || key.includes(q)) {
                seen.add(key);
                list.push({ name: testName, tag: 'Template' });
              }
            }
          }
        }
      }
    } catch {}

    return list.slice(0, 10);
  }, [newTestName, savedCustomTests, templateUpdateTrigger]);

  // Suggestions strictly from real saved Advice templates (localStorage + master templates)
  const adviceSuggestions = useMemo(() => {
    const q = (advice || '').trim().toLowerCase();
    const list: Array<{ name: string; tag: string; value: string }> = [];
    const seen = new Set<string>();

    // 1. Saved custom advice templates
    try {
      const customAdvice = getSectionCustomTemplates('advice');
      for (const tmpl of customAdvice) {
        const val = typeof tmpl.data === 'string' ? tmpl.data : tmpl.name || '';
        const key = val.trim().toLowerCase();
        if (key && !seen.has(key)) {
          if (!q || key.includes(q) || tmpl.name.toLowerCase().includes(q)) {
            seen.add(key);
            list.push({
              name: tmpl.name,
              value: val,
              tag: 'Saved Template',
            });
          }
        }
      }
    } catch {}

    // 2. Master templates advice
    try {
      const allTemplates = getAllTemplates();
      for (const tmpl of allTemplates) {
        if (tmpl.advice && typeof tmpl.advice === 'string' && tmpl.advice.trim()) {
          const val = tmpl.advice.trim();
          const key = val.toLowerCase();
          if (!seen.has(key)) {
            if (!q || key.includes(q) || tmpl.name.toLowerCase().includes(q)) {
              seen.add(key);
              list.push({
                name: tmpl.name,
                value: val,
                tag: 'Master Template',
              });
            }
          }
        }
      }
    } catch {}

    return list.slice(0, 10);
  }, [advice, templateUpdateTrigger]);

  // Handle selecting a suggested advice (replaces temporary search text cleanly)
  const handleSelectAdviceSuggestion = (item: { name: string; value: string; tag: string }) => {
    const textToInsert = (item.value || item.name || '').trim();
    onUpdateAdvice(textToInsert);
    setShowAdviceSuggestions(false);
  };

  // Handle selecting a suggested test
  const handleSelectSuggestion = (suggested: { name: string; tag: string; data?: any } | string) => {
    if (typeof suggested === 'object' && suggested.data && Array.isArray(suggested.data) && suggested.data.length > 0) {
      const parsed = parseTestsFromTemplate(suggested.data);
      if (parsed.length > 0) {
        setTestsRequested((prev) => {
          const existing = new Set(prev.map((t) => t.name.toLowerCase().trim()));
          const newItems = parsed.filter((t) => !existing.has(t.name.toLowerCase().trim()));
          return [...prev, ...newItems];
        });
      }
    } else {
      const testName = typeof suggested === 'string' ? suggested : suggested.name;
      handleAddTest(testName, newTestByWhen || 'Next Visit');
    }
    setNewTestName('');
    setShowTestSuggestions(false);
  };

  // Add test and AUTO-SAVE into templates & Convex DB (supports multiple comma-separated tests)
  const handleAddTest = (overrideName?: string, overrideByWhen?: string) => {
    const rawName = (overrideName !== undefined ? overrideName : newTestName).trim();
    const byWhen = (overrideByWhen !== undefined ? overrideByWhen : (newTestByWhen || 'Next Visit')).trim();
    if (!rawName) return;

    // Support comma-separated tests: e.g. "CBC, X-Ray Knee, Blood Sugar"
    const testNames = rawName
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (testNames.length === 0) return;

    const now = Date.now();
    const newItems: TestRequestedItem[] = testNames.map((name, idx) => ({
      id: `${now}_${idx}`,
      name,
      by_when: byWhen,
    }));

    setTestsRequested((prev) => [...prev, ...newItems]);

    // Auto-save test so it is remembered in local templates and Convex DB forever
    try {
      testNames.forEach((name) => {
        saveSectionCustomTemplate('tests_requested', name, [{ name, by_when: byWhen }], docCategory);
      });
      setSavedCustomTests((prev) => {
        const set = new Set(prev);
        testNames.forEach((n) => set.add(n));
        return Array.from(set);
      });
    } catch (err) {
      console.warn('Could not auto-save test requested:', err);
    }

    setNewTestName('');
    setShowTestSuggestions(false);
  };

  // Simplified clinical notes: Advice + Tests Requested
  return (
    <div className="space-y-3">
      {/* 1. General Advice */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Left Pill Badge: Advice */}
          <div className="px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-50/90 flex items-center gap-2 shrink-0 select-none shadow-2xs w-full sm:w-52">
            <FileText className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">Advice</span>
          </div>

          {/* Right Pill/Box: Actions + Input + Clear */}
          <div className="relative flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 shadow-2xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            <div className="flex items-center gap-1 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => adviceInputRef.current?.focus()}
                title="Edit Advice"
                className="p-1 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="advice"
                sectionTitle="Advice"
                currentValue={advice}
                category={docCategory}
                align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  onUpdateAdvice(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Prescription Advice"
                className="p-1 rounded hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("advice") : onUpdateAdvice('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" />

            <div className="relative flex-1 flex items-center min-w-0">
              <input
                ref={adviceInputRef}
                type="text"
                value={advice}
                onFocus={() => {
                  setShowAdviceSuggestions(true);
                  setHighlightedAdviceIdx(0);
                }}
                onChange={(e) => {
                  onUpdateAdvice(e.target.value);
                  setShowAdviceSuggestions(true);
                  setHighlightedAdviceIdx(0);
                }}
                onKeyDown={(e) => {
                  if (showAdviceSuggestions && adviceSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedAdviceIdx((prev) => (prev + 1) % adviceSuggestions.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedAdviceIdx((prev) => (prev - 1 + adviceSuggestions.length) % adviceSuggestions.length);
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const item = adviceSuggestions[highlightedAdviceIdx];
                      if (item) {
                        handleSelectAdviceSuggestion(item);
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      setShowAdviceSuggestions(false);
                      return;
                    }
                  }
                }}
                placeholder="General advice for patient (e.g. warm saline rinses, bed rest)..."
                className="w-full bg-transparent border-none outline-none text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400"
              />

              {/* Advice Suggestions Dropdown */}
              {showAdviceSuggestions && adviceSuggestions.length > 0 && (
                <div
                  ref={adviceSuggestionsBoxRef}
                  className="absolute left-0 top-full mt-2 w-full min-w-[280px] sm:min-w-[420px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Suggestions
                    </span>
                    <span className="text-[10px] text-slate-400">↑↓ to navigate • Enter to pick</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                    {adviceSuggestions.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        onClick={() => handleSelectAdviceSuggestion(item)}
                        onMouseEnter={() => setHighlightedAdviceIdx(idx)}
                        className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 transition ${
                          idx === highlightedAdviceIdx
                            ? 'bg-emerald-50 text-emerald-950 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate font-semibold">{cleanTemplateName(item.name)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <div className="w-px h-4 bg-slate-200" />
              <button
                type="button"
                onClick={() => onUpdateAdvice('')}
                title="Clear Advice"
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
        <p className="mt-1.5 px-3 text-[11px] font-medium text-slate-500 flex items-center gap-1">
          <span>*</span> Medicine can be purchased from any medical store and in a generic form also
        </p>
      </div>

      {/* 2. Tests Requested (Auto-suggest + Auto-save) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Left Pill Badge: Tests Requested */}
          <div className="px-3.5 py-2 rounded-xl border border-slate-100 bg-slate-50/90 flex items-center gap-2 shrink-0 select-none shadow-2xs w-full sm:w-52">
            <FlaskConical className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">Tests Requested</span>
            {testsRequested.length > 0 && (
              <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {testsRequested.length}
              </span>
            )}
          </div>

          {/* Right Pill/Box: Actions + Chips + Input + Clear */}
          <div className="relative flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center gap-2 shadow-2xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
            {/* Action Icons: Folder (Templates), Undo */}
            <div className="flex items-center gap-1 text-slate-400 shrink-0">
              <SectionTemplatePicker
                sectionKey="tests_requested"
                sectionTitle="Tests Requested"
                currentValue={
                  testsRequested.length > 0
                    ? testsRequested.map((t) => ({ name: t.name, by_when: t.by_when || 'Next Visit' }))
                    : newTestName.trim()
                    ? [{ name: newTestName.trim(), by_when: newTestByWhen || 'Next Visit' }]
                    : []
                }
                category={docCategory}
                align="right"
                onApplyPreset={(val) => {
                  const parsed = parseTestsFromTemplate(val);
                  if (parsed.length > 0) {
                    setTestsRequested((prev) => {
                      const existingNames = new Set(prev.map((t) => t.name.toLowerCase().trim()));
                      const newItems = parsed.filter((t) => !existingNames.has(t.name.toLowerCase().trim()));
                      if (prev.length === 0) return parsed;
                      return [...prev, ...newItems];
                    });
                  }
                }}
              />
              <button
                type="button"
                title="Restore Previous Prescription Tests"
                className="p-1 rounded hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("investigations") : setTestsRequested([])}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" />

            {/* Test Chips */}
            {testsRequested.map((t, idx) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold shrink-0 group transition hover:bg-emerald-100 shadow-2xs"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-bold text-slate-800">{t.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200 font-medium">
                  By: {t.by_when || 'Next Visit'}
                </span>
                <button
                  type="button"
                  onClick={() => setTestsRequested((prev) => prev.filter((x) => x.id !== t.id))}
                  title={`Remove ${t.name}`}
                  className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer p-0.5 transition"
                >
                  ✕
                </button>
              </span>
            ))}

            {/* Inline Input with By When & Auto-Suggest */}
            <div className="relative flex-1 min-w-[240px] flex items-center gap-1.5">
              <input
                ref={testInputRef}
                type="text"
                value={newTestName}
                onFocus={() => {
                  setShowTestSuggestions(true);
                  setHighlightedSuggestionIdx(0);
                }}
                onChange={(e) => {
                  setNewTestName(e.target.value);
                  setShowTestSuggestions(true);
                  setHighlightedSuggestionIdx(0);
                }}
                onKeyDown={(e) => {
                  if (showTestSuggestions && testSuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedSuggestionIdx((prev) => (prev + 1) % testSuggestions.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedSuggestionIdx((prev) => (prev - 1 + testSuggestions.length) % testSuggestions.length);
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (testSuggestions[highlightedSuggestionIdx]) {
                        handleSelectSuggestion(testSuggestions[highlightedSuggestionIdx]);
                      } else {
                        handleAddTest();
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      setShowTestSuggestions(false);
                      return;
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTest();
                  }
                }}
                placeholder={testsRequested.length === 0 ? "Add test name (or comma-separated e.g. CBC, X-Ray)..." : "Add next test..."}
                className="flex-1 min-w-[130px] bg-transparent border-none outline-none text-slate-800 text-xs sm:text-sm font-medium placeholder:text-slate-400"
              />

              {/* By When Input / Dropdown */}
              <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200/90 rounded-lg px-2 py-0.5 focus-within:border-emerald-500 focus-within:bg-white transition">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">By:</span>
                <input
                  ref={byWhenInputRef}
                  type="text"
                  list="test-by-when-presets"
                  value={newTestByWhen}
                  onChange={(e) => setNewTestByWhen(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTest();
                    }
                  }}
                  placeholder="Next Visit"
                  className="w-20 sm:w-24 text-xs font-semibold text-slate-700 bg-transparent outline-none border-none py-0.5"
                />
                <datalist id="test-by-when-presets">
                  <option value="Next Visit" />
                  <option value="Immediate / Today" />
                  <option value="Tomorrow" />
                  <option value="In 3 Days" />
                  <option value="Before Monday" />
                  <option value="Before Next Consult" />
                </datalist>
              </div>

              {/* Add Button */}
              <button
                type="button"
                onClick={() => handleAddTest()}
                title="Add Test (or press Enter)"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>

              {/* Suggestions Dropdown */}
              {showTestSuggestions && testSuggestions.length > 0 && (
                <div
                  ref={suggestionsBoxRef}
                  className="absolute left-0 top-full mt-2 w-full min-w-[280px] sm:min-w-[360px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Suggestions
                    </span>
                    <span className="text-[10px] text-slate-400">↑↓ to navigate • Enter to pick</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                    {testSuggestions.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        onClick={() => handleSelectSuggestion(item)}
                        onMouseEnter={() => setHighlightedSuggestionIdx(idx)}
                        className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 transition ${
                          idx === highlightedSuggestionIdx
                            ? 'bg-emerald-50 text-emerald-950 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Clear Button */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <div className="w-px h-4 bg-slate-200" />
              <button
                type="button"
                onClick={() => setTestsRequested([])}
                title="Clear Tests Requested"
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 1. Dr Notes & Quick Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dr Notes */}
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
              <button
                type="button"
                title="Edit Dr Notes"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="dr_notes"
              sectionTitle="Dr Notes"
              currentValue={drNotes}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  setDrNotes(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Doctor Notes"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("dr_notes") : setDrNotes('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={drNotes}
            onChange={(e) => setDrNotes(e.target.value)}
            minRows={1}
            placeholder="Doctor private remarks / internal clinical notes (e.g. Patient reluctant for surgery, follow up in OPD personally)..."
            className="w-full p-2.5 text-xs sm:text-sm leading-relaxed border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white outline-none"
          />
        </div>

        {/* Quick Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Quick Notes
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Quick Notes"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="quick_notes"
              sectionTitle="Quick Notes"
              currentValue={quickNotes}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  setQuickNotes(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Quick Notes"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("quick_notes") : setQuickNotes('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            minRows={1}
            placeholder="Brief clinical quick notes..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* 2. Procedure Advice & Advice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Procedure Advice */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Procedure Advice
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Procedure Advice"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="procedure_done"
              sectionTitle="Procedure Advice"
              currentValue={procedureAdvice}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text =
                    typeof val === 'string'
                      ? val
                      : val.name
                      ? `Procedure advice: ${val.name}`
                      : '';
                  setProcedureAdvice(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Procedure Advice"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("procedure_advice") : setProcedureAdvice('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={procedureAdvice}
            onChange={(e) => setProcedureAdvice(e.target.value)}
            minRows={1}
            placeholder="Pre/post procedure advice..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* General Advice */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Advice
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Advice"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="advice"
              sectionTitle="Advice"
              currentValue={advice}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  onUpdateAdvice(text.trim());
                }}
              />
              <button
                type="button"
                title="Reset / Clear Advice"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => onUpdateAdvice('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={advice}
            onChange={(e) => onUpdateAdvice(e.target.value)}
            minRows={1}
            placeholder="General advice for patient (e.g. warm saline rinses, drink plenty of fluids)..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          {!(/gyne|shillpa|shilpa|obs|maternity/i.test(selectedDoctorName || '')) && (
            <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
              <span>*</span> Prescription is valid for 30 days only
            </p>
          )}
          <p className="mt-0.5 text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <span>*</span> Medicine can be purchased from any medical store and in a generic form also
          </p>
        </div>
      </div>

      {/* 3. Tests Requested */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            Tests Requested
          </label>
          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              title="Edit Tests Requested"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <SectionTemplatePicker
              sectionKey="tests_requested"
              sectionTitle="Tests Requested"
              currentValue={
                testsRequested.length > 0
                  ? testsRequested.map((t) => ({ name: t.name, by_when: t.by_when || 'Next Visit' }))
                  : newTestName.trim()
                  ? [{ name: newTestName.trim(), by_when: newTestByWhen || 'Next Visit' }]
                  : []
              }
              category={docCategory}
              align="right"
              onApplyPreset={(val) => {
                const parsed = parseTestsFromTemplate(val);
                if (parsed.length > 0) {
                  setTestsRequested((prev) => {
                    const existingNames = new Set(prev.map((t) => t.name.toLowerCase().trim()));
                    const newItems = parsed.filter((t) => !existingNames.has(t.name.toLowerCase().trim()));
                    if (prev.length === 0) return parsed;
                    return [...prev, ...newItems];
                  });
                }
              }}
            />
            <button
              type="button"
              title="Reset / Clear Tests"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              onClick={() => setTestsRequested([])}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
          <div className="grid grid-cols-12 bg-slate-50 text-slate-600 font-semibold py-2 px-3 border-b border-slate-200">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Tests Requested</div>
            <div className="col-span-4">By When</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {testsRequested.map((t, idx) => (
            <div
              key={t.id}
              className="grid grid-cols-12 items-center py-2 px-3 border-b border-slate-100 hover:bg-slate-50/50"
            >
              <div className="col-span-1 text-slate-400">{idx + 1}</div>
              <div className="col-span-6 font-semibold text-slate-800">{t.name}</div>
              <div className="col-span-4 text-slate-600">{t.by_when || '—'}</div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => setTestsRequested((prev) => prev.filter((x) => x.id !== t.id))}
                  className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTest();
                  }
                }}
                placeholder="Add Tests (e.g. CBC, Blood Sugar, X-Ray Knee)..."
                className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white outline-none"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                value={newTestByWhen}
                onChange={(e) => setNewTestByWhen(e.target.value)}
                placeholder="e.g. Next Visit or Before Monday"
                className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white outline-none"
              />
            </div>
            <div className="col-span-1 text-right">
              <button
                type="button"
                onClick={() => handleAddTest()}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs cursor-pointer shadow-xs"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Referred To */}
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
                className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Speciality</label>
            <select
              value={referralSpeciality}
              onChange={(e) => setReferralSpeciality(e.target.value)}
              className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 bg-white outline-none cursor-pointer"
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
              className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={referralEmail}
              onChange={(e) => setReferralEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={() => {
                if (referralDocName.trim()) {
                  alert(`Referral to Dr. ${referralDocName} (${referralSpeciality}) noted.`);
                }
              }}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 text-xs cursor-pointer transition"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 5. Diet and Exercise & Investigations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Diet & Exercise */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Diet and Exercise
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Diet and Exercise"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="diet_exercise"
              sectionTitle="Diet & Exercise"
              currentValue={dietExercise}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  setDietExercise(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Diet & Exercise"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("diet_exercise") : setDietExercise('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={dietExercise}
            onChange={(e) => setDietExercise(e.target.value)}
            minRows={1}
            placeholder="Soft diet, avoid sugary snacks, 30 min daily walk..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Investigations */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Investigations
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Investigations"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="investigations"
              sectionTitle="Investigations"
              currentValue={investigationText}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  setInvestigationText(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Investigations"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("investigations") : setInvestigationText('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={investigationText}
            onChange={(e) => setInvestigationText(e.target.value)}
            minRows={1}
            placeholder="e.g. OPG, IOPAR wrt 16, CBCT, Blood sugar..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* 6. Past Medication & Examinations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Past Medication */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800">Past Medication</label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Past Medication"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="past_medications"
              sectionTitle="Past Medication"
              currentValue={pastMedication}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  setPastMedication(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Past Medication"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("past_medications") : setPastMedication('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={pastMedication}
            onChange={(e) => setPastMedication(e.target.value)}
            minRows={1}
            placeholder="Past Medications..."
            className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 outline-none"
          />
        </div>

        {/* Systemic Examination */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800">Systemic Examination</label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Systemic Examination"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="systemic_examinations"
              sectionTitle="Systemic Examination"
              currentValue={systemicExam}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  setSystemicExam(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous Systemic Examination"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("systemic_examinations") : setSystemicExam('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={systemicExam}
            onChange={(e) => setSystemicExam(e.target.value)}
            minRows={1}
            placeholder="CVS, RS, CNS findings..."
            className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 outline-none"
          />
        </div>

        {/* General Examinations */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800">General Examinations</label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit General Examinations"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
              sectionKey="general_examinations"
              sectionTitle="General Examinations"
              currentValue={generalExam}
              category={docCategory}
              align="right"
                onApplyPreset={(val) => {
                  const text = typeof val === 'string' ? val : JSON.stringify(val);
                  setGeneralExam(text.trim());
                }}
              />
              <button
                type="button"
                title="Restore Previous General Examinations"
                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRestorePreviousNote ? onRestorePreviousNote("general_examinations") : setGeneralExam('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <AutoResizeTextarea
            value={generalExam}
            onChange={(e) => setGeneralExam(e.target.value)}
            minRows={1}
            placeholder="Pallor, Icterus, Cyanosis, Clubbing, Lymphadenopathy, Edema..."
            className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

