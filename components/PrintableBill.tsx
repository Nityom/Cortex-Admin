'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Check, X, ArrowLeft } from 'lucide-react';
import { hospitalConfig } from '@/config/hospital';

interface BillItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  total: number;
  itemType?: 'medicine' | 'procedure' | 'consultation' | 'other';
  date?: string;
}

interface PaymentTransaction {
  amount: number;
  payment_date: string;
  payment_method?: string;
}

interface PrintableBillProps {
  billNumber: string;
  billDate: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: string;
  patientSex?: string;
  items: BillItem[];
  subtotal: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  balance?: number;
  termsAndConditions?: string;
  showPrintButton?: boolean;
  signature?: string;
  doctorName?: string;
  paymentTransactions?: PaymentTransaction[];
  referenceNumber?: string;
  prescriptionId?: string;
  includeSignature?: boolean;
  defaultPageSize?: 'A6' | 'A7' | 'A4';
}

const PrintableBill: React.FC<PrintableBillProps> = ({
  billNumber,
  billDate,
  patientName,
  patientPhone,
  patientAge,
  patientSex,
  items = [],
  subtotal,
  discount = 0,
  total,
  amountPaid = 0,
  balance = 0,
  termsAndConditions = 'All disputes are subject to Wardha jurisdiction only',
  showPrintButton = true,
  signature = 'sign.png',
  doctorName = 'Dr. Vipeen Raut',
  paymentTransactions = [],
  referenceNumber,
  prescriptionId,
  includeSignature = true,
  defaultPageSize = 'A6',
}) => {
  const [includeSigState, setIncludeSigState] = useState<boolean>(includeSignature);
  const [pageSize, setPageSize] = useState<'A6' | 'A7' | 'A4'>(defaultPageSize);
  const [autoClose, setAutoClose] = useState<boolean>(true);

  // Initialize from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('cortex_bill_paper_size') as 'A6' | 'A7' | 'A4' | null;
      if (savedSize && ['A6', 'A7', 'A4'].includes(savedSize)) {
        setPageSize(savedSize);
      }
    }
  }, []);

  const handleSelectPageSize = (size: 'A6' | 'A7' | 'A4') => {
    setPageSize(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cortex_bill_paper_size', size);
    }
  };

  useEffect(() => {
    setIncludeSigState(includeSignature);
  }, [includeSignature]);

  // Listen to afterprint event to auto-close tab if enabled
  useEffect(() => {
    const handleAfterPrint = () => {
      if (autoClose) {
        window.close();
      }
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [autoClose]);

  const handlePrint = () => {
    window.print();
  };

  const getSignatureSrc = (sig?: string) => {
    if (!sig) return '/sign.png';
    if (sig.startsWith('data:') || sig.startsWith('http://') || sig.startsWith('https://')) {
      return sig;
    }
    return `/${sig.replace(/^\//, '')}`;
  };

  const formatCurrency = (amount: number) => {
    return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const convertIndianNumbering = (n: number): string => {
      if (n === 0) return 'Zero';

      const crore = Math.floor(n / 10000000);
      const lakh = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const remainder = n % 1000;

      let result = '';

      if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
      if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
      if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
      if (remainder > 0) result += convertLessThanThousand(remainder);

      return result.trim();
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let words = convertIndianNumbering(rupees) + ' Rupees';
    if (paise > 0) {
      words += ' and ' + convertIndianNumbering(paise) + ' Paise';
    }
    return words + ' Only';
  };

  const formattedBillNumber = (billNumber || '').replace(/^KSD-INV/i, 'CRX-INV').replace(/^KSD-/i, 'CRX-').replace(/^CH-INV/i, 'CRX-INV').replace(/^CH-/i, 'CRX-');

  // Dynamic CSS according to selected page size
  const getPageStyles = () => {
    if (pageSize === 'A7') {
      return `
        @media print {
          @page {
            size: 74mm 105mm portrait;
            margin: 2mm 2.5mm 2mm 2.5mm;
          }
          .printable-page {
            width: 100% !important;
            max-width: 74mm !important;
            min-height: 100mm !important;
            padding: 2mm 2.5mm !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
          }
        }
        @media screen {
          .printable-page {
            max-width: 74mm;
            min-height: 105mm;
            padding: 3mm 3.5mm;
            font-size: 8.5px;
          }
        }
      `;
    }

    if (pageSize === 'A6') {
      return `
        @media print {
          @page {
            size: 105mm 148mm portrait;
            margin: 3mm 4mm 3mm 4mm;
          }
          .printable-page {
            width: 100% !important;
            max-width: 105mm !important;
            min-height: 141mm !important;
            padding: 3mm 4mm !important;
            font-size: 9.5px !important;
            line-height: 1.25 !important;
          }
        }
        @media screen {
          .printable-page {
            max-width: 105mm;
            min-height: 148mm;
            padding: 4mm 5mm;
            font-size: 10px;
          }
        }
      `;
    }

    // Default A4
    return `
      @media print {
        @page {
          size: A4 portrait;
          margin: 6mm 8mm 6mm 8mm;
        }
        .printable-page {
          width: 100% !important;
          max-width: 210mm !important;
          min-height: 265mm !important;
          padding: 8mm 12mm !important;
          font-size: 12px !important;
        }
      }
      @media screen {
        .printable-page {
          max-width: 210mm;
          min-height: 275mm;
          padding: 10mm 14mm;
          font-size: 12px;
        }
      }
    `;
  };

  // Top action bar
  const renderToolbar = () => (
    <div className="no-print sticky top-0 z-50 bg-slate-900/95 backdrop-blur text-white shadow-xl border-b border-slate-700/80 px-3 py-2.5 mb-4">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Paper Size Selector */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <span className="text-[10px] font-extrabold text-slate-400 px-2 uppercase tracking-wider">Paper:</span>
          <button
            type="button"
            onClick={() => handleSelectPageSize('A6')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              pageSize === 'A6'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <span>📄</span>
            <span>A6 (105×148mm)</span>
            {pageSize === 'A6' && <span className="text-[10px] bg-emerald-800/60 px-1 rounded">Selected</span>}
          </button>
          <button
            type="button"
            onClick={() => handleSelectPageSize('A7')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              pageSize === 'A7'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <span>🧾</span>
            <span>A7 (74×105mm)</span>
            {pageSize === 'A7' && <span className="text-[10px] bg-emerald-800/60 px-1 rounded">Selected</span>}
          </button>
          <button
            type="button"
            onClick={() => handleSelectPageSize('A4')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              pageSize === 'A4'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <span>📋</span>
            <span>A4 (Full Sheet)</span>
            {pageSize === 'A4' && <span className="text-[10px] bg-emerald-800/60 px-1 rounded">Selected</span>}
          </button>
        </div>

        {/* Options */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={includeSigState}
              onChange={(e) => setIncludeSigState(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span>Include Sign</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none" title="Auto-close this tab after printing is finished">
            <input
              type="checkbox"
              checked={autoClose}
              onChange={(e) => setAutoClose(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span className="text-emerald-400 font-medium">Auto-close tab</span>
          </label>
        </div>

        {/* Print & Close Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill</span>
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition cursor-pointer"
            title="Close this window"
          >
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // A7 Mini Receipt Layout (74mm x 105mm)
  // -------------------------------------------------------------
  const renderA7Bill = () => (
    <div className="printable-page bg-white">
      <div>
        {/* Header */}
        <div className="text-center pb-1.5 mb-1.5 border-b border-gray-400">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <img
              src={hospitalConfig.branding.logoUrl}
              alt="Logo"
              className="h-5 w-auto object-contain logo-print"
            />
            <span className="font-extrabold text-[9px] uppercase tracking-wide text-gray-900 leading-tight">
              {hospitalConfig.name}
            </span>
          </div>
          <div className="text-[7px] text-gray-600 leading-tight">
            {hospitalConfig.address.city}, {hospitalConfig.address.state} • Ph: {hospitalConfig.contacts.mobile}
          </div>
          <div className="mt-0.5 text-[6.5px] font-bold uppercase tracking-wider text-gray-500 border-t border-dotted border-gray-300 pt-0.5">
            Bill of Supply (Original)
          </div>
        </div>

        {/* Invoice & Patient */}
        <div className="border border-gray-300 rounded p-1 mb-1.5 text-[7.5px] leading-tight bg-gray-50/40">
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Inv: {formattedBillNumber}</span>
            <span>{billDate}</span>
          </div>
          <div className="font-bold text-gray-900 mt-0.5 truncate">
            Pt: {patientName}
            {(patientAge || patientSex) && ` (${patientAge ? `${patientAge}Y` : ''}${patientSex ? `/${patientSex[0]}` : ''})`}
          </div>
          <div className="flex justify-between text-gray-600 mt-0.5">
            <span>UHID: {referenceNumber || '-'}</span>
            {patientPhone && <span>Ph: {patientPhone}</span>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-1.5 text-[7.5px]">
          <thead>
            <tr className="border-t border-b border-gray-800 bg-gray-100 font-bold text-gray-800">
              <th className="text-left py-0.5 px-0.5">ITEM</th>
              <th className="text-center py-0.5 px-0.5 w-7">QTY</th>
              <th className="text-right py-0.5 px-0.5 w-12">AMT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-0.5 px-0.5 font-medium text-gray-900 leading-tight">
                  {item.description}
                </td>
                <td className="py-0.5 px-0.5 text-center text-gray-700">
                  {item.quantity}
                </td>
                <td className="py-0.5 px-0.5 text-right font-bold text-gray-900">
                  ₹{Math.round(item.total).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="border-t border-gray-800 pt-1 space-y-0.5 text-[7.5px]">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>- {formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 border-t border-dotted border-gray-300 pt-0.5">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Received:</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-800 pt-0.5 text-[8px]">
            <span>Balance:</span>
            <span className={balance > 0 ? 'text-red-600' : 'text-emerald-700'}>{formatCurrency(balance)}</span>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-2 pt-1 border-t border-dotted border-gray-300 text-right">
          {includeSigState && (
            <div className="flex justify-end mb-0.5">
              <img
                src={getSignatureSrc(signature)}
                alt="Signature"
                className="max-h-5 w-auto object-contain"
              />
            </div>
          )}
          <div className="text-[7.5px] font-bold text-gray-900">{doctorName}</div>
          <div className="text-[6.5px] text-gray-500">Authorized Signatory</div>
        </div>
      </div>

      <div className="mt-auto pt-1 border-t border-gray-200 text-[6.5px] text-gray-400 flex justify-between">
        <span>Wardha jurisdiction</span>
        <span>Svaasth HMS</span>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // A6 Receipt Layout (105mm x 148mm) - RECOMMENDED
  // -------------------------------------------------------------
  const renderA6Bill = () => (
    <div className="printable-page bg-white">
      <div>
        {/* Header */}
        <div className="pb-2 mb-2 border-b border-gray-400">
          <div className="flex justify-between items-center text-[8px] text-gray-500 mb-1">
            <span className="font-bold tracking-wider text-gray-700 uppercase">BILL OF SUPPLY</span>
            <span className="border border-gray-300 px-1.5 py-0.2 rounded font-medium">ORIGINAL FOR RECIPIENT</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <img
                src={hospitalConfig.branding.logoUrl}
                alt="Logo"
                className="h-8 w-auto object-contain logo-print"
              />
              <div className="text-left">
                <h1 className="font-extrabold text-[12px] uppercase tracking-wide text-gray-900 leading-tight">
                  {hospitalConfig.name}
                </h1>
                <p className="text-[8px] font-semibold text-emerald-800">Cortex Hospital & Research Centre</p>
              </div>
            </div>
            <p className="text-[8.5px] text-gray-700 leading-tight mt-1">
              {hospitalConfig.address.fullFormatted}
            </p>
            <p className="text-[8.5px] text-gray-700 font-medium">
              Mobile: +91 {hospitalConfig.contacts.mobile}
            </p>
          </div>
        </div>

        {/* Invoice & Patient Info Box */}
        <div className="border border-gray-300 rounded-lg p-2 mb-2 text-[9.5px] bg-gray-50/40">
          <div className="flex justify-between items-center font-bold pb-1 border-b border-gray-200 text-gray-900">
            <span>Invoice No: <span className="font-mono">{formattedBillNumber}</span></span>
            <span>Date: {billDate}</span>
          </div>
          <div className="pt-1 flex justify-between items-start">
            <div>
              <div className="font-bold text-gray-900 text-[10px]">{patientName}</div>
              <div className="text-[8.5px] text-gray-600 mt-0.5">
                {(patientAge || patientSex) && (
                  <span>Age/Sex: {patientAge ? `${patientAge}Y` : ''} {patientSex ? `• ${patientSex}` : ''} &nbsp;</span>
                )}
                {patientPhone && <span>• Ph: {patientPhone}</span>}
              </div>
            </div>
            <div className="text-right text-[8.5px] text-gray-600 space-y-0.5">
              {referenceNumber && (
                <div>UHID: <span className="font-mono font-bold text-gray-900">{referenceNumber}</span></div>
              )}
              {prescriptionId && !['DIRECT_BILL', 'OPD_DIRECT', 'IPD_DIRECT'].includes(prescriptionId) && (
                <div>Rx: <span className="font-mono font-bold text-emerald-800">#{prescriptionId.slice(-6)}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-2 text-[9px]">
          <thead>
            <tr className="border-t-2 border-b-2 border-gray-800 bg-gray-100 font-bold text-gray-800">
              <th className="text-left py-1 px-1.5">ITEMS / SERVICES</th>
              <th className="text-center py-1 px-1 w-10">QTY</th>
              <th className="text-right py-1 px-1 w-14">RATE</th>
              <th className="text-right py-1 px-1.5 w-16">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-1 px-1.5 font-medium text-gray-900 leading-snug">
                  <div>{item.description}</div>
                  {item.date && (
                    <div className="text-[7.5px] text-gray-500">
                      {new Date(item.date).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </td>
                <td className="py-1 px-1 text-center text-gray-800">
                  {item.quantity}
                </td>
                <td className="py-1 px-1 text-right text-gray-700">
                  ₹{item.unitPrice.toLocaleString('en-IN')}
                </td>
                <td className="py-1 px-1.5 text-right font-bold text-gray-900">
                  ₹{Math.round(item.total).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Signature */}
        <div className="flex justify-between items-start gap-2 pt-1 border-t border-gray-800">
          {/* Left: Words & Terms */}
          <div className="w-1/2 text-[8px] space-y-1">
            <div className="bg-gray-50 p-1.5 rounded border border-gray-200 leading-tight">
              <span className="font-bold text-gray-700">Amount in Words: </span>
              <span className="italic text-gray-600">{numberToWords(total)}</span>
            </div>
            <div className="text-[7.5px] text-gray-500 leading-tight">
              {termsAndConditions}
            </div>
          </div>

          {/* Right: Calculations */}
          <div className="w-1/2 space-y-0.5 text-[9px]">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-300 pt-0.5">
              <span>Total Amount:</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {paymentTransactions.length > 0 ? (
              paymentTransactions.map((txn, i) => (
                <div key={i} className="flex justify-between text-[8px] text-gray-600">
                  <span>Paid ({txn.payment_method || 'Cash'}):</span>
                  <span>{formatCurrency(txn.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-gray-700">
                <span>Received Amount:</span>
                <span>{formatCurrency(amountPaid)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold border-t-2 border-gray-800 pt-0.5 text-[10px]">
              <span className="text-gray-900">Balance:</span>
              <span className={balance > 0 ? 'text-red-600' : 'text-emerald-700'}>{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-3 pt-1 flex justify-end">
          <div className="text-center min-w-[120px]">
            {includeSigState && (
              <div className="mb-0.5 h-8 flex items-center justify-center">
                <img
                  src={getSignatureSrc(signature)}
                  alt="Signature"
                  className="max-h-8 w-auto object-contain"
                />
              </div>
            )}
            <div className="border-t border-gray-800 pt-0.5 text-[8.5px] font-bold text-gray-900">
              {doctorName}
            </div>
            <div className="text-[7.5px] text-gray-500">Authorized Signatory</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-1.5 border-t border-gray-200 text-[7.5px] text-gray-500 flex justify-between items-center">
        <span>Valid computer generated receipt</span>
        <span className="font-medium">Powered by Svaasth HMS</span>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // A4 Standard Layout (210mm x 297mm)
  // -------------------------------------------------------------
  const isMultiPageA4 = (items?.length || 0) > 5;
  const halfIndexA4 = isMultiPageA4 ? Math.ceil(items.length / 2) : (items?.length || 0);
  const page1ItemsA4 = (items || []).slice(0, halfIndexA4);
  const page2ItemsA4 = isMultiPageA4 ? (items || []).slice(halfIndexA4) : [];

  const renderA4Header = () => (
    <>
      <div className="pb-3 mb-3 border-b border-gray-300">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <div className="text-xs text-gray-600 mb-1">BILL OF SUPPLY</div>
            <div className="text-xs border border-gray-400 px-2 py-0.5 inline-block font-medium">
              ORIGINAL FOR RECIPIENT
            </div>
          </div>
        </div>

        <div className="mt-2 text-center">
          <div className="flex items-center justify-center mb-2">
            <img
              src={hospitalConfig.branding.logoUrl}
              alt={`${hospitalConfig.name} Logo`}
              className="h-14 mr-3 logo-print object-contain"
            />
          </div>
          <p className="text-xs text-gray-800 font-medium">
            {hospitalConfig.address.fullFormatted}
          </p>
          <p className="text-xs text-gray-700 mt-0.5">Mobile: +91 {hospitalConfig.contacts.mobile} &nbsp;</p>
        </div>
      </div>

      <div className="pb-2 mb-3">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-sm font-semibold text-gray-800">Invoice No.: </span>
            <span className="text-sm font-bold text-gray-900">{formattedBillNumber}</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-800">Invoice Date: </span>
            <span className="text-sm font-medium">{billDate}</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-gray-300 flex justify-between items-start">
          <div className="text-sm">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">BILL TO</div>
            <div className="font-bold text-gray-900">{patientName}</div>
            {patientPhone && <div className="text-xs text-gray-600">Mobile: {patientPhone}</div>}
            {(patientAge || patientSex) && (
              <div className="text-xs text-gray-600">
                {patientAge && `Age: ${patientAge}`}
                {patientAge && patientSex && ' | '}
                {patientSex && `Gender: ${patientSex}`}
              </div>
            )}
          </div>

          {(referenceNumber || (prescriptionId && !['DIRECT_BILL', 'OPD_DIRECT', 'IPD_DIRECT'].includes(prescriptionId))) && (
            <div className="text-right text-xs text-gray-600 space-y-1">
              {referenceNumber && (
                <div>
                  <span className="font-semibold text-gray-700">UHID: </span>
                  <span className="font-mono font-bold text-gray-900">{referenceNumber}</span>
                </div>
              )}
              {prescriptionId && !['DIRECT_BILL', 'OPD_DIRECT', 'IPD_DIRECT'].includes(prescriptionId) && (
                <div>
                  <span className="font-semibold text-gray-700">Prescription: </span>
                  <span className="font-mono font-bold text-teal-800">#{prescriptionId.slice(-6)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderA4ItemsTable = (itemList: BillItem[]) => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-t-2 border-b-2 border-gray-800 bg-gray-50/50">
          <th className="text-left py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800">ITEMS/SERVICES</th>
          <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-24">DATE</th>
          <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-20">QTY</th>
          <th className="text-right py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-24">RATE</th>
          <th className="text-right py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-28">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        {itemList.map((item, index) => (
          <tr key={item.id || index} className="border-b border-gray-200">
            <td className="py-2 px-2 text-sm font-medium text-gray-900">{item.description}</td>
            <td className="py-2 px-2 text-xs text-center text-gray-600">
              {item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}
            </td>
            <td className="py-2 px-2 text-xs text-center text-gray-800 font-medium">
              {item.quantity} {item.unit || (item.itemType === 'medicine' ? 'PCS' : 'EACH')}
            </td>
            <td className="py-2 px-2 text-sm text-right text-gray-800">₹{item.unitPrice.toLocaleString('en-IN')}</td>
            <td className="py-2 px-2 text-sm text-right font-semibold text-gray-900">₹{Math.round(item.total).toLocaleString('en-IN')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderA4TotalsAndSignature = () => (
    <div className="bill-footer-section mt-4 pt-2">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="w-1/2 pt-1">
          <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">TERMS AND CONDITIONS</div>
          <div className="text-[11px] text-gray-600 leading-relaxed">{termsAndConditions}</div>
        </div>

        <div className="w-5/12">
          <div className="border-t-2 border-gray-800 pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-gray-700">SUBTOTAL</span>
              <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-xs text-red-600">
                <span>Discount</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-gray-300 pt-1.5 text-sm font-bold text-gray-900">
              <span>Total Amount</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {paymentTransactions.length > 0 ? (
              paymentTransactions.map((txn, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600">
                  <span>
                    Received on {(() => {
                      const d = new Date(txn.payment_date);
                      if (isNaN(d.getTime())) return txn.payment_date;
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const yy = String(d.getFullYear()).slice(-2);
                      return `${dd}-${mm}-${yy}`;
                    })()}
                    {txn.payment_method ? ` (${txn.payment_method})` : ''}
                  </span>
                  <span className="font-medium text-gray-800">{formatCurrency(txn.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-xs text-gray-700">
                <span>Received Amount</span>
                <span>{formatCurrency(amountPaid)}</span>
              </div>
            )}

            <div className="flex justify-between border-t-2 border-gray-800 pt-1.5 text-sm font-bold">
              <span className="text-gray-900">Balance</span>
              <span className={balance > 0 ? 'text-red-600' : 'text-emerald-700'}>{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 border-t border-gray-300 pt-2 bg-gray-50/50 p-2 rounded">
        <div className="text-xs">
          <span className="font-bold text-gray-800">Total Amount (in words): </span>
          <span className="text-gray-700 italic">{numberToWords(total)}</span>
        </div>
      </div>

      <div className="mt-4 pt-2">
        <div className="flex justify-end">
          <div className="text-center min-w-[180px]">
            {includeSigState && (
              <div className="mb-1 h-14 flex items-center justify-center">
                <img
                  src={getSignatureSrc(signature)}
                  alt="Signature"
                  className="max-h-12 w-auto object-contain"
                />
              </div>
            )}
            <div className="border-t border-gray-800 pt-1 text-xs font-semibold text-gray-900">
              <div>{doctorName}</div>
              <div className="text-[11px] text-gray-600 font-normal">{hospitalConfig.name}, {hospitalConfig.address.city}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderA4Bill = () => {
    if (!isMultiPageA4) {
      return (
        <div className="printable-page bg-white">
          <div>
            {renderA4Header()}
            <div className="mb-4">{renderA4ItemsTable(page1ItemsA4)}</div>
            {renderA4TotalsAndSignature()}
          </div>
          <div className="mt-auto pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex justify-between items-center">
            <span>Valid system-generated tax invoice / bill of supply</span>
            <span className="flex items-center gap-1 text-gray-500 font-medium">
              Powered by <img src="/Svaasth_logo.png" alt="Svaasth HMS" className="h-3.5 w-3.5 inline-block object-contain rounded-xs" /> <strong className="text-gray-700">Svaasth HMS</strong>
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="printable-page bg-white page-break-after">
          <div>
            {renderA4Header()}
            <div className="mb-4">{renderA4ItemsTable(page1ItemsA4)}</div>
          </div>
          <div className="mt-auto pt-3 border-t border-gray-300 text-xs text-gray-600 flex justify-between items-center">
            <span className="font-semibold text-blue-700 italic">Continued on Page 2...</span>
            <span>Page 1 of 2</span>
          </div>
        </div>

        <div className="printable-page bg-white">
          <div>
            {renderA4Header()}
            <div className="mb-4">{renderA4ItemsTable(page2ItemsA4)}</div>
            {renderA4TotalsAndSignature()}
          </div>
          <div className="mt-auto pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex justify-between items-center">
            <span>Valid system-generated tax invoice / bill of supply</span>
            <span className="flex items-center gap-1 text-gray-500 font-medium">
              Powered by <img src="/Svaasth_logo.png" alt="Svaasth HMS" className="h-3.5 w-3.5 inline-block object-contain rounded-xs" /> <strong className="text-gray-700">Svaasth HMS</strong>
            </span>
            <span>Page 2 of 2</span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 py-2 sm:py-4 px-2 sm:px-4 text-gray-900">
      <style>{`
        ${getPageStyles()}

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
          }

          .no-print {
            display: none !important;
          }

          .printable-page {
            position: relative !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }

          table {
            width: 100% !important;
          }

          .logo-print {
            filter: brightness(1.05) !important;
          }
        }

        @media screen {
          .printable-page {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            margin: 0 auto 20px auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }
      `}</style>

      {showPrintButton && renderToolbar()}

      {/* Bill Presentation */}
      <div className="flex justify-center">
        {pageSize === 'A7' && renderA7Bill()}
        {pageSize === 'A6' && renderA6Bill()}
        {pageSize === 'A4' && renderA4Bill()}
      </div>

      {showPrintButton && (
        <div className="no-print flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 mb-8">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 px-8 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill ({pageSize})</span>
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 px-6 rounded-xl transition cursor-pointer"
          >
            Close Tab
          </button>
        </div>
      )}
    </div>
  );
};

export default PrintableBill;