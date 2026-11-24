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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
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
        } max-h-[90vh] overflow-y-auto p-3 sm:p-4 shadow-2xl border border-slate-200 space-y-3 print:max-h-none print:overflow-visible print:p-0 print:border-none print:shadow-none`}
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
        {/* The Bill-Sized Receipt Container - Clean B&W Normal Hospital Receipt */}
        <div
          id="inpatient-small-receipt"
          className="border border-black rounded-lg p-5 bg-white space-y-3 text-black shadow-xs font-sans"
        >
          {/* Header matching Hospital Standard Receipts */}
          <div className="text-center pb-2.5 border-b border-black">
            <div className="flex items-center justify-center gap-2">
              <img
                src={hospitalConfig.branding.logoUrl}
                alt={hospitalConfig.name}
                className="h-8 w-auto object-contain"
              />
              <h2 className="text-base font-black tracking-tight text-black uppercase">
                {hospitalConfig.legalName || "CORTEX HOSPITAL"}
              </h2>
            </div>
            <p className="text-[11px] text-gray-800 mt-0.5">{hospitalConfig.address.fullFormatted}</p>
            <p className="text-[10px] text-gray-700 font-mono">Cell: +91 {hospitalConfig.contacts.mobile}</p>

            <div className="inline-block mt-2 px-3 py-0.5 border border-black text-black text-[11px] font-black uppercase tracking-widest">
              PAYMENT RECEIPT
            </div>
          </div>

          {/* Receipt Meta (Receipt No & Date) */}
          <div className="flex items-center justify-between text-xs font-mono border-b border-black pb-2">
            <div>
              <span className="text-gray-700 font-semibold mr-1">Receipt No:</span>
              <strong className="text-black font-bold font-mono">{adv.receiptNumber || `CRX-REC-${pt.ipdNumber}`}</strong>
            </div>
            <div className="text-right">
              <span className="text-gray-700 font-semibold mr-1">Date:</span>
              <strong className="text-black font-bold font-mono">
                {(() => {
                  const dStr = adv.date || new Date().toISOString().split("T")[0];
                  try {
                    const parts = dStr.split("-");
                    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    return dStr;
                  } catch {
                    return dStr;
                  }
                })()}
              </strong>
            </div>
          </div>

          {/* Patient Information Grid */}
          <div className="text-xs border-b border-black pb-2.5 space-y-1.5">
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-3 font-semibold text-gray-700">Patient Name:</div>
              <div className="col-span-9 font-bold text-black uppercase">{pt.name}</div>
            </div>
            <div className="grid grid-cols-12 gap-1 text-[11.5px]">
              <div className="col-span-3 font-semibold text-gray-700">UHID:</div>
              <div className="col-span-9 font-mono font-bold text-black">{pt.uhid}</div>
            </div>
            <div className="grid grid-cols-12 gap-1 text-[11.5px]">
              <div className="col-span-3 font-semibold text-gray-700">IPD No:</div>
              <div className="col-span-9 font-mono font-bold text-black">{pt.ipdNumber}</div>
            </div>
            <div className="grid grid-cols-12 gap-1 text-[11.5px]">
              <div className="col-span-3 font-semibold text-gray-700">Ward &amp; Bed:</div>
              <div className="col-span-9 font-medium text-black">
                {pt.ward} ({pt.bedNumber.replace(/^Bed\s*/i, "Bed ")})
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1 text-[11.5px]">
              <div className="col-span-3 font-semibold text-gray-700">Consultant:</div>
              <div className="col-span-9 font-semibold text-black">{pt.consultantDoctor}</div>
            </div>
          </div>

          {/* Clean Normal Particulars & Amount Table */}
          <table className="w-full border-collapse border border-black text-xs my-2">
            <thead>
              <tr className="border-b border-black bg-gray-100 font-bold text-black">
                <th className="p-2 text-left border-r border-black">Particulars / Description</th>
                <th className="p-2 text-center w-28 border-r border-black">Payment Mode</th>
                <th className="p-2 text-right w-32">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black">
                <td className="p-2 text-left border-r border-black">
                  <div className="font-bold text-black">
                    {adv.notes?.trim() ? adv.notes : "Inpatient Advance Payment / Deposit"}
                  </div>
                  <div className="text-[10.5px] text-gray-600 mt-0.5">
                    Received towards Inpatient Stay Charges
                  </div>
                </td>
                <td className="p-2 text-center font-bold text-black uppercase border-r border-black font-mono">
                  {adv.mode || "Cash"}
                </td>
                <td className="p-2 text-right font-mono font-bold text-black text-sm">
                  {Number(adv.amount || 0).toFixed(2)}
                </td>
              </tr>
              <tr className="bg-gray-50/80 font-bold border-t border-black">
                <td colSpan={2} className="p-2 text-right border-r border-black font-bold">
                  Total Amount Received:
                </td>
                <td className="p-2 text-right font-mono font-bold text-sm">
                  Rs. {Number(adv.amount || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="text-xs py-1 border-b border-black">
            <span className="font-semibold text-gray-700">Amount in Words: </span>
            <span className="font-bold text-black italic">
              Rupees {amountWords} Only
            </span>
          </div>

          {/* Signatures & Footer */}
          <div className="pt-4 flex justify-between items-end text-xs">
            <div>
              <span className="text-gray-500 block text-[10px]">Received By:</span>
              <span className="font-semibold text-black">{adv.receivedBy || "Billing Desk"}</span>
            </div>
            <div className="text-center w-40">
              <img src={docSig} alt="Signature" className="h-8 w-auto object-contain mx-auto mb-1" />
              <div className="border-t border-black pt-1 font-bold text-black text-[11px]">
                Authorized Signatory
              </div>
            </div>
          </div>

          <div className="text-center text-[9px] text-gray-500 pt-1.5 border-t border-gray-300">
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

