'use client';

import React, { useState } from 'react';
import { Edit2, Undo2 } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';

export interface TestRequestedItem {
  id: string;
  name: string;
  by_when: string;
}

interface PrescriptionClinicalNotesSectionProps {
  drNotes: string;
  setDrNotes: React.Dispatch<React.SetStateAction<string>>;
  quickNotes: string;
  setQuickNotes: React.Dispatch<React.SetStateAction<string>>;
  procedureAdvice: string;
  setProcedureAdvice: React.Dispatch<React.SetStateAction<string>>;
  advice: string;
  onUpdateAdvice: (val: string) => void;
  testsRequested: TestRequestedItem[];
  setTestsRequested: React.Dispatch<React.SetStateAction<TestRequestedItem[]>>;
  referralDocName: string;
  setReferralDocName: (val: string) => void;
  referralSpeciality: string;
  setReferralSpeciality: (val: string) => void;
  referralPhone: string;
  setReferralPhone: (val: string) => void;
  referralEmail: string;
  setReferralEmail: (val: string) => void;
  dietExercise: string;
  setDietExercise: React.Dispatch<React.SetStateAction<string>>;
  investigationText: string;
  setInvestigationText: React.Dispatch<React.SetStateAction<string>>;
  pastMedication: string;
  setPastMedication: React.Dispatch<React.SetStateAction<string>>;
  systemicExam: string;
  setSystemicExam: React.Dispatch<React.SetStateAction<string>>;
  generalExam: string;
  setGeneralExam: React.Dispatch<React.SetStateAction<string>>;
}

