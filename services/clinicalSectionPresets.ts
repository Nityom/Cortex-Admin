import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export interface ClinicalSectionPreset {
  id: string;
  name: string;
  category?: string;
  description?: string;
  data: any;
}

// User requested to clear all hardcoded preset templates and only keep saved DB ones
export const CLINICAL_SECTION_PRESETS: Record<string, ClinicalSectionPreset[]> = {
  complaints: [],
  findings: [],
  diagnosis: [],
  procedure_done: [],
  dr_notes: [],
  quick_notes: [],
  advice: [],
  tests_requested: [],
  diet_exercise: [],
  investigations: [],
  general_examinations: [],
  systemic_examinations: [],
  past_medications: [],
  drawing_board: [],
  medicines: [],
};

const SECTION_STORAGE_PREFIX = 'cortex_section_tmpl_';

export interface ClinicalSectionMeta {
  key: string;
  title: string;
  category: string;
  description: string;
  dataType: 'text' | 'complaints' | 'tests' | 'diagnosis' | 'medicines' | 'procedure';
}

export const ALL_CLINICAL_SECTION_KEYS = [
  'complaints',
  'findings',
  'diagnosis',
  'procedure_done',
  'dr_notes',
  'quick_notes',
  'advice',
  'tests_requested',
  'diet_exercise',
  'investigations',
  'general_examinations',
  'systemic_examinations',
  'past_medications',
  'drawing_board',
  'medicines',
] as const;

export const SECTION_METADATA: Record<string, ClinicalSectionMeta> = {
  complaints: {
    key: 'complaints',
    title: 'Complaints',
    category: 'Clinical History',
    description: 'Patient symptoms and complaints',
    dataType: 'complaints',
  },
  findings: {
    key: 'findings',
    title: 'Findings',
    category: 'Physical Examination',
    description: 'Clinical findings and signs',
    dataType: 'text',
  },
  diagnosis: {
    key: 'diagnosis',
    title: 'Diagnosis',
    category: 'Clinical Diagnosis',
    description: 'SNOMED & provisional diagnoses',
    dataType: 'diagnosis',
  },
  procedure_done: {
    key: 'procedure_done',
    title: 'Procedure Done',
    category: 'Treatments',
    description: 'Procedures and clinical interventions',
    dataType: 'procedure',
  },
  dr_notes: {
    key: 'dr_notes',
    title: 'Doctor Notes',
    category: 'Internal',
    description: 'Private clinical and follow-up notes',
    dataType: 'text',
  },
  quick_notes: {
    key: 'quick_notes',
    title: 'Quick Notes',
    category: 'Clinical Notes',
    description: 'Concise reminders and observation notes',
    dataType: 'text',
  },
  advice: {
    key: 'advice',
    title: 'Advice',
    category: 'Patient Instructions',
    description: 'Lifestyle and medication instructions',
    dataType: 'text',
  },
  tests_requested: {
    key: 'tests_requested',
    title: 'Lab & Imaging Tests',
    category: 'Investigations',
    description: 'Requested blood tests, X-Rays, MRI',
    dataType: 'tests',
  },
  diet_exercise: {
    key: 'diet_exercise',
    title: 'Diet & Exercise',
    category: 'Rehabilitation',
    description: 'Dietary restrictions and physical exercises',
    dataType: 'text',
  },
  investigations: {
    key: 'investigations',
    title: 'Investigations',
    category: 'Investigations',
    description: 'Radiology and pathology investigation requests',
    dataType: 'text',
  },
  general_examinations: {
    key: 'general_examinations',
    title: 'General Examination',
    category: 'Physical Examination',
    description: 'Pallor, icterus, edema, lymphadenopathy',
    dataType: 'text',
  },
  systemic_examinations: {
    key: 'systemic_examinations',
    title: 'Systemic Examination',
    category: 'Physical Examination',
    description: 'CVS, RS, P/A, CNS findings',
    dataType: 'text',
  },
  past_medications: {
    key: 'past_medications',
    title: 'Past Medications',
    category: 'Clinical History',
    description: 'Prior drug treatments and ongoing medications',
    dataType: 'text',
  },
  drawing_board: {
    key: 'drawing_board',
    title: 'Drawing Board',
    category: 'Diagrams',
    description: 'Anatomical sketches & annotations',
    dataType: 'text',
  },
  medicines: {
    key: 'medicines',
    title: 'Medicines',
    category: 'Prescription',
    description: 'Medicine sets & dosages',
    dataType: 'medicines',
  },
};

export function getAllCustomSectionTemplates(): Array<
  ClinicalSectionPreset & { sectionKey: string; sectionTitle: string }
> {
  if (typeof window === 'undefined') return [];
  const results: Array<ClinicalSectionPreset & { sectionKey: string; sectionTitle: string }> = [];
  for (const key of ALL_CLINICAL_SECTION_KEYS) {
    const customList = getSectionCustomTemplates(key);
    const meta = SECTION_METADATA[key] || { title: key };
    for (const item of customList) {
      results.push({
        ...item,
        sectionKey: key,
        sectionTitle: meta.title,
      });
    }
  }
  return results;
}

