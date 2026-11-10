"use client";

import React from "react";
import {
  HeartPulse,
  Stethoscope,
  Syringe,
  Activity,
  FileText,
  ClipboardCheck,
  Pencil,
  Printer,
  X,
  Trash2,
} from "lucide-react";
import { IPDAdmission, DOCTORS } from "./types";
import { formatDate } from "@/lib/utils";

interface IpdClinicalStayModalProps {
  admission: IPDAdmission;
  onClose: () => void;
  isEditingAdmissionInfo: boolean;
  setIsEditingAdmissionInfo: (val: boolean) => void;
  editAdmissionInfoForm: {
    provisionalDiagnosis: string;
    reasonForAdmission: string;
    consultantDoctor: string;
    ward: string;
    bedNumber: string;
  };
  setEditAdmissionInfoForm: (val: any) => void;
  onUpdateAdmissionInfo: (id: string) => void;
  profileTab: "vitals" | "doctorNotes" | "meds" | "investigations" | "procedures" | "nursing";
  setProfileTab: (tab: "vitals" | "doctorNotes" | "meds" | "investigations" | "procedures" | "nursing") => void;
  editingClinicalItem: { type: string; id: string; data: any } | null;
  setEditingClinicalItem: (val: any) => void;
  vitalsInput: { bp: string; pulse: string; temp: string; spo2: string; weight: string; recordedBy: string };
  setVitalsInput: (val: any) => void;
  onAddVitals: (id: string) => void;
  onUpdateVitals: (id: string, vitalsId: string, data: any) => void;
  onDeleteVitals: (id: string, vitalsId: string) => void;
  doctorNoteInput: { doctor: string; note: string; plan: string };
  setDoctorNoteInput: (val: any) => void;
  onAddDoctorNote: (id: string) => void;
  onUpdateDoctorNote: (id: string, noteId: string, data: any) => void;
  onDeleteDoctorNote: (id: string, noteId: string) => void;
  medInput: { name: string; dosage: string; route: string; frequency: string; timing: string };
  setMedInput: (val: any) => void;
  onAddMedication: (id: string) => void;
  onUpdateMedication: (id: string, medId: string, data: any) => void;
  onDeleteMedication: (id: string, medId: string) => void;
  investigationInput: { name: string; cost: number };
  setInvestigationInput: (val: any) => void;
  onAddInvestigation: (id: string) => void;
  onUpdateClinicalInvestigation: (id: string, invId: string, data: any) => void;
  onDeleteClinicalInvestigation: (id: string, invId: string) => void;
  procedureInput: { name: string; surgeon: string; cost: number; notes: string };
  setProcedureInput: (val: any) => void;
  onAddProcedure: (id: string) => void;
  onUpdateClinicalProcedure: (id: string, procId: string, data: any) => void;
  onDeleteClinicalProcedure: (id: string, procId: string) => void;
  nursingNoteInput: { shift: "Morning" | "Evening" | "Night"; note: string; nurse: string };
  setNursingNoteInput: (val: any) => void;
  onAddNursingNote: (id: string) => void;
  onUpdateNursingNote: (id: string, noteId: string, data: any) => void;
  onDeleteNursingNote: (id: string, noteId: string) => void;
}

