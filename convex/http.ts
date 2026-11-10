import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import {
  CORTEX_LOGO_BASE64,
  SIGN_VIPEEN_BASE64,
  SIGN_SHILLPA_BASE64,
  SVAASTH_LOGO_BASE64,
} from "./prescriptionAssets";

const http = httpRouter();

function formatPrescriptionDate(dateStr?: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  const matchDMYSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchDMYSlash) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(matchDMYSlash[2], 10) - 1;
    return `${matchDMYSlash[1].padStart(2, "0")}-${months[mIdx] || matchDMYSlash[2]}-${matchDMYSlash[3]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatTimestamp(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const validD = isNaN(d.getTime()) ? new Date() : d;
  const day = String(validD.getDate()).padStart(2, "0");
  const month = String(validD.getMonth() + 1).padStart(2, "0");
  const year = validD.getFullYear();
  const hours = String(validD.getHours()).padStart(2, "0");
  const mins = String(validD.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year}, ${hours}:${mins}`;
}

function formatFollowup(followupDate?: string, prescriptionDate?: string): string {
  if (!followupDate) return "";
  const fDate = new Date(followupDate);
  if (isNaN(fDate.getTime())) return followupDate;

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = daysOfWeek[fDate.getDay()];
  const formattedDate = `${String(fDate.getDate()).padStart(2, "0")}-${String(fDate.getMonth() + 1).padStart(2, "0")}-${fDate.getFullYear()}`;

  let diffPrefix = "";
  if (prescriptionDate) {
    const pDate = new Date(prescriptionDate);
    if (!isNaN(pDate.getTime())) {
      const diffMs = fDate.getTime() - pDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        diffPrefix = `${diffDays} days `;
      }
    }
  }

  return `${diffPrefix}(${formattedDate} - ${dayName})`;
}

function getTimingFromDosage(dosage?: string, when?: string): string {
  if (!dosage || typeof dosage !== "string") return when || "";
  const trimmed = dosage.trim();
  const clean = trimmed.toLowerCase().replace(/\s+/g, "");
  const wLower = (when || "").toLowerCase();
  const isBefore = wLower.includes("before") || (when || "").includes("आधी");
  const isEmpty = wLower.includes("empty") || (when || "").includes("उपाशी");
  const isBedtime = wLower.includes("bedtime") || (when || "").includes("झोपण्या");

  if (isEmpty) return "सकाळी उपाशीपोटी (Empty Stomach)";
  if (isBedtime) return "रात्री झोपण्यापूर्वी (Bedtime)";

  let marathi = "";
  if (clean === "1-0-0") marathi = isBefore ? "सकाळी नाश्त्याआधी" : "सकाळी नाश्त्यानंतर";
  else if (clean === "0-1-0") marathi = isBefore ? "दुपारी जेवणाआधी" : "दुपारी जेवणानंतर";
  else if (clean === "0-0-1") marathi = isBefore ? "रात्री जेवणाआधी" : "रात्री जेवणानंतर";
  else if (clean === "1-0-1") marathi = isBefore ? "सकाळी नाश्त्याआधी आणि रात्री जेवणाआधी" : "सकाळी नाश्त्यानंतर आणि रात्री जेवणानंतर";
  else if (clean === "1-1-1") marathi = isBefore ? "सकाळी, दुपारी आणि रात्री जेवणाआधी" : "सकाळी, दुपारी आणि रात्री जेवणानंतर";
  else if (clean === "1-1-0") marathi = isBefore ? "सकाळी आणि दुपारी जेवणाआधी" : "सकाळी आणि दुपारी जेवणानंतर";
  else if (clean === "0-1-1") marathi = isBefore ? "दुपारी आणि रात्री जेवणाआधी" : "दुपारी आणि रात्री जेवणानंतर";
  else if (clean === "stat") marathi = "तातडीने (STAT)";
  else if (clean === "sos") marathi = "गरज भासल्यास (SOS)";
  else {
    marathi = when || "As directed";
  }

  if (when && !marathi.toLowerCase().includes(when.toLowerCase())) {
    return `${marathi} (${when})`;
  }
  return marathi;
}

