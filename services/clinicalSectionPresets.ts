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

  systemic_examinations: [
    {
      id: 'se_normal',
      name: 'Normal Systemic Examination (CVS, RS, CNS, GI)',
      category: 'Systemic Exam',
      data: 'CVS: S1 S2 heard, regular rate and rhythm, no murmurs.\nRespiratory System: Bilateral air entry clear, normal vesicular breath sounds, no wheeze or crepitations.\nAbdomen: Soft, non-tender, no organomegaly or guarding, bowel sounds present.\nCNS: Higher functions intact, Cranial nerves gross exam intact, Motor tone & power 5/5 all limbs, Sensory intact.',
    },
    {
      id: 'se_respiratory_bronchial',
      name: 'Respiratory System - Asthmatic / Bronchitis',
      category: 'Respiratory',
      data: 'RS: Bilateral air entry equal, expiratory wheezing present in both lower zones, scattered ronchi present, no dullness on percussion.',
    },
    {
      id: 'se_spine_neuro',
      name: 'Neurological & Spine Motor Exam',
      category: 'Neurological',
      data: 'Spine & Lower Extremity Neuro: L2-S1 dermatomal sensations intact. Motor power 5/5 bilateral hip flexors, quadriceps, extensor hallucis longus (EHL), and gastrocnemius. Knee jerks ++ bilateral, Ankle jerks ++ bilateral, Plantars flexor.',
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

  medicines: [
    {
      id: 'med_oa_knee',
      name: 'Knee Osteoarthritis Medical Regimen',
      category: 'Orthopaedics',
      description: 'Aceclofenac + PCM, Glucosamine + Diacerein, Calcium D3, PPI',
      data: [
        {
          name: 'TAB ACECLOFENAC 100MG + PARACETAMOL 325MG',
          dosage: '1-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '15 days',
          note: 'जेवणानंतर',
          composition: 'Aceclofenac 100mg + Paracetamol 325mg',
        },
        {
          name: 'TAB DIACEREIN 50MG + GLUCOSAMINE 750MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          composition: 'Diacerein 50mg + Glucosamine 750mg',
        },
        {
          name: 'TAB PANTOPRAZOLE 40MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '15 days',
          note: 'सकाळी उपाशीपोटी',
          composition: 'Pantoprazole Sodium 40mg',
        },
        {
          name: 'TAB CALCIUM CARBONATE 500MG + VITAMIN D3',
          dosage: '0-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          note: 'रात्री जेवणानंतर',
          composition: 'Elemental Calcium 500mg + Cholecalciferol 250IU',
        },
      ],
    },
    {
      id: 'med_lumbar_spine',
      name: 'Lumbar Spondylosis & Sciatica Regimen',
      category: 'Orthopaedics',
      description: 'Pregabalin + Methylcobalamin, Thiocolchicoside + Etoricoxib, PPI',
      data: [
        {
          name: 'TAB PREGABALIN 75MG + METHYLCOBALAMIN 1500MCG',
          dosage: '0-0-1',
          unit: 'tab',
          when: 'At Bedtime',
          where: 'oral',
          frequency: 'daily',
          duration: '15 days',
          note: 'रात्री झोपताना',
          composition: 'Pregabalin 75mg + Methylcobalamin 1500mcg',
        },
        {
          name: 'TAB THIOCOLCHICOSIDE 4MG + ETORICOXIB 60MG',
          dosage: '1-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '7 days',
          note: 'जेवणानंतर',
          composition: 'Thiocolchicoside 4mg + Etoricoxib 60mg',
        },
        {
          name: 'CAP RABEPRAZOLE 20MG',
          dosage: '1-0-0',
          unit: 'cap',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '10 days',
          note: 'सकाळी नाश्ता आधी',
          composition: 'Rabeprazole Sodium 20mg',
        },
      ],
    },
    {
      id: 'med_cervical_spine',
      name: 'Cervical Spondylosis & Neck Pain Regimen',
      category: 'Orthopaedics',
      description: 'Etoricoxib 90mg, Methylcobalamin, PPI',
      data: [
        {
          name: 'TAB ETORICOXIB 90MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '7 days',
          note: 'दुपारी जेवणानंतर',
          composition: 'Etoricoxib 90mg',
        },
        {
          name: 'TAB METHYLCOBALAMIN 1500MCG',
          dosage: '0-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          composition: 'Methylcobalamin 1500mcg',
        },
        {
          name: 'TAB PANTOPRAZOLE 40MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '10 days',
          note: 'सकाळी उपाशीपोटी',
          composition: 'Pantoprazole Sodium 40mg',
        },
      ],
    },
    {
      id: 'med_urti_fever',
      name: 'Acute URTI & Viral Fever Regimen',
      category: 'General Medicine',
      description: 'Paracetamol 650mg, Azithromycin 500mg, Montelukast + Levocetirizine',
      data: [
        {
          name: 'TAB PARACETAMOL 650MG',
          dosage: '1-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '3 days',
          note: 'गरज भासल्यास / तापात',
          composition: 'Paracetamol 650mg',
        },
        {
          name: 'TAB AZITHROMYCIN 500MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '3 days',
          composition: 'Azithromycin 500mg',
        },
        {
          name: 'TAB LEVOCETIRIZINE 5MG + MONTELUKAST 10MG',
          dosage: '0-0-1',
          unit: 'tab',
          when: 'At Bedtime',
          where: 'oral',
          frequency: 'daily',
          duration: '5 days',
          note: 'रात्री झोपताना',
          composition: 'Levocetirizine 5mg + Montelukast Sodium 10mg',
        },
        {
          name: 'TAB PANTOPRAZOLE 40MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '5 days',
          composition: 'Pantoprazole 40mg',
        },
      ],
    },
    {
      id: 'med_gerd_dyspepsia',
      name: 'GERD & Acidity / Dyspepsia Regimen',
      category: 'General Medicine',
      description: 'Rabeprazole + Domperidone, Sucralfate syrup',
      data: [
        {
          name: 'CAP RABEPRAZOLE 20MG + DOMPERIDONE 30MG SR',
          dosage: '1-0-0',
          unit: 'cap',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '15 days',
          note: 'सकाळी नाश्ता आधी',
          composition: 'Rabeprazole 20mg + Domperidone 30mg Sustained Release',
        },
        {
          name: 'SYP SUCRALFATE 1000MG + OXETACAINE 20MG',
          dosage: '10ml',
          unit: 'ml',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '7 days',
          note: 'जेवणापूर्वी १ तास आधी',
          composition: 'Sucralfate 1000mg + Oxetacaine 20mg per 10ml',
        },
      ],
    },
    {
      id: 'med_derma_antifungal',
      name: 'Dermatology Antifungal & Hair Care Regimen',
      category: 'Dermatology',
      description: 'Fixtral SB 130mg, Kentruff Lotion, Logi Hair Tab, Verilich Tab',
      data: [
        {
          name: 'KENTRUFF STAYON 50ML LOTION',
          dosage: '0-0-1',
          unit: 'lotion',
          when: '',
          where: 'scalp',
          frequency: 'alternate day',
          duration: '25 days',
          note: 'केसांच्या मुळाशी',
          composition: 'Ketoconazole 2 %w/v',
        },
        {
          name: 'LOGI HAIR WOMEN TAB',
          dosage: '0-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '25 days',
          note: 'रात्री जेवणानंतर',
          composition: 'Beta-carotene 30 MG + Elemental Iron + Amino Acids',
        },
        {
          name: 'VERILICH HAIR TAB',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'alternate day',
          duration: '25 days',
          note: 'दुपारी जेवणानंतर',
          composition: 'Hair Multivitamin & Minerals Complex',
        },
        {
          name: 'FIXTRAL SB 130 MG',
          dosage: '0-0-1',
          unit: 'cap',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '15 days',
          note: 'रात्री जेवणानंतर',
          composition: 'Itraconazole 130 MG',
        },
      ],
    },
    {
      id: 'med_hypertension',
      name: 'Essential Hypertension Dual Drug Regimen',
      category: 'Cardiovascular',
      description: 'Telmisartan 40mg + Amlodipine 5mg, Chlorthalidone 12.5mg',
      data: [
        {
          name: 'TAB TELMISARTAN 40MG + AMLODIPINE 5MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          note: 'सकाळी नाश्ता नंतर',
          composition: 'Telmisartan 40mg + Amlodipine 5mg',
        },
        {
          name: 'TAB CHLORTHALIDONE 12.5MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          composition: 'Chlorthalidone 12.5mg',
        },
      ],
    },
    {
      id: 'med_t2dm',
      name: 'Type 2 Diabetes Mellitus Regimen',
      category: 'Endocrinology',
      description: 'Metformin 500mg SR, Glimepiride 1mg',
      data: [
        {
          name: 'TAB METFORMIN 500MG SR',
          dosage: '1-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          note: 'दुपारी व रात्री जेवणानंतर',
          composition: 'Metformin Hydrochloride 500mg Sustained Release',
        },
        {
          name: 'TAB GLIMEPIRIDE 1MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          note: 'सकाळी नाश्ता आधी',
          composition: 'Glimepiride 1mg',
        },
      ],
    },
    {
      id: 'med_anc_first_trimester',
      name: 'Antenatal Care (ANC) 1st Trimester Meds',
      category: 'Gynaecology',
      description: 'Folic Acid 5mg, Doxylamine + Pyridoxine for nausea',
      data: [
        {
          name: 'TAB FOLIC ACID 5MG',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          note: 'सकाळी नाश्ता नंतर',
          composition: 'Folic Acid 5mg',
        },
        {
          name: 'TAB DOXYLAMINE 10MG + PYRIDOXINE 10MG',
          dosage: '1-0-1',
          unit: 'tab',
          when: 'Before Food',
          where: 'oral',
          frequency: 'daily',
          duration: '15 days',
          note: 'उलट्या / मळमळ साठी',
          composition: 'Doxylamine Succinate 10mg + Pyridoxine Hydrochloride 10mg',
        },
      ],
    },
    {
      id: 'med_anc_second_trimester',
      name: 'Antenatal Care (ANC) 2nd & 3rd Trimester Meds',
      category: 'Gynaecology',
      description: 'Ferrous Ascorbate + Folic Acid, Calcium 500mg + D3',
      data: [
        {
          name: 'TAB FERROUS ASCORBATE 100MG + FOLIC ACID 1.5MG',
          dosage: '0-0-1',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          note: 'रात्री जेवणानंतर',
          composition: 'Elemental Iron (as Ferrous Ascorbate) 100mg + Folic Acid 1.5mg',
        },
        {
          name: 'TAB CALCIUM CARBONATE 500MG + VITAMIN D3 250IU',
          dosage: '1-0-0',
          unit: 'tab',
          when: 'After Food',
          where: 'oral',
          frequency: 'daily',
          duration: '1 month',
          note: 'दुपारी जेवणानंतर',
          composition: 'Elemental Calcium 500mg + Vitamin D3 250IU',
        },
      ],
    },
  ],
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
    title: 'Dr Notes (Private)',
    category: 'Internal Notes',
    description: 'Private physician remarks, not printed on prescription',
    dataType: 'text',
  },
  quick_notes: {
    key: 'quick_notes',
    title: 'Quick Notes',
    category: 'Clinical Notes',
    description: 'Quick progress observations',
    dataType: 'text',
  },
  advice: {
    key: 'advice',
    title: 'Advice',
    category: 'Patient Instructions',
    description: 'General instructions, precautions, and patient advice',
    dataType: 'text',
  },
  tests_requested: {
    key: 'tests_requested',
    title: 'Tests Requested',
    category: 'Diagnostics',
    description: 'Laboratory and radiology requisitions',
    dataType: 'tests',
  },
  diet_exercise: {
    key: 'diet_exercise',
    title: 'Diet & Exercise',
    category: 'Lifestyle',
    description: 'Nutritional and exercise protocols',
    dataType: 'text',
  },
  investigations: {
    key: 'investigations',
    title: 'Investigations',
    category: 'Diagnostics',
    description: 'Lab & imaging interpretations and findings',
    dataType: 'text',
  },
  general_examinations: {
    key: 'general_examinations',
    title: 'General Examinations',
    category: 'Physical Examination',
    description: 'Pallor, icterus, cyanosis, clubbing, edema, etc.',
    dataType: 'text',
  },
  systemic_examinations: {
    key: 'systemic_examinations',
    title: 'Systemic Examination',
    category: 'Physical Examination',
    description: 'CVS, RS, CNS, GI physical examination',
    dataType: 'text',
  },
  past_medications: {
    key: 'past_medications',
    title: 'Past Medications',
    category: 'Clinical History',
    description: 'Chronic medications & drug allergies',
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

