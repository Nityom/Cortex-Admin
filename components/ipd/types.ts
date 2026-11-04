import { Patient } from "@/types/patient";

export interface IPDAdmission {
  id: string;
  ipdNumber: string;
  uhid: string;
  patientId?: string;
  name: string;
  age: string;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  email?: string;
  whatsapp_number?: string;
  medicalHistory?: string;
  allergies?: string;
  provisionalDiagnosis: string;
  reasonForAdmission: string;
  admissionDate: string; // YYYY-MM-DD
  admissionTime: string; // HH:MM AM/PM
  department: string;
  consultantDoctor: string;
  referredBy?: string;
  paymentCategory: "Cash" | "TPA / Insurance" | "Ayushman Bharat / MJPJAY" | "Corporate";
  ward: string;
  bedNumber: string;
  dailyRate: number;
  nursingRatePerDay: number;
  doctorRatePerVisit: number;
  billableDaysOverride?: number;
  bedChargesOverride?: number;
  nursingChargesOverride?: number;
  doctorVisitsCountOverride?: number;
  doctorChargesOverride?: number;
  status: "Admitted" | "Discharged";
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeSummary?: {
    conditionAtDischarge: string;
    finalDiagnosis: string;
    treatmentGiven: string;
    dischargeMeds: string;
    followupDate: string;
    doctorNotes: string;
  };
  vitals: Array<{
    id: string;
    date: string;
    time: string;
    bp: string;
    pulse: string;
    temp: string;
    spo2: string;
    respRate?: string;
    weight?: string;
    recordedBy: string;
  }>;
  doctorNotes: Array<{
    id: string;
    date: string;
    time: string;
    doctor: string;
    note: string;
    plan: string;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    route: string;
    frequency: string;
    timing: string;
    status: "Active" | "Stopped";
  }>;
  investigations: Array<{
    id: string;
    name: string;
    date: string;
    status: "Ordered" | "Completed";
    result?: string;
    cost: number;
  }>;
  procedures: Array<{
    id: string;
    name: string;
    date: string;
    surgeon: string;
    notes?: string;
    cost: number;
  }>;
  nursingNotes: Array<{
    id: string;
    date: string;
    shift: "Morning" | "Evening" | "Night";
    note: string;
    nurse: string;
  }>;
  customCharges: Array<{
    id: string;
    description: string;
    date: string;
    amount: number;
    category: string;
  }>;
  advances: Array<{
    id: string;
    receiptNumber: string;
    date: string;
    amount: number;
    mode: "Cash" | "UPI" | "Card" | "Bank Transfer";
    notes?: string;
    receivedBy: string;
  }>;
  finalSettlement?: {
    billId?: string;
    billNumber: string;
    date: string;
    grossTotal: number;
    discount: number;
    netTotal: number;
    advanceAdjusted: number;
    balancePaid: number;
    paymentMode: string;
    status: "PAID" | "PARTIAL" | "CLAIM_PENDING";
  };
}

export interface WardBedConfigItem {
  ward: string;
  dailyRate: number;
  beds: string[];
}

export const DEFAULT_WARD_BED_CONFIG: WardBedConfigItem[] = [
  {
    ward: "Room 101",
    dailyRate: 1000,
    beds: ["Bed 101-A", "Bed 101-B"],
  },
  {
    ward: "Room 102",
    dailyRate: 1000,
    beds: ["Bed 102-A", "Bed 102-B"],
  },
  {
    ward: "Room 201 (Special)",
    dailyRate: 1800,
    beds: ["Bed 201-A", "Bed 201-B"],
  },
  {
    ward: "Room 202",
    dailyRate: 1500,
    beds: ["Bed 202"],
  },
  {
    ward: "Room 203",
    dailyRate: 1500,
    beds: ["Bed 203-A", "Bed 203-B"],
  },
  {
    ward: "Room 204",
    dailyRate: 1500,
    beds: ["Bed 204"],
  },
];

export const BED_CONFIG_STORAGE_KEY = "cortex_ipd_bed_config_v2";
export const STORAGE_KEY = "cortex_ipd_admissions_v1";

export const DOCTORS = [
  { name: "Dr. Vipeen Raut", specialty: "Orthopaedics & Joint Replacement" },
  { name: "Dr. Shillpa Raut", specialty: "Obstetrics & Gynaecology" },
  { name: "Visiting Consultant", specialty: "General & Laparoscopic Surgery" },
];

export const DEPARTMENTS = [
  "Orthopaedics & Joint Replacement",
  "Obstetrics & Gynaecology",
  "General Medicine",
  "General Surgery",
  "Physiotherapy & Rehabilitation",
];

export interface HospitalChargeItem {
  name: string;
  category: "Procedure" | "Investigation" | "Consultation" | "Nursing" | "Medicine" | "Bed" | "Other";
  price: number;
}

