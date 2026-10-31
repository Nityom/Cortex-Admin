/**
 * Svasth-HMS White-Label Hospital Configuration Template
 * 
 * Instructions:
 * 1. Duplicate or edit this file to configure a new hospital or clinic client.
 * 2. Replace the hospital details, doctors list, and consultation fee structure.
 * 3. Toggle the active modules (Appointments, OPD, IPD, Billing, etc.).
 * 4. Place the hospital logo inside `public/` and update `branding.logoUrl`.
 */

export interface DoctorProfile {
  id: string;
  name: string;
  degrees: string;
  registrationNumber: string;
  designation: string;
  specialty: 'orthopaedic' | 'gynecology' | 'dental' | 'general' | 'pediatric' | 'other';
  email: string;
  signatureUrl: string;
  consultationFee: {
    firstVisit: number;
    followupVisit: number;
    followupValidityDays: number;
  };
}

export interface HospitalConfig {
  id: string;
  name: string;
  legalName: string;
  tagline: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    fullFormatted: string;
  };
  contacts: {
    phones: string[];
    mobile: string;
    landline?: string;
    whatsapp: string;
    email: string;
    website?: string;
  };
  schedule: {
    opdTimings: string;
    clinicDetails?: string;
    sundayStatus?: string;
  };
  branding: {
    primaryColor: string;       // Primary brand accent hex (e.g. #7B1828)
    primaryHover: string;
    accentTeal: string;         // EMR brand secondary
    logoUrl: string;            // Main hospital logo (sidebar, letterhead)
    emailLogoUrl: string;       // Lightweight compressed logo for email HTML
    faviconUrl: string;
    svasthLogoUrl: string;      // Svasth-HMS engine badge
    poweredBySvasth: boolean;   // Toggle "Powered by Svasth-HMS" footer/badge
  };
  doctors: DoctorProfile[];
  modules: {
    appointments: boolean;
    patientManagement: boolean;
    opd: boolean;
    ipd: boolean;
    billing: boolean;
    prescription: boolean;
    clinicalTemplates: boolean;
    medicinesCatalog: boolean;
    inventory: boolean;
    salesReport: boolean;
    installments: boolean;
    specialties: {
      orthopaedics: boolean;
      obstetricsGynaecology: boolean;
      dental: boolean;
    };
  };
}

export const hospitalTemplateConfig: HospitalConfig = {
  id: "client-hospital-id",
  name: "Sample Multi-Speciality Hospital",
  legalName: "Sample Multi-Speciality Hospital & Research Centre",
  tagline: "Centre for Advanced Healthcare & Surgery",
  address: {
    line1: "Main Road",
    line2: "Opposite City Gardens",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    fullFormatted: "Main Road, Opposite City Gardens, Mumbai - 400001",
  },
  contacts: {
    phones: ["022-25550000", "9876543210"],
    mobile: "9876543210",
    landline: "022-25550000",
    whatsapp: "919876543210",
    email: "contact@hospital.com",
    website: "https://hospital.com",
  },
  schedule: {
    opdTimings: "Mon. to Sat. - 9 am to 1 pm & 5 pm to 9 pm | Sunday Closed",
    clinicDetails: "SPECIALIST CLINIC • Every Wednesday 5 pm to 8 pm",
    sundayStatus: "Sunday OPD Closed (Emergency 24x7)",
  },
  branding: {
    primaryColor: "#0284c7",   // Brand Primary
    primaryHover: "#0369a1",
    accentTeal: "#0d9488",
    logoUrl: "/cortex_logo.png",
    emailLogoUrl: "/cortex_logo_email.png",
    faviconUrl: "/Svasth_favicon.png",
    svasthLogoUrl: "/Svasth_logo.png",
    poweredBySvasth: true,
  },
  doctors: [
    {
      id: "dr-sample-doctor",
      name: "Dr. Sample Doctor",
      degrees: "M.B.B.S., M.S., DNB",
      registrationNumber: "MMC/2010/01/1234",
      designation: "Consultant Physician & Surgeon",
      specialty: "general",
      email: "doctor@hospital.com",
      signatureUrl: "/sign.png",
      consultationFee: {
        firstVisit: 500,
        followupVisit: 300,
        followupValidityDays: 14,
      },
    },
  ],
  modules: {
    appointments: true,
    patientManagement: true,
    opd: true,
    ipd: true,
    billing: true,
    prescription: true,
    clinicalTemplates: true,
    medicinesCatalog: true,
    inventory: true,
    salesReport: true,
    installments: true,
    specialties: {
      orthopaedics: true,
      obstetricsGynaecology: false,
      dental: false,
    },
  },
};
