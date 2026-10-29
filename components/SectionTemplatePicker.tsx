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
} from '@/services/clinicalSectionPresets';

interface SectionTemplatePickerProps {
  sectionKey: string;
  sectionTitle: string;
  currentValue?: any;
  onApplyPreset: (data: any) => void;
  className?: string;
  align?: 'left' | 'right';
}

export default function SectionTemplatePicker({
  sectionKey,
  sectionTitle,
  currentValue,
  onApplyPreset,
  className = '',
  align = 'left',
}: SectionTemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'saved'>('presets');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<ClinicalSectionPreset[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const presets = CLINICAL_SECTION_PRESETS[sectionKey] || [];

  const loadSavedTemplates = React.useCallback(() => {
    const list = getSectionCustomTemplates(sectionKey);
    setSavedTemplates(list);
  }, [sectionKey]);

  useEffect(() => {
    if (isOpen) {
      loadSavedTemplates();
    }
  }, [isOpen, loadSavedTemplates]);

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

  const handleApply = (preset: ClinicalSectionPreset) => {
    onApplyPreset(preset.data);
    showToast(`Applied "${preset.name}"`);
    setTimeout(() => {
      setIsOpen(false);
    }, 400);
  };

  const handleQuickSaveWithName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Please enter a template name');
      return;
    }
    if (isCurrentValueEmpty()) {
      showToast(`Current ${sectionTitle} is empty. Enter details first.`);
      return;
    }
    const saved = saveSectionCustomTemplate(sectionKey, trimmed, currentValue);
    loadSavedTemplates();
    setNewTemplateName('');
    setActiveTab('saved');
    showToast(`Saved "${saved.name}" to templates!`);
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuickSaveWithName(newTemplateName || searchQuery);
  };

  const handleDeleteSaved = (id: string, name: string) => {
    if (confirm(`Delete template "${name}"?`)) {
      deleteSectionCustomTemplate(sectionKey, id);
      loadSavedTemplates();
      showToast(`Deleted "${name}"`);
    }
  };

  const filteredPresets = presets.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  const filteredSaved = savedTemplates.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q);
  });

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`${sectionTitle} Templates & Presets`}
        className={`p-1 rounded transition cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'text-teal-600 bg-teal-50 ring-1 ring-teal-300'
            : 'text-slate-400 hover:text-teal-600 hover:bg-slate-100'
        }`}
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl z-[999] p-3 text-xs animate-in fade-in zoom-in-95 duration-100`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>{sectionTitle} Templates</span>
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
              placeholder={`Search ${sectionTitle.toLowerCase()} templates...`}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          {/* Quick Save Current as Template Form (Docked at TOP, not bottom) */}
          <form onSubmit={handleSaveCurrent} className="mb-2 p-2 bg-teal-50/70 border border-teal-200/90 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-600" />
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
                placeholder={
                  searchQuery.trim()
                    ? `Save as "${searchQuery.trim()}"...`
                    : `Template name (e.g. My ${sectionTitle} Protocol)...`
                }
                className="flex-1 py-1.5 px-2.5 text-xs bg-white border border-teal-300 rounded-lg text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
              />
              <button
                type="submit"
                title={`Save current ${sectionTitle} content as template`}
                className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-xs whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </form>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-2 p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              title="View Standard Medical Presets"
              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition cursor-pointer text-center ${
                activeTab === 'presets'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clinical Presets ({filteredPresets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              title="View Doctor Saved Custom Templates"
              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition cursor-pointer text-center ${
                activeTab === 'saved'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Templates ({filteredSaved.length})
            </button>
          </div>

          {/* Preset / Template List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
            {/* If user typed a search query and no match was found in active tab */}
            {searchQuery.trim() && (activeTab === 'presets' ? filteredPresets.length === 0 : filteredSaved.length === 0) && (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-center space-y-2 my-1">
                <p className="text-[11px] text-amber-900 font-semibold">
                  No template found matching <span className="underline decoration-amber-400 font-bold">"{searchQuery.trim()}"</span>
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickSaveWithName(searchQuery.trim())}
                  className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save current {sectionTitle} as "{searchQuery.trim()}"</span>
                </button>
              </div>
            )}

            {activeTab === 'presets' ? (
              filteredPresets.length > 0 ? (
                filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApply(preset)}
                    title={`Click to apply ${preset.name} into ${sectionTitle}`}
                    className="p-2 border border-slate-100 hover:border-teal-300 rounded-lg bg-slate-50/60 hover:bg-teal-50/40 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 text-[11px] group-hover:text-teal-900 line-clamp-1">
                        {preset.name}
                      </span>
                      {preset.category && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 whitespace-nowrap">
                          {preset.category}
                        </span>
                      )}
                    </div>
                    {preset.description && (
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {preset.description}
                      </p>
                    )}
                  </div>
                ))
              ) : !searchQuery.trim() ? (
                <div className="py-4 text-center text-slate-400 italic text-[11px]">
                  No clinical presets available for {sectionTitle}.
                </div>
              ) : null
            ) : filteredSaved.length > 0 ? (
              filteredSaved.map((saved) => (
                <div
                  key={saved.id}
                  className="p-2 border border-slate-100 hover:border-teal-300 rounded-lg bg-slate-50/60 hover:bg-teal-50/40 transition flex items-center justify-between gap-2 group"
                >
                  <div
                    onClick={() => handleApply(saved)}
                    title={`Click to apply ${saved.name}`}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <span className="font-bold text-slate-800 text-[11px] group-hover:text-teal-900 block truncate">
                      {saved.name}
                    </span>
                    <span className="text-[9px] text-slate-400">Custom Template</span>
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
                No custom templates saved yet. Fill out {sectionTitle} and save above.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