export const COMPLETE_IPD_CHARGES_CATALOG: HospitalChargeItem[] = [
  // 1. Day Wise Charges
  { name: "Bed Charges (Special Room 201)", category: "Bed", price: 1800 },
  { name: "Nursing Charges (Special Room 201)", category: "Nursing", price: 300 },
  { name: "Consultant Charges (Special Room 201)", category: "Consultation", price: 300 },
  { name: "Assistant Doctor Charges (Special Room 201)", category: "Consultation", price: 0 },

  // 2. Other Particulars
  { name: "AC Charges", category: "Other", price: 1000 },
  { name: "Anaesthesia Charges", category: "Procedure", price: 0 },
  { name: "Assistant Surgeon Charges", category: "Procedure", price: 1000 },
  { name: "Blood Transfusion Charges", category: "Procedure", price: 500 },
  { name: "BS Charges", category: "Investigation", price: 50 },
  { name: "Buddy Staping Charge", category: "Procedure", price: 300 },
  { name: "C-Arm Machine", category: "Procedure", price: 2000 },
  { name: "CR Charges", category: "Procedure", price: 300 },
  { name: "Catheter Charges", category: "Procedure", price: 500 },
  { name: "Certificate Charges", category: "Other", price: 100 },
  { name: "Consultation Charges", category: "Consultation", price: 200 },
  { name: "Consultation Charges", category: "Consultation", price: 400 },
  { name: "Cut Charges", category: "Procedure", price: 300 },
  { name: "Delivery Charge", category: "Procedure", price: 1000 },
  { name: "Delivery Trial Charges", category: "Procedure", price: 0 },
  { name: "Diagnostic Tapping Charge", category: "Procedure", price: 2500 },
  { name: "Dr. Round Charges", category: "Consultation", price: 200 },
  { name: "Dressing Charges", category: "Procedure", price: 150 },
  { name: "Dressing Charges", category: "Procedure", price: 200 },
  { name: "ECG Charges", category: "Investigation", price: 200 },
  { name: "ECG Charges", category: "Investigation", price: 300 },
  { name: "Emergency Charges", category: "Consultation", price: 200 },
  { name: "Emergency Charges", category: "Consultation", price: 500 },
  { name: "Emergency Consultation", category: "Consultation", price: 500 },
  { name: "Endoscopy", category: "Procedure", price: 1300 },
  { name: "Food Charges", category: "Other", price: 0 },
  { name: "Implant Charges", category: "Procedure", price: 2000 },
  { name: "Injection Charges", category: "Nursing", price: 100 },
  { name: "Injection Charges", category: "Nursing", price: 250 },
  { name: "Injection Charges", category: "Nursing", price: 500 },
  { name: "Intubation Charges", category: "Procedure", price: 2000 },
  { name: "IPD Emergency Consultation", category: "Consultation", price: 1000 },
  { name: "IPD Medication", category: "Medicine", price: 0 },
  { name: "IUI Charges", category: "Procedure", price: 500 },
  { name: "IV Charges", category: "Nursing", price: 300 },
  { name: "K-Wire Removal", category: "Procedure", price: 300 },
  { name: "Labour Room Charges", category: "Procedure", price: 2000 },
  { name: "Medicine Charges", category: "Medicine", price: 2500 },
  { name: "Miscellaneous", category: "Other", price: 100 },
  { name: "Monitor Charges", category: "Nursing", price: 600 },
  { name: "Nebulizer Charges", category: "Procedure", price: 50 },
  { name: "Nitrogen Charges", category: "Procedure", price: 1000 },
  { name: "Nursing Charge", category: "Nursing", price: 200 },
  { name: "OPD Consultation", category: "Consultation", price: 100 },
  { name: "OPD Old", category: "Consultation", price: 150 },
  { name: "Operation Charges", category: "Procedure", price: 10000 },
  { name: "Operation/Surgeon Charges", category: "Procedure", price: 3000 },
  { name: "OT Assistant Charges", category: "Procedure", price: 500 },
  { name: "OT Charges", category: "Procedure", price: 1000 },
  { name: "OT Charges", category: "Procedure", price: 2000 },
  { name: "OT Consumable", category: "Procedure", price: 1000 },
  { name: "OT Medicine", category: "Medicine", price: 100 },
  { name: "OT Technician/OT Nurse Charges", category: "Procedure", price: 500 },
  { name: "Other Charges", category: "Other", price: 0 },
  { name: "Oxygen Charges", category: "Nursing", price: 75 },
  { name: "Physiotherapy Charge", category: "Procedure", price: 100 },
  { name: "Plaster Charges", category: "Procedure", price: 1000 },
  { name: "Plaster Charges", category: "Procedure", price: 1500 },
  { name: "Procedure Charges", category: "Procedure", price: 0 },
  { name: "Registration Charges", category: "Other", price: 100 },
  { name: "Room Charge OT", category: "Bed", price: 300 },
  { name: "Room Charges", category: "Bed", price: 1000 },
  { name: "Sonography Charges", category: "Investigation", price: 800 },
  { name: "Suturing Charges", category: "Procedure", price: 200 },
  { name: "Suturing Removal", category: "Procedure", price: 200 },
  { name: "Syringe Pump (Infusion Pump)", category: "Nursing", price: 500 },
  { name: "Therapeutic Tapping", category: "Procedure", price: 1000 },
  { name: "Traction Charges", category: "Procedure", price: 200 },
  { name: "Urine Catheter", category: "Procedure", price: 300 },
  { name: "Urine Charge", category: "Investigation", price: 50 },
  { name: "X-Ray Charges", category: "Investigation", price: 800 },
];

