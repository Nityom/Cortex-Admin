"use client";

import React from "react";
import { X, Users, Bed, IndianRupee, Stethoscope, ClipboardCheck, Save } from "lucide-react";
import { WardBedConfigItem, IPDAdmission, DOCTORS, DEPARTMENTS } from "./types";

interface IpdEditAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAdmissionForm: {
    id: string;
    name: string;
    age: string;
    sex: "Male" | "Female" | "Other";
    phone: string;
    address: string;
    uhid: string;
    ipdNumber: string;
    department: string;
    consultantDoctor: string;
    ward: string;
    isCustomWard: boolean;
    bedNumber: string;
    isCustomBed: boolean;
    dailyRate: number;
    nursingRatePerDay: number;
    doctorRatePerVisit: number;
    provisionalDiagnosis: string;
    admissionDate: string;
    admissionTime: string;
    paymentCategory: "Cash" | "TPA / Insurance" | "Ayushman Bharat / MJPJAY" | "Corporate";
    status: "Admitted" | "Discharged";
    dischargeDate: string;
    dischargeTime: string;
    conditionAtDischarge: string;
    finalDiagnosis: string;
    treatmentGiven: string;
    dischargeMeds: string;
    followupDate: string;
    doctorNotes: string;
  };
  setEditAdmissionForm: React.Dispatch<React.SetStateAction<any>>;
  wardBedConfig: WardBedConfigItem[];
  occupiedBeds: Map<string, IPDAdmission>;
  onSave: () => void;
}

