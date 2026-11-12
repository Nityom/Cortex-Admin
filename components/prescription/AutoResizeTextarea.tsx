'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Sparkles, Plus, Check, BookmarkPlus, X } from 'lucide-react';
import {
  CLINICAL_SECTION_PRESETS,
  ClinicalSectionPreset,
  getSectionCustomTemplates,
  saveSectionCustomTemplate,
  fetchSectionTemplatesFromConvex,
  cleanTemplateName,
} from '@/services/clinicalSectionPresets';

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  sectionKey?: string;
  sectionTitle?: string;
  category?: string;
  onApplyTemplate?: (templateData: any) => void;
  showSaveButton?: boolean;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  (
    {
      value,
      onChange,
      className = '',
      minRows = 1,
      rows = 1,
      style,
      onInput,
      onFocus,
      onBlur,
      onKeyDown,
      sectionKey,
      sectionTitle,
      category,
      onApplyTemplate,
      showSaveButton = true,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const [allTemplates, setAllTemplates] = useState<ClinicalSectionPreset[]>([]);
    const [matchingSuggestions, setMatchingSuggestions] = useState<ClinicalSectionPreset[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Auto-resize logic
    const adjustHeight = () => {
      const textarea = internalRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 38)}px`;
    };

    useEffect(() => {
      adjustHeight();
    }, [value]);

    // Load templates for sectionKey
    const loadTemplates = useCallback(() => {
      if (!sectionKey) return;
      const custom = getSectionCustomTemplates(sectionKey);
      const presets = CLINICAL_SECTION_PRESETS[sectionKey] || [];
      const combined = [...custom, ...presets];
      setAllTemplates(combined);

      // Background sync from Convex
      fetchSectionTemplatesFromConvex(sectionKey)
        .then((convexCustom) => {
          if (convexCustom && Array.isArray(convexCustom)) {
            setAllTemplates([...convexCustom, ...presets]);
          }
        })
        .catch(() => {});
    }, [sectionKey]);

    useEffect(() => {
      if (sectionKey) {
        loadTemplates();
      }
    }, [sectionKey, loadTemplates]);

    // Filter templates as user types
    useEffect(() => {
      if (!sectionKey || allTemplates.length === 0 || !isFocused) {
        setMatchingSuggestions([]);
        return;
      }

      const strVal = String(value || '');
      const trimmed = strVal.trim();
      if (!trimmed) {
        setMatchingSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Check against current active line or full text
      const lines = strVal.split('\n');
      const lastLine = lines[lines.length - 1].trim();
      const query = (lastLine.length >= 2 ? lastLine : trimmed).toLowerCase();

      if (query.length < 2) {
        setMatchingSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const filtered = allTemplates.filter((t) => {
        const nameMatch = t.name.toLowerCase().includes(query);
        const dataStr =
          typeof t.data === 'string'
            ? t.data.toLowerCase()
            : Array.isArray(t.data)
            ? t.data.map((x: any) => (x.name || x.complaint || JSON.stringify(x)).toLowerCase()).join(' ')
            : JSON.stringify(t.data).toLowerCase();
        const contentMatch = dataStr.includes(query);
        return nameMatch || contentMatch;
      });

      setMatchingSuggestions(filtered.slice(0, 6));
      setShowSuggestions(filtered.length > 0);
      setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    }, [value, sectionKey, allTemplates, isFocused]);

    // Click outside listener
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowSuggestions(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    };

    // Apply template suggestion
    const handleSelectSuggestion = (item: ClinicalSectionPreset) => {
      if (onApplyTemplate) {
        onApplyTemplate(item.data);
      } else {
        const textToInsert =
          typeof item.data === 'string'
            ? item.data
            : Array.isArray(item.data)
            ? item.data.map((x: any) => x.name || x.complaint || JSON.stringify(x)).join(', ')
            : JSON.stringify(item.data);

        if (internalRef.current) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
          )?.set;
          nativeSetter?.call(internalRef.current, textToInsert);
          const ev = new Event('input', { bubbles: true });
          internalRef.current.dispatchEvent(ev);
        }
      }

      setShowSuggestions(false);
      showToast(`Applied "${cleanTemplateName(item.name)}"`);
    };

    // Quick Save Current Typed Content as Section Template
    const handleQuickSaveCurrent = (customName?: string) => {
      const textToSave = String(value || '').trim();
      if (!textToSave) {
        showToast('Please type some text before saving as template.');
        return;
      }
      if (!sectionKey) return;

      const title = sectionTitle || sectionKey.replace(/_/g, ' ');
      const suggestedName =
        customName ||
        (textToSave.length > 35 ? textToSave.slice(0, 32) + '...' : textToSave);

      const enteredName = prompt(`Save as ${title} template:`, suggestedName);
      if (!enteredName || !enteredName.trim()) return;

      const saved = saveSectionCustomTemplate(
        sectionKey,
        enteredName.trim(),
        textToSave,
        category || 'General'
      );

      loadTemplates();
      showToast(`Saved "${saved.name}" to templates!`);
      setShowSuggestions(false);
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && matchingSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < matchingSuggestions.length - 1 ? prev + 1 : 0));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : matchingSuggestions.length - 1));
          return;
        }
        if (e.key === 'Enter' && matchingSuggestions.length > 0) {
          e.preventDefault();
          const target = highlightedIndex >= 0 ? matchingSuggestions[highlightedIndex] : matchingSuggestions[0];
          handleSelectSuggestion(target);
          return;
        }
        if (e.key === 'Tab' && matchingSuggestions.length > 0) {
          e.preventDefault();
          const target = highlightedIndex >= 0 ? matchingSuggestions[highlightedIndex] : matchingSuggestions[0];
          handleSelectSuggestion(target);
          return;
        }
        if (e.key === 'Escape') {
          setShowSuggestions(false);
          return;
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    return (
      <div ref={containerRef} className="relative w-full">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute right-2 -top-8 z-50 bg-emerald-700 text-white px-2.5 py-1 rounded-md shadow-lg text-[11px] font-bold flex items-center gap-1 animate-in fade-in">
            <Check className="w-3 h-3 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
        )}

        <textarea
          ref={internalRef}
          value={value}
          onChange={onChange}
          rows={minRows || rows}
          onFocus={(e) => {
            setIsFocused(true);
            if (sectionKey) loadTemplates();
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          onInput={(e) => {
            adjustHeight();
            if (onInput) onInput(e);
          }}
          onKeyDown={handleKeyDownInternal}
          style={{
            ...style,
            resize: 'none',
            overflow: 'hidden',
          }}
          className={`w-full transition-[height] duration-75 field-sizing-content ${className}`}
          {...props}
        />

        {/* Floating Auto-suggestions Dropdown */}
        {showSuggestions && matchingSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
            <div className="px-3 py-1.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-[11px] font-bold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Suggestions (Enter to apply)
              </span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowSuggestions(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {matchingSuggestions.map((item, idx) => {
                const isSelected = highlightedIndex === idx;
                const snippet =
                  typeof item.data === 'string'
                    ? item.data
                    : Array.isArray(item.data)
                    ? item.data.map((x: any) => x.name || x.complaint || JSON.stringify(x)).join(', ')
                    : JSON.stringify(item.data);

                return (
                  <div
                    key={item.id || idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(item);
                    }}
                    className={`px-3 py-2 cursor-pointer transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {cleanTemplateName(item.name)}
                      </span>
                      {item.category && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200 shrink-0">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                      Apply ↵
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick 1-click Save Action */}
            {sectionKey && showSaveButton && String(value || '').trim().length >= 3 && (
              <div className="p-2 bg-slate-50/90 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600 font-medium truncate">
                  Like this text? Save as reusable template
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleQuickSaveCurrent();
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" /> Save as Template
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';
export default AutoResizeTextarea;
