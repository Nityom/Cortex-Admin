'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  X,
  Search,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  CLINICAL_SECTION_PRESETS,
  ClinicalSectionPreset,
  getSectionCustomTemplates,
  saveSectionCustomTemplate,
  deleteSectionCustomTemplate,
  fetchSectionTemplatesFromConvex,
  cleanTemplateName,
} from '@/services/clinicalSectionPresets';

interface SectionTemplatePickerProps {
  sectionKey: string;
  sectionTitle: string;
  currentValue?: any;
  onApplyPreset: (data: any) => void;
  className?: string;
  align?: 'left' | 'right';
  category?: string;
}

export default function SectionTemplatePicker({
  sectionKey,
  sectionTitle,
  currentValue,
  onApplyPreset,
  className = '',
  align = 'right',
  category,
}: SectionTemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'saved' | 'presets'>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [directContentInput, setDirectContentInput] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<ClinicalSectionPreset[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverAlign, setPopoverAlign] = useState<'left' | 'right'>(align);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 384;
      const spaceRight = window.innerWidth - rect.left;
      const spaceLeft = rect.right;

      // Prevent clipping on right screen boundary
      if (spaceRight < popoverWidth + 24) {
        setPopoverAlign('right');
      } else if (spaceLeft < popoverWidth + 24) {
        setPopoverAlign('left');
      } else {
        setPopoverAlign(align);
      }
    }
  }, [isOpen, align]);

  const presets = CLINICAL_SECTION_PRESETS[sectionKey] || [];

  const loadSavedTemplates = React.useCallback(() => {
    const list = getSectionCustomTemplates(sectionKey);
    setSavedTemplates(list);
    // Also sync from Convex DB in background
    fetchSectionTemplatesFromConvex(sectionKey)
      .then((updated) => {
        if (updated && Array.isArray(updated)) {
          setSavedTemplates(updated);
        }
      })
      .catch(() => {});
  }, [sectionKey]);

  useEffect(() => {
    if (isOpen) {
      loadSavedTemplates();
    }
  }, [isOpen, loadSavedTemplates]);

  // Keep templates synced reactively when any section updates
  useEffect(() => {
    const handleTemplateUpdate = (e: any) => {
      if (!e.detail?.sectionKey || e.detail.sectionKey === sectionKey) {
        loadSavedTemplates();
      }
    };
    window.addEventListener('cortex_section_templates_updated', handleTemplateUpdate);
    window.addEventListener('storage', handleTemplateUpdate);
    return () => {
      window.removeEventListener('cortex_section_templates_updated', handleTemplateUpdate);
      window.removeEventListener('storage', handleTemplateUpdate);
    };
  }, [sectionKey, loadSavedTemplates]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const isCurrentValueEmpty = () => {
    if (currentValue === null || currentValue === undefined) return true;
    if (typeof currentValue === 'string') return currentValue.trim() === '';
    if (Array.isArray(currentValue)) return currentValue.length === 0;
    if (typeof currentValue === 'object') return Object.keys(currentValue).length === 0;
    return false;
  };

  const handleApply = (preset: ClinicalSectionPreset, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onApplyPreset(preset.data);
    showToast(`Applied "${preset.name}"`);
    setSearchQuery('');
    setTimeout(() => {
      setIsOpen(false);
    }, 350);
  };

  const handleQuickSaveWithName = (name: string, customData?: any) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Please enter a template name');
      return;
    }
    const dataToSave =
      customData !== undefined
        ? customData
        : !isCurrentValueEmpty()
        ? currentValue
        : directContentInput.trim();

    if (
      !dataToSave ||
      (typeof dataToSave === 'string' && !dataToSave.trim()) ||
      (Array.isArray(dataToSave) && dataToSave.length === 0)
    ) {
      showToast(`Current ${sectionTitle} is empty. Enter instructions below or in form first.`);
      return;
    }
    const saved = saveSectionCustomTemplate(sectionKey, trimmed, dataToSave, category || 'General');
    // Instantly update component state so the item shows immediately
    setSavedTemplates((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
    setNewTemplateName('');
    setDirectContentInput('');
    setActiveTab('saved');
    showToast(`Saved "${saved.name}" to templates!`);
  };

  const handleSaveCurrent = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleQuickSaveWithName(newTemplateName || searchQuery);
  };

  const handleDeleteSaved = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (confirm(`Delete template "${name}"?`)) {
      deleteSectionCustomTemplate(sectionKey, id);
      loadSavedTemplates();
      showToast(`Deleted "${name}"`);
    }
  };

  const filteredSaved = savedTemplates
    .filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (category) {
        const catLower = category.toLowerCase();
        const aMatches = a.category && a.category.toLowerCase().includes(catLower);
        const bMatches = b.category && b.category.toLowerCase().includes(catLower);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }
      return a.name.localeCompare(b.name);
    });

  const filteredPresets = presets.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`${sectionTitle} Templates`}
        className={`p-1 rounded transition cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'text-emerald-600 bg-emerald-50 ring-1 ring-emerald-300'
            : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
        }`}
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${popoverAlign === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl z-[999] p-3 text-xs animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{sectionTitle} Templates</span>
              {category && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                  {category}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Close template menu"
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-2 p-1.5 bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded border border-emerald-200 flex items-center gap-1 animate-pulse">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              placeholder={`Search ${sectionTitle.toLowerCase()} templates...`}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Quick Save Current as Template Box (Div, never nested form) */}
          <div className="mb-2 p-2 bg-emerald-50/70 border border-emerald-200/90 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Save Current {sectionTitle} As Template
              </label>
              {!isCurrentValueEmpty() && (
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded">
                  Ready to Save
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveCurrent(e);
                  }
                }}
                placeholder={`Name (e.g. ${sectionTitle} Protocol)`}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveCurrent(e);
                }}
                title={`Save current ${sectionTitle} content as template`}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-xs whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
            {isCurrentValueEmpty() && (
              <div className="mt-1.5">
                <textarea
                  value={directContentInput}
                  onChange={(e) => setDirectContentInput(e.target.value)}
                  placeholder={`Or type ${sectionTitle.toLowerCase()} instructions here to save as template...`}
                  rows={2}
                  className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-md text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed resize-none"
                />
              </div>
            )}
          </div>

          {/* Template List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
            {searchQuery.trim() && filteredSaved.length === 0 && (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-center space-y-2 my-1">
                <p className="text-[11px] text-amber-900 font-semibold">
                  No template found matching <span className="underline decoration-amber-400 font-bold">"{searchQuery.trim()}"</span>
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickSaveWithName(searchQuery.trim())}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save current {sectionTitle} as "{searchQuery.trim()}"</span>
                </button>
              </div>
            )}

            {filteredSaved.length > 0 ? (
              filteredSaved.map((saved) => (
                <div
                  key={saved.id}
                  className="p-2 border border-slate-100 hover:border-emerald-300 rounded-lg bg-slate-50/60 hover:bg-emerald-50/40 transition flex items-center justify-between gap-2 group"
                >
                  <div
                    onClick={() => handleApply(saved)}
                    title={`Click to apply ${saved.name}`}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 text-[11px] group-hover:text-emerald-900 block truncate">
                        {cleanTemplateName(saved.name)}
                      </span>
                      {saved.category && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          {saved.category}
                        </span>
                      )}
                    </div>
                    {saved.description && (
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{saved.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSaved(saved.id, saved.name);
                    }}
                    title={`Delete template "${saved.name}"`}
                    className="text-slate-300 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : !searchQuery.trim() ? (
              <div className="py-4 text-center text-slate-400 italic text-[11px]">
                No templates saved yet. Fill out {sectionTitle} and save above to store in database.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
