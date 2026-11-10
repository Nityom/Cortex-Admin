"use client";

import React from "react";
import { Printer } from "lucide-react";
import { IPDAdmission } from "./types";
import { formatDate } from "@/lib/utils";

interface IpdPrintBedTicketModalProps {
  isOpen: boolean;
  admission: IPDAdmission | null;
  onClose: () => void;
}

export default function IpdPrintBedTicketModal({
  isOpen,
  admission,
  onClose,
}: IpdPrintBedTicketModalProps) {
  if (!isOpen || !admission) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="text-center border-b border-slate-200 pb-3">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">CORTEX HOSPITAL</h2>
          <p className="text-[11px] text-slate-500">INPATIENT ADMISSION CARD & BED TICKET</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block">IPD Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{admission.ipdNumber}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block">UHID</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{admission.uhid}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Patient Name:</span>
            <span className="font-bold text-slate-900">{admission.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Age / Sex / Mobile:</span>
            <span>
              {admission.age}y • {admission.sex} • {admission.phone}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Admission Date & Time:</span>
            <span>
              {formatDate(admission.admissionDate)} ({admission.admissionTime})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Consultant Doctor:</span>
            <span className="font-bold">{admission.consultantDoctor}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Allocated Bed:</span>
            <span className="font-black text-emerald-700">
              {admission.bedNumber} ({admission.ward})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Category:</span>
            <span>{admission.paymentCategory}</span>
          </div>
          <div className="col-span-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
            <span className="text-[10px] text-emerald-800 font-bold uppercase block">Provisional Diagnosis:</span>
            <span className="text-slate-900 font-medium">{admission.provisionalDiagnosis}</span>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Bed Ticket
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

