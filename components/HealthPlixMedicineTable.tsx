'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, Calendar, RotateCcw, Copy, BookmarkPlus, FolderOpen } from 'lucide-react';
import MedicineSearchInput from './MedicineSearchInput';
import { Medicine } from '@/services/medicine';
import { MedicineEntry, DosageSchedule } from '@/services/prescription';

interface HealthPlixMedicineTableProps {
  medicines: MedicineEntry[];
  onChange: (medicines: MedicineEntry[]) => void;
  medicineOptions: Medicine[];
  prescriptionDate?: string;
  onOpenLoadTemplate?: () => void;
  onOpenSaveTemplate?: () => void;
  onAutoSaveMedicine?: (name: string, composition?: string) => void;
}

const DOSAGE_OPTIONS = ['0-0-1', '1-0-0', '1-0-1', '1-1-1', '0-1-0', '1-1-0', '0-0-2', '1-0-2', 'Stat', 'SOS', 'As Directed'];
const UNIT_OPTIONS = ['tab', 'cap', 'ml', 'lotion', 'ointment', 'drops', 'sachet', 'spray', 'syrup', 'inj'];
const TIME_OPTIONS = ['', 'Morning', 'Afternoon', 'Night', 'Bedtime', 'Morning & Night', '8 Hourly', '12 Hourly'];
const WHEN_OPTIONS = ['After Food', 'Before Food', 'With Food', 'Empty Stomach', 'At Bedtime', 'As Directed'];
const WHERE_OPTIONS = ['', 'oral', 'face', 'scalp', 'affected area', 'skin', 'left eye', 'right eye', 'throat', 'joints', 'chest', 'back'];
const FREQUENCY_OPTIONS = ['daily', 'alternate day', 'twice a week', 'thrice a week', 'weekly', 'once a month', 'SOS'];
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '15 days', '21 days', '25 days', '1 month', '2 months', '3 months'];

const NOTE_PRESETS = [
  'केसांच्या मुळाशी',
  'नाश्ता नंतर',
  'दुपारी जेवणानंतर',
  'रात्री जेवणानंतर',
  'पाण्यासोबत घ्यावे',
  'दूधासोबत घ्यावे',
  'गरज भासल्यास',
  'Take with plenty of water',
  'Apply gently on affected area',
];

// Helper to format any date into clean uniform DD/MM/YYYY
function formatToDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) return clean.replace(/-/g, '/');
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(clean);
  if (isNaN(d.getTime())) return clean;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to compute end date given a start date and duration string
