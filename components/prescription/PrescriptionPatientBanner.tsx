'use client';

import React, { useState } from 'react';
import {
  FolderOpen,
  BookmarkPlus,
  Mail,
  FileEdit,
  RotateCcw,
  Calendar,
  ChevronDown,
  Edit2,
  X,
  Phone,
} from 'lucide-react';

interface PrescriptionPatientBannerProps {
  formData: {
    patientName: string;
    phoneNumber: string;
    email?: string;
    age: string;
    sex: string;
    date: string;
    reference_number?: string;
    de?: string;
    [key: string]: any;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handlePhoneNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedDoctorName: string;
  handleDoctorSelect: (name: string) => void;
  availableDoctors: { id?: string; _id?: string; name: string }[];
  activeTab: '1st Visit' | 'Repeat Patient' | 'View Past' | 'Record' | string;
  setActiveTab: React.Dispatch<React.SetStateAction<'1st Visit' | 'Repeat Patient' | 'View Past' | 'Record'>> | ((tab: any) => void);
  isNewPatient?: boolean;
  setRepeatPatient?: (isRepeat: boolean) => void;
  consultationCharge?: number;
  onOpenLoadTemplate: () => void;
  onOpenSaveTemplate: () => void;
  onOpenEmailModal?: () => void;
  onOpenDraftModal?: () => void;
  hasDraft?: boolean;
  showDraftBanner?: boolean;
  currentDraft?: any;
  onRestoreDraft?: (draft: any) => void;
  onDismissDraftBanner?: () => void;
}

export default function PrescriptionPatientBanner({
  formData,
  handleChange,
  handlePhoneNumberChange,
  selectedDoctorName,
  handleDoctorSelect,
  availableDoctors,
  activeTab,
  setActiveTab,
  isNewPatient = true,
  setRepeatPatient,
  consultationCharge,
  onOpenLoadTemplate,
  onOpenSaveTemplate,
  onOpenEmailModal,
  onOpenDraftModal,
  hasDraft = false,
  showDraftBanner = false,
  currentDraft,
  onRestoreDraft,
  onDismissDraftBanner,
}: PrescriptionPatientBannerProps) {
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  const isGynae =
    (selectedDoctorName || '').toLowerCase().includes('shilpa') ||
    (selectedDoctorName || '').toLowerCase().includes('shillpa') ||
    (selectedDoctorName || '').toLowerCase().includes('gynae') ||
    (selectedDoctorName || '').toLowerCase().includes('obs');

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      if (y && m && d) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(m, 10) - 1;
        return `${parseInt(d, 10)} ${months[mIdx] || m} ${y}`;
      }
    } catch {}
    return dateStr;
  };

  const formatDateNumeric = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      if (y && m && d) {
        return `${d}/${m}/${y}`;
      }
    } catch {}
    return dateStr;
  };

  const patientInitial = (formData.patientName || 'P').trim().charAt(0).toUpperCase();

  const formattedPhone = formData.phoneNumber
    ? formData.phoneNumber.startsWith('+')
      ? formData.phoneNumber
      : `+91 ${formData.phoneNumber}`
    : '';

  return (
    <div className="space-y-3">
      {/* 1. Sleek Minimal Unified Header Card (Matching User Image Mockup) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left Section: Avatar + Name + Badges + Gender/Date/Age */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-base shrink-0 border ${
              isGynae
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {patientInitial}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                {formData.patientName || 'Patient Name'}
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                  isGynae
                    ? 'bg-pink-50 text-pink-700 border-pink-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isGynae ? 'Obstetrics & Gynaecology' : 'Orthopaedics & Joint Replacement'}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingDetails(!isEditingDetails)}
                title={isEditingDetails ? 'Hide editable inputs' : 'Edit patient details'}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mt-0.5">
              <span>{formData.sex === 'Female' ? '♀ Female' : formData.sex === 'Male' ? '♂ Male' : (formData.sex || 'Female')}</span>
              <span>•</span>
              <span>{formatDateDisplay(formData.date) || 'Today'}</span>
              <span>•</span>
              <span className="font-bold text-slate-700">{formData.age ? `${formData.age} Yrs` : '—'}</span>
              {formData.reference_number && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-600 font-bold">{formData.reference_number}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Phone & Email metadata icons */}
        {(formattedPhone || formData.email) && (
          <div className="flex flex-wrap sm:flex-col justify-center gap-1.5 text-xs text-slate-600 border-t xl:border-t-0 xl:border-l xl:border-r border-slate-100 xl:px-5 py-1 xl:py-0 shrink-0">
            {formattedPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700 tabular-nums">{formattedPhone}</span>
              </div>
            )}
            {formData.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700 truncate max-w-[200px]">{formData.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Right Section: Visit Date, Doctor Switcher & Drawing Board Button */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start xl:self-center">
          {/* Visit Date Box */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="block text-xs font-extrabold text-slate-900 leading-tight">
                {formatDateNumeric(formData.date) || '—'}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                Visit Date
              </span>
            </div>
          </div>

          {/* Doctor Switcher Dropdown */}
          <div className="relative">
            <select
              value={selectedDoctorName}
              onChange={(e) => handleDoctorSelect(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {availableDoctors.map((doc) => (
                <option key={doc.id || doc._id || doc.name} value={doc.name}>
                  {doc.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Past Visits Modal Button */}
          <button
            type="button"
            onClick={() => setActiveTab('View Past')}
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
            title="View past visits and history"
          >
            <span>Past Visits</span>
          </button>

          {/* Repeat Patient Toggle Pill */}
          <button
            type="button"
            onClick={() => {
              const next = isNewPatient;
              if (setRepeatPatient) setRepeatPatient(next);
              if (setActiveTab) setActiveTab(next ? 'Repeat Patient' : '1st Visit');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              !isNewPatient
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={!isNewPatient ? 'Repeat Patient (Discounted visit)' : '1st Visit'}
          >
            <span>{!isNewPatient ? 'Repeat Patient' : '1st Visit'}</span>
          </button>

          {/* Quick Action Pills: Load Template, Save Template, Draft & Mail Rx */}
          {onOpenLoadTemplate && (
            <button
              type="button"
              onClick={onOpenLoadTemplate}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition cursor-pointer shadow-2xs"
              title="Load master prescription template"
            >
              <FolderOpen className="w-4 h-4 text-emerald-600" />
            </button>
          )}

          {onOpenSaveTemplate && (
            <button
              type="button"
              onClick={onOpenSaveTemplate}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 transition cursor-pointer shadow-2xs"
              title="Save entire prescription as master template"
            >
              <BookmarkPlus className="w-4 h-4 text-purple-600" />
            </button>
          )}

          {onOpenDraftModal && (
            <button
              type="button"
              onClick={onOpenDraftModal}
              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                hasDraft
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Prescription Drafts"
            >
              <FileEdit className="w-4 h-4 text-amber-600" />
              {hasDraft && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </button>
          )}

          {onOpenEmailModal && (
            <button
              type="button"
              onClick={onOpenEmailModal}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition cursor-pointer shadow-2xs"
              title="Email Prescription to Patient"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Optional Collapsible Edit Drawer (Hidden by default to keep screen minimal) */}
      {isEditingDetails && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Edit Patient Registration Details
            </span>
            <button
              type="button"
              onClick={() => setIsEditingDetails(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Name *</label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                required
                placeholder="Patient Name"
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-semibold text-slate-800 text-sm focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="Phone Number"
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-semibold text-slate-800 text-sm focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="patient@email.com"
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-semibold text-slate-800 text-sm focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Years"
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-semibold text-slate-800 text-sm focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Gender {isGynae && <span className="text-[10px] text-pink-600 font-bold ml-1">(Auto: Female)</span>}
              </label>
              <select
                name="sex"
                value={isGynae ? 'Female' : formData.sex}
                onChange={handleChange}
                disabled={isGynae}
                className={`w-full mt-1 p-2 border rounded-lg font-semibold text-sm focus:ring-1 focus:ring-emerald-500 ${
                  isGynae ? 'bg-pink-50 border-pink-200 text-pink-900 cursor-not-allowed' : 'border-slate-200 text-slate-800'
                }`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">Visit Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-semibold text-slate-800 text-sm focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Unsaved Draft Banner (Clean horizontal strip matching user mockup image) */}
      {showDraftBanner && currentDraft && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-slate-800">Unsaved draft available</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">
              {currentDraft.patientName || 'This patient'} ({currentDraft.medicines?.length || 0} medicine(s)
              {currentDraft.diagnosesList?.length ? ` • ${currentDraft.diagnosesList.length} diagnosis` : ''})
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onRestoreDraft?.(currentDraft)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Draft</span>
            </button>
            {onDismissDraftBanner && (
              <button
                type="button"
                onClick={onDismissDraftBanner}
                className="text-slate-400 hover:text-slate-600 font-bold p-0.5 cursor-pointer"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
