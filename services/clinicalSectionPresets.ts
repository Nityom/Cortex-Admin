export interface ClinicalSectionPreset {
  id: string;
  name: string;
  category?: string;
  description?: string;
  data: any;
}

export const CLINICAL_SECTION_PRESETS: Record<string, ClinicalSectionPreset[]> = {
  complaints: [
    {
      id: 'cmp_oa_knee',
      name: 'Osteoarthritis Knee Protocol',
      category: 'Orthopaedics',
      description: 'Bilateral knee pain aggravated on stairs, morning stiffness',
      data: [
        { complaint: 'Bilateral knee pain aggravated on climbing stairs & walking', frequency: 'Continuous', severity: 'Moderate', duration: '2 months' },
        { complaint: 'Morning stiffness in knee joints (< 30 mins)', frequency: 'Daily', severity: 'Mild', duration: '1 month' },
      ],
    },
    {
      id: 'cmp_lumbar_spine',
      name: 'Lumbar Spondylosis / Sciatica',
      category: 'Orthopaedics',
      description: 'Low back ache radiating to lower limb with stiffness',
      data: [
        { complaint: 'Low back ache radiating to left lower extremity', frequency: 'Intermittent', severity: 'Moderate', duration: '3 weeks' },
        { complaint: 'Difficulty and pain on forward bending', frequency: 'Continuous', severity: 'Moderate', duration: '2 weeks' },
      ],
    },
    {
      id: 'cmp_cervical_spine',
      name: 'Cervical Spondylosis / Neck Pain',
      category: 'Orthopaedics',
      description: 'Neck stiffness and radicular pain to upper limb',
      data: [
        { complaint: 'Neck pain with stiffness radiating to right shoulder', frequency: 'Intermittent', severity: 'Moderate', duration: '1 month' },
        { complaint: 'Tingling sensation in right hand fingers', frequency: 'Intermittent', severity: 'Mild', duration: '2 weeks' },
      ],
    },
    {
      id: 'cmp_urti_fever',
      name: 'Acute URTI & Viral Fever',
      category: 'General Medicine',
      description: 'Fever with chills, throat irritation and cough',
      data: [
        { complaint: 'High grade fever with body ache and chills', frequency: 'Intermittent', severity: 'Moderate', duration: '3 days' },
        { complaint: 'Sore throat, throat irritation and dry cough', frequency: 'Continuous', severity: 'Mild', duration: '4 days' },
      ],
    },
    {
      id: 'cmp_gerd',
      name: 'Dyspepsia / Acidity / GERD',
      category: 'General Medicine',
      description: 'Epigastric burning, postprandial fullness',
      data: [
        { complaint: 'Epigastric burning sensation after meals', frequency: 'Intermittent', severity: 'Moderate', duration: '2 weeks' },
        { complaint: 'Acid reflux, sour belching and bloating', frequency: 'Daily', severity: 'Mild', duration: '10 days' },
      ],
    },
    {
      id: 'cmp_anc_routine',
      name: 'Antenatal Care (ANC) Routine',
      category: 'Gynaecology',
      description: 'Routine antenatal review, amenorrhea, nausea',
      data: [
        { complaint: 'Routine antenatal check-up visit', frequency: 'Regular', severity: 'Mild', duration: '4 weeks' },
        { complaint: 'Mild morning sickness and nausea', frequency: 'Intermittent', severity: 'Mild', duration: '2 weeks' },
      ],
    },
  ],

  findings: [
    {
      id: 'fnd_oa_knee',
      name: 'Knee Osteoarthritis Examination',
      category: 'Orthopaedics',
      data: 'Bilateral knee joint crepitus present on active and passive movement. Medial joint line tenderness (+). No gross effusion or erythema. Range of motion: 0-110 degrees, terminal flexion painful. McMurray / Anterior Drawer / Lachman tests negative.',
    },
    {
      id: 'fnd_lumbar_spine',
      name: 'Lumbar Spine Radiculopathy',
      category: 'Orthopaedics',
      data: 'Paravertebral muscle spasm present in lumbar region. Tenderness over L4-L5 interspinous space. Straight leg raising test (SLRT) positive at 60 degrees on left. Motor power 5/5 bilateral lower limbs. Knee and ankle jerks preserved. Plantar flexor.',
    },
    {
      id: 'fnd_cervical_spine',
      name: 'Cervical Spine Examination',
      category: 'Orthopaedics',
      data: 'Restricted cervical lateral rotation and extension due to pain. Tenderness over C5-C6 paraspinal musculature. Spurling test positive on right side. Upper limb deep tendon reflexes (biceps, triceps, supinator) normal.',
    },
    {
      id: 'fnd_gen_opd',
      name: 'General OPD Systemic Signs',
      category: 'General Medicine',
      data: 'Conscious, cooperative, well-oriented. Vital parameters within normal limits. No pallor, icterus, cyanosis, clubbing, or pedal edema. Chest: Bilateral air entry clear, vesicular breath sounds. CVS: S1 S2 heard, no murmurs. Abdomen: Soft, non-tender, no organomegaly.',
    },
    {
      id: 'fnd_ent_throat',
      name: 'ENT / Pharyngeal Findings',
      category: 'ENT',
      data: 'Posterior pharyngeal wall congested (+). Tonsils mildly enlarged (Grade 1), non-follicular. Anterior cervical lymph nodes palpable, mildly tender. Tympanic membranes bilateral intact and shiny.',
    },
    {
      id: 'fnd_gynae_anc',
      name: 'Antenatal Obstetric Exam',
      category: 'Gynaecology',
      data: 'Uterus corresponds to gestational age. Fetal heart sounds (FHS) heard, regular (144 bpm). Cephalic presentation. Normal liquor volume clinically. No uterine contractions, no bleeding or leaking per vaginum.',
    },
  ],

  diagnosis: [
    {
      id: 'diag_oa_knee',
      name: 'Osteoarthritis Bilateral Knee',
      category: 'Orthopaedics',
      data: 'Osteoarthritis Bilateral Knees (Grade II) [ICD M17.0]',
    },
    {
      id: 'diag_lumbar_spon',
      name: 'Lumbar Spondylosis with Sciatica',
      category: 'Orthopaedics',
      data: 'Lumbar Spondylosis with Radiculopathy [ICD M47.816]',
    },
    {
      id: 'diag_cervical_spon',
      name: 'Cervical Spondylosis',
      category: 'Orthopaedics',
      data: 'Cervical Spondylosis without Myelopathy [ICD M47.812]',
    },
    {
      id: 'diag_htn',
      name: 'Essential Primary Hypertension',
      category: 'General Medicine',
      data: 'Essential (Primary) Hypertension [ICD I10]',
    },
    {
      id: 'diag_t2dm',
      name: 'Type 2 Diabetes Mellitus',
      category: 'General Medicine',
      data: 'Type 2 Diabetes Mellitus with Neuropathy [ICD E11.4]',
    },
    {
      id: 'diag_urti',
      name: 'Acute Viral URTI',
      category: 'General Medicine',
      data: 'Acute Upper Respiratory Tract Infection (URTI) [ICD J06.9]',
    },
    {
      id: 'diag_gerd',
      name: 'Gastroesophageal Reflux Disease',
      category: 'General Medicine',
      data: 'Gastroesophageal Reflux Disease without Esophagitis [ICD K21.9]',
    },
    {
      id: 'diag_anc',
      name: 'Antenatal Care (ANC)',
      category: 'Gynaecology',
      data: 'Intrauterine Pregnancy - Antenatal Care Routine [ICD Z34.90]',
    },
    {
      id: 'diag_frozen_shoulder',
      name: 'Adhesive Capsulitis / Frozen Shoulder',
      category: 'Orthopaedics',
      data: 'Adhesive Capsulitis of Shoulder [ICD M75.0]',
    },
  ],

  procedure_done: [
    {
      id: 'proc_prp_joint',
      name: 'Intra-articular Knee Injection',
      category: 'Orthopaedics',
      description: 'Sterile intra-articular PRP / Hyaluronic acid injection',
      data: { name: 'Intra-articular Joint Injection Right Knee', price: 1500, qty: 1 },
    },
    {
      id: 'proc_pop_slab',
      name: 'Below Knee / Short Arm POP Cast',
      category: 'Orthopaedics',
      description: 'POP immobilization slab / cast application',
      data: { name: 'POP Slab / Cast Application with Padding', price: 800, qty: 1 },
    },
    {
      id: 'proc_wound_dressing',
      name: 'Wound Debridement & Dressing',
      category: 'General Surgery',
      description: 'Aseptic surgical wound dressing with Betadine',
      data: { name: 'Surgical Wound Cleaning & Sterile Dressing', price: 400, qty: 1 },
    },
    {
      id: 'proc_suture_removal',
      name: 'Suture Removal & Antiseptic Wash',
      category: 'General Surgery',
      description: 'Suture removal with sterile antiseptic wash',
      data: { name: 'Suture Removal & Antiseptic Cleaning', price: 250, qty: 1 },
    },
    {
      id: 'proc_nebulization',
      name: 'Nebulization (Duolin + Budecort)',
      category: 'General Medicine',
      description: 'Bronchodilator nebulization therapy',
      data: { name: 'Nebulization Therapy (2 cycles)', price: 300, qty: 1 },
    },
  ],

  dr_notes: [
    {
      id: 'dr_surg_counsel',
      name: 'Surgical vs Medical Counseling',
      category: 'Clinical Counseling',
      data: 'Patient explained disease progression and indicated for total joint replacement / surgical intervention if symptoms fail to improve. Patient currently opted for medical management and physiotherapy. Review in 4 weeks.',
    },
    {
      id: 'dr_cauda_equina',
      name: 'Cauda Equina Red Flag Counseling',
      category: 'Emergency Warnings',
      data: 'Cauda equina syndrome red flag warnings clearly explained to patient (urinary/bowel retention or incontinence, saddle anesthesia, progressive foot weakness). Instructed to report immediately to casualty if any red flag occurs.',
    },
    {
      id: 'dr_compliance_bp',
      name: 'Medication Compliance & Diet',
      category: 'General Practice',
      data: 'Emphasized regular medication compliance for BP and blood sugar. Patient instructed to maintain a home blood pressure log twice daily for 2 weeks. Strictly avoid OTC painkillers.',
    },
    {
      id: 'dr_postop_review',
      name: 'Post-Operative Progress Note',
      category: 'Post-Op',
      data: 'Post-operative incision site clean, healthy, no discharge. Mild edema managed with limb elevation and compression bandage. Active toe movements encouraged.',
    },
  ],

  quick_notes: [
    {
      id: 'qn_opd_7d',
      name: 'Review in OPD 7 Days',
      category: 'Follow-up',
      data: 'Review in OPD after 7 days with investigation reports.',
    },
    {
      id: 'qn_sos_review',
      name: 'SOS Review if Pain Aggravates',
      category: 'Follow-up',
      data: 'SOS review if pain, fever, or swelling worsens.',
    },
    {
      id: 'qn_continue_meds',
      name: 'Continue Existing Cardiac Drugs',
      category: 'Medication',
      data: 'Continue existing morning cardiac medications as previously prescribed.',
    },
    {
      id: 'qn_reports_normal',
      name: 'Investigation Reports Normal',
      category: 'Reports',
      data: 'All baseline laboratory and imaging reports reviewed and found within normal limits.',
    },
  ],

  advice: [
    {
      id: 'adv_oa_knee',
      name: 'Osteoarthritis Knee Lifestyle Advice',
      category: 'Orthopaedics',
      data: 'Avoid squatting, sitting on the floor, and cross-legged posture. Use western-style commode. Avoid prolonged standing and unnecessary stair climbing. Hot water fomentation for 15 minutes twice daily. Wear well-cushioned supportive footwear. Quadriceps isometric exercises 3 times daily.',
    },
    {
      id: 'adv_spine_care',
      name: 'Spine Care & Lumbar Belt Protocol',
      category: 'Orthopaedics',
      data: 'Wear lumbo-sacral corset belt while walking and travelling. Sleep on a firm, flat mattress. Strictly avoid bending forward and lifting heavy weights (> 5 kg). Turn sideways before getting out of bed. Pelvic bridging and back extension exercises after acute pain subsides.',
    },
    {
      id: 'adv_fever_general',
      name: 'General Viral Fever & Hydration Advice',
      category: 'General Medicine',
      data: 'Adequate physical rest. Drink 2.5 to 3 litres of boiled and cooled water daily. Light, warm home-cooked meals (khichdi, soup, dal). Avoid cold drinks, ice, and spicy food. Lukewarm water sponging if body temperature rises above 100°F.',
    },
    {
      id: 'adv_diabetic_cardio',
      name: 'Diabetic & Hypertension Lifestyle',
      category: 'General Medicine',
      data: 'Restrict dietary sodium to < 5g per day. Avoid refined sugar, sweets, potatoes, and deep-fried items. High fiber diet (whole grains, vegetables, salads). 30-40 minutes of brisk walking daily. Self-monitor BP and blood sugar regularly.',
    },
    {
      id: 'adv_anc_lifestyle',
      name: 'Antenatal Care Daily Guidelines',
      category: 'Gynaecology',
      data: 'Small and frequent nutritious meals. Take iron and calcium supplements at least 4 hours apart for optimal absorption. Sleep on the left lateral side. Keep track of daily fetal movement count (DFMC) from 24 weeks. Report immediately if vaginal bleeding or severe abdominal cramps occur.',
    },
  ],

  tests_requested: [
    {
      id: 'tst_ortho_knee',
      name: 'Knee X-Ray & Arthritis Panel',
      category: 'Orthopaedics',
      description: 'X-Ray Knees AP & Lat standing, ESR, Uric Acid',
      data: [
        { name: 'X-Ray Both Knees AP & Lateral Standing', by_when: 'Next Visit' },
        { name: 'Serum Uric Acid & ESR', by_when: 'Next Visit' },
        { name: 'Complete Blood Count (CBC)', by_when: 'Next Visit' },
      ],
    },
    {
      id: 'tst_lumbar_spine',
      name: 'Lumbar Spine MRI & Metabolic Panel',
      category: 'Orthopaedics',
      description: 'MRI Lumbar Spine with whole spine screening, Vitamin D3 & B12',
      data: [
        { name: 'MRI Lumbar Spine with whole spine screening', by_when: 'Within 7 Days' },
        { name: 'Vitamin D3 & Vitamin B12 levels', by_when: 'Next Visit' },
      ],
    },
    {
      id: 'tst_routine_health',
      name: 'Routine Health & Diabetic Profile',
      category: 'General Medicine',
      description: 'CBC, Fasting Blood Sugar, HbA1c, Lipid Profile, Creatinine',
      data: [
        { name: 'Complete Blood Count (CBC)', by_when: 'Before Next Visit' },
        { name: 'Fasting Blood Sugar (FBS) & HbA1c', by_when: 'Before Next Visit' },
        { name: 'Lipid Profile & Serum Creatinine', by_when: 'Before Next Visit' },
      ],
    },
    {
      id: 'tst_anc_panel',
      name: 'Antenatal Screening Panel',
      category: 'Gynaecology',
      description: 'Obstetric USG Scan, Urine Routine, Hemoglobin',
      data: [
        { name: 'Obstetric Ultrasound (Targeted Anomaly Scan)', by_when: 'Next Visit' },
        { name: 'Hemoglobin (Hb%) & Blood Group Rh', by_when: 'Next Visit' },
        { name: 'Urine Routine & Microscopic Examination', by_when: 'Next Visit' },
      ],
    },
  ],

  diet_exercise: [
    {
      id: 'diet_ortho_knee',
      name: 'Knee Osteoarthritis Diet & Exercises',
      category: 'Orthopaedics',
      data: 'Maintain healthy BMI. High calcium and Vitamin D diet (dairy products, sesame seeds, almonds, green leafy vegetables). Perform quadriceps isometric contractions (press knee into bed for 5 seconds, 20 reps TID), straight leg raising (SLR), and ankle pumps.',
    },
    {
      id: 'diet_spine_core',
      name: 'Spine Core Strengthening & Fiber Diet',
      category: 'Orthopaedics',
      data: 'High fiber diet to prevent constipation and straining. Isometric core strengthening exercises: pelvic tilts, gluteal bridging, and prone back extensions once acute pain subsides. Avoid forward bending exercises.',
    },
    {
      id: 'diet_diabetic_lowcarb',
      name: 'Low Glycemic Index Diabetic Diet',
      category: 'General Medicine',
      data: 'Low glycemic index meals (jowar/bajra rotis, sprouts, pulses, salads). Avoid sweets, white rice, potatoes, and sweetened beverages. 40 minutes brisk walking daily 5 days a week.',
    },
    {
      id: 'diet_anc_highprotein',
      name: 'High Protein & Iron Antenatal Diet',
      category: 'Gynaecology',
      data: 'High protein diet (paneer, eggs, pulses, soya). Iron-rich foods (spinach, beetroot, jaggery, dates). Fresh seasonal fruits and coconut water for natural hydration. Gentle 20 min morning walk.',
    },
  ],

  investigations: [
    {
      id: 'inv_xray_knee',
      name: 'X-Ray Knee OA Findings',
      category: 'Radiology',
      data: 'X-Ray Bilateral Knees AP & Lateral Standing: Marked narrowing of medial tibiofemoral joint space bilateral. Subchondral sclerosis and marginal osteophytes noted. Grade II Kellgren-Lawrence Osteoarthritis.',
    },
    {
      id: 'inv_mri_spine',
      name: 'MRI Lumbar Spine Findings',
      category: 'Radiology',
      data: 'MRI Lumbar Spine: L4-L5 broad-based posterior disc protrusion indenting the anterior thecal sac and impinging on traversing L5 nerve roots bilateral. Normal cord termination at L1 level.',
    },
    {
      id: 'inv_blood_panel',
      name: 'Normal Blood & Metabolic Panel',
      category: 'Pathology',
      data: 'CBC: Hb 13.4 g/dL, Total Leukocyte Count 7,400/cumm, Platelets 2.5 Lakhs. FBS: 96 mg/dL, HbA1c: 5.7%. Serum Creatinine: 0.88 mg/dL, Serum Uric Acid: 5.2 mg/dL. ESR: 14 mm/1st hr.',
    },
  ],

  general_examinations: [
    {
      id: 'ge_normal',
      name: 'Normal General Examination',
      category: 'Clinical Exam',
      data: 'Conscious, cooperative, well-oriented to time, place, and person.\nPallor: Absent\nIcterus: Absent\nCyanosis: Absent\nClubbing: Absent\nLymphadenopathy: Absent\nPedal Edema: Absent',
    },
    {
      id: 'ge_pallor_edema',
      name: 'Mild Pallor & Pedal Edema',
      category: 'Clinical Exam',
      data: 'Conscious, oriented.\nPallor: Mild (+) lower palpebral conjunctiva\nIcterus: Absent\nCyanosis: Absent\nClubbing: Absent\nLymphadenopathy: No significant enlargement\nPedal Edema: Bilateral mild pitting edema over medial malleolus (+)',
    },
  ],

  past_medications: [
    {
      id: 'pm_cardio_htn',
      name: 'Hypertension & Dyslipidemia History',
      category: 'Cardiovascular',
      data: '• Tab Telmisartan 40 mg OD Morning (4 years for Hypertension)\n• Tab Atorvastatin 10 mg HS (2 years for Dyslipidemia)\n• Tab Aspirin 75 mg OD After Lunch\n• No known drug allergies (NKDA)',
    },
    {
      id: 'pm_diabetes_htn',
      name: 'Type 2 Diabetes & HTN History',
      category: 'Endocrinology',
      data: '• Tab Metformin 500 mg BD After Meals (5 years for T2DM)\n• Tab Glimepiride 1 mg OD Morning (Before Breakfast)\n• Tab Amlodipine 5 mg OD Morning (3 years for HTN)\n• Tab Pantoprazole 40 mg SOS for acidity\n• No known drug allergies (NKDA)',
    },
    {
      id: 'pm_none_nkda',
      name: 'No Past Medications (NKDA)',
      category: 'General',
      data: '• No history of chronic medication use\n• No known drug or food allergies (NKDA)',
    },
  ],

  drawing_board: [
    {
      id: 'drw_knee_joint',
      name: 'Knee Joint Diagram Preset',
      category: 'Anatomy Diagram',
      description: 'Anatomical knee joint diagram preset template',
      data: 'knee_joint_preset',
    },
    {
      id: 'drw_spine_column',
      name: 'Lumbar Spine Diagram Preset',
      category: 'Anatomy Diagram',
      description: 'Vertebral column and spinal disc anatomy template',
      data: 'spine_column_preset',
    },
    {
      id: 'drw_shoulder_joint',
      name: 'Shoulder Joint Diagram Preset',
      category: 'Anatomy Diagram',
      description: 'Glenohumeral joint and rotator cuff template',
      data: 'shoulder_joint_preset',
    },
  ],
};

const SECTION_STORAGE_PREFIX = 'cortex_section_tmpl_';

export function getSectionCustomTemplates(sectionKey: string): ClinicalSectionPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${SECTION_STORAGE_PREFIX}${sectionKey}`);
    return raw ? JSON.parse(raw) : [];
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
  const newPreset: ClinicalSectionPreset = {
    id: `tmpl_${sectionKey}_${Date.now()}`,
    name,
    category,
    data,
  };
  const updated = [newPreset, ...current];
  try {
    localStorage.setItem(`${SECTION_STORAGE_PREFIX}${sectionKey}`, JSON.stringify(updated));
  } catch (err) {
    console.error(`Error saving section template for ${sectionKey}:`, err);
  }
  return newPreset;
}

export function deleteSectionCustomTemplate(sectionKey: string, id: string): boolean {
  const current = getSectionCustomTemplates(sectionKey);
  const filtered = current.filter((t) => t.id !== id);
  try {
    localStorage.setItem(`${SECTION_STORAGE_PREFIX}${sectionKey}`, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error(`Error deleting section template for ${sectionKey}:`, err);
    return false;
  }
}

