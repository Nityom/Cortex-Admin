'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getTimingFromDosage } from '@/lib/prescriptionUtils';
import {
  getAllTemplates,
  saveTemplate,
  deleteTemplate,
  PrescriptionTemplate,
  ALL_CLINICAL_SECTION_KEYS,
  SECTION_METADATA,
  getSectionCustomTemplates,
  saveSectionCustomTemplate,
  deleteSectionCustomTemplate,
  getAllCustomSectionTemplates,
  CLINICAL_SECTION_PRESETS,
  ClinicalSectionPreset,
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
  Sparkles,
  Layers,
  FolderOpen,
  ClipboardList,
  Activity,
  HeartPulse,
  Syringe,
  Dumbbell,
  Microscope,
  FileSearch,
  HelpCircle,
} from 'lucide-react';

const SPECIALTIES = [
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

interface UnifiedSectionTemplateItem {
  id: string;
  name: string;
  sectionKey: string;
  sectionTitle: string;
  category?: string;
  description?: string;
  data: any;
  isPreset?: boolean;
}

export default function TemplatesManagementPage() {
  const router = useRouter();

  // Active section tab: 'all' | 'prescription' | sectionKey
  const [activeSectionTab, setActiveSectionTab] = useState<string>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPresets, setShowPresets] = useState<boolean>(true);

  // Loaded template collections
  const [prescriptionTemplates, setPrescriptionTemplates] = useState<PrescriptionTemplate[]>([]);
  const [sectionTemplates, setSectionTemplates] = useState<UnifiedSectionTemplateItem[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);

  // Convex clinical templates query & mutation
  const convexTemplates = useQuery(api.clinical_templates.list);
  const bulkSyncMutation = useMutation(api.clinical_templates.bulkSync);

  // Toast / feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Master Prescription Modal states
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [editingPrescriptionTemplate, setEditingPrescriptionTemplate] =
    useState<PrescriptionTemplate | null>(null);
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
  const [formComplaints, setFormComplaints] = useState<
    Array<{ complaint: string; frequency?: string; severity?: string; duration?: string }>
  >([]);
  const [formTests, setFormTests] = useState<Array<{ name: string; by_when?: string }>>([]);

  // Medicine helpers for template editing
  const handleAddMedicineRow = () => {
    setFormMedicines((prev) => [
      ...prev,
      {
        name: '',
        dosage: '1-0-1',
        timing: 'सकाळी नाश्त्यानंतर आणि रात्री जेवणानंतर',
        duration: '5 Days',
        quantity: 10,
        note: '',
      },
    ]);
  };

  const handleRemoveMedicineRow = (idx: number) => {
    setFormMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMedicineChange = (idx: number, field: keyof MedicineEntry, value: any) => {
    setFormMedicines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      if (field === 'dosage') {
        const autoTiming = getTimingFromDosage(value);
        if (autoTiming) {
          copy[idx].timing = autoTiming;
        }
      }
      return copy;
    });
  };

  // Section Template Modal states
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSectionTemplate, setEditingSectionTemplate] =
    useState<UnifiedSectionTemplateItem | null>(null);
  const [sectionFormKey, setSectionFormKey] = useState<string>('diagnosis');
  const [sectionFormName, setSectionFormName] = useState<string>('');
  const [sectionFormCategory, setSectionFormCategory] = useState<string>('Orthopaedics');
  const [sectionFormContent, setSectionFormContent] = useState<string>('');

  // Real-time bidirectional sync with Convex DB
  useEffect(() => {
    if (convexTemplates && Array.isArray(convexTemplates)) {
      if (convexTemplates.length > 0) {
        const mapped: PrescriptionTemplate[] = convexTemplates.map((item: any) => ({
          id: item.template_id || item._id,
          name: item.name,
          diagnosis: item.diagnosis || '',
          category: item.category || 'General',
          doctor_name: item.doctor_name,
          advice: item.advice,
          dr_notes: item.dr_notes,
          procedure_advice: item.procedure_advice,
          diet_exercise: item.diet_exercise,
          followup_count: item.followup_count,
          followup_unit: item.followup_unit,
          medicines: item.medicines || [],
          complaints: item.complaints,
          tests_requested: item.tests_requested,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));

        try {
          const local = getAllTemplates();
          const localMap = new Map<string, PrescriptionTemplate>();
          for (const l of local) localMap.set(l.id, l);
          for (const m of mapped) localMap.set(m.id, m);
          const merged = Array.from(localMap.values());
          localStorage.setItem('cortex_prescription_templates_v2', JSON.stringify(merged));
          setPrescriptionTemplates(merged);
        } catch {}
      } else {
        const defaultTemplates = getAllTemplates();
        if (defaultTemplates.length > 0) {
          bulkSyncMutation({
            templates: defaultTemplates.map((t) => ({
              template_id: t.id,
              name: t.name,
              category: t.category || 'General',
              doctor_name: t.doctor_name,
              diagnosis: t.diagnosis,
              advice: t.advice,
              dr_notes: t.dr_notes,
              procedure_advice: t.procedure_advice,
              diet_exercise: t.diet_exercise,
              followup_count: t.followup_count,
              followup_unit: t.followup_unit,
              medicines: t.medicines || [],
              complaints: t.complaints,
              tests_requested: t.tests_requested,
            })),
          }).catch(console.warn);
        }
      }
    }
  }, [convexTemplates, bulkSyncMutation]);

  // Load all templates (prescription + custom section templates + clinical presets)
  const loadAllTemplates = useCallback(() => {
    // 1. Prescription master templates
    const masterList = getAllTemplates();
    setPrescriptionTemplates(masterList);

    // 2. Custom doctor section templates
    const customSectionList: UnifiedSectionTemplateItem[] = getAllCustomSectionTemplates().map((t) => ({
      ...t,
      category: t.category || 'General',
      isPreset: false,
    }));

    // 3. Built-in clinical section presets
    const presetList: UnifiedSectionTemplateItem[] = [];
    for (const key of ALL_CLINICAL_SECTION_KEYS) {
      const presets = CLINICAL_SECTION_PRESETS[key] || [];
      const meta = SECTION_METADATA[key] || { title: key };
      for (const p of presets) {
        presetList.push({
          id: p.id,
          name: p.name,
          sectionKey: key,
          sectionTitle: meta.title,
          category: p.category || 'General',
          description: p.description,
          data: p.data,
          isPreset: true,
        });
      }
    }

    setSectionTemplates([...customSectionList, ...presetList]);
  }, []);

  useEffect(() => {
    loadAllTemplates();
    getAllMedicines().then(setAvailableMedicines).catch(console.error);
  }, [loadAllTemplates]);

  // Open Prescription Modal
  const handleOpenCreatePrescriptionModal = () => {
    setEditingPrescriptionTemplate(null);
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
    setIsPrescriptionModalOpen(true);
  };

  const handleOpenEditPrescriptionModal = (t: PrescriptionTemplate) => {
    setEditingPrescriptionTemplate(t);
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
    setFormMedicines(
      t.medicines && t.medicines.length > 0 ? JSON.parse(JSON.stringify(t.medicines)) : []
    );
    setFormComplaints(
      t.complaints && t.complaints.length > 0 ? JSON.parse(JSON.stringify(t.complaints)) : []
    );
    setFormTests(
      t.tests_requested && t.tests_requested.length > 0
        ? JSON.parse(JSON.stringify(t.tests_requested))
        : []
    );
    setIsPrescriptionModalOpen(true);
  };

  const handleSavePrescriptionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const saved = saveTemplate({
      id: editingPrescriptionTemplate?.id,
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
      medicines: formMedicines.filter((m) => m.name.trim() !== ''),
      complaints: formComplaints.filter((c) => c.complaint.trim() !== ''),
      tests_requested: formTests.filter((t) => t.name.trim() !== ''),
    });

    loadAllTemplates();
    setIsPrescriptionModalOpen(false);
    showToast(`Prescription template "${saved.name}" saved!`);
  };

  // Open Section Template Modal
  const handleOpenCreateSectionModal = (targetKey?: string) => {
    const key =
      targetKey && targetKey !== 'all' && targetKey !== 'prescription'
        ? targetKey
        : activeSectionTab !== 'all' && activeSectionTab !== 'prescription'
        ? activeSectionTab
        : 'diagnosis';

    setEditingSectionTemplate(null);
    setSectionFormKey(key);
    setSectionFormName('');
    setSectionFormCategory(selectedSpecialty !== 'All' ? selectedSpecialty : 'Orthopaedics');
    setSectionFormContent('');
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSectionModal = (item: UnifiedSectionTemplateItem) => {
    setEditingSectionTemplate(item);
    setSectionFormKey(item.sectionKey);
    setSectionFormName(item.name);
    setSectionFormCategory(item.category || 'Orthopaedics');
    const contentString =
      typeof item.data === 'string'
        ? item.data
        : typeof item.data === 'object'
        ? JSON.stringify(item.data, null, 2)
        : '';
    setSectionFormContent(contentString);
    setIsSectionModalOpen(true);
  };

  const handleSaveSectionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionFormName.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (!sectionFormContent.trim()) {
      alert('Please enter template content or instructions');
      return;
    }

    let parsedData: any = sectionFormContent.trim();
    if (
      (sectionFormContent.trim().startsWith('[') && sectionFormContent.trim().endsWith(']')) ||
      (sectionFormContent.trim().startsWith('{') && sectionFormContent.trim().endsWith('}'))
    ) {
      try {
        parsedData = JSON.parse(sectionFormContent.trim());
      } catch {
        // Fall back to plain string
      }
    }

    const saved = saveSectionCustomTemplate(
      sectionFormKey,
      sectionFormName.trim(),
      parsedData,
      sectionFormCategory
    );

    loadAllTemplates();
    setIsSectionModalOpen(false);
    showToast(`Saved template "${saved.name}" to ${SECTION_METADATA[sectionFormKey]?.title || sectionFormKey}!`);
  };

  const handleDeleteSectionTemplate = (sectionKey: string, id: string, name: string) => {
    if (confirm(`Delete template "${name}" from ${SECTION_METADATA[sectionKey]?.title || sectionKey}?`)) {
      deleteSectionCustomTemplate(sectionKey, id);
      loadAllTemplates();
      showToast(`Deleted "${name}"`);
    }
  };

  const handleDeletePrescriptionTemplate = (id: string, name: string) => {
    if (confirm(`Delete prescription template "${name}"?`)) {
      deleteTemplate(id);
      loadAllTemplates();
      showToast(`Prescription template "${name}" deleted.`);
    }
  };

  // Section Tabs Definition
  const SECTION_TABS = [
    { key: 'all', title: 'All Templates', count: prescriptionTemplates.length + sectionTemplates.length },
    { key: 'prescription', title: 'Master Prescriptions', count: prescriptionTemplates.length },
    { key: 'diagnosis', title: 'Diagnosis', count: sectionTemplates.filter((s) => s.sectionKey === 'diagnosis').length },
    { key: 'complaints', title: 'Complaints', count: sectionTemplates.filter((s) => s.sectionKey === 'complaints').length },
    { key: 'findings', title: 'Findings', count: sectionTemplates.filter((s) => s.sectionKey === 'findings').length },
    { key: 'advice', title: 'Advice', count: sectionTemplates.filter((s) => s.sectionKey === 'advice').length },
    { key: 'tests_requested', title: 'Tests Requested', count: sectionTemplates.filter((s) => s.sectionKey === 'tests_requested').length },
    { key: 'quick_notes', title: 'Quick Notes', count: sectionTemplates.filter((s) => s.sectionKey === 'quick_notes').length },
    { key: 'dr_notes', title: 'Dr Notes (Private)', count: sectionTemplates.filter((s) => s.sectionKey === 'dr_notes').length },
    { key: 'diet_exercise', title: 'Diet & Exercise', count: sectionTemplates.filter((s) => s.sectionKey === 'diet_exercise').length },
    { key: 'investigations', title: 'Investigations', count: sectionTemplates.filter((s) => s.sectionKey === 'investigations').length },
    { key: 'general_examinations', title: 'General Examinations', count: sectionTemplates.filter((s) => s.sectionKey === 'general_examinations').length },
    { key: 'systemic_examinations', title: 'Systemic Examination', count: sectionTemplates.filter((s) => s.sectionKey === 'systemic_examinations').length },
    { key: 'past_medications', title: 'Past Medications', count: sectionTemplates.filter((s) => s.sectionKey === 'past_medications').length },
    { key: 'procedure_done', title: 'Procedure Done', count: sectionTemplates.filter((s) => s.sectionKey === 'procedure_done').length },
    { key: 'drawing_board', title: 'Drawing Board', count: sectionTemplates.filter((s) => s.sectionKey === 'drawing_board').length },
  ];

  // Filter section templates
  const filteredSectionTemplates = sectionTemplates.filter((t) => {
    if (!showPresets && t.isPreset) return false;
    if (activeSectionTab !== 'all' && activeSectionTab !== 'prescription' && t.sectionKey !== activeSectionTab) {
      return false;
    }
    if (activeSectionTab === 'prescription') return false;
    if (selectedSpecialty !== 'All' && t.category !== selectedSpecialty) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchCategory = (t.category || '').toLowerCase().includes(q);
    const matchDesc = (t.description || '').toLowerCase().includes(q);
    const matchContent =
      typeof t.data === 'string'
        ? t.data.toLowerCase().includes(q)
        : JSON.stringify(t.data).toLowerCase().includes(q);
    return matchName || matchCategory || matchDesc || matchContent;
  });

  // Filter prescription templates
  const filteredPrescriptionTemplates = prescriptionTemplates.filter((t) => {
    if (activeSectionTab !== 'all' && activeSectionTab !== 'prescription') return false;
    if (selectedSpecialty !== 'All' && t.category !== selectedSpecialty) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchDiag = (t.diagnosis || '').toLowerCase().includes(q);
    const matchMeds = (t.medicines || []).some(
      (m) => m.name.toLowerCase().includes(q) || (m.composition || '').toLowerCase().includes(q)
    );
    return matchName || matchDiag || matchMeds;
  });

  const totalResultsCount = filteredPrescriptionTemplates.length + filteredSectionTemplates.length;

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
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-xs">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Clinical Templates Hub
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage all clinical templates: Prescriptions, Diagnoses, Complaints, Findings, Advice, Tests, Notes & Examinations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/admin/prescription')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> Go to Prescription
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateSectionModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Section Template
          </button>
          <button
            type="button"
            onClick={handleOpenCreatePrescriptionModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Create Master Prescription
          </button>
        </div>
      </div>

      {/* Section Tabs (Horizontally Scrollable) */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {SECTION_TABS.map((tab) => {
            const isActive = activeSectionTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSectionTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span>{tab.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
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
              placeholder="Search by template name, medical keywords, diagnosis, or advice..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>

          {/* Show Presets Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={showPresets}
              onChange={(e) => setShowPresets(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Include Standard Clinical Presets</span>
          </label>
        </div>

        {/* Specialty Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Specialty:
          </span>
          {SPECIALTIES.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedSpecialty === spec
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Master Prescription Templates */}
        {filteredPrescriptionTemplates.map((t) => (
          <div
            key={`rx_${t.id}`}
            className="bg-white rounded-2xl border border-emerald-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group relative"
          >
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Master Prescription
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {t.category || 'General'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition leading-snug">
                {t.name}
              </h3>

              {t.diagnosis && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold truncate">{t.diagnosis}</span>
                </div>
              )}
            </div>

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

            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditPrescriptionModal(t)}
                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                  title="Edit Master Prescription Template"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePrescriptionTemplate(t.id, t.name)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                Use Template <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* 2. Section Templates (Diagnosis, Complaints, Findings, Advice, Tests, Notes, etc.) */}
        {filteredSectionTemplates.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
          >
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                  {item.sectionTitle}
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    item.isPreset
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {item.isPreset ? 'Standard Preset' : 'Custom Template'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                {item.name}
              </h3>

              {item.category && (
                <span className="inline-block mt-1 text-[11px] font-semibold text-slate-500">
                  Specialty: {item.category}
                </span>
              )}
            </div>

            {/* Content Preview */}
            <div className="p-5 flex-1 bg-slate-50/40 text-xs">
              {typeof item.data === 'string' ? (
                <p className="text-slate-600 line-clamp-4 whitespace-pre-line leading-relaxed text-[11px]">
                  {item.data}
                </p>
              ) : Array.isArray(item.data) ? (
                <div className="space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                    Items ({item.data.length}):
                  </span>
                  {item.data.slice(0, 3).map((sub: any, i: number) => (
                    <div
                      key={i}
                      className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-800 text-[11px] font-medium truncate"
                    >
                      {sub.complaint || sub.name || sub.diagnosis || JSON.stringify(sub)}
                    </div>
                  ))}
                  {item.data.length > 3 && (
                    <p className="text-[10px] text-slate-400 italic">
                      + {item.data.length - 3} more items
                    </p>
                  )}
                </div>
              ) : (
                <pre className="text-[10px] text-slate-600 line-clamp-4 font-mono bg-white p-2 rounded border border-slate-200">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {!item.isPreset && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEditSectionModal(item)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      title="Edit Section Template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSectionTemplate(item.sectionKey, item.id, item.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {item.isPreset && (
                  <button
                    type="button"
                    onClick={() => {
                      setSectionFormKey(item.sectionKey);
                      setSectionFormName(`${item.name} (Custom)`);
                      setSectionFormCategory(item.category || 'Orthopaedics');
                      setSectionFormContent(
                        typeof item.data === 'string'
                          ? item.data
                          : JSON.stringify(item.data, null, 2)
                      );
                      setIsSectionModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                    title="Clone Preset into Custom Template"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  router.push(`/admin/prescription`);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                Use in Rx <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalResultsCount === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No clinical templates found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No templates matched "{searchQuery || activeSectionTab}". Click below to create a new template for this section.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenCreateSectionModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create {SECTION_METADATA[activeSectionTab]?.title || 'Section'} Template
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: Create / Edit Section Template */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingSectionTemplate ? 'Edit Section Template' : 'Create Clinical Section Template'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSectionModal} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Section *</label>
                <select
                  value={sectionFormKey}
                  onChange={(e) => setSectionFormKey(e.target.value)}
                  disabled={!!editingSectionTemplate}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ALL_CLINICAL_SECTION_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {SECTION_METADATA[key]?.title || key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={sectionFormName}
                  onChange={(e) => setSectionFormName(e.target.value)}
                  placeholder="e.g. Lumbar Spondylosis Protocol, Viral Fever Advice..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Specialty</label>
                <select
                  value={sectionFormCategory}
                  onChange={(e) => setSectionFormCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {SPECIALTIES.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Template Content / Clinical Text *
                </label>
                <textarea
                  value={sectionFormContent}
                  onChange={(e) => setSectionFormContent(e.target.value)}
                  rows={6}
                  placeholder={`Enter standard clinical text, advice, findings, or notes for this template...`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Master Prescription Template */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingPrescriptionTemplate
                    ? 'Edit Master Prescription Template'
                    : 'Create Master Prescription Template'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescriptionModal} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Osteoarthritis Knee Protocol..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specialty</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {SPECIALTIES.filter((s) => s !== 'All').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnosis</label>
                <input
                  type="text"
                  value={formDiagnosis}
                  onChange={(e) => setFormDiagnosis(e.target.value)}
                  placeholder="e.g. Osteoarthritis Bilateral Knees (Grade II)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* MEDICINES EDITOR SECTION */}
              <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/70">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <label className="font-bold text-slate-800 text-sm">
                      Medicines &amp; Prescriptions ({formMedicines.length})
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                </div>

                {formMedicines.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 italic">
                    No medicines in this template. Click &quot;+ Add Medicine&quot; to include prescription drugs.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {formMedicines.map((med, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-emerald-300 transition"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Medicine Name with Datalist Autocomplete from availableMedicines */}
                          <div className="col-span-12 sm:col-span-5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                              Medicine Name *
                            </label>
                            <input
                              type="text"
                              list={`med-datalist-${idx}`}
                              value={med.name}
                              onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                              placeholder="e.g. TAB ACECLOFENAC 100 MG..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                              required
                            />
                            <datalist id={`med-datalist-${idx}`}>
                              {availableMedicines.slice(0, 50).map((m) => (
                                <option key={m.id || m.name} value={m.name}>
                                  {m.composition || m.company || ''}
                                </option>
                              ))}
                            </datalist>
                          </div>

                          {/* Dosage Dropdown with all combinations */}
                          <div className="col-span-6 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                              Dosage
                            </label>
                            <select
                              value={med.dosage || '1-0-1'}
                              onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                              <option value="1-0-1">1-0-1 (Morning &amp; Night)</option>
                              <option value="1-1-1">1-1-1 (Thrice daily)</option>
                              <option value="1-0-0">1-0-0 (Morning only)</option>
                              <option value="0-0-1">0-0-1 (Night only)</option>
                              <option value="0-1-0">0-1-0 (Afternoon only)</option>
                              <option value="1-1-0">1-1-0 (Morning &amp; Afternoon)</option>
                              <option value="0-1-1">0-1-1 (Afternoon &amp; Night)</option>
                              <option value="1/2-0-0">1/2-0-0 (Half morning)</option>
                              <option value="0-0-1/2">0-0-1/2 (Half night)</option>
                              <option value="1/2-0-1/2">1/2-0-1/2 (Half morning &amp; night)</option>
                              <option value="1-0-1/2">1-0-1/2 (1 Morning, 1/2 Night)</option>
                              <option value="1/2-0-1">1/2-0-1 (1/2 Morning, 1 Night)</option>
                              <option value="2-0-0">2-0-0 (Two morning)</option>
                              <option value="0-0-2">0-0-2 (Two night)</option>
                              <option value="1-0-2">1-0-2 (1 Morning, 2 Night)</option>
                              <option value="2-0-1">2-0-1 (2 Morning, 1 Night)</option>
                              <option value="2-0-2">2-0-2 (Two morning &amp; night)</option>
                              <option value="1-1-1-1">1-1-1-1 (Four times daily)</option>
                              <option value="1-0-0-1">1-0-0-1 (Morning &amp; Bedtime)</option>
                              <option value="SOS">SOS (When required)</option>
                              <option value="Stat">Stat (Immediately)</option>
                            </select>
                          </div>

                          {/* Duration */}
                          <div className="col-span-4 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                              Duration
                            </label>
                            <input
                              type="text"
                              value={med.duration || ''}
                              onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                              placeholder="e.g. 5 Days"
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                              Qty
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={med.quantity ?? ''}
                              onChange={(e) => handleMedicineChange(idx, 'quantity', Number(e.target.value) || 0)}
                              placeholder="10"
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>

                          {/* Delete Button */}
                          <div className="col-span-12 sm:col-span-1 text-right pt-3 sm:pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicineRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete medicine"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Timing (Marathi with आणि) and Special Instructions */}
                        <div className="grid grid-cols-12 gap-2 pt-1 border-t border-slate-100">
                          <div className="col-span-12 sm:col-span-7">
                            <input
                              type="text"
                              value={med.timing || ''}
                              onChange={(e) => handleMedicineChange(idx, 'timing', e.target.value)}
                              placeholder="Timing (e.g. सकाळी नाश्त्यानंतर आणि रात्री जेवणानंतर / After Food)"
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-5">
                            <input
                              type="text"
                              value={med.note || ''}
                              onChange={(e) => handleMedicineChange(idx, 'note', e.target.value)}
                              placeholder="Special note (e.g. With warm milk/water)"
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Advice & Instructions</label>
                <textarea
                  value={formAdvice}
                  onChange={(e) => setFormAdvice(e.target.value)}
                  rows={2}
                  placeholder="Patient instructions, precautions, lifestyle advice..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dr Notes (Internal)</label>
                <textarea
                  value={formDrNotes}
                  onChange={(e) => setFormDrNotes(e.target.value)}
                  rows={2}
                  placeholder="Private physician notes (not printed on prescription)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPrescriptionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Master Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
