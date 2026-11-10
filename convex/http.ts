import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

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
    h2 { color: #e11d48; margin-bottom: 12px; }
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

    const doctorName = rx.doctor_name || "Dr. Vipeen Raut";
    const isGynae = /shillpa|gyne/i.test(doctorName);
    const docDegree = isGynae ? "M.B.B.S., M.D. (Gynecology & Obstetrics)" : "M.B.B.S., Dip.Ortho., DNB Ortho";
    const docReg = isGynae ? "Reg. No.: 2005/02/1055" : "Reg. No.: 2004/03/1785";
    const docSpec = isGynae ? "Consultant Obstetrician & Gynecologist" : "Consultant Orthopaedic & Joint Replacement Surgeon";

    // Format date DD/MM/YYYY
    let displayDate = rx.prescription_date || "";
    try {
      const match = String(displayDate).match(/^(20\d{2})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        displayDate = `${match[3].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[1]}`;
      }
    } catch {}

    const medsHtml = Array.isArray(rx.medicines) && rx.medicines.length > 0
      ? rx.medicines.map((m: any, idx: number) => {
          const timing = m.when ? `(${m.when})` : "";
          const note = m.note ? `<div class="med-note">${m.note}</div>` : "";
          const comp = m.composition ? `<div class="med-comp">${m.composition}</div>` : "";
          return `
          <tr>
            <td style="width: 32px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
            <td>
              <div class="med-name">${m.name || "Medicine"}</div>
              ${comp}
              ${note}
            </td>
            <td style="text-align: center; font-weight: 600;">${m.dosage || "-"}</td>
            <td style="text-align: center; color: #475569;">${m.frequency || "Daily"} ${timing}</td>
            <td style="text-align: center; font-weight: 600;">${m.duration || "-"}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">No oral medicines prescribed.</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Prescription - ${rx.patient_name || "Patient"} - Cortex Hospital</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; color: #0f172a; padding: 20px 12px; }
    .page-container { max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0; }
    .print-actions { background: #0f172a; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; color: white; }
    .print-btn { background: #0284c7; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; }
    .print-btn:hover { background: #0369a1; }
    .header { padding: 24px 32px 18px; border-bottom: 2px solid #0284c7; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; background: #f8fafc; }
    .hospital-title { font-size: 24px; font-weight: 800; color: #0369a1; letter-spacing: -0.5px; }
    .hospital-tagline { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
    .hospital-contact { font-size: 12px; color: #475569; margin-top: 8px; line-height: 1.4; }
    .doctor-box { text-align: right; }
    .doc-name { font-size: 18px; font-weight: 700; color: #0f172a; }
    .doc-degree { font-size: 12px; color: #475569; font-weight: 500; margin-top: 2px; }
    .doc-spec { font-size: 12px; color: #0284c7; font-weight: 600; margin-top: 2px; }
    .patient-bar { background: #f1f5f9; padding: 14px 32px; border-bottom: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; font-size: 13px; }
    .p-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 2px; }
    .p-val { font-weight: 700; color: #0f172a; }
    .main-body { padding: 28px 32px; }
    .clinical-strip { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; padding: 14px 18px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #0284c7; }
    .clinical-item { font-size: 13px; }
    .rx-header { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 800; color: #0369a1; margin-bottom: 14px; }
    table.med-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    table.med-table th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.3px; }
    table.med-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .med-name { font-weight: 700; color: #0f172a; font-size: 14px; }
    .med-comp { font-size: 11px; color: #64748b; margin-top: 2px; }
    .med-note { font-size: 11px; color: #0284c7; font-style: italic; margin-top: 2px; }
    .section-title { font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .advice-box { background: #fefce8; border: 1px solid #fef08a; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #854d0e; line-height: 1.5; margin-bottom: 20px; }
    .followup-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #166534; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
    .footer { padding: 24px 32px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #94a3b8; }
    .sign-area { text-align: center; }
    .sign-line { width: 180px; border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 4px; font-weight: 600; color: #475569; font-size: 12px; }
    @media print {
      body { background: white; padding: 0; }
      .page-container { box-shadow: none; border: none; }
      .print-actions { display: none; }
    }
    @media (max-width: 640px) {
      .header { flex-direction: column; align-items: flex-start; }
      .doctor-box { text-align: left; margin-top: 12px; }
      .footer { flex-direction: column; align-items: flex-start; gap: 20px; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="print-actions">
      <span>🏥 Official Digital Prescription - Cortex Hospital</span>
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="hospital-title">CORTEX HOSPITAL</div>
        <div class="hospital-tagline">Specialty Orthopaedic, Obstetric &amp; Gynecological Care</div>
        <div class="hospital-contact">
          📍 Aarti Chowk, Nagpur Road, Wardha - 442001, Maharashtra<br>
          📞 Reception: 07152-255795 | Emergency / WhatsApp: +91 9373280505
        </div>
      </div>
      <div class="doctor-box">
        <div class="doc-name">${doctorName}</div>
        <div class="doc-degree">${docDegree}</div>
        <div class="doc-spec">${docSpec}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${docReg}</div>
      </div>
    </div>

    <div class="patient-bar">
      <div>
        <span class="p-label">Patient Name</span>
        <span class="p-val">${rx.patient_name || "Patient"}</span>
      </div>
      <div>
        <span class="p-label">UHID / Patient ID</span>
        <span class="p-val">${rx.reference_number || "CRX"}</span>
      </div>
      <div>
        <span class="p-label">Age / Sex</span>
        <span class="p-val">${rx.age || "-"} yrs / ${rx.sex || "-"}</span>
      </div>
      <div>
        <span class="p-label">Contact</span>
        <span class="p-val">${rx.phone_number || "-"}</span>
      </div>
      <div>
        <span class="p-label">Prescription Date</span>
        <span class="p-val">${displayDate}</span>
      </div>
    </div>

    <div class="main-body">
      ${rx.diagnosis ? `
      <div class="clinical-strip">
        <div class="clinical-item">
          <strong>Diagnosis:</strong> ${rx.diagnosis}
        </div>
        ${rx.chief_complaint ? `<div class="clinical-item"><strong>Chief Complaint:</strong> ${rx.chief_complaint}</div>` : ""}
      </div>` : ""}

      <div class="rx-header">
        <span>℞</span> Prescribed Medications
      </div>

      <table class="med-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">#</th>
            <th>Medicine Name &amp; Composition</th>
            <th style="text-align: center;">Dosage</th>
            <th style="text-align: center;">Frequency / Timing</th>
            <th style="text-align: center;">Duration</th>
          </tr>
        </thead>
        <tbody>
          ${medsHtml}
        </tbody>
      </table>

      ${rx.advice ? `
      <div>
        <div class="section-title">Doctor's Advice &amp; Instructions</div>
        <div class="advice-box">${rx.advice.replace(/\\n/g, "<br>")}</div>
      </div>` : ""}

      ${rx.followup_date ? `
      <div class="followup-box">
        <span>🔔 <strong>Next Recommended Follow-up:</strong> ${rx.followup_date}</span>
        <span>Please bring this prescription for your follow-up visit.</span>
      </div>` : ""}
    </div>

    <div class="footer">
      <div>
        <strong>Notice:</strong> This is an authenticated electronic prescription generated via Cortex PMS.<br>
        For inquiries or emergency assistance, call hospital reception at 07152-255795.
      </div>
      <div class="sign-area">
        <div class="sign-line">${doctorName}</div>
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