export default function IpdEditAdmissionModal({
  isOpen,
  onClose,
  editAdmissionForm,
  setEditAdmissionForm,
  wardBedConfig,
  occupiedBeds,
  onSave,
}: IpdEditAdmissionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-bold text-xs border border-slate-200">
                {editAdmissionForm.ipdNumber || "IPD"}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-xs border border-slate-200">
                {editAdmissionForm.uhid}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                Admin Editing Mode
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              Edit Inpatient Details, Bed & Rates: {editAdmissionForm.name}
            </h2>
            <p className="text-xs text-slate-500">
              Modify ward category, bed number, room & nursing rates, or patient admission/discharge info.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* 1. Demographics */}
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              1. Patient Demographics & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  value={editAdmissionForm.name}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editAdmissionForm.phone}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Age</label>
                  <input
                    type="text"
                    value={editAdmissionForm.age}
                    onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, age: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sex</label>
                  <select
                    value={editAdmissionForm.sex}
                    onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, sex: e.target.value as any })}
                    className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editAdmissionForm.address}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">UHID / Reference No.</label>
                <input
                  type="text"
                  value={editAdmissionForm.uhid}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, uhid: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">IPD Number</label>
                <input
                  type="text"
                  value={editAdmissionForm.ipdNumber}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, ipdNumber: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 2. Ward Category & Bed Selection (Editable) */}
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-emerald-600" />
              2. Ward Category & Bed Allocation (Editable)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">Ward Category</label>
                  <button
                    type="button"
                    onClick={() => setEditAdmissionForm((prev: any) => ({ ...prev, isCustomWard: !prev.isCustomWard }))}
                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold underline cursor-pointer"
                  >
                    {editAdmissionForm.isCustomWard ? "Choose Standard" : "+ Custom Ward"}
                  </button>
                </div>
                {editAdmissionForm.isCustomWard ? (
                  <input
                    type="text"
                    value={editAdmissionForm.ward}
                    onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, ward: e.target.value })}
                    placeholder="e.g. Special Deluxe, HDU, NICU..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-900"
                  />
                ) : (
                  <select
                    value={editAdmissionForm.ward}
                    onChange={(e) => {
                      const wName = e.target.value;
                      const conf = wardBedConfig.find((w) => w.ward === wName);
                      setEditAdmissionForm({
                        ...editAdmissionForm,
                        ward: wName,
                        dailyRate: conf?.dailyRate || editAdmissionForm.dailyRate,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
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
                  <label className="text-[11px] font-bold text-slate-700">Bed Number</label>
                  <button
                    type="button"
                    onClick={() => setEditAdmissionForm((prev: any) => ({ ...prev, isCustomBed: !prev.isCustomBed }))}
                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold underline cursor-pointer"
                  >
                    {editAdmissionForm.isCustomBed ? "Choose Standard" : "+ Custom Bed ID"}
                  </button>
                </div>
                {editAdmissionForm.isCustomBed ? (
                  <input
                    type="text"
                    value={editAdmissionForm.bedNumber}
                    onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, bedNumber: e.target.value })}
                    placeholder="e.g. Bed #204, ICU-05, Extra-1..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold text-slate-900"
                  />
                ) : (
                  <select
                    value={editAdmissionForm.bedNumber}
                    onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, bedNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold"
                  >
                    <option value={editAdmissionForm.bedNumber}>{editAdmissionForm.bedNumber} (Current)</option>
                    {(() => {
                      const conf = wardBedConfig.find((w) => w.ward === editAdmissionForm.ward);
                      return conf?.beds
                        .filter((b) => b !== editAdmissionForm.bedNumber)
                        .map((b) => {
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
            </div>
          </div>

          {/* 3. Charge Rates (Directly Editable by Admin) */}
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
              3. Inpatient Charge Rates (Editable by Admin)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Room / Bed Rate (₹/day)</label>
                <input
                  type="number"
                  min="0"
                  value={editAdmissionForm.dailyRate}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, dailyRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Daily Nursing Care (₹/day)</label>
                <input
                  type="number"
                  min="0"
                  value={editAdmissionForm.nursingRatePerDay}
                  onChange={(e) =>
                    setEditAdmissionForm({ ...editAdmissionForm, nursingRatePerDay: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Doctor Round Fee (₹/visit)</label>
                <input
                  type="number"
                  min="0"
                  value={editAdmissionForm.doctorRatePerVisit}
                  onChange={(e) =>
                    setEditAdmissionForm({ ...editAdmissionForm, doctorRatePerVisit: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 4. Doctor, Department & Diagnosis */}
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
              4. Doctor, Clinical Diagnosis & Dates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Consultant Doctor</label>
                <select
                  value={editAdmissionForm.consultantDoctor}
                  onChange={(e) => {
                    const docObj = DOCTORS.find((d) => d.name === e.target.value);
                    setEditAdmissionForm({
                      ...editAdmissionForm,
                      consultantDoctor: e.target.value,
                      department: docObj?.specialty || editAdmissionForm.department,
                    });
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                >
                  {DOCTORS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department</label>
                <select
                  value={editAdmissionForm.department}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, department: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Category</label>
                <select
                  value={editAdmissionForm.paymentCategory}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, paymentCategory: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Cash">Cash / Self-Pay</option>
                  <option value="TPA / Insurance">TPA / Mediclaim</option>
                  <option value="Ayushman Bharat / MJPJAY">Ayushman Bharat / MJPJAY</option>
                  <option value="Corporate">Corporate Tie-up</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Admission Date</label>
                <input
                  type="date"
                  value={editAdmissionForm.admissionDate}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, admissionDate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Admission Time</label>
                <input
                  type="text"
                  value={editAdmissionForm.admissionTime}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, admissionTime: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provisional Diagnosis</label>
                <input
                  type="text"
                  value={editAdmissionForm.provisionalDiagnosis}
                  onChange={(e) =>
                    setEditAdmissionForm({ ...editAdmissionForm, provisionalDiagnosis: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* 5. Status & Discharge Details (Editable after discharge) */}
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-rose-600" />
              5. Inpatient Status & Discharge Details (Editable Anytime)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-rose-50/40 p-3.5 rounded-xl border border-rose-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Inpatient Status</label>
                <select
                  value={editAdmissionForm.status}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold text-slate-900"
                >
                  <option value="Admitted">Admitted (Active Inpatient)</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Discharge Date</label>
                <input
                  type="date"
                  value={editAdmissionForm.dischargeDate}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, dischargeDate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Discharge Time</label>
                <input
                  type="text"
                  value={editAdmissionForm.dischargeTime}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, dischargeTime: e.target.value })}
                  placeholder="e.g. 11:30 AM"
                  className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-xs bg-white font-bold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Condition at Discharge</label>
                <select
                  value={editAdmissionForm.conditionAtDischarge}
                  onChange={(e) =>
                    setEditAdmissionForm({ ...editAdmissionForm, conditionAtDischarge: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Cured / Stable">Cured / Stable</option>
                  <option value="Improved">Improved</option>
                  <option value="Transferred to Higher Centre">Transferred to Higher Centre</option>
                  <option value="LAMA (Left Against Medical Advice)">LAMA</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Final Diagnosis</label>
                <input
                  type="text"
                  value={editAdmissionForm.finalDiagnosis}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, finalDiagnosis: e.target.value })}
                  placeholder="Final confirmed clinical diagnosis at discharge"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Treatment Given During Stay</label>
                <textarea
                  rows={2}
                  value={editAdmissionForm.treatmentGiven}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, treatmentGiven: e.target.value })}
                  placeholder="Summary of surgeries, procedures, medications, and treatments given..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Discharge Medications (To Continue at Home)
                </label>
                <textarea
                  rows={2}
                  value={editAdmissionForm.dischargeMeds}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, dischargeMeds: e.target.value })}
                  placeholder="Medications to continue at home..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={editAdmissionForm.followupDate}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, followupDate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Post-Discharge Instructions / Advice
                </label>
                <input
                  type="text"
                  value={editAdmissionForm.doctorNotes}
                  onChange={(e) => setEditAdmissionForm({ ...editAdmissionForm, doctorNotes: e.target.value })}
                  placeholder="e.g. Bed rest 7 days, wound dressing every 2 days, review in OPD"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