export default function PrescriptionClinicalNotesSection({
  drNotes,
  setDrNotes,
  quickNotes,
  setQuickNotes,
  procedureAdvice,
  setProcedureAdvice,
  advice,
  onUpdateAdvice,
  testsRequested,
  setTestsRequested,
  referralDocName,
  setReferralDocName,
  referralSpeciality,
  setReferralSpeciality,
  referralPhone,
  setReferralPhone,
  referralEmail,
  setReferralEmail,
  dietExercise,
  setDietExercise,
  investigationText,
  setInvestigationText,
  pastMedication,
  setPastMedication,
  systemicExam,
  setSystemicExam,
  generalExam,
  setGeneralExam,
}: PrescriptionClinicalNotesSectionProps) {
  const [newTestName, setNewTestName] = useState('');
  const [newTestByWhen, setNewTestByWhen] = useState('');

  const handleAddTest = () => {
    if (!newTestName.trim()) return;
    setTestsRequested((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: newTestName.trim(),
        by_when: newTestByWhen.trim() || 'Next Visit',
      },
    ]);
    setNewTestName('');
    setNewTestByWhen('');
  };

  return (
    <div className="space-y-4">
      {/* 1. Dr Notes & Quick Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dr Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Dr Notes
              </label>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Private • Not printed on prescription
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Dr Notes"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="dr_notes"
                sectionTitle="Dr Notes"
                currentValue={drNotes}
                align="left"
                onApplyPreset={(val) => setDrNotes((prev) => (prev ? prev + '\n' + val : val))}
              />
              <button
                type="button"
                title="Reset / Clear Dr Notes"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setDrNotes('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={drNotes}
            onChange={(e) => setDrNotes(e.target.value)}
            rows={3}
            placeholder="Doctor private remarks / internal clinical notes (e.g. Patient reluctant for surgery, follow up in OPD personally)..."
            className="w-full min-h-[85px] p-3 text-sm leading-relaxed border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none"
          />
        </div>

        {/* Quick Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Quick Notes
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Quick Notes"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="quick_notes"
                sectionTitle="Quick Notes"
                currentValue={quickNotes}
                align="left"
                onApplyPreset={(val) => setQuickNotes((prev) => (prev ? prev + '\n' + val : val))}
              />
              <button
                type="button"
                title="Reset / Clear Quick Notes"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setQuickNotes('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            rows={3}
            placeholder="Brief clinical quick notes..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      {/* 2. Procedure Advice & Advice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Procedure Advice */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Procedure Advice
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Procedure Advice"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="procedure_done"
                sectionTitle="Procedure Advice"
                currentValue={procedureAdvice}
                align="left"
                onApplyPreset={(val) => {
                  const text =
                    typeof val === 'string'
                      ? val
                      : val.name
                      ? `Procedure advice: ${val.name}`
                      : '';
                  setProcedureAdvice((prev) => (prev ? prev + '\n' + text : text));
                }}
              />
              <button
                type="button"
                title="Reset / Clear Procedure Advice"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setProcedureAdvice('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={procedureAdvice}
            onChange={(e) => setProcedureAdvice(e.target.value)}
            rows={3}
            placeholder="Pre/post procedure advice..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>

        {/* General Advice */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Advice
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Advice"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="advice"
                sectionTitle="Advice"
                currentValue={advice}
                align="left"
                onApplyPreset={(val) => onUpdateAdvice(advice ? advice + '\n' + val : val)}
              />
              <button
                type="button"
                title="Reset / Clear Advice"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => onUpdateAdvice('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={advice}
            onChange={(e) => onUpdateAdvice(e.target.value)}
            rows={3}
            placeholder="General advice for patient (e.g. warm saline rinses, drink plenty of fluids)..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500 outline-none"
          />
          <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
            <span>*</span> Prescription is valid for 30 days only
          </p>
        </div>
      </div>

      {/* 3. Tests Requested */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            Tests Requested
          </label>
          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              title="Edit Tests Requested"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <SectionTemplatePicker
              sectionKey="tests_requested"
              sectionTitle="Tests Requested"
              currentValue={testsRequested}
              align="left"
              onApplyPreset={(val) => {
                if (Array.isArray(val)) {
                  setTestsRequested((prev) => [
                    ...prev,
                    ...val.map((t: any, i: number) => ({
                      id: 'tt_' + Date.now() + '_' + i,
                      name: t.name,
                      by_when: t.by_when || 'Next Visit',
                    })),
                  ]);
                }
              }}
            />
            <button
              type="button"
              title="Reset / Clear Tests"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              onClick={() => setTestsRequested([])}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div className="grid grid-cols-12 bg-slate-50 text-slate-600 font-semibold py-2 px-3 border-b border-slate-200">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Tests Requested</div>
            <div className="col-span-4">By When</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {testsRequested.map((t, idx) => (
            <div
              key={t.id}
              className="grid grid-cols-12 items-center py-2 px-3 border-b border-slate-100 hover:bg-slate-50/50"
            >
              <div className="col-span-1 text-slate-400">{idx + 1}</div>
              <div className="col-span-6 font-semibold text-slate-800">{t.name}</div>
              <div className="col-span-4 text-slate-600">{t.by_when || '—'}</div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => setTestsRequested((prev) => prev.filter((x) => x.id !== t.id))}
                  className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Inline Add Test */}
          <div className="grid grid-cols-12 items-center py-1.5 px-3 bg-slate-50/30 gap-2">
            <div className="col-span-1 text-slate-400 font-mono">{testsRequested.length + 1}</div>
            <div className="col-span-6">
              <input
                type="text"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTest();
                  }
                }}
                placeholder="Add Tests (e.g. CBC, Blood Sugar, X-Ray Knee)..."
                className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white outline-none"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                value={newTestByWhen}
                onChange={(e) => setNewTestByWhen(e.target.value)}
                placeholder="e.g. Next Visit or Before Monday"
                className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white outline-none"
              />
            </div>
            <div className="col-span-1 text-right">
              <button
                type="button"
                onClick={handleAddTest}
                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs cursor-pointer shadow-xs"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Referred To */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            Referred to
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Doctor Name</label>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-semibold">Dr.</span>
              <input
                type="text"
                value={referralDocName}
                onChange={(e) => setReferralDocName(e.target.value)}
                placeholder="Doctor Name"
                className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Speciality</label>
            <select
              value={referralSpeciality}
              onChange={(e) => setReferralSpeciality(e.target.value)}
              className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 bg-white outline-none cursor-pointer"
            >
              <option value="Orthopaedics">Orthopaedics</option>
              <option value="Gynaecology">Gynaecology</option>
              <option value="General Medicine">General Medicine</option>
              <option value="General Surgery">General Surgery</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="ENT">ENT</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Radiology">Radiology</option>
              <option value="Physiotherapy">Physiotherapy</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Phone No</label>
            <input
              type="text"
              value={referralPhone}
              onChange={(e) => setReferralPhone(e.target.value)}
              placeholder="+91 Number"
              className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={referralEmail}
              onChange={(e) => setReferralEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={() => {
                if (referralDocName.trim()) {
                  alert(`Referral to Dr. ${referralDocName} (${referralSpeciality}) noted.`);
                }
              }}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 text-xs cursor-pointer transition"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 5. Diet and Exercise & Investigations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Diet & Exercise */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Diet and Exercise
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Diet and Exercise"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="diet_exercise"
                sectionTitle="Diet & Exercise"
                currentValue={dietExercise}
                align="left"
                onApplyPreset={(val) => setDietExercise((prev) => (prev ? prev + '\n' + val : val))}
              />
              <button
                type="button"
                title="Reset / Clear Diet & Exercise"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setDietExercise('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={dietExercise}
            onChange={(e) => setDietExercise(e.target.value)}
            rows={3}
            placeholder="Soft diet, avoid sugary snacks, 30 min daily walk..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>

        {/* Investigations */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Investigations
            </label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Investigations"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="investigations"
                sectionTitle="Investigations"
                currentValue={investigationText}
                align="left"
                onApplyPreset={(val) =>
                  setInvestigationText((prev) => (prev ? prev + '\n' + val : val))
                }
              />
              <button
                type="button"
                title="Reset / Clear Investigations"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setInvestigationText('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={investigationText}
            onChange={(e) => setInvestigationText(e.target.value)}
            rows={2}
            placeholder="e.g. OPG, IOPAR wrt 16, CBCT, Blood sugar..."
            className="w-full p-2.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      {/* 6. Past Medication & Examinations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Past Medication */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800">Past Medication</label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Past Medication"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="past_medications"
                sectionTitle="Past Medication"
                currentValue={pastMedication}
                align="left"
                onApplyPreset={(val) =>
                  setPastMedication((prev) => (prev ? prev + '\n' + val : val))
                }
              />
              <button
                type="button"
                title="Reset / Clear Past Medication"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setPastMedication('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={pastMedication}
            onChange={(e) => setPastMedication(e.target.value)}
            rows={2}
            placeholder="Past Medications..."
            className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 outline-none"
          />
        </div>

        {/* Systemic Examination */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800">Systemic Examination</label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit Systemic Examination"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="systemic_examinations"
                sectionTitle="Systemic Examination"
                currentValue={systemicExam}
                align="left"
                onApplyPreset={(val) => setSystemicExam((prev) => (prev ? prev + '\n' + val : val))}
              />
              <button
                type="button"
                title="Reset / Clear Systemic Examination"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setSystemicExam('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={systemicExam}
            onChange={(e) => setSystemicExam(e.target.value)}
            rows={2}
            placeholder="CVS, RS, CNS findings..."
            className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 outline-none"
          />
        </div>

        {/* General Examinations */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800">General Examinations</label>
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                title="Edit General Examinations"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <SectionTemplatePicker
                sectionKey="general_examinations"
                sectionTitle="General Examinations"
                currentValue={generalExam}
                align="left"
                onApplyPreset={(val) => setGeneralExam((prev) => (prev ? prev + '\n' + val : val))}
              />
              <button
                type="button"
                title="Reset / Clear General Examinations"
                className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                onClick={() => setGeneralExam('')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={generalExam}
            onChange={(e) => setGeneralExam(e.target.value)}
            rows={2}
            placeholder="Pallor, Icterus, Cyanosis, Clubbing, Lymphadenopathy, Edema..."
            className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

