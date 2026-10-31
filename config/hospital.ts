/**
 * Svasth-HMS White-Label Hospital Configuration
 * 
 * To brand this application for any hospital or clinic:
 * Simply update this configuration file. All letterheads, billing receipts,
 * PDF prescriptions, logos, contacts, fee schedules, and active module
 * toggles will adapt automatically.
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
    primaryColor: string;       // Primary brand accent (e.g. #7B1828)
    primaryHover: string;
    accentTeal: string;         // EMR brand secondary
    logoUrl: string;            // Main hospital logo (sidebar, letterhead)
    emailLogoUrl: string;       // Lightweight compressed logo for email HTML
    faviconUrl: string;
    svasthLogoUrl: string;      // Svasth-HMS master engine badge
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

export const hospitalConfig: HospitalConfig = {
  id: "cortex-hospital",
  name: "Cortex Hospital",
  legalName: "Cortex Hospital & Research Centre",
  tagline: "Hospital & Research Centre",
  address: {
    line1: "Aarti Chowk",
    line2: "Nagpur Road",
    city: "Wardha",
    state: "Maharashtra",
    pincode: "442001",
    fullFormatted: "Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001",
  },
  contacts: {
    phones: ["07152-255795", "9373280505"],
    mobile: "9373280505",
    landline: "07152-255795",
    whatsapp: "919373280505",
    email: "cortexhospital@gmail.com",
    website: "https://cortexhospital.com",
  },
  schedule: {
    opdTimings: "Mon. to Fri. - 10 am to 1 pm & 6 pm to 8 pm | Sat. - 10 am to 1 pm | Sunday Closed",
    clinicDetails: "HIP & KNEE JOINT CLINIC • Every Thursday 6 pm to 8 pm",
    sundayStatus: "Sunday OPD Closed",
  },
  branding: {
    primaryColor: "#7B1828", // Cortex Maroon
    primaryHover: "#5e121e",
    accentTeal: "#0d9488",  // Svasth Teal
    logoUrl: "/cortex_logo.png",
    emailLogoUrl: "/cortex_logo_email.png",
    faviconUrl: "/Svasth_favicon.png",
    svasthLogoUrl: "/Svasth_logo.png",
    poweredBySvasth: true,
  },
  doctors: [
    {
      id: "dr-vipeen-raut",
      name: "Dr. Vipeen Raut",
      degrees: "M.B.B.S., Dip.Ortho., DNB Ortho",
      registrationNumber: "1692/03/2002",
      designation: "Consulting Orthopaedic and Joint Replacement Surgeon",
      specialty: "orthopaedic",
      email: "drvipeenraut@cortexhospital.com",
      signatureUrl: "/sign.png",
      consultationFee: {
        firstVisit: 400,
        followupVisit: 200,
        followupValidityDays: 10,
      },
    },
    {
      id: "dr-shillpa-raut",
      name: "Dr. Shillpa Raut",
      degrees: "M.B.B.S., M.D. (Gynecology & Obstetrics)",
      registrationNumber: "2004/05/1842",
      designation: "Consulting Gynecologist & Obstetrician",
      specialty: "gynecology",
      email: "drshillparaut@cortexhospital.com",
      signatureUrl: "/sign1.png",
      consultationFee: {
        firstVisit: 200,
        followupVisit: 100,
        followupValidityDays: 10,
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
      obstetricsGynaecology: true,
      dental: false,
    },
  },
};

/** Helper to find doctor profile by name matching */
export function getDoctorProfile(doctorName?: string): DoctorProfile | undefined {
  if (!doctorName) return hospitalConfig.doctors[0];
  const clean = doctorName.toLowerCase().trim();
  return (
    hospitalConfig.doctors.find((doc) => clean.includes(doc.name.toLowerCase()) || doc.name.toLowerCase().includes(clean)) ||
    hospitalConfig.doctors[0]
  );
}

/** Helper to calculate consultation charge based on previous visits within validity days */
export function calculateDoctorConsultationFee(doctorName?: string, isFollowupWithinValidity: boolean = false): number {
  const doc = getDoctorProfile(doctorName);
  if (!doc) return 400;
  return isFollowupWithinValidity ? doc.consultationFee.followupVisit : doc.consultationFee.firstVisit;
}

