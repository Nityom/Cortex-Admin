"use client";

import React from "react";
import {
  Users,
  CheckCircle2,
  Phone,
  Stethoscope,
  Bed,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { IPDAdmission, WardBedConfigItem, DOCTORS, DEPARTMENTS } from "./types";
import { Patient } from "@/types/patient";

interface IpdNewAdmissionTabProps {
  newAdmissionForm: {
    uhid: string;
    ipdNumber: string;
    name: string;
    age: string;
    sex: "Male" | "Female" | "Other";
    phone: string;
    address: string;
    email: string;
    whatsapp_number: string;
    medicalHistory: string;
    allergies: string;
    provisionalDiagnosis: string;
    reasonForAdmission: string;
    admissionDate: string;
    admissionTime: string;
    department: string;
    consultantDoctor: string;
    referredBy: string;
    paymentCategory: "Cash" | "TPA / Insurance" | "Ayushman Bharat / MJPJAY" | "Corporate";
    ward: string;
    isCustomWard: boolean;
    customWardName: string;
    bedNumber: string;
    isCustomBed: boolean;
    customBedNumber: string;
    dailyRate: number;
    nursingRate: number;
    doctorVisitFee: number;
    initialAdvance: number;
    advancePaymentMode: "Cash" | "UPI" | "Card" | "Bank Transfer";
  };
  setNewAdmissionForm: React.Dispatch<React.SetStateAction<any>>;
  admissions: IPDAdmission[];
  wardBedConfig: WardBedConfigItem[];
  occupiedBeds: Map<string, IPDAdmission>;
  opdPatients: any[];
  selectedOpdDate: string;
  setSelectedOpdDate: (date: string) => void;
  importedFromOpd: any;
  setImportedFromOpd: (pt: any) => void;
  existingPatientFound: Patient | null;
  setExistingPatientFound: (pt: Patient | null) => void;
  handlePhoneLookup: (phone: string) => Promise<void>;
  handleSelectOpdPatient: (pt: any) => void;
  handleCreateAdmission: (e: React.FormEvent) => void;
  submittingAdmission: boolean;
  onCancel: () => void;
}

export default function IpdNewAdmissionTab({
  newAdmissionForm,
  setNewAdmissionForm,
  admissions,
  wardBedConfig,
  occupiedBeds,
  opdPatients,
  selectedOpdDate,
  setSelectedOpdDate,
  importedFromOpd,
  setImportedFromOpd,
  existingPatientFound,
  setExistingPatientFound,
  handlePhoneLookup,
  handleSelectOpdPatient,
  handleCreateAdmission,
  submittingAdmission,
  onCancel,
}: IpdNewAdmissionTabProps) {
  return (
    <form onSubmit={handleCreateAdmission} className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Patient IPD Admission & Bed Allocation</h2>
            <p className="text-xs text-slate-500">
              Lookup existing patient by mobile/UHID or register new. Assign consultant doctor, ward, and bed.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            Next IPD No: IPD-{new Date().getFullYear()}-{String(admissions.length + 1).padStart(3, "0")}
          </span>
        </div>

        {/* OPD Patient Import Banner & Selector */}
        {importedFromOpd ? (
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-bold text-sm block">Selected from OPD: {importedFromOpd.name}</span>
                <span className="text-[11px] text-emerald-700">
                  Token #{importedFromOpd.token} • Date: {importedFromOpd.date} • Demographics & vitals imported automatically.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setImportedFromOpd(null)}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
            >
              Clear OPD Selection
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Quick Import: Select from OPD Patients as per Date
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Choose a date to view registered OPD patients and import their UHID, demographics & vitals for admission.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedOpdDate}
                  onChange={(e) => setSelectedOpdDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSelectedOpdDate(new Date().toISOString().split("T")[0])}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
                    selectedOpdDate === new Date().toISOString().split("T")[0]
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedOpdDate(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0])
                  }
                  className="px-2 py-1 text-[11px] font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  Yesterday
                </button>
              </div>
            </div>

            {/* OPD Patients horizontal list / chips for selected date */}
            {(() => {
              const matchingOpd = opdPatients.filter((p) => {
                const d = p.registeredAt ? p.registeredAt.slice(0, 10) : "";
                return !selectedOpdDate || d === selectedOpdDate;
              });

              if (matchingOpd.length === 0) {
                return (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                    No OPD patients registered on <strong>{selectedOpdDate}</strong>. Change date or lookup by phone number below.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  {matchingOpd.map((opdPt) => (
                    <div
                      key={opdPt.id}
                      className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-3 shadow-2xs flex flex-col justify-between gap-2 transition hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            Token #{opdPt.token} • {opdPt.uhid || "CRX..."}
                          </span>
                          <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {opdPt.doctor ? opdPt.doctor.replace("Dr. ", "") : "OPD"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{opdPt.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {opdPt.age}y • {opdPt.sex} • Ph: {opdPt.phone}
                        </p>
                        {opdPt.vitals?.bp && (
                          <p className="text-[10px] text-slate-600 font-medium mt-1">
                            Vitals: BP {opdPt.vitals.bp} | SpO₂ {opdPt.vitals.spo2 || "—"}%
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectOpdPatient(opdPt)}
                        className="w-full py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Select for IPD Admission
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Existing patient banner */}
        {existingPatientFound && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Existing patient found: <strong>{existingPatientFound.name}</strong> (UHID:{" "}
                <strong>{newAdmissionForm.uhid}</strong>). Demographic details pre-filled.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExistingPatientFound(null)}
              className="text-emerald-700 underline font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {/* SECTION 1: Patient Demographics */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            1. Patient Demographics & UHID
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={newAdmissionForm.phone}
                  onChange={(e) => {
                    setNewAdmissionForm({ ...newAdmissionForm, phone: e.target.value });
                    handlePhoneLookup(e.target.value);
                  }}
                  placeholder="e.g. 9823012345"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Type 10 digits to auto-lookup UHID</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UHID / Reference No.</label>
              <input
                type="text"
                value={newAdmissionForm.uhid}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, uhid: e.target.value })}
                placeholder="CRX0001 (Auto-generated)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IPD Number <span className="text-[10px] text-slate-400 font-normal">(Auto/Custom)</span>
              </label>
              <input
                type="text"
                value={newAdmissionForm.ipdNumber}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, ipdNumber: e.target.value })}
                placeholder={String(100 + admissions.length + 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 focus:outline-none"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newAdmissionForm.name}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, name: e.target.value })}
                placeholder="Enter patient full name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  value={newAdmissionForm.age}
                  onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, age: e.target.value })}
                  placeholder="Age"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={newAdmissionForm.sex}
                  onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, sex: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email ID <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={newAdmissionForm.email}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, email: e.target.value })}
                placeholder="e.g. patient@gmail.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential Address <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={newAdmissionForm.address}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, address: e.target.value })}
                placeholder="e.g. Shivaji Nagar, Wardha"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Clinical Details on Admission */}
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            2. Clinical Diagnosis
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Provisional Diagnosis <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newAdmissionForm.provisionalDiagnosis}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, provisionalDiagnosis: e.target.value })}
                placeholder="e.g. Acute Appendicitis / Fracture Neck Femur / Normal Labour / Observation"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Ward & Bed Allocation */}
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Bed className="w-4 h-4 text-emerald-600" />
            3. Doctor, Ward & Bed Allocation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Consultant Doctor</label>
              <select
                value={newAdmissionForm.consultantDoctor}
                onChange={(e) => {
                  const docObj = DOCTORS.find((d) => d.name === e.target.value);
                  setNewAdmissionForm({
                    ...newAdmissionForm,
                    consultantDoctor: e.target.value,
                    department: docObj?.specialty || newAdmissionForm.department,
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none"
              >
                {DOCTORS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={newAdmissionForm.department}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Ward Category</label>
                <button
                  type="button"
                  onClick={() => setNewAdmissionForm((prev: any) => ({ ...prev, isCustomWard: !prev.isCustomWard }))}
                  className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold underline cursor-pointer"
                >
                  {newAdmissionForm.isCustomWard ? "Choose Standard" : "+ Custom Ward"}
                </button>
              </div>
              {newAdmissionForm.isCustomWard ? (
                <input
                  type="text"
                  value={newAdmissionForm.customWardName}
                  onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, customWardName: e.target.value })}
                  placeholder="e.g. Special Deluxe, HDU, NICU..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none font-medium"
                />
              ) : (
                <select
                  value={newAdmissionForm.ward}
                  onChange={(e) => {
                    const wName = e.target.value as any;
                    const conf = wardBedConfig.find((w) => w.ward === wName);
                    const firstVacantBed = conf?.beds.find((b) => !occupiedBeds.has(b)) || conf?.beds[0] || "Bed 101-A";
                    setNewAdmissionForm({
                      ...newAdmissionForm,
                      ward: wName,
                      bedNumber: firstVacantBed,
                      dailyRate: conf?.dailyRate || 1000,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none"
                >
                  {wardBedConfig.map((w) => (
                    <option key={w.ward} value={w.ward}>
                      {w.ward} (₹{w.dailyRate}/day)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Select Bed Number <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setNewAdmissionForm((prev: any) => ({ ...prev, isCustomBed: !prev.isCustomBed }))}
                  className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold underline cursor-pointer"
                >
                  {newAdmissionForm.isCustomBed ? "Choose Standard" : "+ Custom Bed"}
                </button>
              </div>
              {newAdmissionForm.isCustomBed ? (
                <input
                  type="text"
                  value={newAdmissionForm.customBedNumber}
                  onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, customBedNumber: e.target.value })}
                  placeholder="e.g. Bed #204, ICU-05, Extra-1..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono font-bold focus:outline-none"
                />
              ) : (
                <select
                  value={newAdmissionForm.bedNumber}
                  onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, bedNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono font-bold focus:outline-none"
                >
                  {(() => {
                    const conf = wardBedConfig.find((w) => w.ward === newAdmissionForm.ward);
                    return conf?.beds.map((b) => {
                      const isOcc = occupiedBeds.has(b);
                      return (
                        <option key={b} value={b} disabled={isOcc}>
                          {b} {isOcc ? "— OCCUPIED" : "— VACANT"}
                        </option>
                      );
                    });
                  })()}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date</label>
              <input
                type="date"
                value={newAdmissionForm.admissionDate}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, admissionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Time</label>
              <input
                type="text"
                value={newAdmissionForm.admissionTime}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, admissionTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Category</label>
              <select
                value={newAdmissionForm.paymentCategory}
                onChange={(e) => setNewAdmissionForm({ ...newAdmissionForm, paymentCategory: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
              >
                <option value="Cash">Cash / Self-Pay</option>
                <option value="TPA / Insurance">TPA / Mediclaim</option>
                <option value="Ayushman Bharat / MJPJAY">Ayushman Bharat / MJPJAY</option>
                <option value="Corporate">Corporate Tie-up</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submittingAdmission}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {submittingAdmission ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Admitting...
              </>
            ) : (
              <>
                <Bed className="w-4 h-4" />
                Confirm Admission & Allocate Bed
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