function calculateEndDate(startDateStr: string | undefined, durationStr: string | undefined): string {
  const baseDate = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(baseDate.getTime())) return '';
  if (!durationStr) return '';

  let daysToAdd = 0;
  const matchNum = durationStr.match(/\d+/);
  if (matchNum) {
    const num = parseInt(matchNum[0], 10);
    if (/month/i.test(durationStr)) {
      daysToAdd = num * 30;
    } else if (/week/i.test(durationStr)) {
      daysToAdd = num * 7;
    } else {
      daysToAdd = num;
    }
  }

  if (daysToAdd === 0) return '';
  const endDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const yyyy = endDate.getFullYear();
  const mm = String(endDate.getMonth() + 1).padStart(2, '0');
  const dd = String(endDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function HealthPlixMedicineTable({
  medicines,
  onChange,
  medicineOptions,
  prescriptionDate = new Date().toISOString().slice(0, 10),
  onOpenLoadTemplate,
  onOpenSaveTemplate,
  onAutoSaveMedicine,
}: HealthPlixMedicineTableProps) {
  const [editingCompositionIndex, setEditingCompositionIndex] = useState<number | null>(null);
  const [compositionDraft, setCompositionDraft] = useState<string>('');
  const [newMedSearch, setNewMedSearch] = useState<string>('');

  // Ensure every medicine has at least 1 schedule in its `schedules` array
  const normalizeMedicineSchedules = (med: MedicineEntry): DosageSchedule[] => {
    if (med.schedules && med.schedules.length > 0) {
      return med.schedules;
    }
    return [
      {
        id: 'sch_init',
        dosage: med.dosage || '0-0-1',
        unit: med.unit || (med.dosage && /ml|syp/i.test(med.name) ? 'ml' : 'tab'),
        time: '',
        when: med.when || 'After Food',
        where: med.where || '',
        frequency: med.frequency || 'daily',
        duration: med.duration || '5 days',
        start_from: med.start_from || prescriptionDate,
        to_date: med.to_date || calculateEndDate(prescriptionDate, med.duration || '5 days'),
        details: med.details || '',
        notes: med.note || '',
      },
    ];
  };

  // Add a new sub-schedule for a medicine (+ button clicked)
  const handleAddSchedule = (medIndex: number) => {
    const updated = [...medicines];
    const target = updated[medIndex];
    const currentSchedules = normalizeMedicineSchedules(target);

    // Default the new schedule to complementary/alternate timing
    const lastSch = currentSchedules[currentSchedules.length - 1];
    const newSch: DosageSchedule = {
      id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dosage: lastSch.dosage === '0-0-1' ? '1-0-0' : '0-0-1',
      unit: lastSch.unit || 'tab',
      time: '',
      when: lastSch.when || 'After Food',
      where: lastSch.where || '',
      frequency: lastSch.frequency === 'daily' ? 'alternate day' : 'daily',
      duration: lastSch.duration || '25 days',
      start_from: lastSch.start_from || prescriptionDate,
      to_date: calculateEndDate(lastSch.start_from || prescriptionDate, lastSch.duration || '25 days'),
      details: '',
      notes: '',
    };

    target.schedules = [...currentSchedules, newSch];
    // Keep top-level in sync
    target.dosage = target.schedules.map(s => s.dosage).join(' / ');
    target.frequency = target.schedules.map(s => s.frequency).join(' / ');
    target.duration = target.schedules.map(s => s.duration).join(' / ');
    onChange(updated);
  };

  // Remove a schedule or entire medicine if only 1 schedule left
  const handleRemoveSchedule = (medIndex: number, schIndex: number) => {
    const updated = [...medicines];
    const target = updated[medIndex];
    const currentSchedules = normalizeMedicineSchedules(target);

    if (currentSchedules.length <= 1) {
      // Remove entire medicine
      updated.splice(medIndex, 1);
    } else {
      currentSchedules.splice(schIndex, 1);
      target.schedules = currentSchedules;
      target.dosage = currentSchedules[0].dosage;
      target.frequency = currentSchedules[0].frequency;
      target.duration = currentSchedules[0].duration;
    }
    onChange(updated);
  };

  // Delete whole medicine
  const handleDeleteMedicine = (medIndex: number) => {
    const updated = [...medicines];
    updated.splice(medIndex, 1);
    onChange(updated);
  };

  // Update a schedule field
  const handleUpdateSchedule = (
    medIndex: number,
    schIndex: number,
    field: keyof DosageSchedule,
    value: string
  ) => {
    const updated = [...medicines];
    const target = updated[medIndex];
    const currentSchedules = normalizeMedicineSchedules(target);
    const sch = { ...currentSchedules[schIndex], [field]: value };

    // Auto calculate to_date when duration or start_from changes
    if (field === 'duration' || field === 'start_from') {
      const start = field === 'start_from' ? value : sch.start_from || prescriptionDate;
      const dur = field === 'duration' ? value : sch.duration;
      sch.to_date = calculateEndDate(start, dur);
    }

    currentSchedules[schIndex] = sch;
    target.schedules = currentSchedules;

    // Sync primary fields for backwards compatibility with letterhead & billing
    if (schIndex === 0) {
      if (field === 'dosage') target.dosage = value;
      if (field === 'frequency') target.frequency = value;
      if (field === 'duration') target.duration = value;
      if (field === 'notes') target.note = value;
      if (field === 'when') target.when = value;
      if (field === 'where') target.where = value;
      if (field === 'unit') target.unit = value;
    } else {
      target.dosage = currentSchedules.map(s => s.dosage).join(' / ');
      target.frequency = currentSchedules.map(s => s.frequency).join(' / ');
      target.duration = currentSchedules.map(s => s.duration).join(' / ');
    }

    onChange(updated);
  };

  // Add new medicine from bottom row
  const handleSelectNewMedicine = (med: Medicine) => {
    const defaultUnit = med.name.toLowerCase().includes('lotion')
      ? 'lotion'
      : med.name.toLowerCase().includes('cap')
      ? 'cap'
      : med.name.toLowerCase().includes('drops')
      ? 'drops'
      : med.name.toLowerCase().includes('syp') || med.name.toLowerCase().includes('syrup')
      ? 'ml'
      : 'tab';

    const newEntry: MedicineEntry = {
      name: med.name.toUpperCase(),
      dosage: '0-0-1',
      unit: defaultUnit,
      frequency: 'daily',
      duration: '25 days',
      when: 'After Food',
      where: med.name.toLowerCase().includes('lotion') ? 'face' : '',
      composition: med.composition || '',
      note: '',
      start_from: prescriptionDate,
      to_date: calculateEndDate(prescriptionDate, '25 days'),
      schedules: [
        {
          id: `sch_${Date.now()}`,
          dosage: '0-0-1',
          unit: defaultUnit,
          time: '',
          when: 'After Food',
          where: med.name.toLowerCase().includes('lotion') ? 'face' : '',
          frequency: 'daily',
          duration: '25 days',
          start_from: prescriptionDate,
          to_date: calculateEndDate(prescriptionDate, '25 days'),
          details: '',
          notes: '',
        },
      ],
    };

    onChange([...medicines, newEntry]);
    setNewMedSearch('');
    if (onAutoSaveMedicine) {
      onAutoSaveMedicine(med.name.toUpperCase(), med.composition || '');
    }
  };

  const handleAddNewCustomMedicine = (name: string) => {
    if (!name.trim()) return;
    const newEntry: MedicineEntry = {
      name: name.trim().toUpperCase(),
      dosage: '0-0-1',
      unit: 'tab',
      frequency: 'daily',
      duration: '15 days',
      when: 'After Food',
      where: '',
      composition: '',
      note: '',
      start_from: prescriptionDate,
      to_date: calculateEndDate(prescriptionDate, '15 days'),
      schedules: [
        {
          id: `sch_${Date.now()}`,
          dosage: '0-0-1',
          unit: 'tab',
          time: '',
          when: 'After Food',
          where: '',
          frequency: 'daily',
          duration: '15 days',
          start_from: prescriptionDate,
          to_date: calculateEndDate(prescriptionDate, '15 days'),
          details: '',
          notes: '',
        },
      ],
    };
    onChange([...medicines, newEntry]);
    setNewMedSearch('');
    if (onAutoSaveMedicine) {
      onAutoSaveMedicine(name.trim().toUpperCase(), '');
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-slate-300/80 overflow-hidden shadow-2xs">
      {/* Full-width Spreadsheet Table matching HealthPlix exact design */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse border-b border-slate-200">
          <thead>
            <tr className="bg-[#eef2f7] text-slate-800 font-bold border-b border-slate-300 text-[13px]">
              <th className="py-3 px-3 border-r border-slate-300/70 w-[24%]">
                <span className="text-slate-900 font-bold text-sm">Medicine *</span>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[7%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Dosage</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[5%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Unit</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[6%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Time</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[9%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>When</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[6%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Where</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[9%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Frequency</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[7%]">
                <div className="flex items-center justify-between cursor-pointer">
                  <span>Duration</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[9%]">
                <span>Start From</span>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[6%]">
                <span>Details</span>
              </th>
              <th className="py-3 px-2.5 border-r border-slate-300/70 w-[10%]">
                <span>Notes</span>
              </th>
              <th className="py-3 px-1 w-[2%] text-center"></th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((med, medIndex) => {
              const schedules = normalizeMedicineSchedules(med);

              return (
                <React.Fragment key={medIndex}>
                  {schedules.map((sch, schIndex) => {
                    const isFirstSchedule = schIndex === 0;
                    const isLastSchedule = schIndex === schedules.length - 1;

                    return (
                      <tr
                        key={`${medIndex}_${schIndex}`}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* 1. Medicine Name & Composition with '+' Button in cell */}
                        <td className="border-r border-b border-slate-200 p-2.5 align-top relative">
                          {isFirstSchedule ? (
                            <div className="flex flex-col justify-between h-full min-h-[48px]">
                              <div>
                                <div className="font-bold text-slate-900 text-sm uppercase tracking-tight">
                                  {med.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCompositionIndex(medIndex);
                                      setCompositionDraft(med.composition || '');
                                    }}
                                    className="text-slate-400 hover:text-slate-700"
                                    title="Edit composition/generic"
                                  >
                                    <Edit2 className="w-3 h-3 inline" />
                                  </button>
                                  {editingCompositionIndex === medIndex ? (
                                    <input
                                      type="text"
                                      value={compositionDraft}
                                      onChange={(e) => setCompositionDraft(e.target.value)}
                                      onBlur={() => {
                                        const updated = [...medicines];
                                        updated[medIndex].composition = compositionDraft;
                                        onChange(updated);
                                        setEditingCompositionIndex(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const updated = [...medicines];
                                          updated[medIndex].composition = compositionDraft;
                                          onChange(updated);
                                          setEditingCompositionIndex(null);
                                        }
                                      }}
                                      autoFocus
                                      className="px-1.5 py-0.5 border border-blue-400 rounded text-xs bg-white outline-none w-full"
                                    />
                                  ) : (
                                    <span className="italic line-clamp-1">
                                      {med.composition || 'Generic name'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* HealthPlix + Button at bottom-right of Medicine cell */}
                              {isLastSchedule && (
                                <div className="flex justify-end mt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddSchedule(medIndex)}
                                    className="w-4 h-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xs flex items-center justify-center transition shadow-2xs border border-slate-300/80 cursor-pointer"
                                    title="Add more frequency / schedule line for this medicine"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between h-full min-h-[48px] pl-3 text-xs text-slate-400 italic">
                              <span>↳ Additional Schedule</span>
                              {isLastSchedule && (
                                <button
                                  type="button"
                                  onClick={() => handleAddSchedule(medIndex)}
                                  className="w-4 h-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xs flex items-center justify-center transition shadow-2xs border border-slate-300/80 cursor-pointer"
                                  title="Add more frequency / schedule line for this medicine"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 2. Dosage */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.dosage || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'dosage', e.target.value)
                            }
                            placeholder=""
                            list={`dosage-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2.5 py-2.5 bg-transparent text-slate-900 text-sm font-bold focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`dosage-list-${medIndex}-${schIndex}`}>
                            {DOSAGE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 3. Unit */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.unit || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'unit', e.target.value)
                            }
                            placeholder=""
                            list={`unit-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`unit-list-${medIndex}-${schIndex}`}>
                            {UNIT_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 4. Time */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.time || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'time', e.target.value)
                            }
                            placeholder=""
                            list={`time-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`time-list-${medIndex}-${schIndex}`}>
                            {TIME_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 5. When */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <select
                            value={sch.when || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'when', e.target.value)
                            }
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none cursor-pointer transition"
                          >
                            <option value="">—</option>
                            {WHEN_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 6. Where */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.where || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'where', e.target.value)
                            }
                            placeholder=""
                            list={`where-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`where-list-${medIndex}-${schIndex}`}>
                            {WHERE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 7. Frequency */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <select
                            value={sch.frequency || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'frequency', e.target.value)
                            }
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none cursor-pointer transition"
                          >
                            <option value="">—</option>
                            {FREQUENCY_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 8. Duration */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.duration || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'duration', e.target.value)
                            }
                            placeholder=""
                            list={`duration-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-semibold focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`duration-list-${medIndex}-${schIndex}`}>
                            {DURATION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </td>

                        {/* 9. Start From & To Date (Uniform DD/MM/YYYY) */}
                        <td className="border-r border-b border-slate-200 p-2 align-top">
                          <div className="flex flex-col justify-center text-xs leading-normal py-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-bold text-xs">From:</span>
                              <input
                                type="date"
                                value={sch.start_from || prescriptionDate}
                                onChange={(e) =>
                                  handleUpdateSchedule(medIndex, schIndex, 'start_from', e.target.value)
                                }
                                className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer focus:bg-white rounded px-1 py-0.5 border border-transparent hover:border-slate-300"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-slate-400 font-bold text-xs">To:</span>
                              <span className="text-slate-900 font-bold text-xs px-1">
                                {formatToDisplayDate(sch.to_date || calculateEndDate(sch.start_from || prescriptionDate, sch.duration)) || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 10. Details */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.details || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'details', e.target.value)
                            }
                            placeholder=""
                            className="w-full h-full min-h-[48px] px-2 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                        </td>

                        {/* 11. Notes */}
                        <td className="border-r border-b border-slate-200 p-0 align-top">
                          <input
                            type="text"
                            value={sch.notes || ''}
                            onChange={(e) =>
                              handleUpdateSchedule(medIndex, schIndex, 'notes', e.target.value)
                            }
                            placeholder=""
                            list={`notes-list-${medIndex}-${schIndex}`}
                            className="w-full h-full min-h-[48px] px-2.5 py-2.5 bg-transparent text-slate-800 text-sm font-medium focus:bg-blue-50/50 focus:outline-none transition"
                          />
                          <datalist id={`notes-list-${medIndex}-${schIndex}`}>
                            {NOTE_PRESETS.map((note) => (
                              <option key={note} value={note} />
                            ))}
                          </datalist>
                        </td>

                        {/* 12. Delete Action */}
                        <td className="border-b border-slate-200 p-1 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveSchedule(medIndex, schIndex)}
                            className="text-slate-300 hover:text-red-600 transition p-1.5 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                            title={schedules.length > 1 ? 'Remove this schedule frequency' : 'Delete medicine from prescription'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Row: Add Medicine (Matching Row 5 in HealthPlix IMG_0910) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="border-r border-b border-slate-200 p-2 align-middle">
                <div className="flex items-center gap-1.5 w-full">
                  <div className="flex-1">
                    <MedicineSearchInput
                      value={newMedSearch}
                      onChangeName={setNewMedSearch}
                      onSelectMedicine={handleSelectNewMedicine}
                      options={medicineOptions}
                      placeholder="Add Medicine"
                      index={medicines.length}
                    />
                  </div>
                  {newMedSearch && !medicineOptions.some(m => m.name.toLowerCase() === newMedSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleAddNewCustomMedicine(newMedSearch)}
                      title={`Add "${newMedSearch}" to prescription`}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition whitespace-nowrap cursor-pointer shadow-2xs"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-r border-b border-slate-200 min-h-[48px] p-0"></td>
              <td className="border-b border-slate-200 min-h-[48px] p-0"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Template & Action Controls (HealthPlix Style Footer) */}
      <div className="py-2 px-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-4 text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => {
            try {
              const lastRx = localStorage.getItem('cortex_last_prescribed_medicines');
              if (lastRx) {
                const parsed = JSON.parse(lastRx);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  onChange([...medicines, ...parsed]);
                }
              }
            } catch {}
          }}
          title="Load Previous Consultation Medicines"
          className="flex items-center gap-1 hover:text-blue-600 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Load Prev</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onOpenLoadTemplate) {
              onOpenLoadTemplate();
            } else {
              try {
                const tmpl = localStorage.getItem('cortex_med_template_default');
                if (tmpl) {
                  const parsed = JSON.parse(tmpl);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    onChange(parsed);
                  }
                } else {
                  alert('No saved medicine template found.');
                }
              } catch {}
            }
          }}
          title="Load Master Prescription Template"
          className="flex items-center gap-1 hover:text-blue-600 transition cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Load template</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onOpenSaveTemplate) {
              onOpenSaveTemplate();
            } else {
              if (medicines.length === 0) {
                alert('Please add medicines before saving as template.');
                return;
              }
              try {
                localStorage.setItem('cortex_med_template_default', JSON.stringify(medicines));
                alert('Medicines saved as default template successfully!');
              } catch {}
            }
          }}
          title="Save Current Medicines as Prescription Template"
          className="flex items-center gap-1 hover:text-blue-600 transition cursor-pointer"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-purple-600" />
          <span>Save as template</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('Clear all medicines?')) {
              onChange([]);
            }
          }}
          title="Clear All Medicines from Prescription"
          className="flex items-center gap-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>
    </div>
  );
}

