'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllTemplates,
  saveTemplate,
  deleteTemplate,
  PrescriptionTemplate,
} from '@/services/templates';
import { MedicineEntry } from '@/services/prescription';
import { getAllMedicines, Medicine } from '@/services/medicine';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  FileText,
  CheckCircle2,
  BookmarkCheck,
  Stethoscope,
  Filter,
  X,
  ArrowRight,
  Pill,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Orthopaedics',
  'Gynaecology',
  'General Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'ENT',
  'Other',
];

export default function TemplatesManagementPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState('All');
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null);

  // Form states for creating / editing template
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Orthopaedics');
  const [formDoctorName, setFormDoctorName] = useState('Dr. Vipeen Raut');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [formAdvice, setFormAdvice] = useState('');
  const [formDrNotes, setFormDrNotes] = useState('');
  const [formProcedureAdvice, setFormProcedureAdvice] = useState('');
  const [formDietExercise, setFormDietExercise] = useState('');
  const [formFollowupCount, setFormFollowupCount] = useState('15');
  const [formFollowupUnit, setFormFollowupUnit] = useState<'Days' | 'Weeks' | 'Months'>('Days');
  const [formMedicines, setFormMedicines] = useState<MedicineEntry[]>([]);
  const [formComplaints, setFormComplaints] = useState<Array<{ complaint: string; frequency?: string; severity?: string; duration?: string }>>([]);
  const [formTests, setFormTests] = useState<Array<{ name: string; by_when?: string }>>([]);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTemplates = React.useCallback(() => {
    const list = getAllTemplates();
    setTemplates(list);
  }, []);

  useEffect(() => {
    loadTemplates();
    getAllMedicines().then(setAvailableMedicines).catch(console.error);
  }, [loadTemplates]);

  const handleOpenCreateModal = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormCategory('Orthopaedics');
    setFormDoctorName('Dr. Vipeen Raut');
    setFormDiagnosis('');
    setFormAdvice('');
    setFormDrNotes('');
    setFormProcedureAdvice('');
    setFormDietExercise('');
    setFormFollowupCount('15');
    setFormFollowupUnit('Days');
    setFormMedicines([
      {
        name: '',
        composition: '',
        dosage: '1-0-1',
        unit: 'tab',
        when: 'After Food',
        frequency: 'daily',
        duration: '5 days',
        note: '',
      },
    ]);
    setFormComplaints([]);
    setFormTests([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: PrescriptionTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormCategory(t.category || 'Orthopaedics');
    setFormDoctorName(t.doctor_name || 'Dr. Vipeen Raut');
    setFormDiagnosis(t.diagnosis || '');
    setFormAdvice(t.advice || '');
    setFormDrNotes(t.dr_notes || '');
    setFormProcedureAdvice(t.procedure_advice || '');
    setFormDietExercise(t.diet_exercise || '');
    setFormFollowupCount(t.followup_count || '15');
    setFormFollowupUnit(t.followup_unit || 'Days');
    setFormMedicines(t.medicines && t.medicines.length > 0 ? JSON.parse(JSON.stringify(t.medicines)) : []);
    setFormComplaints(t.complaints && t.complaints.length > 0 ? JSON.parse(JSON.stringify(t.complaints)) : []);
    setFormTests(t.tests_requested && t.tests_requested.length > 0 ? JSON.parse(JSON.stringify(t.tests_requested)) : []);
    setIsModalOpen(true);
  };

  const handleDuplicateTemplate = (t: PrescriptionTemplate) => {
    const duplicated = saveTemplate({
      ...t,
      name: `${t.name} (Copy)`,
    });
    loadTemplates();
    showToast(`Template duplicated: ${duplicated.name}`);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      deleteTemplate(id);
      loadTemplates();
      showToast(`Template "${name}" deleted.`);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const saved = saveTemplate({
      id: editingTemplate?.id,
      name: formName.trim(),
      category: formCategory,
      doctor_name: formDoctorName,
      diagnosis: formDiagnosis.trim(),
      advice: formAdvice.trim(),
      dr_notes: formDrNotes.trim(),
      procedure_advice: formProcedureAdvice.trim(),
      diet_exercise: formDietExercise.trim(),
      followup_count: formFollowupCount,
      followup_unit: formFollowupUnit,
      medicines: formMedicines.filter((m) => m.name && m.name.trim()),
      complaints: formComplaints.filter((c) => c.complaint && c.complaint.trim()),
      tests_requested: formTests.filter((t) => t.name && t.name.trim()),
    });

    loadTemplates();
    setIsModalOpen(false);
    showToast(`Template "${saved.name}" saved successfully!`);
  };

  // Medicine form helpers
  const handleAddMedicineRow = () => {
    setFormMedicines((prev) => [
      ...prev,
      {
        name: '',
        composition: '',
        dosage: '1-0-1',
        unit: 'tab',
        when: 'After Food',
        frequency: 'daily',
        duration: '5 days',
        note: '',
      },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setFormMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof MedicineEntry, value: string) => {
    setFormMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'name') {
        const found = availableMedicines.find(
          (m) => m.name.toLowerCase() === value.trim().toLowerCase()
        );
        if (found?.composition) {
          updated[index].composition = found.composition;
        }
      }
      return updated;
    });
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
    if (selectedDoctor !== 'All' && t.doctor_name && !t.doctor_name.toLowerCase().includes(selectedDoctor.toLowerCase())) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchDiag = (t.diagnosis || '').toLowerCase().includes(q);
    const matchMeds = (t.medicines || []).some(
      (m) => m.name.toLowerCase().includes(q) || (m.composition || '').toLowerCase().includes(q)
    );
    return matchName || matchDiag || matchMeds;
  });

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shadow-xs">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Prescription Templates
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Create and manage reusable consultation protocols, diagnosis sets, and medicine regimens.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/admin/prescription')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Go to Prescription
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Template
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search template name, diagnosis, or medicines..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Doctor filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Doctor:</span>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="p-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Doctors</option>
              <option value="Vipeen">Dr. Vipeen Raut (Ortho)</option>
              <option value="Shillpa">Dr. Shillpa Raut (Gynae)</option>
            </select>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Specialty:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    t.category === 'Orthopaedics'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : t.category === 'Gynaecology'
                      ? 'bg-pink-50 text-pink-700 border-pink-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {t.category || 'General'}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {t.doctor_name || 'Dr. Vipeen Raut'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                {t.name}
              </h3>

              {t.diagnosis && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold truncate">{t.diagnosis}</span>
                </div>
              )}
            </div>

            {/* Card Body - Medicines Preview */}
            <div className="p-5 space-y-3 flex-1 bg-slate-50/30 text-xs">
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                  Medicines ({t.medicines?.length || 0}):
                </span>
                <div className="space-y-1.5">
                  {(t.medicines || []).slice(0, 3).map((med, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-800 font-medium flex items-center justify-between text-[11px]"
                    >
                      <span className="truncate max-w-[180px] font-semibold">{med.name}</span>
                      <span className="text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {med.dosage || '1-0-1'}
                      </span>
                    </div>
                  ))}
                  {(t.medicines || []).length > 3 && (
                    <div className="text-[10px] text-slate-400 italic">
                      + {(t.medicines || []).length - 3} more medicines
                    </div>
                  )}
                </div>
              </div>

              {t.advice && (
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">
                    Advice:
                  </span>
                  <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                    "{t.advice}"
                  </p>
                </div>
              )}
            </div>

            {/* Card Footer Actions */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(t)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit Template"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateTemplate(t)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Duplicate Template"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(t.id, t.name)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  router.push(`/admin/prescription?templateId=${encodeURIComponent(t.id)}`);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1"
              >
                Use Template <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No templates found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or specialty filter, or click "+ Create Template" to add a new protocol.
          </p>
        </div>
      )}

      {/* Create / Edit Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingTemplate ? 'Edit Prescription Template' : 'Create New Prescription Template'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure diagnosis, medicines, and clinical instructions for one-click re-use.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModal} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Row 1: Name, Category, Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Knee OA Protocol, ANC 1st Trimester"
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Specialty / Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Attending Doctor
                  </label>
                  <select
                    value={formDoctorName}
                    onChange={(e) => setFormDoctorName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-white"
                  >
                    <option value="Dr. Vipeen Raut">Dr. Vipeen Raut (Ortho)</option>
                    <option value="Dr. Shillpa Raut">Dr. Shillpa Raut (Gynae)</option>
                    <option value="Both Doctors">Both Doctors / Clinic</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Diagnosis */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Diagnosis / Clinical Impression
                </label>
                <input
                  type="text"
                  value={formDiagnosis}
                  onChange={(e) => setFormDiagnosis(e.target.value)}
                  placeholder="e.g. Osteoarthritis Bilateral Knees, Primary Hypertension"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Row 3: Prescribed Medicines Table Editor */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 uppercase text-xs flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-purple-600" /> Prescribed Medicines
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs"
                  >
                    + Add Medicine
                  </button>
                </div>

                <div className="space-y-2">
                  {formMedicines.map((med, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          placeholder="Medicine Name (e.g. TAB ACECLOFENAC)"
                          className="w-full p-1.5 border border-slate-300 rounded font-bold text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (1-0-1)"
                          className="w-full p-1.5 border border-slate-300 rounded text-center font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={med.when || 'After Food'}
                          onChange={(e) => handleMedicineChange(idx, 'when', e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white text-slate-700"
                        >
                          <option value="After Food">After Food</option>
                          <option value="Before Food">Before Food</option>
                          <option value="With Food">With Food</option>
                          <option value="Empty Stomach">Empty Stomach</option>
                          <option value="At Bedtime">At Bedtime</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                          placeholder="Duration (5 days)"
                          className="w-full p-1.5 border border-slate-300 rounded text-slate-700"
                        />
                      </div>
                      <div className="sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {formMedicines.length === 0 && (
                    <div className="text-center py-4 text-slate-400 italic">
                      No medicines added yet. Click "+ Add Medicine" to prescribe drugs for this template.
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Advice & Doctor Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Advice Given
                  </label>
                  <textarea
                    value={formAdvice}
                    onChange={(e) => setFormAdvice(e.target.value)}
                    rows={3}
                    placeholder="Patient instructions (e.g. avoid squatting, regular walking, warm saline rinses)..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Dr Notes / Clinical Remarks
                  </label>
                  <textarea
                    value={formDrNotes}
                    onChange={(e) => setFormDrNotes(e.target.value)}
                    rows={3}
                    placeholder="Doctor clinical notes..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* Row 5: Follow-up */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700 uppercase text-[11px]">Follow-up:</span>
                <input
                  type="number"
                  min="1"
                  value={formFollowupCount}
                  onChange={(e) => setFormFollowupCount(e.target.value)}
                  className="w-16 p-1.5 border border-slate-300 rounded text-center font-bold"
                />
                <select
                  value={formFollowupUnit}
                  onChange={(e) => setFormFollowupUnit(e.target.value as any)}
                  className="p-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="Days">Days</option>
                  <option value="Weeks">Weeks</option>
                  <option value="Months">Months</option>
                </select>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
