'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Check, Loader2, Search, Sparkles, X, ChevronDown } from 'lucide-react';
import {
  saveMultipleDiagnoses,
  saveDiagnosis,
  getDiagnosisSuggestions,
  autoSavePrescriptionDiagnosis,
} from '@/services/prescription';

interface DiagnosisSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectDiagnosisRow?: (diagnosis: string) => void;
  prescriptionId?: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function DiagnosisSearchInput({
  value,
  onChange,
  onSelectDiagnosisRow,
  prescriptionId,
  placeholder = 'Type diagnosis here (e.g. Dental Caries wrt 16, Closed Fracture, Acute Pulpitis)...',
  className = '',
  disabled = false,
}: DiagnosisSearchInputProps) {
  const [text, setText] = useState(value || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeQuery, setActiveQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef<string>(value || '');

  // Keep internal text synced with parent value if changed externally
  useEffect(() => {
    setText(value || '');
  }, [value]);

  // Initial fetch of popular/recent diagnoses for autocomplete
  const loadSuggestions = useCallback(async (query?: string) => {
    try {
      const list = await getDiagnosisSuggestions(query, 30);
      if (list && list.length > 0) {
        setSuggestions(list);
      }
    } catch (err) {
      console.warn('Could not load diagnosis suggestions:', err);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Extract the active word/phrase being typed around the cursor position
  const getActiveSegment = useCallback((fullText: string, cursorPosition: number) => {
    const textBeforeCursor = fullText.slice(0, cursorPosition);
    // Find last line break or separator before cursor
    const lastLineBreak = Math.max(
      textBeforeCursor.lastIndexOf('\n'),
      textBeforeCursor.lastIndexOf(','),
      textBeforeCursor.lastIndexOf(';')
    );
    const segment = lastLineBreak === -1 ? textBeforeCursor : textBeforeCursor.slice(lastLineBreak + 1);
    return segment.trim();
  }, []);

  // Filter suggestions based on active query
  const filteredSuggestions = useMemo(() => {
    const q = activeQuery.toLowerCase().trim();
    if (!q) {
      return suggestions.slice(0, 10);
    }
    return suggestions
      .filter((item) => item.toLowerCase().includes(q))
      .sort((a, b) => {
        const aName = a.toLowerCase();
        const bName = b.toLowerCase();
        const aExact = aName === q;
        const bExact = bName === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aName.localeCompare(bName);
      })
      .slice(0, 12);
  }, [activeQuery, suggestions]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredSuggestions]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-save logic
  const triggerAutoSave = useCallback(
    async (textToSave: string) => {
      const trimmed = textToSave.trim();
      if (!trimmed || trimmed === lastSavedValueRef.current) {
        return;
      }

      setSaveStatus('saving');

      try {
        // 1. Split into individual diagnosis terms (by line or comma)
        const parts = trimmed
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 2);

        // 2. Auto-save diagnosis terms to Convex master catalog
        if (parts.length > 0) {
          await saveMultipleDiagnoses(parts);
        }

        // 3. If editing an existing prescription, auto-save diagnosis field in prescription doc
        if (prescriptionId && prescriptionId !== 'undefined' && prescriptionId !== 'null' && !prescriptionId.startsWith('TMP-')) {
          await autoSavePrescriptionDiagnosis(prescriptionId, trimmed);
        }

        // 4. Save to local draft storage
        try {
          localStorage.setItem('cortex_diagnosis_draft', trimmed);
        } catch {
          // ignore localStorage errors
        }

        lastSavedValueRef.current = trimmed;
        setSaveStatus('saved');

        // Refresh suggestions list to include newly auto-saved diagnoses
        loadSuggestions();

        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2500);
      } catch (err) {
        console.error('Auto-save diagnosis failed:', err);
        setSaveStatus('idle');
      }
    },
    [prescriptionId, loadSuggestions]
  );

  // Debounced auto-save on typing (750ms)
  const scheduleAutoSave = useCallback(
    (newText: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        triggerAutoSave(newText);
      }, 750);
    },
    [triggerAutoSave]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setText(val);
    onChange(val);

    const segment = getActiveSegment(val, cursor);
    setActiveQuery(segment);
    setIsOpen(true);

    scheduleAutoSave(val);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const newText = text ? `${text}\n${suggestion}` : suggestion;
      setText(newText);
      onChange(newText);
      triggerAutoSave(newText);
      setIsOpen(false);
      return;
    }

    const cursor = textarea.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);

    // Find where the active segment started
    const lastLineBreak = Math.max(
      textBeforeCursor.lastIndexOf('\n'),
      textBeforeCursor.lastIndexOf(','),
      textBeforeCursor.lastIndexOf(';')
    );

    const prefix = lastLineBreak === -1 ? '' : textBeforeCursor.slice(0, lastLineBreak + 1);
    const separator = lastLineBreak !== -1 && textBeforeCursor[lastLineBreak] === ',' ? ' ' : '';

    const newText = `${prefix}${separator}${suggestion}${textAfterCursor.startsWith('\n') || textAfterCursor.startsWith(',') ? '' : ''}${textAfterCursor}`;

    setText(newText);
    onChange(newText);
    setIsOpen(false);
    saveDiagnosis(suggestion);
    triggerAutoSave(newText);
    onSelectDiagnosisRow?.(suggestion);

    // Reposition cursor right after the inserted suggestion
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = (prefix + separator + suggestion).length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && e.altKey) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
    } else if (e.key === 'Tab' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Flush pending auto-save immediately on blur
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    triggerAutoSave(text);
  };

  const handleClear = () => {
    setText('');
    onChange('');
    setIsOpen(false);
    if (prescriptionId) {
      autoSavePrescriptionDiagnosis(prescriptionId, '');
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      {/* Header Info & Auto-save status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Diagnosis Findings / Conditions
          </label>
          {/* Live Auto-save badge */}
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 animate-pulse border border-blue-200">
              <Loader2 className="w-3 h-3 animate-spin" />
              Auto-saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all duration-300">
              <Check className="w-3 h-3" />
              Auto-saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Type to search suggestions • Auto-saves as you write
          </span>
          {text && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 font-medium px-1.5 py-0.5 rounded hover:bg-red-50 transition"
              title="Clear diagnosis"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Textarea with Auto-complete */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            const cursor = textareaRef.current?.selectionStart || text.length;
            setActiveQuery(getActiveSegment(text, cursor));
            setIsOpen(true);
          }}
          onBlur={handleBlur}
          disabled={disabled}
          rows={4}
          placeholder={placeholder}
          className="block w-full min-h-[105px] p-4 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base leading-relaxed text-gray-900 bg-white transition disabled:bg-slate-50 disabled:cursor-not-allowed"
        />

        {/* Indicator icon */}
        <div className="absolute right-3 top-3.5 flex items-center gap-1.5 text-slate-400 pointer-events-none">
          <Sparkles className="w-4 h-4 text-blue-500/70" />
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-400" />
                Suggestions from saved diagnoses
              </span>
              <span>Use ↑↓ keys and Enter / click to insert</span>
            </div>

            <ul className="py-1">
              {filteredSuggestions.map((suggestion, idx) => {
                const isSelected = idx === highlightedIndex;
                const matchIndex = activeQuery
                  ? suggestion.toLowerCase().indexOf(activeQuery.toLowerCase().trim())
                  : -1;

                return (
                  <li
                    key={`${suggestion}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Keep textarea focus
                      handleSelectSuggestion(suggestion);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2 text-sm cursor-pointer flex items-center justify-between transition ${
                      isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-blue-500 text-xs">🩺</span>
                      {matchIndex >= 0 && activeQuery ? (
                        <span>
                          {suggestion.slice(0, matchIndex)}
                          <strong className="text-blue-600 underline font-semibold">
                            {suggestion.slice(matchIndex, matchIndex + activeQuery.trim().length)}
                          </strong>
                          {suggestion.slice(matchIndex + activeQuery.trim().length)}
                        </span>
                      ) : (
                        <span>{suggestion}</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-normal">
                      Insert
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Quick Suggestions presets for 1-click addition */}
      
    </div>
  );
}
