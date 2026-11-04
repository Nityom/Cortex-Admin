"use client";

import React from "react";
import { Receipt, Pencil, Printer } from "lucide-react";
import { IPDAdmission, calculateRunningBill, numberToWordsINR } from "./types";

interface IpdPrintReceiptModalProps {
  data: {
    patient: IPDAdmission;
    advance: any;
  };
  setData: (data: { patient: IPDAdmission; advance: any } | null) => void;
  receiptPageSize: "A6" | "A7" | "A4";
  setReceiptPageSize: (size: "A6" | "A7" | "A4") => void;
  hospitalConfig: any;
  onClose: () => void;
  onOpenEditReceipt: (patient: IPDAdmission, advance: any) => void;
  onOpenRecordPayment: (patient: IPDAdmission) => void;
}

export function IpdPrintReceiptModal({
  data,
  setData,
  receiptPageSize,
  setReceiptPageSize,
  hospitalConfig,
  onClose,
  onOpenEditReceipt,
  onOpenRecordPayment,
}: IpdPrintReceiptModalProps) {
  const pt = data.patient;
  const adv = data.advance;
  const ptBill = calculateRunningBill(pt);
  const amountWords = numberToWordsINR(adv.amount || 0);
  const allPatientAdvances = pt.advances || [];
  const isGyno = /shillpa|shilpa|gyn/i.test(pt.consultantDoctor || "");
  const docSig = isGyno ? "/sign1.png" : "/sign.png";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Embedded Print CSS to print receipt matching bill size (A6 / A7 / A4) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: ${receiptPageSize === "A7" ? "74mm 105mm" : receiptPageSize === "A6" ? "105mm 148mm" : "A4 portrait"};
            margin: ${receiptPageSize === "A7" ? "2mm" : "4mm"};
          }
          body * {
            visibility: hidden !important;
          }
          #inpatient-small-receipt, #inpatient-small-receipt * {
            visibility: visible !important;
          }
          #inpatient-small-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: ${receiptPageSize === "A7" ? "3mm" : "5mm"} !important;
            border: 1px solid #000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `,
        }}
      />

      <div
        className={`bg-white rounded-2xl w-full ${
          receiptPageSize === "A7" ? "max-w-sm" : "max-w-lg"
        } p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 print:p-0 print:border-none print:shadow-none`}
      >
        {/* Top Navigation & Paper Size Selector */}
        <div className="no-print space-y-2 pb-2 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Receipts ({allPatientAdvances.length}):
              </span>
              {allPatientAdvances.map((item: any, idx: number) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setData({ patient: pt, advance: item })}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                    adv.id === item.id
                      ? "bg-emerald-600 text-white shadow-2xs font-bold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  #{idx + 1}: ₹{item.amount.toLocaleString("en-IN")}
                </button>
              ))}
            </div>

            {/* Paper Size Selector (Matches Bills A6 / A7 / A4) */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setReceiptPageSize("A6")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  receiptPageSize === "A6"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A6 (Bill Size)
              </button>
              <button
                type="button"
                onClick={() => setReceiptPageSize("A7")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  receiptPageSize === "A7"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A7 (Pocket)
              </button>
              <button
                type="button"
                onClick={() => setReceiptPageSize("A4")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  receiptPageSize === "A4"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A4
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Selected Paper: <strong>{receiptPageSize} Portrait</strong> (Same as Hospital Bills)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenEditReceipt(pt, adv)}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold whitespace-nowrap border border-emerald-200 flex items-center gap-1 cursor-pointer"
                title="Edit amount, mode, or notes of this receipt"
              >
                <Pencil className="w-3 h-3" />
                Edit Receipt
              </button>
              <button
                type="button"
                onClick={() => onOpenRecordPayment(pt)}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold whitespace-nowrap border border-emerald-200 cursor-pointer"
              >
                + Add Payment
              </button>
            </div>
          </div>
        </div>

        {/* The Bill-Sized Receipt Container */}
        <div
          id="inpatient-small-receipt"
          className="border border-slate-300 rounded-xl p-4 bg-white space-y-2.5 text-slate-900 shadow-xs"
        >
          {/* Header matching Hospital Bills */}
          <div className="text-center pb-2 border-b border-slate-300">
            <div className="flex items-center justify-center gap-2">
              <img
                src={hospitalConfig.branding.logoUrl}
                alt={hospitalConfig.name}
                className="h-7 w-auto object-contain"
              />
              <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                {hospitalConfig.legalName}
              </h2>
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5">{hospitalConfig.address.fullFormatted}</p>
            <p className="text-[9px] text-slate-500 font-mono">Cell: +91 {hospitalConfig.contacts.mobile}</p>

            <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded">
              INPATIENT PAYMENT RECEIPT
            </div>
          </div>

          {/* Receipt Meta */}
          <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-200 pb-1.5">
            <div>
              <span className="text-slate-500 text-[10px] block">Receipt No:</span>
              <strong className="text-slate-900">{adv.receiptNumber || `CRX-REC-${pt.ipdNumber}`}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">Date:</span>
              <strong className="text-slate-900">{adv.date || new Date().toISOString().split("T")[0]}</strong>
            </div>
          </div>

          {/* Patient Information Box */}
          <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Patient Name:</span>
              <strong className="text-slate-900 font-bold">{pt.name}</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">UHID:</span>
              <span className="font-mono font-bold text-slate-800">{pt.uhid}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">IPD No:</span>
              <span className="font-mono font-bold text-emerald-700">{pt.ipdNumber}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Ward &amp; Bed:</span>
              <span className="font-semibold text-slate-800">
                {pt.ward} (Bed {pt.bedNumber})
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Consultant:</span>
              <span className="font-semibold text-slate-800">{pt.consultantDoctor}</span>
            </div>
          </div>

          {/* Prominent Amount Box */}
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              AMOUNT RECEIVED
            </span>
            <div className="text-2xl font-black font-mono text-emerald-950 my-0.5">
              ₹{Number(adv.amount || 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] font-bold text-emerald-950 italic">{amountWords}</p>
            <div className="mt-1.5 pt-1.5 border-t border-emerald-200 flex justify-between text-[10px] text-emerald-900 font-semibold">
              <span>
                Mode: <strong>{adv.mode || "Cash"}</strong>
              </span>
              <span>{adv.notes || "Inpatient Stay Payment"}</span>
            </div>
          </div>

          {/* Running Account Ledger Status */}
          <div className="p-2 border border-slate-200 rounded-lg text-[10px] space-y-1 bg-white">
            <div className="flex justify-between text-slate-600">
              <span>Total Stay Charges So Far:</span>
              <span className="font-mono font-bold text-slate-800">₹{ptBill.grossTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Total Advance Receipts Credited:</span>
              <span className="font-mono font-bold">₹{ptBill.totalAdvances.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
              <span>Current Net Balance Due:</span>
              <span className="font-mono text-xs">₹{ptBill.balanceDue.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-2 flex justify-between items-end border-t border-slate-300 text-[10px]">
            <div>
              <span className="text-slate-400 block text-[9px]">Received By:</span>
              <span className="font-semibold text-slate-800">{adv.receivedBy || "Billing Desk"}</span>
            </div>
            <div className="text-right">
              <img src={docSig} alt="Signature" className="h-7 w-auto object-contain ml-auto mb-0.5" />
              <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-800">
                Authorized Signatory
              </div>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 pt-0.5">
            Official computer generated receipt • All disputes subject to Wardha jurisdiction only
          </div>
        </div>

        {/* Modal Buttons (no-print) */}
        <div className="no-print pt-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenRecordPayment(pt)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              + Record Next Payment
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Receipt ({receiptPageSize})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
