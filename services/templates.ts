import { MedicineEntry } from './prescription';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';
export * from './clinicalSectionPresets';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export interface PrescriptionTemplate {
  id: string;
  name: string;
  diagnosis: string;
  category: string; // 'Orthopaedics' | 'Gynaecology' | 'General Medicine' | 'Pediatrics' | etc.
  doctor_name?: string;
  complaints?: Array<{
    complaint: string;
    frequency?: string;
    severity?: string;
    duration?: string;
  }>;
  findings?: string;
  vitals?: {
    bp_systolic?: string;
    bp_diastolic?: string;
    pulse?: string;
    height?: string;
    weight?: string;
    temperature?: string;
    bmi?: string;
    waist_hip?: string;
    spo2?: string;
    lmp?: string;
    edd?: string;
    gestational_weeks?: string;
    gestational_days?: string;
  };
  diagnoses_list?: Array<{
    id?: string;
    diagnosis: string;
    snomed_code?: string;
    duration?: string;
    date?: string;
  }>;
  medicines: MedicineEntry[];
  advice?: string;
  dr_notes?: string;
  quick_notes?: string;
  procedure_advice?: string;
  procedure_done?: Array<{
    name: string;
    price: number;
    qty?: number;
    date?: string;
  }>;
  tests_requested?: Array<{
    name: string;
    by_when?: string;
  }>;
  diet_exercise?: string;
  investigations?: string;
  general_examinations?: string;
  past_medications?: string;
  drawing_board?: string;
  followup_count?: string;
  followup_unit?: 'Days' | 'Weeks' | 'Months';
  created_at: number;
  updated_at?: number;
}

const TEMPLATES_STORAGE_KEY = 'cortex_prescription_templates_v2';

export const DEFAULT_CLINICAL_TEMPLATES: PrescriptionTemplate[] = [];

const DUMMY_PRESET_KEYWORDS = [
  'acute bronchitis',
  'hypertension essential',
  'osteoarthritis bilateral',
  'lumbar spondylosis',
  'first trimester routine',
  'pcos / irregular',
  'cervical spondylosis',
  'lateral epicondylitis',
  'pediatric',
  'essential hypertension',
  'bronchitis & upper',
];

export function isDummyPreset(t: any): boolean {
  if (!t) return false;
  if (t.is_preset === true) return true;
  const id = String(t.id || t.template_id || '').toLowerCase();
  const name = String(t.name || '').toLowerCase();
  if (
    id.startsWith('tmpl_ortho_') ||
    id.startsWith('tmpl_gynae_') ||
    id.startsWith('tmpl_gen_') ||
    id.startsWith('tmpl_general_') ||
    id.startsWith('tmpl_ped_') ||
    id.startsWith('tmpl_oa_') ||
    id.startsWith('tmpl_lumbar_') ||
    id.startsWith('tmpl_anc_') ||
    id.startsWith('tmpl_pcos_') ||
    id.startsWith('tmpl_cervical_') ||
    id.startsWith('tmpl_tennis_') ||
    id.startsWith('tmpl_htn_') ||
    id.startsWith('tmpl_default_')
  ) {
    return true;
  }
  return DUMMY_PRESET_KEYWORDS.some((kw) => name.includes(kw));
}

export function cleanTemplateName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/^⭐\s*(\[.*?\])?\s*/i, '')
    .replace(/^⚡\s*(\[.*?\])?\s*/i, '')
    .replace(/^\[(saved\s*template|template|preset)\]\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  return cleaned || raw.replace(/^⭐\s*(\[.*?\])?\s*/i, '').replace(/^⚡\s*(\[.*?\])?\s*/i, '').trim();
}

/**
 * Get all prescription templates from localStorage, returning only saved DB/user templates.
 */
export function getAllTemplates(): PrescriptionTemplate[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed
        .filter((t) => !isDummyPreset(t))
        .map((t) => ({
          ...t,
          name: cleanTemplateName(t.name),
        }));
      if (cleaned.length !== parsed.length) {
        try {
          localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(cleaned));
        } catch {}
      }
      return cleaned;
    }
    return [];
  } catch (err) {
    console.error("Failed to load templates from localStorage:", err);
    return [];
  }
}

/**
 * Get a single template by ID
 */
export function getTemplateById(id: string): PrescriptionTemplate | undefined {
  const templates = getAllTemplates();
  return templates.find(t => t.id === id);
}

/**
 * Sync template with Convex DB
 */
