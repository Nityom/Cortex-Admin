'use client';

import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';

export interface TreatmentItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date?: string;
}

export interface ProcedureOption {
  id: string | number;
  name: string;
  price: number;
}

interface PrescriptionProcedureSectionProps {
  dentalProcedures: ProcedureOption[];
  treatmentItems: TreatmentItem[];
  setTreatmentItems: React.Dispatch<React.SetStateAction<TreatmentItem[]>>;
  applyConsultationCharge: boolean;
  setApplyConsultationCharge: (val: boolean) => void;
  consultationCharge: number;
  setConsultationCharge: (val: number) => void;
  isNewPatient: boolean;
  saveProcedureToCatalog: (name: string, price: number) => void;
  defaultDate?: string;
}

export default function PrescriptionProcedureSection({
  dentalProcedures,
  treatmentItems,
  setTreatmentItems,
  applyConsultationCharge,
  setApplyConsultationCharge,
  consultationCharge,
  setConsultationCharge,
  isNewPatient,
  saveProcedureToCatalog,
  defaultDate = new Date().toISOString().slice(0, 10),
}: PrescriptionProcedureSectionProps) {
  const [selectedTreatmentName, setSelectedTreatmentName] = useState('');
  const [selectedTreatmentPrice, setSelectedTreatmentPrice] = useState('');
  const [selectedTreatmentQty, setSelectedTreatmentQty] = useState(1);
  const [selectedTreatmentDate, setSelectedTreatmentDate] = useState('');

  const handleAddTreatment = () => {
    const nameTrimmed = selectedTreatmentName.trim();
    if (!nameTrimmed) return;
    const priceNum = parseFloat(selectedTreatmentPrice) || 0;
    const qtyNum = Number(selectedTreatmentQty) || 1;

    const newItem: TreatmentItem = {
      id: Date.now(),
      description: nameTrimmed,
      quantity: qtyNum,
      unitPrice: priceNum,
      total: priceNum * qtyNum,
      date: selectedTreatmentDate || defaultDate,
    };

    setTreatmentItems([...treatmentItems, newItem]);
    saveProcedureToCatalog(nameTrimmed, priceNum);

    setSelectedTreatmentName('');
    setSelectedTreatmentPrice('');
    setSelectedTreatmentQty(1);
  };

  return (
    <div className="bg-gradient-to-br from-teal-50/70 to-emerald-50/40 border border-teal-200 rounded-xl p-4 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-teal-200/80 gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
            <span title="Edit Procedure Done" className="inline-flex">
              <Edit2 className="w-4 h-4 text-teal-700" />
            </span>
            Procedure done / Treatment Done
          </label>
          <SectionTemplatePicker
            sectionKey="procedure_done"
            sectionTitle="Procedure Done"
            currentValue={dentalProcedures}
            align="left"
            onApplyPreset={(val) => {
              if (val && val.name) {
                setSelectedTreatmentName(val.name);
                setSelectedTreatmentPrice(String(val.price || 0));
                setSelectedTreatmentQty(val.qty || 1);
                saveProcedureToCatalog(val.name, val.price || 0);
              }
            }}
          />
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
            Optional
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            Forwarded to Billing Only
          </span>
        </div>
      </div>

      {/* Registration / Consultation Fee Checkbox */}
      <div className="p-3 bg-white/95 rounded-lg border border-teal-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={applyConsultationCharge}
            onChange={(e) => {
              const checked = e.target.checked;
              setApplyConsultationCharge(checked);
              if (checked && (!consultationCharge || consultationCharge === 0)) {
                setConsultationCharge(isNewPatient ? 400 : 200);
              }
            }}
            className="mt-0.5 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                Add {isNewPatient ? 'New Patient Registration' : 'Follow-up Consultation'} Charge
              </span>
              <span
                className={
                  isNewPatient
                    ? 'text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-300'
                }
              >
                {isNewPatient ? `New Patient (₹${consultationCharge || 400})` : `Follow-up / Re-visit (₹${consultationCharge || 200})`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isNewPatient
                ? 'New Patient — consultation fee automatically calculated per doctor (Dr. Shillpa Raut ₹200, Dr. Vipeen Raut ₹400).'
                : 'Follow-up Patient — consultation fee automatically calculated (Dr. Shillpa Raut ₹100 within 10 days, Dr. Vipeen Raut ₹200).'}
            </p>
          </div>
        </label>

        {applyConsultationCharge && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Charge (₹):</span>
            <input
              type="number"
              min="0"
              value={consultationCharge || ''}
              onChange={(e) => setConsultationCharge(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-20 p-1.5 text-xs font-bold border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Procedure Entry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
        <div className="sm:col-span-5">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Treatment / Procedure Name
          </label>
          <input
            type="text"
            list="clinical-procedure-datalist"
            value={selectedTreatmentName}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedTreatmentName(val);
              const matched = dentalProcedures.find(
                (p) => p.name.toLowerCase() === val.trim().toLowerCase()
              );
              if (matched && matched.price > 0) {
                setSelectedTreatmentPrice(String(matched.price));
              }
            }}
            placeholder="Type or select procedure (e.g. Joint Aspiration, POP Cast, USG Scan)..."
            className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white outline-none"
          />
          <datalist id="clinical-procedure-datalist">
            {dentalProcedures.map((proc) => (
              <option key={proc.id} value={proc.name}>
                ₹{proc.price}
              </option>
            ))}
          </datalist>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Charge (₹)</label>
          <input
            type="number"
            min="0"
            value={selectedTreatmentPrice}
            onChange={(e) => setSelectedTreatmentPrice(e.target.value)}
            placeholder="0"
            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Qty</label>
          <input
            type="number"
            min="1"
            value={selectedTreatmentQty}
            onChange={(e) => setSelectedTreatmentQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-white text-center outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={selectedTreatmentDate || defaultDate}
            onChange={(e) => setSelectedTreatmentDate(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white outline-none cursor-pointer"
          />
        </div>

        <div className="sm:col-span-1">
          <button
            type="button"
            onClick={handleAddTreatment}
            disabled={!selectedTreatmentName.trim()}
            className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Treatment Items Table */}
      {treatmentItems.length > 0 && (
        <div className="bg-white rounded-lg border border-teal-200 overflow-hidden text-xs">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Treatment</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {treatmentItems.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-slate-400 font-mono">{index + 1}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{item.description}</td>
                  <td className="px-3 py-2 text-slate-500">{item.date || defaultDate}</td>
                  <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                  <td className="px-3 py-2 text-right font-bold">₹{item.unitPrice}</td>
                  <td className="px-3 py-2 text-right font-bold text-teal-800">₹{item.total}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setTreatmentItems((prev) => prev.filter((_, i) => i !== index))}
                      className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold"
                    >
                      ✕
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