http.route({
  path: "/print-prescription",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || url.searchParams.get("prescriptionId");

    if (!id) {
      return new Response("Missing prescription ID", { status: 400 });
    }

    let rx: any = null;
    try {
      rx = await ctx.runQuery(api.prescriptions.getById, { id: id as any });
    } catch (err) {
      console.error("Failed to fetch prescription:", err);
    }

    if (!rx) {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription Not Found - Cortex Hospital</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px 20px; background: #f8fafc; color: #334155; }
    .card { background: white; max-width: 480px; margin: 0 auto; padding: 40px 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    h2 { color: #7B1828; margin-bottom: 12px; }
    p { line-height: 1.6; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Prescription Not Found</h2>
    <p>We could not find a prescription with ID: <code>${id}</code>.</p>
    <p>Please contact Cortex Hospital reception at <strong>07152-255795</strong> or reply on WhatsApp.</p>
  </div>
</body>
</html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Doctor profile resolution matching config/hospital.ts
    const resolvedDoctorName = (rx.doctor_name || "Dr. Vipeen Raut").trim();
    const isGyno =
      /gyne|shillpa|shilpa|obs|maternity/i.test(resolvedDoctorName);

    const docConfig = isGyno
      ? {
          name: "Dr. Shillpa Raut",
          degrees: "M.B.B.S., M.D. (Gynecology & Obstetrics)",
          reg: "Reg. No. 2004/05/1842",
          diplomate: "Consulting Gynecologist & Obstetrician",
          specialty: "Maternity, Infertility & Women Care Specialist",
          signature: SIGN_SHILLPA_BASE64,
        }
      : {
          name: "Dr. Vipeen Raut",
          degrees: "M.B.B.S., Dip.Ortho., DNB Ortho",
          reg: "Reg. No. 1692/03/2002",
          diplomate: "Diplomate of National Board (Orthopaedics)",
          specialty: "Consulting Orthopaedic and Joint Replacement Surgeon",
          signature: SIGN_VIPEEN_BASE64,
        };

    // Patient Name formatting with Salutation
    const rawPatientName = (rx.patient_name || "PATIENT").trim();
    const hasSalutation = /^(mr|mrs|ms|dr|mast|master)\.?\s+/i.test(rawPatientName);
    let salutationPrefix = "";
    if (!hasSalutation) {
      const s = (rx.sex || "").toLowerCase();
      if (s.startsWith("f")) salutationPrefix = "MRS./MS. ";
      else if (s.startsWith("m")) salutationPrefix = "MR. ";
    }
    const patientNameFormatted = `${salutationPrefix}${rawPatientName.toUpperCase()}`;

    // Reference number
    let refNumber = (rx.reference_number || "").replace(/^CH/i, "CRX");
    if (!refNumber) refNumber = "CRX0000";

    const rawAge = rx.age ? String(rx.age).trim() : "";
    const ageDisplay = rawAge && rawAge !== "-" && rawAge !== "0" && rawAge !== "null" && rawAge !== "undefined"
      ? `${rawAge.replace(/\s*y(ears?)?/i, "")} Yrs`
      : "";
    const sexDisplay = rx.sex ? rx.sex : "";
    const phoneDisplay = rx.phone_number || "";

    const patientDetailsList = [ageDisplay, sexDisplay].filter(Boolean).join(", ");
    const patientDetailsText = patientDetailsList ? `(${patientDetailsList})` : "";
    const phoneText = phoneDisplay ? ` - ${phoneDisplay}` : "";

    // Diagnosis text
    const diagnosisText = (rx.diagnosis || "").trim();

    // Vitals
    const vitals = rx.vitals || rx.vital_signs || {};
    const bp = vitals.bp || (vitals.bp_systolic && vitals.bp_diastolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : "") || "";
    const pulse = vitals.pulse || "";
    const spo2 = vitals.spo2 || "";
    const temp = vitals.temperature || vitals.temp || "";
    const weight = vitals.weight || "";
    const height = vitals.height || "";
    const bmi = vitals.bmi || "";
    const hasVitals = !!(bp || pulse || spo2 || temp || weight || height || bmi);

    // Medicines rows
    const medicines: any[] = Array.isArray(rx.medicines) ? rx.medicines : [];
    const medsRowsHtml = medicines.length > 0
      ? medicines.map((m: any) => {
          const name = (m.name || "Medicine").toUpperCase();
          const comp = m.composition ? `<div class="med-sub-line"><span class="med-sub-lbl">COMPOSITION</span><span class="med-sub-sep">:</span><span class="med-sub-val">${m.composition}</span></div>` : "";
          const note = m.note ? `<div class="med-sub-line"><span class="med-sub-lbl">NOTE</span><span class="med-sub-sep">:</span><span class="med-note-val">${m.note}</span></div>` : "";
          const dosage = m.dosage || "-";
          const timing = getTimingFromDosage(m.dosage, m.when || m.frequency);
          const duration = m.duration || "-";
          const qty = m.quantity ? `<br><span style="font-size: 9pt; color: #4b5563;">(Qty: ${m.quantity})</span>` : "";

          return `
          <tr class="med-row">
            <td class="col-med">
              <div class="med-name-heading">${name}</div>
              ${comp}
              ${note}
            </td>
            <td class="dosage-val col-dosage">${dosage}</td>
            <td class="timing-val col-timing">${timing}</td>
            <td class="med-qty-val col-qty">${duration}${qty}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="4" style="text-align: center; color: #6b7280; padding: 20px;">No oral medicines prescribed.</td></tr>`;

    // Clinical examination lines
    const findingsText = (rx.findings || rx.clinical_findings || rx.oral_exam_notes || "").trim();
    const findingsLines = findingsText
      ? findingsText.split("\n").map((l: string) => l.trim().replace(/^[-•*]\s*/, "")).filter(Boolean)
      : [];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription - ${rx.patient_name || "Patient"} - Cortex Hospital</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @media print {
      @page {
        size: A4 portrait;
        margin: 5mm 5mm 5mm 20mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .prescription-sheet {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
    }

    body {
      background: #cbd5e1;
      padding: 20px 10px 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #000000;
      line-height: 1.3;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    /* Screen-only top action bar */
    .top-action-bar {
      max-width: 210mm;
      width: 100%;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 13px;
    }

    .print-btn {
      background: #7B1828;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .print-btn:hover {
      background: #5e121e;
    }

    /* A4 Prescription Container matching Cortex-Admin */
    .prescription-sheet {
      width: 210mm;
      min-height: 297mm;
      max-width: 210mm;
      background: #ffffff;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
      padding: 6mm 10mm 8mm 18mm;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }

    /* Faint Watermark */
    .sheet-watermark {
      position: absolute;
      top: 48%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      opacity: 0.055;
      pointer-events: none;
      z-index: 0;
    }

    .sheet-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 280mm;
    }

    .sheet-top-and-body {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    /* Top Meta Line */
    .top-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #555555;
      margin-bottom: 2px;
    }

    /* Header Area */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #d1d5db;
    }

    .hospital-logo {
      height: 56px;
      width: auto;
      object-fit: contain;
    }

    .doctor-header-block {
      text-align: right;
    }

    .doctor-title-name {
      font-size: 16pt;
      font-weight: 700;
      color: #7B1828; /* Cortex maroon */
      margin: 0;
      line-height: 1.15;
      letter-spacing: -0.2px;
    }

    .doctor-qualifications {
      font-size: 9.5pt;
      font-weight: 500;
      color: #111111;
      margin-top: 1px;
    }

    .doctor-reg {
      font-size: 8pt;
      color: #4b5563;
      margin-top: 1px;
    }

    .doctor-diplomate {
      font-size: 9pt;
      font-weight: 500;
      color: #1f2937;
      margin-top: 1px;
    }

    .doctor-specialty {
      font-size: 9pt;
      font-weight: 500;
      color: #1f2937;
      margin-top: 1px;
    }

    /* Patient Bar */
    .patient-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0 5px 0;
      font-size: 11pt;
      font-weight: 500;
      color: #000000;
    }

    .patient-info-left {
      flex: 1;
      letter-spacing: 0.1px;
    }

    .patient-date-right {
      white-space: nowrap;
      font-weight: 500;
    }

    /* Vitals Row */
    .vitals-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 4px 0 4px 0;
      font-size: 10pt;
      color: #111111;
      border-top: 1px dashed #cbd5e1;
    }

    .vitals-label {
      font-weight: 600;
      color: #000000;
      text-transform: uppercase;
      font-size: 9.5pt;
      letter-spacing: 0.5px;
    }

    .vitals-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* Clinical Strip */
    .clinical-strip-section {
      padding: 4px 0 4px 0;
      font-size: 10pt;
      line-height: 1.4;
      border-top: 1px dashed #cbd5e1;
      border-bottom: 1px solid #d1d5db;
    }

    .clinical-strip-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 2px;
    }

    .clinical-strip-lbl {
      font-weight: 600;
      color: #000000;
      font-size: 9.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }

    .clinical-strip-val {
      font-weight: normal;
      color: #111111;
    }

    /* Diagnosis Row */
    .diagnosis-row {
      padding: 4px 0 6px 0;
      font-size: 11pt;
      line-height: 1.35;
      border-bottom: 1px solid #d1d5db;
    }

    .diagnosis-label {
      font-weight: 600;
      color: #000000;
    }

    .diagnosis-text {
      font-weight: normal;
      color: #111111;
      text-transform: uppercase;
    }

    /* Rx Section */
    .rx-wrapper {
      margin-top: 6px;
    }

    .rx-symbol {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20pt;
      font-weight: normal;
      font-style: italic;
      color: #1f2937;
      line-height: 1;
      margin-bottom: 3px;
    }

    .med-table {
      width: 100%;
      border-collapse: collapse;
    }

    .med-table th {
      font-size: 10pt;
      font-weight: 600;
      color: #1f2937;
      padding: 5px 6px;
      border-bottom: 2px solid #6b7280;
    }

    .med-table th.col-med {
      width: 42%;
      text-align: left;
    }

    .med-table th.col-dosage {
      width: 12%;
      text-align: center;
    }

    .med-table th.col-timing {
      width: 34%;
      text-align: left;
    }

    .med-table th.col-qty {
      width: 12%;
      text-align: center;
      padding-left: 2px;
      padding-right: 2px;
    }

    .med-row td {
      padding: 6px 6px;
      vertical-align: top;
      border-bottom: 1px solid #e5e7eb;
    }

    .med-name-heading {
      font-size: 12.5pt;
      font-weight: 600;
      color: #000000;
      letter-spacing: 0.1px;
      text-transform: uppercase;
    }

    .med-sub-line {
      display: flex;
      font-size: 9.5pt;
      margin-top: 2px;
      padding-left: 12px;
      line-height: 1.35;
    }

    .med-sub-lbl {
      width: 90px;
      color: #4b5563;
      font-weight: 600;
      text-transform: uppercase;
      flex-shrink: 0;
      font-size: 8.5pt;
    }

    .med-sub-sep {
      margin-right: 5px;
      color: #555555;
      flex-shrink: 0;
    }

    .med-sub-val {
      color: #111111;
      font-weight: normal;
    }

    .med-note-val {
      color: #000000;
      font-weight: normal;
      text-decoration: underline;
      text-decoration-color: #dc2626;
    }

    .dosage-val {
      font-size: 11.5pt;
      font-weight: normal;
      color: #000000;
      text-align: center;
      letter-spacing: 0.2px;
      white-space: nowrap;
      padding-top: 1px;
    }

    .timing-val {
      font-size: 10.5pt;
      font-weight: normal;
      color: #111111;
      line-height: 1.35;
    }

    .med-qty-val {
      font-size: 11.5pt;
      font-weight: 600;
      color: #000000;
      text-align: center;
    }

    /* Advice & Next Visit */
    .advice-section {
      margin-top: 8px;
    }

    .advice-heading {
      font-size: 11pt;
      font-weight: 600;
      color: #000000;
      margin-bottom: 2px;
    }

    .advice-content-body {
      font-size: 10.5pt;
      color: #1f2937;
      line-height: 1.4;
      white-space: pre-line;
      margin-bottom: 4px;
    }

    .marathi-item {
      font-size: 10.5pt;
      margin-top: 4px;
      color: #000000;
    }

    .marathi-label {
      font-weight: 600;
      margin-right: 5px;
    }

    /* Doctor Signature */
    .sheet-signature-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 6mm;
    }

    .signature-block {
      text-align: center;
      min-width: 210px;
      flex-shrink: 0;
      padding-bottom: 2px;
    }

    .sig-img {
      height: 52px;
      max-width: 170px;
      object-fit: contain;
      margin: 0 auto;
      display: block;
    }

    .sig-doc-name {
      font-size: 13pt;
      font-weight: 600;
      color: #111111;
      margin-top: 2px;
    }

    /* Bottom Fixed Footer Area */
    .sheet-footer-fixed-bottom {
      margin-top: auto;
      flex-shrink: 0;
    }

    .prescription-validity-note {
      font-size: 9pt;
      line-height: 1.4;
      letter-spacing: 0.1px;
      margin-bottom: 4px;
    }

    .validity-rule {
      font-weight: 600;
      color: #b91c1c;
    }

    .generic-rule {
      font-weight: normal;
      color: #1e293b;
      margin-top: 1.5px;
    }

    /* Footer Schedule Banner */
    .footer-banner-container {
      margin-top: 6px;
      padding-top: 3px;
      border-top: 1.5px solid #d1d5db;
      text-align: center;
    }

    .footer-top-pill-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 3px;
    }

    .clinic-pill {
      background-color: #7B1828;
      color: #ffffff;
      font-size: 8pt;
      font-weight: 600;
      padding: 1.5px 8px;
      border-radius: 9999px;
      letter-spacing: 0.2px;
    }

    .clinic-time {
      font-size: 8.5pt;
      font-weight: normal;
      color: #111111;
    }

    .footer-clinic-title {
      font-size: 9.5pt;
      font-weight: 600;
      color: #000000;
      margin-bottom: 1px;
    }

    .footer-opd-line {
      font-size: 7.5pt;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 1.5px;
    }

    .footer-opd-label {
      font-weight: 800;
      color: #7B1828;
    }

    .footer-sunday-line {
      font-size: 7.5pt;
      font-weight: 700;
      color: #7B1828;
      margin-bottom: 2px;
    }

    .footer-address-line {
      font-size: 7.5pt;
      font-weight: 500;
      color: #374151;
    }

    .footer-bottom-bar {
      height: 4px;
      background: linear-gradient(90deg, #4c1d95 0%, #7B1828 50%, #4c1d95 100%);
      border-radius: 2px;
      margin-top: 4px;
    }

    .footer-hms-branding {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      margin-top: 6px;
      padding-top: 2px;
      padding-right: 4px;
      font-size: 7.5pt;
      color: #64748b;
      text-align: right;
    }

    .footer-hms-branding img {
      height: 12px;
      width: auto;
      object-fit: contain;
      border-radius: 2px;
      display: inline-block;
      vertical-align: middle;
    }

    .footer-hms-branding strong {
      color: #0d9488;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <!-- Top Navigation / Action Bar (Screen Only) -->
  <div class="top-action-bar no-print">
    <span>🏥 Official Digital Prescription &bull; Cortex Hospital, Wardha</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <!-- A4 Prescription Sheet -->
  <div class="prescription-sheet">
    <!-- Watermark -->
    <img src="${CORTEX_LOGO_BASE64}" alt="Watermark" class="sheet-watermark" />

    <div class="sheet-content">
      <div class="sheet-top-and-body">
        <!-- Top Meta Line -->
        <div class="top-meta-row">
          <span>${formatTimestamp(rx.prescription_date)}</span>
          <span>Svaasth HMS</span>
        </div>

        <!-- Official Header Row -->
        <div class="header-row">
          <div style="display: flex; align-items: center;">
            <img src="${CORTEX_LOGO_BASE64}" alt="Cortex Hospital" class="hospital-logo" />
          </div>

          <div class="doctor-header-block">
            <h1 class="doctor-title-name">${docConfig.name}</h1>
            <div class="doctor-qualifications">${docConfig.degrees}</div>
            <div class="doctor-reg">${docConfig.reg}</div>
            <div class="doctor-diplomate">${docConfig.diplomate}</div>
            <div class="doctor-specialty">${docConfig.specialty}</div>
          </div>
        </div>

        <!-- Patient Row -->
        <div class="patient-row">
          <div class="patient-info-left">
            <span>${refNumber}</span> : <span>${patientNameFormatted}</span> <span>${patientDetailsText}</span><span>${phoneText}</span>
          </div>
          <div class="patient-date-right">
            Date: ${formatPrescriptionDate(rx.prescription_date)}
          </div>
        </div>

        <!-- Vitals (if present) -->
        ${hasVitals ? `
        <div class="vitals-row">
          <span class="vitals-label">Vitals:</span>
          ${bp ? `<span class="vitals-item"><strong>BP:</strong> ${bp} mmHg</span>` : ""}
          ${pulse ? `<span class="vitals-item"><strong>Pulse:</strong> ${pulse} /min</span>` : ""}
          ${spo2 ? `<span class="vitals-item"><strong>SpO₂:</strong> ${spo2}%</span>` : ""}
          ${temp ? `<span class="vitals-item"><strong>Temp:</strong> ${temp} °F</span>` : ""}
          ${height ? `<span class="vitals-item"><strong>Height:</strong> ${height} cm</span>` : ""}
          ${weight ? `<span class="vitals-item"><strong>Weight:</strong> ${weight} kg</span>` : ""}
          ${bmi ? `<span class="vitals-item"><strong>BMI:</strong> ${bmi}</span>` : ""}
        </div>` : ""}

        <!-- Chief Complaints (if present) -->
        ${rx.chief_complaint ? `
        <div class="clinical-strip-section">
          <div class="clinical-strip-row">
            <span class="clinical-strip-lbl">Chief Complaints:</span>
            <span class="clinical-strip-val">${rx.chief_complaint}</span>
          </div>
        </div>` : ""}

        <!-- Medical History (if present) -->
        ${rx.medical_history ? `
        <div class="clinical-strip-section">
          <div class="clinical-strip-row">
            <span class="clinical-strip-lbl">Medical History:</span>
            <span class="clinical-strip-val">${rx.medical_history}</span>
          </div>
        </div>` : ""}

        <!-- Clinical Examination (if present) -->
        ${findingsLines.length > 0 ? `
        <div class="clinical-strip-section">
          <div class="clinical-strip-row" style="align-items: flex-start;">
            <span class="clinical-strip-lbl" style="min-width: 140px;">Clinical Examination:</span>
            <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
              ${findingsLines.map((line: string) => `
                <div style="display: flex; align-items: baseline; gap: 5px;">
                  <span style="font-size: 9pt; color: #666; line-height: 1;">&bull;</span>
                  <span class="clinical-strip-val">${line}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>` : ""}

        <!-- Diagnosis Row -->
        ${diagnosisText ? `
        <div class="diagnosis-row">
          <span class="diagnosis-label">DIAGNOSIS: </span>
          <span class="diagnosis-text">${diagnosisText}</span>
        </div>` : ""}

        <!-- Rx Symbol & Medication Table -->
        <div class="rx-wrapper">
          <div class="rx-symbol">℞</div>
          <table class="med-table">
            <thead>
              <tr>
                <th class="col-med">MEDICINE NAME</th>
                <th class="col-dosage">DOSAGE</th>
                <th class="col-timing">TIMING</th>
                <th class="col-qty">DURATION / QTY</th>
              </tr>
            </thead>
            <tbody>
              ${medsRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Doctor Advice & Instructions (if present) -->
        ${rx.advice ? `
        <div class="advice-section">
          <div class="advice-heading">Advice / सल्ला:</div>
          <div class="advice-content-body">${rx.advice}</div>
        </div>` : ""}

        <!-- Next Visit / Follow-up (if present) -->
        ${rx.followup_date ? `
        <div class="marathi-item">
          <span class="marathi-label">फेरतपासणी (Next Visit):</span>
          <span>${formatFollowup(rx.followup_date, rx.prescription_date)}</span>
        </div>` : ""}

        <!-- Doctor Signature -->
        <div class="sheet-signature-section">
          <div class="signature-block">
            <img src="${docConfig.signature}" alt="Doctor Signature" class="sig-img" />
            <div class="sig-doc-name">${docConfig.name}</div>
          </div>
        </div>
      </div>

      <!-- Bottom Fixed Letterhead Footer -->
      <div class="sheet-footer-fixed-bottom">
        <!-- Validity Note & Generic Medicine Notice -->
        <div class="prescription-validity-note">
          ${!isGyno ? `<div class="validity-rule">* Prescription is valid for 30 days only</div>` : ""}
          <div class="generic-rule">* Medicine can be purchased from any medical store and in a generic form also</div>
        </div>

        <!-- Schedule Banner -->
        <div class="footer-banner-container">
          <div class="footer-top-pill-row">
            <span class="clinic-pill">HIP &amp; KNEE JOINT CLINIC</span>
            <span class="clinic-time">&bull; Every Thursday 6 pm to 8 pm</span>
          </div>

          <div class="footer-clinic-title">Dedicated to Complete Orthopaedic, Maternity &amp; Family Care</div>

          <div class="footer-opd-line">
            <span class="footer-opd-label">OPD Time : </span>Mon. to Fri. - 10 am to 1 pm &amp; 6 pm to 8 pm | Sat. - 10 am to 1 pm | Sunday Closed
          </div>

          <div class="footer-sunday-line">Sunday OPD Closed</div>

          <div class="footer-address-line">
            Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001 &nbsp;|&nbsp; Ph. : 07152-255795, 9373280505
          </div>

          <div class="footer-bottom-bar"></div>
        </div>

        <!-- Powered by Svaasth-HMS Badge -->
        <div class="footer-hms-branding">
          <span>Powered by</span>
          <img src="${SVAASTH_LOGO_BASE64}" alt="Svaasth HMS" />
          <strong>Svaasth-HMS</strong>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

export default http;