export const DEFAULT_HOSPITAL_CHARGES = COMPLETE_IPD_CHARGES_CATALOG;

export const QUICK_IPD_SUGGESTIONS = [
  { name: "Dressing / Wound Care", category: "Procedure" as const, price: 500, emoji: "🩹" },
  { name: "X-Ray / Digital Radiography", category: "Investigation" as const, price: 300, emoji: "🩻" },
  { name: "Blood Test (CBC)", category: "Investigation" as const, price: 300, emoji: "🩸" },
  { name: "ECG / Cardiac Trace", category: "Investigation" as const, price: 250, emoji: "📈" },
  { name: "IV Fluid Infusion", category: "Nursing" as const, price: 250, emoji: "💧" },
  { name: "Injection Charge", category: "Nursing" as const, price: 150, emoji: "💉" },
  { name: "OT Charges", category: "Procedure" as const, price: 5000, emoji: "🏥" },
  { name: "Surgeon Charges", category: "Procedure" as const, price: 10000, emoji: "👨‍⚕️" },
  { name: "Anaesthesia Charges", category: "Procedure" as const, price: 3500, emoji: "🩺" },
  { name: "Medicines & Pharmacy", category: "Medicine" as const, price: 500, emoji: "💊" },
  { name: "Physiotherapy", category: "Procedure" as const, price: 500, emoji: "🏃" },
  { name: "Stitch Removal", category: "Procedure" as const, price: 250, emoji: "🪡" },
  { name: "Doctor Round", category: "Consultation" as const, price: 800, emoji: "🩺" },
];

// Helper to calculate days between dates (minimum 1 day for admission day billing)
export function calculateStayDays(admissionDate: string, dischargeDate?: string): number {
  if (!admissionDate) return 1;
  const start = new Date(admissionDate);
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// Running bill calculation helper
export function calculateRunningBill(admission: IPDAdmission, dischargeDateOverride?: string) {
  const effectiveDischargeDate = dischargeDateOverride !== undefined ? dischargeDateOverride : admission.dischargeDate;
  const rawDays = calculateStayDays(admission.admissionDate, effectiveDischargeDate);
  const days = admission.billableDaysOverride ?? rawDays;
  const dailyRate = admission.dailyRate !== undefined ? Number(admission.dailyRate) : 0;
  const bedCharges = admission.bedChargesOverride !== undefined ? admission.bedChargesOverride : (days * dailyRate);

  const nursingRate = admission.nursingRatePerDay !== undefined ? Number(admission.nursingRatePerDay) : 0;
  const nursingCharges = admission.nursingChargesOverride !== undefined ? admission.nursingChargesOverride : (days * nursingRate);

  const rawDocVisits = Math.max(days, (admission.doctorNotes || []).length);
  const doctorVisitsCount = admission.doctorVisitsCountOverride ?? rawDocVisits;
  const doctorRate = admission.doctorRatePerVisit !== undefined ? Number(admission.doctorRatePerVisit) : 0;
  const doctorCharges = admission.doctorChargesOverride !== undefined ? admission.doctorChargesOverride : (doctorVisitsCount * doctorRate);

  const investigationsTotal = (admission.investigations || []).reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
  const proceduresTotal = (admission.procedures || []).reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const customChargesTotal = (admission.customCharges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const grossTotal = bedCharges + nursingCharges + doctorCharges + investigationsTotal + proceduresTotal + customChargesTotal;
  const totalAdvances = (admission.advances || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const balanceDue = grossTotal - totalAdvances;

  return {
    days,
    rawDays,
    bedCharges,
    nursingCharges,
    doctorVisitsCount,
    rawDocVisits,
    doctorCharges,
    investigationsTotal,
    proceduresTotal,
    customChargesTotal,
    grossTotal,
    totalAdvances,
    balanceDue,
  };
}

export function numberToWordsINR(amount: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Rupees Zero Only';

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }
  return 'Rupees ' + inWords(num).trim() + ' Only';
}
