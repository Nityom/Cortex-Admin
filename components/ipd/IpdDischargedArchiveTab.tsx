"use client";

import React from "react";
import { Search, FileText, Receipt, Pencil, IndianRupee } from "lucide-react";
import { IPDAdmission, calculateStayDays } from "./types";

interface IpdDischargedArchiveTabProps {
  dischargedAdmissions: IPDAdmission[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenEditAdmission: (adm: IPDAdmission) => void;
  onOpenDischargeModal: (adm: IPDAdmission) => void;
  onGenerateFinalBill: (adm: IPDAdmission) => void;
  onOpenPatientReceipt: (adm: IPDAdmission) => void;
  onOpenPrintDischarge: (adm: IPDAdmission) => void;
}

export default function IpdDischargedArchiveTab({
  dischargedAdmissions,
  searchQuery,
  setSearchQuery,
  onOpenEditAdmission,
  onOpenDischargeModal,
  onGenerateFinalBill,
  onOpenPatientReceipt,
  onOpenPrintDischarge,
}: IpdDischargedArchiveTabProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Discharged Patients Archive</h2>
          <p className="text-xs text-slate-500">
            Completed admissions, discharge summaries, and settled hospital bills. Editable anytime.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, IPD, room..."
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none w-full"
          />
        </div>
      </div>

      {dischargedAdmissions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm">No discharged inpatient records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-3 px-3">IPD No.</th>
                <th className="py-3 px-3">UHID</th>
                <th className="py-3 px-3">Patient Info</th>
                <th className="py-3 px-3">Room / Bed</th>
                <th className="py-3 px-3">Consultant Doctor</th>
                <th className="py-3 px-3">Stay Period & Times</th>
                <th className="py-3 px-3">Condition & Diagnosis</th>
                <th className="py-3 px-3">Settlement</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dischargedAdmissions.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{adm.ipdNumber}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{adm.uhid}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{adm.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{adm.phone}</span>
                      <span>•</span>
                      <span>
                        {adm.age}y / {adm.sex}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    <div>{adm.ward}</div>
                    <span className="text-[11px] text-slate-500 font-mono">{adm.bedNumber}</span>
                  </td>
                  <td className="py-3 px-3">{adm.consultantDoctor}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800">
                      {adm.admissionDate} {adm.admissionTime ? `(${adm.admissionTime})` : ""}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      → {adm.dischargeDate || "N/A"} {adm.dischargeTime ? `(${adm.dischargeTime})` : ""}
                    </div>
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] bg-slate-100 rounded text-slate-700 font-semibold">
                      {calculateStayDays(adm.admissionDate, adm.dischargeDate)} billable days
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                      {adm.dischargeSummary?.conditionAtDischarge || "Discharged"}
                    </span>
                    {adm.dischargeSummary?.finalDiagnosis && (
                      <div
                        className="text-[11px] text-slate-600 mt-1 line-clamp-1"
                        title={adm.dischargeSummary.finalDiagnosis}
                      >
                        {adm.dischargeSummary.finalDiagnosis}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {adm.finalSettlement ? (
                      <div>
                        <div>₹{adm.finalSettlement.netTotal.toLocaleString("en-IN")}</div>
                        <span className="text-[10px] text-emerald-700 font-normal">
                          {adm.finalSettlement.paymentMode || "Settled"}
                        </span>
                      </div>
                    ) : (
                      "Settled"
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpenEditAdmission(adm)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Edit patient details, admission/discharge dates, times, notes anytime"
                    >
                      <Pencil className="w-3 h-3 text-amber-700" />
                      Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDischargeModal(adm)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Edit patient bill, charges, discharge date/time, and settlement"
                    >
                      <IndianRupee className="w-3 h-3 text-white" />
                      Edit Bill & Settle
                    </button>
                    <button
                      type="button"
                      onClick={() => onGenerateFinalBill(adm)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      title="View / Print Final Hospital Bill"
                    >
                      <FileText className="w-3 h-3 text-emerald-700" />
                      Final Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPatientReceipt(adm)}
                      className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      title="View all payment receipts"
                    >
                      <Receipt className="w-3 h-3 text-emerald-600" />
                      Receipts ({adm.advances?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPrintDischarge(adm)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-[11px]"
                    >
                      Summary
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
