"use client";

import React from "react";
import {
  Building2,
  Settings,
  ArrowLeftRight,
  HeartPulse,
  Search,
  Bed,
  Phone,
  Stethoscope,
  Receipt,
  IndianRupee,
  Pencil,
  LogOut,
  Printer,
} from "lucide-react";
import { IPDAdmission, WardBedConfigItem, DOCTORS, calculateStayDays, calculateRunningBill } from "./types";

interface IpdBedMatrixTabProps {
  wardBedConfig: WardBedConfigItem[];
  occupiedBeds: Map<string, IPDAdmission>;
  activeAdmissions: IPDAdmission[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedWardFilter: string;
  setSelectedWardFilter: (ward: string) => void;
  selectedDoctorFilter: string;
  setSelectedDoctorFilter: (doc: string) => void;
  onOpenBedConfigModal: () => void;
  onSelectBedForAdmit: (ward: string, bed: string) => void;
  onOpenProfile: (adm: IPDAdmission) => void;
  onOpenBilling: (adm: IPDAdmission) => void;
  onOpenRecordPayment: (adm: IPDAdmission) => void;
  onOpenPatientReceipt: (adm: IPDAdmission) => void;
  onOpenEditAdmission: (adm: IPDAdmission) => void;
  onOpenDischarge: (adm: IPDAdmission) => void;
  onOpenPrintTicket: (adm: IPDAdmission) => void;
  onOpenTransferBed: (adm: IPDAdmission) => void;
  onSwitchToAdmitTab: () => void;
}

export default function IpdBedMatrixTab({
  wardBedConfig,
  occupiedBeds,
  activeAdmissions,
  searchQuery,
  setSearchQuery,
  selectedWardFilter,
  setSelectedWardFilter,
  selectedDoctorFilter,
  setSelectedDoctorFilter,
  onOpenBedConfigModal,
  onSelectBedForAdmit,
  onOpenProfile,
  onOpenBilling,
  onOpenRecordPayment,
  onOpenPatientReceipt,
  onOpenEditAdmission,
  onOpenDischarge,
  onOpenPrintTicket,
  onOpenTransferBed,
  onSwitchToAdmitTab,
}: IpdBedMatrixTabProps) {
  return (
    <div className="space-y-6">
      {/* WARD & BED OCCUPANCY VISUAL MATRIX (EDITABLE) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                Ward & Bed Occupancy
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded border border-slate-200">
                  Editable Matrix
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Click an occupied bed to view clinical sheet, or vacant bed to assign.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Vacant
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Occupied
            </span>
            <button
              type="button"
              onClick={onOpenBedConfigModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition shadow-2xs ml-2 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Edit Beds & Rates
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {wardBedConfig.map((wConfig) => (
            <div key={wConfig.ward} className="bg-slate-50/60 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{wConfig.ward}</span>
                <span className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  ₹{wConfig.dailyRate}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {wConfig.beds.map((bedId) => {
                  const occ = occupiedBeds.get(bedId);
                  const isOccupied = !!occ;
                  return (
                    <div
                      key={bedId}
                      onClick={() => {
                        if (isOccupied) {
                          onOpenProfile(occ);
                        } else {
                          onSelectBedForAdmit(wConfig.ward, bedId);
                        }
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition text-left relative overflow-hidden ${
                        isOccupied
                          ? "bg-slate-50 border-slate-300 hover:bg-slate-100"
                          : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900">{bedId}</span>
                        <span className={`w-2 h-2 rounded-full ${isOccupied ? "bg-amber-500" : "bg-emerald-500"}`} />
                      </div>
                      {isOccupied ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-900 truncate">{occ.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Day {calculateStayDays(occ.admissionDate)} • {occ.uhid}
                          </p>
                          <button
                            type="button"
                            title="Transfer bed"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTransferBed(occ);
                            }}
                            className="mt-1.5 w-full py-0.5 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <ArrowLeftRight className="w-2.5 h-2.5 text-slate-500" />
                            Transfer Bed
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-slate-400">Vacant +</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVE INPATIENTS LIST */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* List Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Currently Admitted Inpatients ({activeAdmissions.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, UHID, IPD No..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-56"
              />
            </div>

            <select
              value={selectedWardFilter}
              onChange={(e) => setSelectedWardFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="All">All Rooms / Wards</option>
              {wardBedConfig.map((w) => (
                <option key={w.ward} value={w.ward}>
                  {w.ward}
                </option>
              ))}
            </select>

            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
            >
              <option value="All">All Doctors</option>
              {DOCTORS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List Content */}
        {activeAdmissions.length === 0 ? (
          <div className="p-12 text-center">
            <Bed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Inpatients Admitted</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">All beds are currently vacant or match no filter.</p>
            <button
              type="button"
              onClick={onSwitchToAdmitTab}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              + Admit First Patient
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeAdmissions.map((adm) => {
              const bill = calculateRunningBill(adm);
              return (
                <div
                  key={adm.id}
                  className="p-4 hover:bg-slate-50/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Patient Details */}
                  <div className="flex items-start gap-3.5">
                    <div className="text-center min-w-[56px] bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-2 shadow-2xs">
                      <span className="text-[9px] font-bold block uppercase tracking-wider text-slate-500">BED</span>
                      <span className="text-base font-black text-slate-900">{adm.bedNumber}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{adm.name}</h3>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {adm.uhid}
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {adm.ipdNumber}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {adm.ward}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>
                          {adm.age}y • {adm.sex}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {adm.phone}
                        </span>
                        <span>
                          Doctor: <strong className="text-slate-800 font-medium">{adm.consultantDoctor}</strong>
                        </span>
                        <span>
                          Admitted: <strong className="text-slate-800 font-medium">{adm.admissionDate}</strong> (
                          {bill.days} {bill.days === 1 ? "day" : "days"})
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded w-fit">
                        <span className="font-semibold text-slate-500 uppercase text-[10px]">Diagnosis: </span>
                        <span className="font-medium text-slate-900">{adm.provisionalDiagnosis}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Running Bill & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    {/* Running Bill Badge */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Running Balance</div>
                      <div className="flex items-center justify-end gap-1 font-bold text-sm">
                        <span className={bill.balanceDue > 0 ? "text-slate-900" : "text-emerald-700"}>
                          ₹{bill.balanceDue.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] font-normal text-slate-400">
                          (Adv: ₹{bill.totalAdvances.toLocaleString("en-IN")})
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(adm)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        title="Clinical Stay Sheet (Vitals, Notes, Meds)"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        Clinical Sheet
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenBilling(adm)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                        title="Running Bill & Advances"
                      >
                        <Receipt className="w-3.5 h-3.5 text-slate-500" />
                        Running Bill
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenRecordPayment(adm)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        title="Record payment & give small receipt to patient"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />+ Record Payment
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPatientReceipt(adm)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                        title="View / Print Small Payment Receipts"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        Receipts ({adm.advances?.length || 0})
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenEditAdmission(adm)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                        title="Edit Inpatient Details, Ward, Bed & Rates"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDischarge(adm)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                        title="Discharge & Final Settlement"
                      >
                        <LogOut className="w-3.5 h-3.5 text-slate-500" />
                        Discharge
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPrintTicket(adm)}
                        className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-xs transition cursor-pointer"
                        title="Print Admission Bed Ticket"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