export async function syncTemplateToConvex(template: PrescriptionTemplate): Promise<void> {
  if (!convexClient) return;
  try {
    await convexClient.mutation(api.clinical_templates.upsert, {
      template_id: template.id,
      name: template.name,
      category: template.category || 'General',
      doctor_name: template.doctor_name,
      diagnosis: template.diagnosis,
      advice: template.advice,
      dr_notes: template.dr_notes,
      quick_notes: template.quick_notes,
      findings: template.findings,
      procedure_advice: template.procedure_advice,
      diet_exercise: template.diet_exercise,
      investigations: template.investigations,
      general_examinations: template.general_examinations,
      past_medications: template.past_medications,
      followup_count: template.followup_count,
      followup_unit: template.followup_unit,
      medicines: template.medicines,
      complaints: template.complaints,
      tests_requested: template.tests_requested,
    });
  } catch (err) {
    console.warn('Could not sync template to Convex:', err);
  }
}

export async function deleteTemplateFromConvex(templateId: string): Promise<void> {
  if (!convexClient) return;
  try {
    await convexClient.mutation(api.clinical_templates.remove, {
      template_id: templateId,
    });
  } catch (err) {
    console.warn('Could not delete template from Convex:', err);
  }
}

export async function fetchTemplatesFromConvex(): Promise<PrescriptionTemplate[]> {
  if (!convexClient) return [];
  try {
    const list = await convexClient.query(api.clinical_templates.list, {});
    if (list && Array.isArray(list)) {
      return list
        .filter((item: any) => !isDummyPreset(item) && !item.is_preset && !item.section_key)
        .map((item: any) => ({
          id: item.template_id || item._id,
          name: cleanTemplateName(item.name),
          diagnosis: item.diagnosis || '',
          category: item.category || 'General',
          doctor_name: item.doctor_name,
          advice: item.advice,
          dr_notes: item.dr_notes,
          quick_notes: item.quick_notes,
          findings: item.findings,
          procedure_advice: item.procedure_advice,
          diet_exercise: item.diet_exercise,
          investigations: item.investigations,
          general_examinations: item.general_examinations,
          past_medications: item.past_medications,
          followup_count: item.followup_count,
          followup_unit: item.followup_unit,
          medicines: item.medicines || [],
          complaints: item.complaints,
          tests_requested: item.tests_requested,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
    }
  } catch (err) {
    console.warn('Could not fetch templates from Convex:', err);
  }
  return [];
}

/**
 * Save or update a prescription template
 */
export function saveTemplate(template: Omit<PrescriptionTemplate, 'id' | 'created_at'> & { id?: string }): PrescriptionTemplate {
  const templates = getAllTemplates();
  const now = Date.now();
  const cleanName = cleanTemplateName(template.name);

  if (template.id) {
    const idx = templates.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      const updated: PrescriptionTemplate = {
        ...templates[idx],
        ...template,
        name: cleanName,
        id: template.id,
        updated_at: now,
      };
      templates[idx] = updated;
      try {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      } catch (err) {
        console.error('Failed to persist template update:', err);
      }
      syncTemplateToConvex(updated).catch(() => {});
      return updated;
    }
  }

  const newId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newTemplate: PrescriptionTemplate = {
    ...template,
    name: cleanName,
    id: newId,
    created_at: now,
    updated_at: now,
  };

  const updatedTemplates = [newTemplate, ...templates];
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates));
  } catch (err) {
    console.error('Failed to persist new template:', err);
  }
  syncTemplateToConvex(newTemplate).catch(() => {});
  return newTemplate;
}

/**
 * Delete a prescription template by ID
 */
export function deleteTemplate(id: string): boolean {
  const templates = getAllTemplates();
  const filtered = templates.filter(t => t.id !== id);
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
    deleteTemplateFromConvex(id).catch(() => {});
    return true;
  } catch (err) {
    console.error('Failed to delete template:', err);
    return false;
  }
}

/**
 * Filter templates by query, category, and doctor
 */
export function filterTemplates(
  query = '',
  category = 'All',
  doctorName?: string
): PrescriptionTemplate[] {
  const all = getAllTemplates();
  const q = query.trim().toLowerCase();

  return all.filter(t => {
    if (category && category !== 'All' && t.category !== category) {
      return false;
    }

    if (doctorName && doctorName !== 'All Doctors' && t.doctor_name) {
      if (t.doctor_name.toLowerCase() !== doctorName.toLowerCase()) {
        return false;
      }
    }

    if (!q) return true;

    const inName = t.name.toLowerCase().includes(q);
    const inDiag = (t.diagnosis || '').toLowerCase().includes(q);
    const inMeds = (t.medicines || []).some(m =>
      m.name.toLowerCase().includes(q) || (m.composition || '').toLowerCase().includes(q)
    );
    const inAdv = (t.advice || '').toLowerCase().includes(q);

    return inName || inDiag || inMeds || inAdv;
  });
}
