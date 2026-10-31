"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { hospitalConfig } from "@/config/hospital";

function OPDCardContent() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "01";
  const name = searchParams.get("name") || "PATIENT NAME";
  let uhid = (searchParams.get("uhid") || searchParams.get("reference") || "CRX0001").replace(/^CH/i, 'CRX');
  if (name.toLowerCase() === "testing" && (uhid === "CRX0001" || uhid === "CH0001")) {
    uhid = "CRX0002";
  } else if (uhid === "CRX0002" && name.toLowerCase() !== "testing") {
    uhid = "CRX0003";
  }
  const age = searchParams.get("age") || "";
  const sex = searchParams.get("sex") || "";
  const phone = searchParams.get("phone") || "";
  const doctor = searchParams.get("doctor") || "Dr. Vipeen Raut";
  const dept = searchParams.get("dept") || "Orthopaedics & Joint Replacement";
  const bp = searchParams.get("bp") || "";
  const pulse = searchParams.get("pulse") || "";
  const spo2 = searchParams.get("spo2") || "";
  const height = searchParams.get("height") || "";
  const weight = searchParams.get("weight") || "";
  const bmi = searchParams.get("bmi") || "";
  const fee = searchParams.get("fee") || "250";
  const dateStr = searchParams.get("date") || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = searchParams.get("time") || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white flex flex-col items-center">
      <div className="no-print mb-4 flex gap-3">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition"
        >
          🖨️ Print OPD Card
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
        >
          Close
        </button>
      </div>

      <div className="w-[148mm] min-h-[210mm] bg-white border border-gray-300 print:border-0 shadow-lg print:shadow-none p-6 flex flex-col justify-between text-black">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <img src={hospitalConfig.branding.logoUrl} alt={hospitalConfig.name} className="h-12 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{hospitalConfig.name.toUpperCase()}</h1>
                <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                  {hospitalConfig.tagline}
                </p>
                <p className="text-[9px] text-slate-500">
                  {hospitalConfig.address.fullFormatted} | Ph: {hospitalConfig.contacts.phones.join(', ')}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="border-2 border-slate-900 rounded-lg px-3 py-1 bg-slate-50 text-center">
                <span className="text-[9px] font-bold block uppercase tracking-wider text-slate-600">TOKEN NO.</span>
                <span className="text-2xl font-black text-blue-700">#{token}</span>
              </div>
            </div>
          </div>

          {/* Subheader Title */}
          <div className="bg-slate-900 text-white text-center py-1 my-2 text-xs font-bold uppercase tracking-widest rounded">
            OUTPATIENT DEPARTMENT (OPD) REGISTRATION SLIP
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-3">
            <div>
              <span className="font-semibold text-slate-500">UHID / CR NO:</span>{" "}
              <strong className="text-slate-900 font-mono text-xs">{uhid}</strong>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-500">DATE & TIME:</span>{" "}
              <strong className="text-slate-900">{dateStr} {timeStr}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-500">PATIENT NAME:</span>{" "}
              <strong className="text-slate-900 uppercase font-bold text-xs">{name}</strong>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-500">AGE / GENDER:</span>{" "}
              <strong className="text-slate-900">{age ? `${age} Y` : "—"} / {sex || "—"}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-500">MOBILE NO:</span>{" "}
              <strong className="text-slate-900 font-mono">{phone || "—"}</strong>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-500">OPD FEE PAID:</span>{" "}
              <strong className="text-emerald-700 font-bold">₹{fee}</strong>
            </div>
          </div>

          {/* Doctor & Specialty Info */}
          <div className="border border-slate-200 rounded-lg p-2.5 mb-3 bg-white text-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CONSULTING DOCTOR</span>
                <span className="text-sm font-bold text-slate-900">{doctor}</span>
                <span className="text-[11px] text-slate-600 block">{dept}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CABIN / ROOM</span>
                <span className="text-xs font-semibold text-slate-800">OPD Room 1</span>
              </div>
            </div>
          </div>

          {/* Recorded Vitals Bar */}
          <div className="border border-slate-200 rounded-lg p-2.5 mb-4 bg-slate-50/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              RECORDED CLINICAL VITALS
            </span>
            <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block font-semibold text-[8.5px]">BP</span>
                <strong className="text-slate-800 text-[11px]">{bp || "—"}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block font-semibold text-[8.5px]">PULSE</span>
                <strong className="text-slate-800 text-[11px]">{pulse ? `${pulse} bpm` : "—"}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block font-semibold text-[8.5px]">SpO₂</span>
                <strong className="text-slate-800 text-[11px]">{spo2 ? `${spo2}%` : "—"}</strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block font-semibold text-[8.5px]">HT / WT</span>
                <strong className="text-slate-800 text-[11px]">
                  {height || "—"} / {weight ? `${weight} kg` : "—"}
                </strong>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="text-slate-400 block font-semibold text-[8.5px]">BMI</span>
                <strong className="text-slate-800 text-[11px]">{bmi || "—"}</strong>
              </div>
            </div>
          </div>

          {/* Doctor Clinical Notes Area for Physical Examination */}
          <div className="border border-dashed border-slate-300 rounded-lg p-3 min-h-[140px] relative">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              CLINICAL EXAMINATION / DOCTOR NOTES:
            </span>
            <div className="absolute bottom-2 right-3 text-right">
              <span className="text-[10px] text-slate-400 block">Doctor&apos;s Signature</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
          <div>
            <span>Please wait for your token to be called. Valid for 7 days from visit date.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <img src="/Svasth_logo.png" alt="Svasth HMS" className="h-3.5 w-auto object-contain inline-block" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintOPDCardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading OPD card...</div>}>
      <OPDCardContent />
    </Suspense>
  );
}
