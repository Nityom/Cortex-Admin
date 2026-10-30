'use client';

import React from 'react';
import { PhoneCall, FolderOpen, BookmarkPlus, Mail } from 'lucide-react';

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
  activeTab: '1st Visit' | 'View Past' | 'Record' | string;
  setActiveTab: React.Dispatch<React.SetStateAction<'1st Visit' | 'View Past' | 'Record'>> | ((tab: any) => void);
  onOpenLoadTemplate: () => void;
  onOpenSaveTemplate: () => void;
  onOpenEmailModal?: () => void;
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
  onOpenLoadTemplate,
  onOpenSaveTemplate,
  onOpenEmailModal,
}: PrescriptionPatientBannerProps) {
  const isGynae = (selectedDoctorName || '').toLowerCase().includes('shilpa') ||
    (selectedDoctorName || '').toLowerCase().includes('shillpa') ||
    (selectedDoctorName || '').toLowerCase().includes('gynae') ||
    (selectedDoctorName || '').toLowerCase().includes('obs');

  return (
    <>
      {/* 0. Top Attending Doctor Status & Quick Switcher (Light Theme) */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-2xs shrink-0 ${
              isGynae
                ? 'bg-pink-50 text-pink-700 border-pink-200'
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}
          >
            ℞
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Current Attending Doctor
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isGynae
                    ? 'bg-pink-50 text-pink-700 border-pink-200'
                    : 'bg-teal-50 text-teal-800 border-teal-200'
                }`}
              >
                {isGynae
                  ? 'Obstetrics & Gynaecology'
                  : 'Orthopaedics & Joint Replacement'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
              <span>{selectedDoctorName}</span>
            </div>
          </div>
        </div>

        {/* Doctor Quick Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
          <span className="text-[11px] text-slate-500 font-bold px-2 hidden md:inline">
            Attending:
          </span>
          <button
            type="button"
            onClick={() => handleDoctorSelect('Dr. Vipeen Raut')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              !isGynae
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <span>Dr. Vipeen Raut</span>
            <span className={`text-[10px] ${!isGynae ? 'text-teal-200' : 'text-slate-400'}`}>(Ortho)</span>
          </button>
          <button
            type="button"
            onClick={() => handleDoctorSelect('Dr. Shillpa Raut')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isGynae
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <span>Dr. Shillpa Raut</span>
            <span className={`text-[10px] ${isGynae ? 'text-pink-200' : 'text-slate-400'}`}>(Gynae / Obs)</span>
          </button>
        </div>
      </div>

      {/* Patient Banner (HealthPlix IMG_0902) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {formData.patientName || 'Patient Name'}
            </h2>
            <span className="text-sm font-semibold text-slate-600">
              ({formData.age || '—'} Y, {formData.sex || 'Male'})
            </span>
            <button
              type="button"
              onClick={() => {
                const tag = prompt('Add tag for patient (e.g. Diabetic, VIP, Ortho, ANC):');
                if (tag) alert('Tag added: ' + tag);
              }}
              className="text-xs px-2 py-0.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              + tag
            </button>
            {formData.phoneNumber && (
              <a
                href={'tel:' + formData.phoneNumber}
                className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold hover:bg-blue-100 flex items-center gap-1 transition"
              >
                <PhoneCall className="w-3 h-3" /> Call
              </a>
            )}
            {onOpenEmailModal && (
              <button
                type="button"
                onClick={onOpenEmailModal}
                className="text-xs px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded font-semibold hover:bg-teal-100 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                title="Email prescription directly to patient"
              >
                <Mail className="w-3 h-3 text-teal-700" /> Mail Rx
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
            {formData.token && (
              <div>
                Token:{' '}
                <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  #{formData.token}
                </span>
              </div>
            )}
            <div>
              UHID / Ref:{' '}
              <span className="font-bold text-slate-800">
                {formData.reference_number || 'Auto-generated on save'}
              </span>
            </div>
            <div>
              Phone: <span className="font-bold text-slate-800">{formData.phoneNumber || '—'}</span>
            </div>
            {formData.email && (
              <div className="hidden md:inline">
                Email: <span className="font-bold text-slate-800">{formData.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Editable Patient Details Bar */}
        <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Name *</label>
            <input
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
              required
              placeholder="Patient Name"
              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder="Phone Number"
              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="patient@email.com"
              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Years"
              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Gender</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Visit Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase">Doctor</label>
            <select
              value={selectedDoctorName}
              onChange={(e) => handleDoctorSelect(e.target.value)}
              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {availableDoctors.map((doc) => (
                <option key={doc.id || doc._id || doc.name} value={doc.name}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sub-Banner Visit Controls (IMG_0902) */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('1st Visit')}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${activeTab === '1st Visit'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            1st Visit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('View Past')}
            className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${activeTab === 'View Past'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            View Past
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-600">
          <button
            type="button"
            onClick={onOpenLoadTemplate}
            className="hover:text-blue-700 flex items-center gap-1.5 font-bold transition text-xs cursor-pointer"
            title="Load master prescription template"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Load template</span>
          </button>
          <button
            type="button"
            onClick={onOpenSaveTemplate}
            className="hover:text-purple-700 flex items-center gap-1.5 font-bold transition text-xs cursor-pointer"
            title="Save entire prescription as master template"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-purple-600" />
            <span>Save as template</span>
          </button>
        </div>
      </div>
    </>
  );
}