export function IpdClinicalStayModal({
  admission: activeAdmission,
  onClose,
  isEditingAdmissionInfo,
  setIsEditingAdmissionInfo,
  editAdmissionInfoForm,
  setEditAdmissionInfoForm,
  onUpdateAdmissionInfo,
  profileTab,
  setProfileTab,
  editingClinicalItem,
  setEditingClinicalItem,
  vitalsInput,
  setVitalsInput,
  onAddVitals,
  onUpdateVitals,
  onDeleteVitals,
  doctorNoteInput,
  setDoctorNoteInput,
  onAddDoctorNote,
  onUpdateDoctorNote,
  onDeleteDoctorNote,
  medInput,
  setMedInput,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  investigationInput,
  setInvestigationInput,
  onAddInvestigation,
  onUpdateClinicalInvestigation,
  onDeleteClinicalInvestigation,
  procedureInput,
  setProcedureInput,
  onAddProcedure,
  onUpdateClinicalProcedure,
  onDeleteClinicalProcedure,
  nursingNoteInput,
  setNursingNoteInput,
  onAddNursingNote,
  onUpdateNursingNote,
  onDeleteNursingNote,
}: IpdClinicalStayModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 rounded-t-2xl shrink-0">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-xs">
                {activeAdmission.ipdNumber}
              </span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-xs">
                {activeAdmission.uhid}
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">
                Bed: {activeAdmission.bedNumber} ({activeAdmission.ward})
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-xs font-semibold">
                Admitted: {formatDate(activeAdmission.admissionDate)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{activeAdmission.name}</h2>
            <p className="text-xs text-slate-600 font-medium">
              {activeAdmission.age}y • {activeAdmission.sex} • Doctor:{" "}
              <strong className="text-slate-800">{activeAdmission.consultantDoctor}</strong> • Diagnosis:{" "}
              <strong className="text-emerald-900">{activeAdmission.provisionalDiagnosis}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditAdmissionInfoForm({
                  provisionalDiagnosis: activeAdmission.provisionalDiagnosis || "",
                  reasonForAdmission: activeAdmission.reasonForAdmission || "",
                  consultantDoctor: activeAdmission.consultantDoctor || DOCTORS[0].name,
                  ward: activeAdmission.ward,
                  bedNumber: activeAdmission.bedNumber,
                });
                setIsEditingAdmissionInfo(!isEditingAdmissionInfo);
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              title="Edit patient diagnosis, doctor, or admission notes"
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-600" />
              {isEditingAdmissionInfo ? "Close Edit Info" : "Edit Diagnosis & Bed"}
            </button>

            <button
              type="button"
              onClick={() =>
                window.open(
                  `/print-discharge?id=${activeAdmission.id}&includeSignature=true&includeClinicalSheet=true`,
                  "_blank"
                )
              }
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              title="Print Full Inpatient Clinical Sheet"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              Print Clinical Sheet
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Admission Diagnosis & Info Editor */}
        {isEditingAdmissionInfo && (
          <div className="p-4 bg-emerald-50/80 border-b border-emerald-200 flex flex-wrap items-end gap-3 text-xs animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-emerald-900 uppercase">Provisional Diagnosis</label>
              <input
                type="text"
                value={editAdmissionInfoForm.provisionalDiagnosis}
                onChange={(e) =>
                  setEditAdmissionInfoForm({ ...editAdmissionInfoForm, provisionalDiagnosis: e.target.value })
                }
                className="w-full p-1.5 text-xs border border-emerald-300 rounded bg-white font-semibold"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-emerald-900 uppercase">Reason for Admission</label>
              <input
                type="text"
                value={editAdmissionInfoForm.reasonForAdmission}
                onChange={(e) =>
                  setEditAdmissionInfoForm({ ...editAdmissionInfoForm, reasonForAdmission: e.target.value })
                }
                className="w-full p-1.5 text-xs border border-emerald-300 rounded bg-white"
              />
            </div>
            <div className="w-48">
              <label className="block text-[10px] font-bold text-emerald-900 uppercase">Consultant Doctor</label>
              <select
                value={editAdmissionInfoForm.consultantDoctor}
                onChange={(e) =>
                  setEditAdmissionInfoForm({ ...editAdmissionInfoForm, consultantDoctor: e.target.value })
                }
                className="w-full p-1.5 text-xs border border-emerald-300 rounded bg-white"
              >
                {DOCTORS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-bold text-emerald-900 uppercase">Bed No.</label>
              <input
                type="text"
                value={editAdmissionInfoForm.bedNumber}
                onChange={(e) => setEditAdmissionInfoForm({ ...editAdmissionInfoForm, bedNumber: e.target.value })}
                className="w-full p-1.5 text-xs border border-emerald-300 rounded bg-white font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => onUpdateAdmissionInfo(activeAdmission.id)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow transition"
            >
              Save Details
            </button>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-3 gap-3 overflow-x-auto text-xs font-bold bg-white shrink-0">
          {[
            { id: "vitals", label: "Vitals Chart", icon: HeartPulse, count: activeAdmission.vitals.length },
            { id: "doctorNotes", label: "Doctor Notes", icon: Stethoscope, count: activeAdmission.doctorNotes.length },
            { id: "meds", label: "Medication MAR", icon: Syringe, count: activeAdmission.medications.length },
            { id: "investigations", label: "Investigations", icon: Activity, count: activeAdmission.investigations.length },
            { id: "procedures", label: "Procedures / OT", icon: FileText, count: activeAdmission.procedures.length },
            { id: "nursing", label: "Nursing Care", icon: ClipboardCheck, count: activeAdmission.nursingNotes.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setProfileTab(tab.id as any);
                setEditingClinicalItem(null);
              }}
              className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
                profileTab === tab.id
                  ? "border-emerald-600 text-emerald-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* VITALS TAB */}
          {profileTab === "vitals" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-end gap-3 ${
                  editingClinicalItem?.type === "vitals"
                    ? "bg-amber-50/80 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">BP (mmHg)</label>
                  <input
                    type="text"
                    value={vitalsInput.bp}
                    onChange={(e) => setVitalsInput({ ...vitalsInput, bp: e.target.value })}
                    placeholder="120/80"
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded w-24 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Pulse (bpm)</label>
                  <input
                    type="text"
                    value={vitalsInput.pulse}
                    onChange={(e) => setVitalsInput({ ...vitalsInput, pulse: e.target.value })}
                    placeholder="72"
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded w-20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Temp (°F)</label>
                  <input
                    type="text"
                    value={vitalsInput.temp}
                    onChange={(e) => setVitalsInput({ ...vitalsInput, temp: e.target.value })}
                    placeholder="98.6"
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded w-20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">SpO₂ (%)</label>
                  <input
                    type="text"
                    value={vitalsInput.spo2}
                    onChange={(e) => setVitalsInput({ ...vitalsInput, spo2: e.target.value })}
                    placeholder="99"
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded w-20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Recorded By</label>
                  <input
                    type="text"
                    value={vitalsInput.recordedBy}
                    onChange={(e) => setVitalsInput({ ...vitalsInput, recordedBy: e.target.value })}
                    placeholder="Staff Nurse"
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded w-32 bg-white"
                  />
                </div>

                {editingClinicalItem?.type === "vitals" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateVitals(activeAdmission.id, editingClinicalItem.id, vitalsInput)}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shadow transition cursor-pointer"
                    >
                      Save Vitals Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClinicalItem(null);
                        setVitalsInput({
                          bp: "120/80",
                          pulse: "72",
                          temp: "98.6",
                          spo2: "99",
                          weight: "",
                          recordedBy: "Staff Nurse",
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddVitals(activeAdmission.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow transition cursor-pointer"
                  >
                    + Record Vitals
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date &amp; Time</th>
                      <th className="p-3">BP</th>
                      <th className="p-3">Pulse</th>
                      <th className="p-3">Temp</th>
                      <th className="p-3">SpO₂</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeAdmission.vitals.length > 0 ? (
                      activeAdmission.vitals.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-medium">
                            {v.date} ({v.time})
                          </td>
                          <td className="p-3 font-bold text-slate-900">{v.bp}</td>
                          <td className="p-3">{v.pulse} bpm</td>
                          <td className="p-3">{v.temp} °F</td>
                          <td className="p-3 font-bold text-emerald-700">{v.spo2}%</td>
                          <td className="p-3 text-slate-500">{v.recordedBy}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClinicalItem({ type: "vitals", id: v.id, data: v });
                                  setVitalsInput({
                                    bp: v.bp,
                                    pulse: v.pulse,
                                    temp: v.temp,
                                    spo2: v.spo2,
                                    weight: v.weight || "",
                                    recordedBy: v.recordedBy || "Staff Nurse",
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer"
                                title="Edit vitals entry"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteVitals(activeAdmission.id, v.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                title="Delete vitals entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                          No vitals recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DOCTOR NOTES TAB */}
          {profileTab === "doctorNotes" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  editingClinicalItem?.type === "doctorNotes"
                    ? "bg-amber-50/80 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Consulting Doctor</label>
                    <select
                      value={doctorNoteInput.doctor}
                      onChange={(e) => setDoctorNoteInput({ ...doctorNoteInput, doctor: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                    >
                      {DOCTORS.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Progress Note</label>
                    <input
                      type="text"
                      value={doctorNoteInput.note}
                      onChange={(e) => setDoctorNoteInput({ ...doctorNoteInput, note: e.target.value })}
                      placeholder="e.g. Afebrile, wound clean, drain minimal, vitals stable."
                      className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Treatment Plan / Orders</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={doctorNoteInput.plan}
                        onChange={(e) => setDoctorNoteInput({ ...doctorNoteInput, plan: e.target.value })}
                        placeholder="e.g. Start oral fluids, mobilised with walker."
                        className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                      />
                      {editingClinicalItem?.type === "doctorNotes" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateDoctorNote(activeAdmission.id, editingClinicalItem.id, doctorNoteInput)
                            }
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs whitespace-nowrap shadow cursor-pointer"
                          >
                            Save Note Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClinicalItem(null);
                              setDoctorNoteInput({ doctor: DOCTORS[0].name, note: "", plan: "" });
                            }}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddDoctorNote(activeAdmission.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs whitespace-nowrap shadow cursor-pointer"
                        >
                          + Add Round Note
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {activeAdmission.doctorNotes.length > 0 ? (
                  activeAdmission.doctorNotes.map((dn) => (
                    <div
                      key={dn.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 hover:shadow-xs transition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900 text-sm">{dn.doctor}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">
                            {dn.date} • {dn.time}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClinicalItem({ type: "doctorNotes", id: dn.id, data: dn });
                              setDoctorNoteInput({ doctor: dn.doctor, note: dn.note, plan: dn.plan || "" });
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer"
                            title="Edit round note"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDoctorNote(activeAdmission.id, dn.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                            title="Delete round note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">{dn.note}</p>
                      {dn.plan && (
                        <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded w-fit border border-emerald-200">
                          Plan / Orders: {dn.plan}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                    No doctor round notes added yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEDICATION MAR TAB */}
          {profileTab === "meds" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-end gap-2.5 ${
                  editingClinicalItem?.type === "meds"
                    ? "bg-amber-50/80 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Medicine &amp; Strength</label>
                  <input
                    type="text"
                    value={medInput.name}
                    onChange={(e) => setMedInput({ ...medInput, name: e.target.value })}
                    placeholder="e.g. Inj. Ceftriaxone 1g"
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Route</label>
                  <select
                    value={medInput.route}
                    onChange={(e) => setMedInput({ ...medInput, route: e.target.value })}
                    className="p-2 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="Oral">Oral</option>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="Infusion">Infusion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Frequency</label>
                  <select
                    value={medInput.frequency}
                    onChange={(e) => setMedInput({ ...medInput, frequency: e.target.value })}
                    className="p-2 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="OD">OD (Once daily)</option>
                    <option value="BD">BD (Twice daily)</option>
                    <option value="TDS">TDS (Thrice daily)</option>
                    <option value="SOS">SOS (As needed)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Timing</label>
                  <input
                    type="text"
                    value={medInput.timing}
                    onChange={(e) => setMedInput({ ...medInput, timing: e.target.value })}
                    placeholder="e.g. Morning & Night"
                    className="p-2 text-xs border border-slate-300 rounded w-40 bg-white"
                  />
                </div>

                {editingClinicalItem?.type === "meds" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateMedication(activeAdmission.id, editingClinicalItem.id, medInput)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shadow cursor-pointer"
                    >
                      Save Medication Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClinicalItem(null);
                        setMedInput({
                          name: "",
                          dosage: "",
                          route: "Oral",
                          frequency: "BD",
                          timing: "Morning & Night",
                        });
                      }}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddMedication(activeAdmission.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow cursor-pointer"
                  >
                    + Add Medication
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Route</th>
                      <th className="p-3">Frequency</th>
                      <th className="p-3">Timing</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeAdmission.medications.length > 0 ? (
                      activeAdmission.medications.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-bold text-slate-900">{m.name}</td>
                          <td className="p-3 font-mono">{m.route}</td>
                          <td className="p-3 font-semibold text-emerald-700">{m.frequency}</td>
                          <td className="p-3 text-slate-600">{m.timing}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateMedication(activeAdmission.id, m.id, {
                                  status: m.status === "Active" ? "Discontinued" : "Active",
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                m.status === "Active"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title="Click to toggle status"
                            >
                              {m.status}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClinicalItem({ type: "meds", id: m.id, data: m });
                                  setMedInput({
                                    name: m.name,
                                    dosage: m.dosage || "",
                                    route: m.route,
                                    frequency: m.frequency,
                                    timing: m.timing,
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer"
                                title="Edit medication"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteMedication(activeAdmission.id, m.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                title="Remove medication"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                          No medications administered or prescribed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INVESTIGATIONS TAB */}
          {profileTab === "investigations" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-end gap-2.5 ${
                  editingClinicalItem?.type === "investigations"
                    ? "bg-amber-50/80 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Investigation Test / Imaging</label>
                  <input
                    type="text"
                    value={investigationInput.name}
                    onChange={(e) => setInvestigationInput({ ...investigationInput, name: e.target.value })}
                    placeholder="e.g. Serum Electrolytes / Digital X-Ray"
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={investigationInput.cost}
                    onChange={(e) =>
                      setInvestigationInput({ ...investigationInput, cost: Number(e.target.value) })
                    }
                    className="p-2 text-xs border border-slate-300 rounded w-28 bg-white font-bold"
                  />
                </div>

                {editingClinicalItem?.type === "investigations" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateClinicalInvestigation(
                          activeAdmission.id,
                          editingClinicalItem.id,
                          investigationInput
                        )
                      }
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shadow cursor-pointer"
                    >
                      Save Test Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClinicalItem(null);
                        setInvestigationInput({ name: "", cost: 500 });
                      }}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddInvestigation(activeAdmission.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow cursor-pointer"
                  >
                    + Order Test
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Investigation Name</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Cost (₹)</th>
                      <th className="p-3 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeAdmission.investigations.length > 0 ? (
                      activeAdmission.investigations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-bold text-slate-900">{inv.name}</td>
                          <td className="p-3 text-slate-500">{inv.date}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateClinicalInvestigation(activeAdmission.id, inv.id, {
                                  status: inv.status === "Ordered" ? "Completed" : "Ordered",
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                inv.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              }`}
                              title="Click to toggle status"
                            >
                              {inv.status}
                            </button>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">₹{inv.cost}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClinicalItem({ type: "investigations", id: inv.id, data: inv });
                                  setInvestigationInput({ name: inv.name, cost: inv.cost });
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer"
                                title="Edit investigation"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteClinicalInvestigation(activeAdmission.id, inv.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                title="Delete investigation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                          No diagnostic investigations recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROCEDURES TAB */}
          {profileTab === "procedures" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  editingClinicalItem?.type === "procedures"
                    ? "bg-amber-50/80 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Procedure / Surgery Name
                    </label>
                    <input
                      type="text"
                      value={procedureInput.name}
                      onChange={(e) => setProcedureInput({ ...procedureInput, name: e.target.value })}
                      placeholder="e.g. Major Dressing / Implant Removal / Knee Arthroscopy"
                      className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Surgeon / Doctor</label>
                    <select
                      value={procedureInput.surgeon}
                      onChange={(e) => setProcedureInput({ ...procedureInput, surgeon: e.target.value })}
                      className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                    >
                      {DOCTORS.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Procedure Charge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={procedureInput.cost}
                      onChange={(e) => setProcedureInput({ ...procedureInput, cost: Number(e.target.value) })}
                      className="w-full p-2 text-xs border border-slate-300 rounded font-bold bg-white"
                    />
                  </div>
                  <div className="md:col-span-4 flex gap-2">
                    <input
                      type="text"
                      value={procedureInput.notes}
                      onChange={(e) => setProcedureInput({ ...procedureInput, notes: e.target.value })}
                      placeholder="Operative notes / findings..."
                      className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                    />
                    {editingClinicalItem?.type === "procedures" ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateClinicalProcedure(activeAdmission.id, editingClinicalItem.id, procedureInput)
                          }
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs whitespace-nowrap shadow cursor-pointer"
                        >
                          Save Procedure Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClinicalItem(null);
                            setProcedureInput({ name: "", surgeon: DOCTORS[0].name, cost: 5000, notes: "" });
                          }}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddProcedure(activeAdmission.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs whitespace-nowrap shadow cursor-pointer"
                      >
                        + Record Procedure
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {activeAdmission.procedures.length > 0 ? (
                  activeAdmission.procedures.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs hover:shadow-xs transition"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                        <p className="text-slate-500 text-[11px]">
                          {p.date} • Surgeon: <strong className="text-slate-700">{p.surgeon}</strong>
                        </p>
                        {p.notes && <p className="text-slate-600 italic text-[11px] mt-0.5">{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-700 text-sm">₹{p.cost}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClinicalItem({ type: "procedures", id: p.id, data: p });
                              setProcedureInput({
                                name: p.name,
                                surgeon: p.surgeon,
                                cost: p.cost,
                                notes: p.notes || "",
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer"
                            title="Edit procedure"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteClinicalProcedure(activeAdmission.id, p.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                            title="Remove procedure"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                    No surgeries or procedures recorded.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NURSING NOTES TAB */}
          {profileTab === "nursing" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-end gap-2.5 ${
                  editingClinicalItem?.type === "nursing"
                    ? "bg-amber-50/80 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Shift</label>
                  <select
                    value={nursingNoteInput.shift}
                    onChange={(e) => setNursingNoteInput({ ...nursingNoteInput, shift: e.target.value as any })}
                    className="p-2 text-xs border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[250px]">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Care Observations &amp; Notes
                  </label>
                  <input
                    type="text"
                    value={nursingNoteInput.note}
                    onChange={(e) => setNursingNoteInput({ ...nursingNoteInput, note: e.target.value })}
                    placeholder="e.g. IV fluids infused, wound dressing intact, patient comfortable."
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>

                {editingClinicalItem?.type === "nursing" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateNursingNote(activeAdmission.id, editingClinicalItem.id, nursingNoteInput)
                      }
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shadow cursor-pointer"
                    >
                      Save Nursing Note
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClinicalItem(null);
                        setNursingNoteInput({ shift: "Morning", note: "", nurse: "Staff Nurse" });
                      }}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddNursingNote(activeAdmission.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow cursor-pointer"
                  >
                    + Add Note
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {activeAdmission.nursingNotes.length > 0 ? (
                  activeAdmission.nursingNotes.map((nn) => (
                    <div
                      key={nn.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 text-xs hover:shadow-xs transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">
                          {nn.shift} Shift • {nn.nurse}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">{nn.date}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClinicalItem({ type: "nursing", id: nn.id, data: nn });
                              setNursingNoteInput({ shift: nn.shift, note: nn.note, nurse: nn.nurse });
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer"
                            title="Edit nursing note"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteNursingNote(activeAdmission.id, nn.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                            title="Delete nursing note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{nn.note}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                    No nursing care notes recorded.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
