import { MedicineEntry } from './prescription';
export * from './clinicalSectionPresets';

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

export const DEFAULT_CLINICAL_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'tmpl_ortho_oa_knee',
    name: 'Osteoarthritis Bilateral Knee Protocol',
    diagnosis: 'Osteoarthritis Bilateral Knees (Grade II)',
    category: 'Orthopaedics',
    doctor_name: 'Dr. Vipeen Raut',
    complaints: [
      { complaint: 'Bilateral knee pain aggravated on climbing stairs', frequency: 'Continuous', severity: 'Moderate', duration: '2 months' },
      { complaint: 'Morning stiffness in knee joints (< 30 mins)', frequency: 'Daily', severity: 'Mild', duration: '1 month' },
    ],
    medicines: [
      {
        name: 'TAB ACECLOFENAC 100 MG + PARACETAMOL 325 MG',
        composition: 'ACECLOFENAC 100 MG + PARACETAMOL 325 MG',
        dosage: '1-0-1',
        unit: 'tab',
        time: 'Morning & Night',
        when: 'After Food',
        frequency: 'daily',
        duration: '5 days',
        note: 'दुपारी व रात्री जेवणानंतर घ्यावे',
      },
      {
        name: 'TAB DIACEREIN 50 MG + GLUCOSAMINE 750 MG',
        composition: 'DIACEREIN 50 MG + GLUCOSAMINE 750 MG',
        dosage: '0-0-1',
        unit: 'tab',
        time: 'Night',
        when: 'After Food',
        frequency: 'daily',
        duration: '1 month',
        note: 'रात्री जेवणानंतर',
      },
      {
        name: 'CAP CALCIUM CITRATE MALATE + VITAMIN D3',
        composition: 'CALCIUM CITRATE MALATE 1250 MG + VIT D3 400 IU',
        dosage: '0-1-0',
        unit: 'cap',
        time: 'Afternoon',
        when: 'After Food',
        frequency: 'daily',
        duration: '1 month',
        note: 'दुपारी जेवणानंतर',
      },
      {
        name: 'TAB PANTOPRAZOLE 40 MG',
        composition: 'PANTOPRAZOLE 40 MG',
        dosage: '1-0-0',
        unit: 'tab',
        time: 'Morning',
        when: 'Empty Stomach',
        frequency: 'daily',
        duration: '7 days',
        note: 'सकाळी उपाशीपोटी',
      },
    ],
    advice: 'Avoid squatting and sitting on the floor. Avoid prolonged standing and climbing stairs without handrail. Perform quadriceps isometric exercises 3 times daily. Hot fermentation for 15 minutes twice daily.',
    dr_notes: 'Knee brace (tubular) advised while travelling. Review with X-Ray AP/Lat standing.',
    procedure_advice: 'Intra-articular PRP / Viscosupplementation injection can be scheduled if pain persists.',
    tests_requested: [
      { name: 'X-Ray Both Knees AP & Lateral Standing', by_when: 'Next Visit' },
      { name: 'Serum Uric Acid & ESR', by_when: 'Next Visit' },
    ],
    diet_exercise: 'Maintain healthy BMI. Low carb, high calcium diet. Isometric quadriceps contractions.',
    followup_count: '1',
    followup_unit: 'Months',
    created_at: 1730000000000,
  },
  {
    id: 'tmpl_ortho_back_pain',
    name: 'Lumbar Spondylosis / Low Back Pain',
    diagnosis: 'Lumbar Spondylosis with Muscle Spasm',
    category: 'Orthopaedics',
    doctor_name: 'Dr. Vipeen Raut',
    complaints: [
      { complaint: 'Low back ache radiating to left gluteal region', frequency: 'Intermittent', severity: 'Moderate', duration: '3 weeks' },
      { complaint: 'Difficulty in forward bending', frequency: 'Continuous', severity: 'Moderate', duration: '2 weeks' },
    ],
    medicines: [
      {
        name: 'TAB PREGABALIN 75 MG + METHYLCOBALAMIN 750 MCG',
        composition: 'PREGABALIN 75 MG + METHYLCOBALAMIN 750 MCG',
        dosage: '0-0-1',
        unit: 'tab',
        time: 'Night',
        when: 'At Bedtime',
        frequency: 'daily',
        duration: '15 days',
        note: 'रात्री झोपताना घ्यावे',
      },
      {
        name: 'TAB THIOCOLCHICOSIDE 4 MG + ETORICOXIB 60 MG',
        composition: 'THIOCOLCHICOSIDE 4 MG + ETORICOXIB 60 MG',
        dosage: '1-0-1',
        unit: 'tab',
        time: 'Morning & Night',
        when: 'After Food',
        frequency: 'daily',
        duration: '5 days',
        note: 'जेवणानंतर',
      },
      {
        name: 'TAB RABEPRAZOLE 20 MG',
        composition: 'RABEPRAZOLE 20 MG',
        dosage: '1-0-0',
        unit: 'tab',
        time: 'Morning',
        when: 'Empty Stomach',
        frequency: 'daily',
        duration: '7 days',
        note: 'सकाळी उपाशीपोटी',
      },
    ],
    advice: 'Lumbo-sacral corset belt while walking and travelling. Firm mattress for sleeping. Strictly avoid forward bending and lifting heavy weights. Pelvic bridging and back extension exercises after acute pain subsides.',
    dr_notes: 'LS belt size L advised.',
    tests_requested: [
      { name: 'MRI Lumbar Spine with whole spine screening', by_when: 'If symptoms persist' },
    ],
    diet_exercise: 'Core strengthening exercises once pain score < 3.',
    followup_count: '15',
    followup_unit: 'Days',
    created_at: 1730000000000,
  },
  {
    id: 'tmpl_gynae_anc_first',
    name: 'Antenatal Care (ANC) - 1st Trimester Routine',
    diagnosis: 'Intrauterine Pregnancy (8 Weeks Gestation)',
    category: 'Gynaecology',
    doctor_name: 'Dr. Shillpa Raut',
    complaints: [
      { complaint: 'Nausea and morning sickness', frequency: 'Intermittent', severity: 'Mild', duration: '2 weeks' },
      { complaint: 'Amenorrhea since 2 months', frequency: 'Continuous', severity: 'Mild', duration: '8 weeks' },
    ],
    medicines: [
      {
        name: 'TAB FOLIC ACID 5 MG',
        composition: 'FOLIC ACID 5 MG',
        dosage: '0-1-0',
        unit: 'tab',
        time: 'Afternoon',
        when: 'After Food',
        frequency: 'daily',
        duration: '1 month',
        note: 'दुपारी जेवणानंतर घ्यावे',
      },
      {
        name: 'TAB DOXYLAMINE SUCCINATE 10 MG + PYRIDOXINE 10 MG',
        composition: 'DOXYLAMINE SUCCINATE 10 MG + PYRIDOXINE 10 MG',
        dosage: '0-0-1',
        unit: 'tab',
        time: 'Night',
        when: 'At Bedtime',
        frequency: 'daily',
        duration: '15 days',
        note: 'रात्री झोपताना उलटी/मळमळ कमी होण्यासाठी',
      },
    ],
    advice: 'Small frequent meals. Keep dry crackers/rusk on bedside before getting up in the morning. Stay well hydrated with coconut water and fresh juices. Avoid smoking, alcohol, and unprescribed over-the-counter medicines. Report immediately in case of bleeding per vaginum or severe lower abdominal pain.',
    dr_notes: 'First trimester ANC protocol initiated. Td toxoid scheduled at 16 weeks.',
    procedure_advice: 'Dating and viability USG scan advised.',
    tests_requested: [
      { name: 'USG Obstetric (Dating & Cardiac Activity Scan)', by_when: 'This Week' },
      { name: 'Complete Blood Count (CBC) & Blood Group Rh', by_when: 'This Week' },
      { name: 'Thyroid Stimulating Hormone (TSH) & Blood Sugar (FBS/PPBS)', by_when: 'This Week' },
      { name: 'HIV, HBsAg, VDRL, Urine Routine', by_when: 'This Week' },
    ],
    diet_exercise: 'Folate rich diet (green leafy vegetables, legumes, citrus fruits). Gentle walking 20 mins.',
    followup_count: '4',
    followup_unit: 'Weeks',
    created_at: 1730000000000,
  },
  {
    id: 'tmpl_gynae_anc_second',
    name: 'Antenatal Care (ANC) - 2nd Trimester Routine',
    diagnosis: 'Intrauterine Pregnancy (20 Weeks Gestation)',
    category: 'Gynaecology',
    doctor_name: 'Dr. Shillpa Raut',
    complaints: [
      { complaint: 'Routine ANC visit, quickening perceived', frequency: 'Occasionally', severity: 'Mild', duration: '1 week' },
    ],
    medicines: [
      {
        name: 'TAB FERROUS ASCORBATE 100 MG + FOLIC ACID 1.5 MG',
        composition: 'FERROUS ASCORBATE 100 MG + FOLIC ACID 1.5 MG',
        dosage: '1-0-0',
        unit: 'tab',
        time: 'Morning',
        when: 'After Food',
        frequency: 'daily',
        duration: '1 month',
        note: 'सकाळी नाश्ता नंतर (दूध किंवा चहासोबत घेऊ नये)',
      },
      {
        name: 'TAB CALCIUM CARBONATE 500 MG + VIT D3 250 IU',
        composition: 'CALCIUM CARBONATE 500 MG + VIT D3 250 IU',
        dosage: '0-0-1',
        unit: 'tab',
        time: 'Night',
        when: 'After Food',
        frequency: 'daily',
        duration: '1 month',
        note: 'रात्री जेवणानंतर (लोह आणि कॅल्शियम गोळी वेगवेगळ्या वेळी घ्यावी)',
      },
    ],
    advice: 'Take Iron and Calcium tablets at least 4 hours apart for optimal absorption. Maintain regular fetal movement counting (DFMC) from 24 weeks. Lie on left lateral side while sleeping.',
    dr_notes: 'Targeted Anomaly Scan (TIFFA) scheduled between 18-20 weeks.',
    procedure_advice: 'Inj. Td 1st dose given. Inj. Td 2nd dose after 4 weeks.',
    tests_requested: [
      { name: 'TIFFA Scan (Anomaly Ultrasound)', by_when: 'Completed / Next Visit' },
      { name: 'Repeat Hemoglobin (Hb%)', by_when: 'Next Visit' },
    ],
    diet_exercise: 'High protein diet (paneer, eggs, pulses). Iron-rich diet (spinach, jaggery, beetroot).',
    followup_count: '4',
    followup_unit: 'Weeks',
    created_at: 1730000000000,
  },
  {
    id: 'tmpl_general_urti',
    name: 'Acute Bronchitis & Upper Respiratory Infection',
    diagnosis: 'Acute Upper Respiratory Tract Infection (URTI) with Dry Cough',
    category: 'General Medicine',
    doctor_name: 'Dr. Vipeen Raut',
    complaints: [
      { complaint: 'Fever with chills and body ache', frequency: 'Intermittent', severity: 'Moderate', duration: '3 days' },
      { complaint: 'Dry irritating cough with throat pain', frequency: 'Continuous', severity: 'Moderate', duration: '4 days' },
    ],
    medicines: [
      {
        name: 'TAB AMOXICILLIN 500 MG + CLAVULANIC ACID 125 MG',
        composition: 'AMOXICILLIN 500 MG + CLAVULANIC ACID 125 MG',
        dosage: '1-0-1',
        unit: 'tab',
        time: 'Morning & Night',
        when: 'After Food',
        frequency: 'daily',
        duration: '5 days',
        note: 'दुपारी व रात्री जेवणानंतर 5 दिवस पूर्ण करा',
      },
      {
        name: 'TAB PARACETAMOL 650 MG',
        composition: 'PARACETAMOL 650 MG',
        dosage: '1-0-1',
        unit: 'tab',
        time: 'Morning & Night',
        when: 'After Food',
        frequency: 'SOS',
        duration: '3 days',
        note: 'ताप / अंगदुखी असल्यास',
      },
      {
        name: 'TAB LEVOCETIRIZINE 5 MG + MONTELUKAST 10 MG',
        composition: 'LEVOCETIRIZINE 5 MG + MONTELUKAST 10 MG',
        dosage: '0-0-1',
        unit: 'tab',
        time: 'Night',
        when: 'At Bedtime',
        frequency: 'daily',
        duration: '7 days',
        note: 'रात्री झोपताना',
      },
      {
        name: 'SYRUP DEXTROMETHORPHAN + CHLORPHENIRAMINE 100 ML',
        composition: 'DEXTROMETHORPHAN 10 MG + CPM 2 MG / 5 ML',
        dosage: '1-1-1',
        unit: 'ml',
        time: 'Morning, Afternoon & Night',
        when: 'After Food',
        frequency: 'daily',
        duration: '5 days',
        note: '10 मिली दिवसातून 3 वेळा',
      },
    ],
    advice: 'Steam inhalation twice daily for 10 minutes. Warm saline gargles thrice daily. Drink warm water throughout the day. Rest and avoid cold drinks or fried foods.',
    dr_notes: 'Chest clear on auscultation. Review if fever spikes above 102°F or breathlessness occurs.',
    tests_requested: [
      { name: 'CBC with Platelet Count & ESR', by_when: 'If fever persists > 48 hrs' },
    ],
    diet_exercise: 'Light warm soups, khichdi, plenty of fluids.',
    followup_count: '5',
    followup_unit: 'Days',
    created_at: 1730000000000,
  },
  {
    id: 'tmpl_general_hypertension',
    name: 'Hypertension Essential Protocol',
    diagnosis: 'Essential Hypertension (Stage 1)',
    category: 'General Medicine',
    doctor_name: 'Dr. Vipeen Raut',
    complaints: [
      { complaint: 'Mild occipital headache in the morning', frequency: 'Intermittent', severity: 'Mild', duration: '2 weeks' },
      { complaint: 'Occasional dizziness on sudden standing', frequency: 'Occasionally', severity: 'Mild', duration: '10 days' },
    ],
    medicines: [
      {
        name: 'TAB TELMISARTAN 40 MG',
        composition: 'TELMISARTAN 40 MG',
        dosage: '1-0-0',
        unit: 'tab',
        time: 'Morning',
        when: 'After Food',
        frequency: 'daily',
        duration: '1 month',
        note: 'सकाळी नाश्ता नंतर दररोज नियमित वेळेवर घ्यावे',
      },
      {
        name: 'TAB AMLODIPINE 5 MG',
        composition: 'AMLODIPINE 5 MG',
        dosage: '0-0-1',
        unit: 'tab',
        time: 'Night',
        when: 'After Food',
        frequency: 'daily',
        duration: '1 month',
        note: 'रात्री जेवणानंतर',
      },
    ],
    advice: 'Low salt diet (< 3-5g/day). Avoid papad, pickles, processed foods, and salted snacks. Regular 40-minute brisk walk daily. Maintain a daily blood pressure record chart.',
    dr_notes: 'BP log advised. Review with lipid profile and renal function test.',
    tests_requested: [
      { name: 'Lipid Profile & Serum Creatinine / Electrolytes', by_when: 'Next Visit' },
      { name: 'Electrocardiogram (ECG)', by_when: 'This Week' },
    ],
    diet_exercise: 'DASH diet (rich in fruits, vegetables, low fat dairy). Stress management.',
    followup_count: '1',
    followup_unit: 'Months',
    created_at: 1730000000000,
  },
];

/**
 * Get all prescription templates from localStorage, initializing with defaults if empty.
 */
export function getAllTemplates(): PrescriptionTemplate[] {
  if (typeof window === 'undefined') {
    return DEFAULT_CLINICAL_TEMPLATES;
  }

  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_CLINICAL_TEMPLATES));
      return DEFAULT_CLINICAL_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_CLINICAL_TEMPLATES;
  } catch (err) {
    console.error('Failed to load templates from localStorage:', err);
    return DEFAULT_CLINICAL_TEMPLATES;
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
 * Save or update a prescription template
 */
export function saveTemplate(template: Omit<PrescriptionTemplate, 'id' | 'created_at'> & { id?: string }): PrescriptionTemplate {
  const templates = getAllTemplates();
  const now = Date.now();

  if (template.id) {
    const idx = templates.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      const updated: PrescriptionTemplate = {
        ...templates[idx],
        ...template,
        id: template.id,
        updated_at: now,
      };
      templates[idx] = updated;
      try {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      } catch (err) {
        console.error('Failed to persist template update:', err);
      }
      return updated;
    }
  }

  const newId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newTemplate: PrescriptionTemplate = {
    ...template,
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
