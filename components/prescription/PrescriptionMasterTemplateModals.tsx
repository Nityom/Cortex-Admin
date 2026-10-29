'use client';

import React from 'react';
import { FolderOpen, BookmarkPlus, X, Search, ArrowRight } from 'lucide-react';
import { PrescriptionTemplate } from '@/services/templates';

interface PrescriptionMasterTemplateModalsProps {
  isLoadTemplateModalOpen: boolean;
  setIsLoadTemplateModalOpen: (val: boolean) => void;
  savedTemplatesList: PrescriptionTemplate[];
  templateCategoryFilter?: string;
  setTemplateCategoryFilter?: (val: string) => void;
  templateSearchQuery?: string;
  setTemplateSearchQuery?: (val: string) => void;
  applyPrescriptionTemplate: (tmpl: PrescriptionTemplate) => void;

  isSaveTemplateModalOpen: boolean;
  setIsSaveTemplateModalOpen: (val: boolean) => void;
  templateNameInput: string;
  setTemplateNameInput: (val: string) => void;
  templateCategoryInput: string;
  setTemplateCategoryInput: (val: string) => void;
  selectedDoctorName: string;
  formData: { de?: string; advice?: string; [key: string]: any };
  medicines: any[];
  complaintsList?: any[];
  findingsText?: string;
  vitals?: any;
  drNotes?: string;
  quickNotes?: string;
  procedureAdvice?: string;
  dietExercise?: string;
  investigationText?: string;
  generalExam?: string;
  pastMedication?: string;
  drawingDataUrl?: string;
  testsRequested?: any[];
  followupCount?: string;
  followupUnit?: string;
  onSaveTemplate: () => void;
}

export default function PrescriptionMasterTemplateModals({
  isLoadTemplateModalOpen,
  setIsLoadTemplateModalOpen,
  savedTemplatesList,
  templateCategoryFilter,
  setTemplateCategoryFilter,
  templateSearchQuery,
  setTemplateSearchQuery,
  applyPrescriptionTemplate,

  isSaveTemplateModalOpen,
  setIsSaveTemplateModalOpen,
  templateNameInput,
  setTemplateNameInput,
  templateCategoryInput,
  setTemplateCategoryInput,
  selectedDoctorName,
  formData,
  medicines,
  followupCount,
  followupUnit,
  onSaveTemplate,
}: PrescriptionMasterTemplateModalsProps) {
  const [internalSearchQuery, setInternalSearchQuery] = React.useState('');
  const [internalCategoryFilter, setInternalCategoryFilter] = React.useState('All');

  const activeSearch = templateSearchQuery !== undefined ? templateSearchQuery : internalSearchQuery;
  const onSearchChange = setTemplateSearchQuery || setInternalSearchQuery;

  const activeCategory = templateCategoryFilter !== undefined ? templateCategoryFilter : internalCategoryFilter;
  const onCategoryChange = setTemplateCategoryFilter || setInternalCategoryFilter;

  return (
    <>
      {/* Load Template Modal */}
      {isLoadTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Load Prescription Template</h3>
                  <p className="text-[11px] text-slate-500">
                    Select a template to auto-populate diagnosis, medicines, and advice.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLoadTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={activeSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search template name, diagnosis, medicine..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                />
              </div>
              <select
                value={activeCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold cursor-pointer outline-none"
              >
                <option value="All">All Specialties</option>
                <option value="Orthopaedics">Orthopaedics</option>
                <option value="Gynaecology">Gynaecology</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 max-h-[50vh]">
              {savedTemplatesList
                .filter((t) => {
                  if (
                    activeCategory !== 'All' &&
                    t.category !== activeCategory
                  )
                    return false;
                  if (!activeSearch.trim()) return true;
                  const q = activeSearch.toLowerCase();
                  return (
                    t.name.toLowerCase().includes(q) ||
                    (t.diagnosis || '').toLowerCase().includes(q) ||
                    (t.medicines || []).some((m) => m.name.toLowerCase().includes(q))
                  );
                })
                .map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {tmpl.category || 'General'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600">
                          {tmpl.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">
                        <strong>Diag:</strong> {tmpl.diagnosis || 'None'} •{' '}
                        <strong>Meds:</strong> {tmpl.medicines?.length || 0} drugs
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        applyPrescriptionTemplate(tmpl);
                        setIsLoadTemplateModalOpen(false);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              {savedTemplatesList.length === 0 && (
                <p className="text-center py-6 text-slate-400 text-xs">No templates found.</p>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <a
                href="/admin/templates"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                Manage All Templates in Full View <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setIsLoadTemplateModalOpen(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Save as Prescription Template
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Save current medicines, diagnosis, and advice as a reusable template.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="e.g. Knee OA Standard Protocol"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Specialty
                  </label>
                  <select
                    value={templateCategoryInput}
                    onChange={(e) => setTemplateCategoryInput(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold bg-white cursor-pointer outline-none"
                  >
                    <option value="Orthopaedics">Orthopaedics</option>
                    <option value="Gynaecology">Gynaecology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Doctor
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={selectedDoctorName}
                    className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1.5 text-[11px]">
                <span className="font-bold text-purple-900 block">Template Content Preview:</span>
                <p className="text-slate-700">
                  <strong>Diagnosis:</strong> {formData.de || 'None'}
                </p>
                <p className="text-slate-700">
                  <strong>Medicines:</strong> {medicines.length} items with dosages & schedules
                </p>
                <p className="text-slate-700">
                  <strong>Advice:</strong>{' '}
                  {formData.advice ? formData.advice.slice(0, 60) + '...' : 'None'}
                </p>
                <p className="text-slate-700">
                  <strong>Follow-up:</strong> {followupCount} {followupUnit}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveTemplate}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

