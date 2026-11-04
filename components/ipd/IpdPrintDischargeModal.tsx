"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { IPDAdmission, calculateStayDays } from "./types";
import { hospitalConfig, getDoctorProfile } from "@/config/hospital";

interface IpdPrintDischargeModalProps {
  isOpen: boolean;
  admission: IPDAdmission | null;
  onClose: () => void;
  dischargeIncludeSignature: boolean;
  setDischargeIncludeSignature: (inc: boolean) => void;
}

export default function IpdPrintDischargeModal({
  isOpen,
  admission,
  onClose,
  dischargeIncludeSignature,
  setDischargeIncludeSignature,
}: IpdPrintDischargeModalProps) {
  if (!isOpen || !admission) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Top Header Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Official Prescription-Format Summary
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Discharge Summary: {admission.name} ({admission.ipdNumber})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Signature Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={dischargeIncludeSignature}
                onChange={(e) => setDischargeIncludeSignature(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer"
              />
              <span>{dischargeIncludeSignature ? "✓ Doctor Signature Included" : "Without Sign (Name Only)"}</span>
            </label>

            <button
              type="button"
              onClick={() =>
                window.open(
                  `/print-discharge?id=${admission.id}&includeSignature=${dischargeIncludeSignature}`,
                  "_blank"
                )
              }
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print A4 Document
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Preview Box (Prescription Format) */}
        <div className="p-6 overflow-y-auto flex-1 font-sans text-xs bg-slate-100">
          <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm space-y-4 max-w-2xl mx-auto">
            {/* Header with Logo & Doctor Details */}
            <div className="flex justify-between items-start pb-3 border-b-2 border-slate-300">
              <img src={hospitalConfig.branding.logoUrl} alt={hospitalConfig.name} className="h-12 w-auto object-contain" />
              <div className="text-right">
                {(() => {
                  const activeDoc = getDoctorProfile(admission.consultantDoctor);
                  return (
                    <>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {activeDoc?.name || admission.consultantDoctor || "Consulting Doctor"}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-900">{activeDoc?.degrees}</p>
                      <p className="text-[10px] text-slate-500">
                        {activeDoc?.registrationNumber ? `Reg. No. ${activeDoc.registrationNumber} • ` : ""}
                        {activeDoc?.designation || hospitalConfig.tagline}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Document Banner */}
            <div className="text-center bg-slate-50 border border-slate-200 py-1 rounded">
              <span className="text-[11px] font-black tracking-wider text-slate-900 uppercase">
                Inpatient Discharge Summary &amp; Clinical Report
              </span>
            </div>

            {/* Patient Information Bar */}
            <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-200">
              <div>
                <span className="font-mono text-slate-600">{admission.uhid}</span> •{" "}
                <span className="font-mono font-bold text-slate-900">{admission.ipdNumber}</span> :{" "}
                <strong className="text-slate-900 text-sm">MR./MRS. {admission.name.toUpperCase()}</strong>{" "}
                <span>
                  ({admission.age} Y, {admission.sex})
                </span>
                {admission.phone && <span> - Ph: {admission.phone}</span>}
              </div>
              <div className="text-right font-bold text-slate-800">
                {admission.ward} (Bed {admission.bedNumber})
              </div>
            </div>

            {/* Stay Metadata Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px]">DOA (Admission)</span>
                <span className="font-bold">{admission.admissionDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DOD (Discharge)</span>
                <span className="font-bold text-slate-900">
                  {admission.dischargeDate || new Date().toISOString().split("T")[0]}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Stay Duration</span>
                <span className="font-bold">
                  {calculateStayDays(admission.admissionDate, admission.dischargeDate)} Days
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Department</span>
                <span className="font-bold">{admission.department || "Orthopaedics"}</span>
              </div>
            </div>

            {/* Clinical Section: Diagnosis */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                1. Clinical Diagnosis
              </div>
              <div className="p-3 space-y-1 text-xs">
                <p>
                  <strong>Final Diagnosis : </strong>
                  <span className="font-extrabold text-slate-900">
                    {admission.dischargeSummary?.finalDiagnosis || admission.provisionalDiagnosis}
                  </span>
                </p>
                {admission.reasonForAdmission && (
                  <p className="text-[11px] text-slate-600">
                    <strong>Reason for Admission : </strong>
                    {admission.reasonForAdmission}
                  </p>
                )}
                {(admission.medicalHistory || admission.allergies) && (
                  <p className="text-[10px] text-slate-500 pt-0.5">
                    {admission.medicalHistory && (
                      <span>
                        <strong>History: </strong>
                        {admission.medicalHistory}{" "}
                      </span>
                    )}
                    {admission.allergies && (
                      <span className="text-red-700 font-bold">
                        • <strong>Allergies: </strong>
                        {admission.allergies}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Clinical Section: Surgeries / Procedures Done During Stay */}
            {admission.procedures && admission.procedures.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                  2. Surgeries / Procedures Performed
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600">
                        <th className="p-2">Procedure</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Operating Surgeon / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admission.procedures.map((proc, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-2 font-bold text-slate-900">{proc.name}</td>
                          <td className="p-2 font-mono text-slate-600">{proc.date}</td>
                          <td className="p-2 text-slate-700">
                            {proc.surgeon} {proc.notes ? `(${proc.notes})` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Clinical Section: Hospital Course & Treatment */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                Hospital Course &amp; Treatment Given
              </div>
              <div className="p-3 text-xs text-slate-800 leading-relaxed">
                {admission.dischargeSummary?.treatmentGiven ||
                  `Managed with inpatient supportive clinical and medical care in ${admission.ward}.`}
              </div>
            </div>

            {/* Clinical Section: Key Investigations */}
            {admission.investigations && admission.investigations.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-800 border-b border-slate-200">
                  Investigations Performed
                </div>
                <div className="p-2.5 flex flex-wrap gap-2 text-[11px]">
                  {admission.investigations.map((inv, idx) => (
                    <span key={idx} className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-700">
                      <strong>{inv.name}</strong> ({inv.date})
                      {inv.result ? `: ${inv.result}` : ` [${inv.status}]`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discharge Medications (Rx) Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 flex items-center justify-between border-b border-slate-200">
                <span className="text-[11px] font-black text-slate-900">
                  ℞ DISCHARGE MEDICATIONS (TO CONTINUE AT HOME)
                </span>
                <span className="text-[10px] text-slate-500 italic">As Prescribed</span>
              </div>
              <div className="p-3 text-xs">
                <p className="whitespace-pre-line leading-relaxed font-mono text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200">
                  {admission.dischargeSummary?.dischargeMeds || "Continue prescribed oral medications."}
                </p>
              </div>
            </div>

            {/* Condition at Discharge & Follow-up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">
                  Condition at Discharge:
                </span>
                <span className="font-bold text-slate-900">
                  {admission.dischargeSummary?.conditionAtDischarge || "Cured / Stable"}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">
                  Follow-up Review (फेरतपासणी):
                </span>
                <span className="font-bold text-slate-900">
                  {admission.dischargeSummary?.followupDate || "After 7 days in OPD"}
                </span>
              </div>
            </div>

            {/* Advice & Warning */}
            {admission.dischargeSummary?.doctorNotes && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Diet &amp; Post-Discharge Instructions:
                </span>
                <p className="text-slate-800 mt-0.5">{admission.dischargeSummary.doctorNotes}</p>
              </div>
            )}

            {/* Doctor Signature & Hospital Footer */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
              <div className="text-[10px] text-red-700 font-semibold max-w-sm">
                * Emergency: Report immediately to {hospitalConfig.name} Casualty in case of high fever, acute pain, or
                bleeding.
              </div>
              <div className="text-center min-w-[130px]">
                {dischargeIncludeSignature && (() => {
                  const isGyn = /shillpa|shilpa|gyn/i.test(admission.consultantDoctor || "");
                  const sigUrl = isGyn ? "/sign1.png" : "/sign.png";
                  return <img src={sigUrl} alt="Signature" className="h-9 mx-auto object-contain" />;
                })()}
                <div className="font-bold text-xs text-slate-900 mt-1">
                  {admission.consultantDoctor || "Dr. Vipeen Raut"}
                </div>
                <div className="text-[10px] text-slate-500">Authorized Consultant</div>
                {!dischargeIncludeSignature && (
                  <div className="text-[9px] text-slate-400 italic mt-0.5">(Name only, no sign image)</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <span className="text-xs text-slate-500">
            A4 official letterhead template with watermark &amp; doctor credentials.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(
                  `/print-discharge?id=${admission.id}&includeSignature=${dischargeIncludeSignature}`,
                  "_blank"
                )
              }
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Official Discharge Summary (A4)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