export function getSectionCustomTemplates(sectionKey: string): ClinicalSectionPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${SECTION_STORAGE_PREFIX}${sectionKey}`);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Filter out old hardcoded preset IDs if any were cached in local storage
    return list.filter((item: any) => 
      !item.id.startsWith('cmp_') &&
      !item.id.startsWith('find_') &&
      !item.id.startsWith('diag_') &&
      !item.id.startsWith('proc_') &&
      !item.id.startsWith('dr_') &&
      !item.id.startsWith('qn_') &&
      !item.id.startsWith('adv_') &&
      !item.id.startsWith('tests_') &&
      !item.id.startsWith('diet_') &&
      !item.id.startsWith('inv_') &&
      !item.id.startsWith('gex_') &&
      !item.id.startsWith('sex_') &&
      !item.id.startsWith('pmed_') &&
      !item.id.startsWith('med_')
    );
  } catch (err) {
    console.error(`Error reading section templates for ${sectionKey}:`, err);
    return [];
  }
}

export function saveSectionCustomTemplate(
  sectionKey: string,
  name: string,
  data: any,
  category = 'Custom'
): ClinicalSectionPreset {
  const current = getSectionCustomTemplates(sectionKey);

  // Normalize tests_requested data into clean array of { name, by_when }
  let normalizedData = data;
  if (sectionKey === 'tests_requested') {
    if (Array.isArray(data)) {
      normalizedData = data
        .map((t: any) => ({
          name: String(t.name || (typeof t === 'string' ? t : '')).trim(),
          by_when: String(t.by_when || 'Next Visit').trim(),
        }))
        .filter((t: any) => t.name.length > 0);
    }
  }

  const newPreset: ClinicalSectionPreset = {
    id: `tmpl_${sectionKey}_${Date.now()}`,
    name,
    category,
    data: normalizedData,
  };
  const updated = [newPreset, ...current];
  try {
    localStorage.setItem(`${SECTION_STORAGE_PREFIX}${sectionKey}`, JSON.stringify(updated));
  } catch (err) {
    console.error(`Error saving section template for ${sectionKey}:`, err);
  }

  // Persist to Convex DB
  if (convexClient) {
    const stringified = typeof normalizedData === 'string' ? normalizedData : JSON.stringify(normalizedData);
    convexClient.mutation(api.clinical_templates.upsert, {
      template_id: newPreset.id,
      name,
      category,
      section_key: sectionKey,
      data: normalizedData,
      medicines: sectionKey === 'medicines' ? normalizedData : undefined,
      is_preset: false,
      diagnosis: sectionKey === 'diagnosis' ? stringified : undefined,
      complaints: sectionKey === 'complaints' ? normalizedData : undefined,
      findings: sectionKey === 'findings' ? stringified : undefined,
      advice: sectionKey === 'advice' ? stringified : undefined,
      dr_notes: sectionKey === 'dr_notes' ? stringified : undefined,
      quick_notes: sectionKey === 'quick_notes' ? stringified : undefined,
      procedure_advice: sectionKey === 'procedure_advice' ? stringified : undefined,
      diet_exercise: sectionKey === 'diet_exercise' ? stringified : undefined,
      tests_requested: sectionKey === 'tests_requested' || sectionKey === 'investigations' ? normalizedData : undefined,
      investigations: sectionKey === 'investigations' ? stringified : undefined,
      general_examinations: sectionKey === 'general_examinations' ? stringified : undefined,
      systemic_examinations: sectionKey === 'systemic_examinations' ? stringified : undefined,
      past_medications: sectionKey === 'past_medications' ? stringified : undefined,
    }).catch((err: any) => console.warn('Could not sync section template to Convex:', err));
  }

  return newPreset;
}

export function deleteSectionCustomTemplate(sectionKey: string, id: string): boolean {
  const current = getSectionCustomTemplates(sectionKey);
  const filtered = current.filter((t) => t.id !== id);
  try {
    localStorage.setItem(`${SECTION_STORAGE_PREFIX}${sectionKey}`, JSON.stringify(filtered));
  } catch (err) {
    console.error(`Error deleting section template for ${sectionKey}:`, err);
    return false;
  }

  // Delete from Convex DB
  if (convexClient) {
    convexClient.mutation(api.clinical_templates.remove, {
      template_id: id,
    }).catch((err: any) => console.warn('Could not delete section template from Convex:', err));
  }

  return true;
}

export async function fetchSectionTemplatesFromConvex(sectionKey: string): Promise<ClinicalSectionPreset[]> {
  if (!convexClient) return getSectionCustomTemplates(sectionKey);
  try {
    const list = await convexClient.query(api.clinical_templates.list, {});
    if (list && Array.isArray(list)) {
      const sectionItems = list
        .filter((item: any) => item.section_key === sectionKey)
        .map((item: any) => {
          let templateData: any;
          if (item.data !== undefined && item.data !== null) {
            templateData = item.data;
          } else if (item.section_key === 'medicines') {
            templateData = item.medicines || [];
          } else if (item.section_key === 'tests_requested') {
            templateData = item.tests_requested || [];
          } else if (item.section_key === 'findings') {
            templateData = item.findings || '';
          } else if (item.section_key === 'quick_notes') {
            templateData = item.quick_notes || '';
          } else if (item.section_key === 'complaints') {
            templateData = item.complaints || [];
          } else {
            templateData = item.advice || item.diagnosis || item.dr_notes || item.diet_exercise || item.procedure_advice || '';
          }
          return {
            id: item.template_id || item._id,
            name: item.name,
            category: item.category || 'General',
            data: templateData,
            description: item.description,
          };
        });
      if (sectionItems.length > 0) {
        const local = getSectionCustomTemplates(sectionKey);
        const map = new Map<string, ClinicalSectionPreset>();
        for (const l of local) map.set(l.id, l);
        for (const s of sectionItems) map.set(s.id, s);
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(`${SECTION_STORAGE_PREFIX}${sectionKey}`, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
    return getSectionCustomTemplates(sectionKey);
  } catch (err) {
    console.warn('Could not fetch section templates from Convex:', err);
    return getSectionCustomTemplates(sectionKey);
  }
}
