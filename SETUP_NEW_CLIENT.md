# Svasth-HMS: Fast Client Onboarding Guide (Option A)

This guide shows you how to brand, configure, and deploy a brand new hospital instance using the **Svasth-HMS Turnkey White-Label Architecture** in under 15 minutes.

---

## ⚡ 5-Step Rapid Deployment

### 1. Collect Client Hospital Details
Get the following from your client (or have them fill out the intake questionnaire):
- **Hospital Full Legal Name & Tagline** (e.g. *Apex Multispeciality Hospital*)
- **Address & Contact Numbers** (phones, mobile, WhatsApp, email)
- **Hospital Logo**: PNG with transparent background (~300x120px)
- **Doctors' Roster**: Full Name, Qualifications, Registration No., Consultation fee (New vs Follow-up validity)
- **Active Modules**: What do they need? (OPD, IPD, Billing, Pharmacy/Catalog, Dental, etc.)

---

### 2. Configure `config/hospital.ts`
Copy from `config/hospital.template.ts` or edit `config/hospital.ts`:
```bash
cp config/hospital.template.ts config/hospital.ts
```
Fill in the `hospitalConfig` object:
```ts
export const hospitalConfig: HospitalConfig = {
  id: "apex-hospital",
  name: "Apex Hospital",
  legalName: "Apex Multispeciality Hospital & Trauma Centre",
  tagline: "Advanced Orthopaedics & Critical Care",
  address: {
    line1: "Station Road",
    line2: "Opposite City Mall",
    city: "Nagpur",
    state: "Maharashtra",
    pincode: "440010",
    fullFormatted: "Station Road, Opposite City Mall, Nagpur - 440010",
  },
  contacts: {
    phones: ["0712-2550000", "9822000000"],
    mobile: "9822000000",
    whatsapp: "919822000000",
    email: "contact@apexhospital.com",
  },
  branding: {
    logoUrl: "/apex_logo.png",
    poweredBySvasth: true, // Shows "Powered by Svasth-HMS" badge
    ...
  },
  modules: {
    appointments: true,
    patientManagement: true,
    opd: true,
    ipd: true,
    billing: true,
    prescription: true,
    ...
  }
};
```

---

### 3. Add Client Assets to `public/`
Save the client's assets:
- `public/apex_logo.png` (their logo)
- `public/apex_sign.png` (doctor's digital signature if provided)

---

### 4. Create Isolated Convex Backend (2 minutes)
Give the client their own private database and realtime backend:
```bash
npx convex deploy
```
Copy the generated deployment URL (e.g. `https://apex-care-123.convex.cloud`) and set it in `.env.local`:
```env
NEXT_PUBLIC_CONVEX_URL=https://apex-care-123.convex.cloud
```

---

### 5. Build & Deploy
Test build locally:
```bash
npm run build
```
Once verified, push to git or deploy to Hostinger/Vercel/Cloudflare Pages:
- The static export is in `out/` (~7.7 MB, deploys in under 20 seconds).
- Point their subdomain (e.g. `admin.apexhospital.com`) to their hosting folder.

🎉 **Done!** The hospital has their custom-branded, fully isolated HMS/EMR running live!
