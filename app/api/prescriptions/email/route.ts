import { NextRequest, NextResponse } from 'next/server';
import { Configuration, SendApi, AccountApi } from 'hostinger-mail-api-sdk';
import nodemailer from 'nodemailer';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export interface SendPrescriptionEmailRequest {
  recipientEmail: string;
  patientName: string;
  age?: string | number;
  gender?: string;
  phoneNumber?: string;
  referenceNumber?: string;
  doctorName?: string;
  prescriptionDate?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  medicalHistory?: string;
  findings?: string;
  vitals?: {
    bp?: string;
    pulse?: string;
    spo2?: string;
    temp?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    lmp?: string;
    edd?: string;
    gestational_age?: string;
  };
  medicines?: Array<{
    name: string;
    dosage?: string;
    timing?: string;
    duration?: string;
    quantity?: number | string;
    composition?: string;
    notes?: string;
    note?: string;
    frequency?: string;
    freq_duration?: string;
  }>;
  advice?: string;
  dietExercise?: string;
  investigation?: string;
  followupDate?: string;
  pdfBase64?: string;
}

/** Safely read public static assets from disk */
async function readPublicFileSafe(fileName: string): Promise<Buffer | null> {
  const possiblePaths = [
    path.join(process.cwd(), 'public', fileName),
    path.join(process.cwd(), 'Cortex-Admin', 'public', fileName),
    path.join(process.cwd(), fileName),
  ];
  for (const p of possiblePaths) {
    try {
      const data = await fs.readFile(p);
      if (data && data.length > 0) return data;
    } catch {
      // try next path
    }
  }
  return null;
}

/** Sanitize text for standard PDF-lib fonts (Helvetica WinAnsi encoding) */
function sanitizePdfText(text?: string | number): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/₹/g, 'Rs.')
    .replace(/—/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/[^\x00-\xFF]/g, ' ')
    .trim();
}

/** Helper to wrap text into lines fitting max characters */
function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine ? currentLine + ' ' + word : word).length <= maxChars) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Format date string nicely */
function formatDateGB(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-GB');
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** English timing helper for PDF WinAnsi font */
function getTimingEnglish(dosage?: string, timing?: string): string {
  if (timing && !/[^\x00-\x7F]/.test(timing)) return timing;
  if (!dosage || typeof dosage !== 'string') return timing ? sanitizePdfText(timing) : '';
  const clean = dosage.trim().toLowerCase();
  if (clean === '1-0-0') return 'Morning after breakfast';
  if (clean === '0-1-0') return 'Afternoon after lunch';
  if (clean === '0-0-1') return 'Night after dinner';
  if (clean === '1-0-1') return 'Morning & Night after meals';
  if (clean === '1-1-1') return 'Morning, Afternoon & Night after meals';
  if (clean === '1-1-0') return 'Morning & Afternoon';
  if (clean === '0-1-1') return 'Afternoon & Night';
  if (clean === 'stat') return 'Immediately (Stat)';
  if (clean === 'sos') return 'As needed (SOS)';

  const parts = clean.split('-').map((p) => p.trim());
  if (parts.length === 3) {
    const [m, a, n] = parts;
    const segs: string[] = [];
    if (m && m !== '0') segs.push(m === '1' ? 'Morning after breakfast' : `${m} Morning`);
    if (a && a !== '0') segs.push(a === '1' ? 'Afternoon after lunch' : `${a} Afternoon`);
    if (n && n !== '0') segs.push(n === '1' ? 'Night after dinner' : `${n} Night`);
    if (segs.length > 0) return segs.join(', ');
  }
  return sanitizePdfText(timing || dosage);
}

/** Build light-themed, clean and normal email HTML (open, spacious, mobile-friendly, under 50KB to prevent Gmail clipping) */
function buildHtmlTemplate(
  data: SendPrescriptionEmailRequest,
  doctorEmail: string,
  doctorTitle: string,
  isGynae: boolean,
  svasthLogoBase64?: string,
  cortexLogoBase64?: string
) {
  const docName = data.doctorName || (isGynae ? 'Dr. Shillpa Raut' : 'Dr. Vipeen Raut');
  const v = data.vitals || {};
  const patientRefClean = data.referenceNumber ? data.referenceNumber.replace(/^CH/i, 'CRX') : 'CRX';

  // Obstetrics & Antenatal Record: Strictly rendered ONLY for Dr. Shillpa Raut (isGynae)
  const hasObstetrics = isGynae && Boolean(v.lmp || v.edd || v.gestational_age);

  const obsDetails: string[] = [];
  if (v.lmp) obsDetails.push(`<strong>LMP:</strong> ${v.lmp}`);
  if (v.edd) obsDetails.push(`<strong>EDD:</strong> ${v.edd}`);
  if (v.gestational_age) obsDetails.push(`<strong>Gestational Age:</strong> ${v.gestational_age}`);

  // Use Content-ID (CID) inline references for Gmail and email clients
  // Gmail web/mobile strictly BLOCKS data:image/base64 URIs, but fully renders standard CID inline images.
  const cortexLogoSrc = 'cid:cortexLogo';
  const svasthLogoSrc = 'cid:svasthLogo';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription - ${data.patientName}</title>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; -webkit-font-smoothing: antialiased;">
  
  <!-- Inbox Snippet Preheader to prevent thread collapse & clipping -->
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Digital Prescription issued for ${data.patientName} (${patientRefClean}) from Cortex Hospital &amp; Research Centre. Official prescription PDF attached.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    
    <!-- Clean Hospital Header with Logo -->
    <div style="padding: 22px 24px 18px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <img src="${cortexLogoSrc}" alt="Cortex Hospital" style="height: 58px; width: auto; max-width: 175px; display: block;" />
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">CORTEX HOSPITAL</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Hospital &amp; Research Centre</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">Aarti Chowk, Nagpur Rd, Wardha</div>
            <div style="font-size: 11px; color: #7B1828; font-weight: 700; margin-top: 2px;">Ph: 07152-255795 • 9373280505</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Solid Maroon Line -->
    <div style="height: 3px; background-color: #7B1828; width: 100%;"></div>

    <!-- Attending Consultant Header Card -->


    <!-- Normal, Spacious Email Body -->
    <div style="padding: 24px; font-size: 15px; line-height: 1.7; color: #334155;">
      <p style="margin: 0 0 16px 0;">Dear <strong>${data.patientName}</strong>,</p>

      <p style="margin: 0 0 16px 0;">Thank you for visiting Cortex Hospital &amp; Research Centre.</p>

      <p style="margin: 0 0 16px 0;">Please find attached your digital prescription issued by <strong>${docName}</strong> following your recent consultation.</p>

      <p style="margin: 0 0 16px 0;">The attached PDF contains your prescribed medications, dosage instructions, medical advice and follow-up details.</p>

      <p style="margin: 0 0 16px 0;">Please keep this prescription for your records and refer to it when required.</p>

      <p style="margin: 0 0 24px 0;">For any queries or assistance, feel free to contact us.</p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">Warm regards,</p>
        <p style="margin: 0 0 2px 0; font-weight: 800; color: #0f172a; font-size: 15px;">Cortex Hospital &amp; Research Centre</p>
        <p style="margin: 0 0 4px 0; font-weight: 700; color: #7B1828; font-size: 14px;">${docName}</p>
        <p style="margin: 0; font-weight: 600; color: #0d9488; font-size: 13px;">📞 07152-255795 | 9373280505</p>
      </div>

      <!-- Obstetrics & Antenatal Record (Strictly rendered ONLY for Dr. Shillpa Raut) -->
      ${hasObstetrics
      ? `
      <div style="margin-top: 22px; padding: 14px 18px; background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; font-size: 13px; color: #831843;">
        <div style="font-size: 11px; font-weight: 800; color: #be185d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          🌸 Obstetrics &amp; Antenatal Record
        </div>
        <div>${obsDetails.join(' &nbsp;•&nbsp; ')}</div>
      </div>
      `
      : ''
    }

      <!-- Attached PDF Notice Banner -->
      <div style="margin-top: 22px; padding: 12px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534;">
        📎 <strong>Attached:</strong> Official digital prescription PDF (Letterhead copy)
      </div>

      <!-- Prominent Dedicated "Powered by Svasth-HMS" Card -->
      <div style="margin-top: 24px; padding: 14px 18px; background-color: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align: middle;">
              <div style="font-size: 10px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px;">Hospital Management System</div>
              <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                Powered by <span style="color: #0d9488; font-weight: 800;">Svasth-HMS</span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Smart Clinical EMR &amp; Digital Health Platform</div>
            </td>
            <td style="text-align: right; vertical-align: middle; width: 50px;">
              ${svasthLogoSrc ? `<img src="${svasthLogoSrc}" alt="Svasth-HMS" style="height: 38px; width: auto; max-width: 44px; display: inline-block; vertical-align: middle;" />` : ''}
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Clean Footer with Powered by Svasth-HMS -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
      <div>Cortex Hospital &amp; Research Centre • Aarti Chowk, Nagpur Road, Wardha - 442001</div>
      <div>OPD Timings: Mon-Fri: 10:00 AM - 1:00 PM, 6:00 PM - 8:00 PM | Sunday Closed</div>
      <div style="margin-top: 6px; font-size: 11px; color: #64748b; font-weight: 600;">
        Powered by <strong style="color: #0d9488; font-weight: 800;">Svasth-HMS</strong>
      </div>
    </div>

  </div>
</body>
</html>`;
}

/** Official PDF generator that produces the exact layout of PrescriptionLivePreview */
async function generatePrescriptionPdf(
  data: SendPrescriptionEmailRequest,
  isGynae: boolean,
  doctorTitle: string,
  doctorEmail: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const obliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const boldObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // Standard A4 dimensions
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN_X = 36;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // Colors matching PrescriptionLivePreview
  const maroonColor = rgb(0.482, 0.094, 0.157); // #7B1828
  const darkSlateColor = rgb(0.12, 0.16, 0.23); // slate-900 / #0f172a
  const midSlateColor = rgb(0.35, 0.4, 0.48); // slate-600
  const lightBorderColor = rgb(0.85, 0.88, 0.92); // slate-200 / slate-300
  const blackColor = rgb(0.05, 0.05, 0.05);

  // 1. Background Watermark (Centered on page at 0.04 opacity)
  const watermarkBytes = await readPublicFileSafe('cortex_logo.png');
  if (watermarkBytes) {
    try {
      const wmImg = await pdfDoc.embedPng(watermarkBytes);
      const wmW = 250;
      const wmH = 105;
      page.drawImage(wmImg, {
        x: (PAGE_W - wmW) / 2,
        y: (PAGE_H - wmH) / 2,
        width: wmW,
        height: wmH,
        opacity: 0.04,
      });
    } catch {
      // ignore
    }
  }

  let y = PAGE_H - 28;

  // 2. Top Meta Row: Date & Time on left, "Svasth HMS" on right
  const pDate = formatDateGB(data.prescriptionDate);
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const topDateStr = `${pDate} ${nowTime}`;
  page.drawText(topDateStr, {
    x: MARGIN_X,
    y,
    size: 8,
    font: regularFont,
    color: rgb(0.45, 0.5, 0.55),
  });

  const svasthTop = 'Svasth HMS';
  const svasthTopW = boldFont.widthOfTextAtSize(svasthTop, 8);
  page.drawText(svasthTop, {
    x: PAGE_W - MARGIN_X - svasthTopW,
    y,
    size: 8,
    font: boldFont,
    color: rgb(0.2, 0.25, 0.3),
  });

  y -= 6;
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_W - MARGIN_X, y },
    thickness: 0.5,
    color: lightBorderColor,
  });

  // 3. Letterhead Header Area: Hospital Logo on Left, Attending Doctor Credentials on Right
  y -= 12;
  const logoBytes = await readPublicFileSafe('cortex_logo.png');
  if (logoBytes) {
    try {
      const logoImg = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImg, {
        x: MARGIN_X,
        y: y - 48,
        width: 105,
        height: 48,
      });
    } catch {
      // ignore
    }
  }

  // Attending Doctor Details (Right-aligned)
  const docName = data.doctorName || (isGynae ? 'Dr. Shillpa Raut' : 'Dr. Vipeen Raut');
  const docTitleW = boldFont.widthOfTextAtSize(docName, 15);
  page.drawText(docName, {
    x: PAGE_W - MARGIN_X - docTitleW,
    y: y - 4,
    size: 15,
    font: boldFont,
    color: maroonColor,
  });

  if (isGynae) {
    const l1 = 'M.B.B.S., M.D. (Gynecology & Obstetrics)';
    page.drawText(l1, {
      x: PAGE_W - MARGIN_X - regularFont.widthOfTextAtSize(l1, 8.5),
      y: y - 16,
      size: 8.5,
      font: regularFont,
      color: rgb(0.25, 0.3, 0.38),
    });

    const l2 = 'Reg. No. 2004/05/1842';
    page.drawText(l2, {
      x: PAGE_W - MARGIN_X - regularFont.widthOfTextAtSize(l2, 7.5),
      y: y - 27,
      size: 7.5,
      font: regularFont,
      color: rgb(0.45, 0.5, 0.55),
    });

    const l3 = 'Consulting Gynecologist & Obstetrician';
    page.drawText(l3, {
      x: PAGE_W - MARGIN_X - boldFont.widthOfTextAtSize(l3, 8),
      y: y - 37,
      size: 8,
      font: boldFont,
      color: darkSlateColor,
    });

    const l4 = 'Maternity, Infertility & Women Care Specialist';
    page.drawText(l4, {
      x: PAGE_W - MARGIN_X - regularFont.widthOfTextAtSize(l4, 8),
      y: y - 47,
      size: 8,
      font: regularFont,
      color: darkSlateColor,
    });
  } else {
    const l1 = 'M.B.B.S., Dip.Ortho., DNB Ortho';
    page.drawText(l1, {
      x: PAGE_W - MARGIN_X - regularFont.widthOfTextAtSize(l1, 8.5),
      y: y - 16,
      size: 8.5,
      font: regularFont,
      color: rgb(0.25, 0.3, 0.38),
    });

    const l2 = 'Reg. No. 1692/03/2002';
    page.drawText(l2, {
      x: PAGE_W - MARGIN_X - regularFont.widthOfTextAtSize(l2, 7.5),
      y: y - 27,
      size: 7.5,
      font: regularFont,
      color: rgb(0.45, 0.5, 0.55),
    });

    const l3 = 'Diplomate of National Board (Orthopaedics)';
    page.drawText(l3, {
      x: PAGE_W - MARGIN_X - boldFont.widthOfTextAtSize(l3, 8),
      y: y - 37,
      size: 8,
      font: boldFont,
      color: darkSlateColor,
    });

    const l4 = 'Consulting Orthopaedic and Joint Replacement Surgeon';
    page.drawText(l4, {
      x: PAGE_W - MARGIN_X - regularFont.widthOfTextAtSize(l4, 8),
      y: y - 47,
      size: 8,
      font: regularFont,
      color: darkSlateColor,
    });
  }

  // Thick Slate Divider (border-b-2 border-slate-800)
  y -= 54;
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_W - MARGIN_X, y },
    thickness: 1.8,
    color: darkSlateColor,
  });

  // 4. Patient Bar: Ref No : MR./MS. PATIENT (Age, Gender) - Ph: ...  |  Date: ...
  y -= 14;
  const pRefClean = data.referenceNumber ? sanitizePdfText(data.referenceNumber.replace(/^CH/i, 'CRX')) : 'CRX0001';
  const pName = sanitizePdfText(data.patientName).toUpperCase();
  const pAge = data.age ? `${data.age} Y` : '-';
  const pGender = data.gender ? sanitizePdfText(data.gender) : '';
  const pPhone = data.phoneNumber ? sanitizePdfText(data.phoneNumber) : '';

  const patientLine = `${pRefClean} : MR./MS. ${pName} (${pAge}${pGender ? `, ${pGender}` : ''})${pPhone ? ` - Ph: ${pPhone}` : ''}`;
  page.drawText(patientLine, {
    x: MARGIN_X,
    y,
    size: 8.5,
    font: boldFont,
    color: blackColor,
  });

  const dateRightStr = `Date: ${pDate}`;
  const dRightW = boldFont.widthOfTextAtSize(dateRightStr, 8.5);
  page.drawText(dateRightStr, {
    x: PAGE_W - MARGIN_X - dRightW,
    y,
    size: 8.5,
    font: boldFont,
    color: blackColor,
  });

  // Thin Divider below Patient Bar
  y -= 8;
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_W - MARGIN_X, y },
    thickness: 0.6,
    color: rgb(0.8, 0.83, 0.88),
  });

  // 5. Vitals (Sequentially arranged in shaded bar)
  const v = data.vitals || {};
  const vList: string[] = [];
  if (v.bp) vList.push(`BP: ${sanitizePdfText(v.bp)}${!String(v.bp).toLowerCase().includes('mmhg') ? ' mmHg' : ''}`);
  if (v.pulse) vList.push(`Pulse: ${sanitizePdfText(v.pulse)}${!String(v.pulse).includes('/') ? ' /min' : ''}`);
  if (v.spo2) vList.push(`SpO2: ${sanitizePdfText(v.spo2)}${!String(v.spo2).includes('%') ? '%' : ''}`);
  if (v.temp) vList.push(`Temp: ${sanitizePdfText(v.temp)}${!String(v.temp).toLowerCase().includes('f') ? ' F' : ''}`);
  if (v.height) vList.push(`Height: ${sanitizePdfText(v.height)}${!String(v.height).toLowerCase().includes('cm') ? ' cm' : ''}`);
  if (v.weight) vList.push(`Weight: ${sanitizePdfText(v.weight)}${!String(v.weight).toLowerCase().includes('kg') ? ' kg' : ''}`);
  if (v.bmi) vList.push(`BMI: ${sanitizePdfText(v.bmi)}`);

  // Include Obstetrics vitals ONLY for Dr. Shillpa Raut
  if (isGynae) {
    if (v.lmp) vList.push(`LMP: ${formatDateGB(v.lmp)}`);
    if (v.edd) vList.push(`EDD: ${formatDateGB(v.edd)}`);
    if (v.gestational_age) vList.push(`GA: ${sanitizePdfText(v.gestational_age)}`);
  }

  if (vList.length > 0) {
    y -= 16;
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 3,
      width: CONTENT_W,
      height: 16,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.88, 0.9, 0.93),
      borderWidth: 0.5,
    });

    page.drawText('VITALS:', {
      x: MARGIN_X + 6,
      y: y + 2,
      size: 8,
      font: boldFont,
      color: blackColor,
    });

    const vitalsStr = vList.join('   •   ');
    page.drawText(vitalsStr.slice(0, 115), {
      x: MARGIN_X + 50,
      y: y + 2,
      size: 7.5,
      font: regularFont,
      color: rgb(0.2, 0.25, 0.3),
    });
  }

  // 6. Chief Complaints
  if (data.chiefComplaint) {
    y -= 16;
    const ccLines = wrapText(`CHIEF COMPLAINTS: ${sanitizePdfText(data.chiefComplaint)}`, 95);
    for (const line of ccLines) {
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size: 8,
        font: boldFont,
        color: blackColor,
      });
      y -= 11;
    }
    y += 2; // small reset
  }

  // 7. Diagnosis (Prominent uppercase)
  if (data.diagnosis) {
    y -= 14;
    page.drawText('Diagnosis: ', {
      x: MARGIN_X,
      y,
      size: 9,
      font: boldFont,
      color: blackColor,
    });

    const diagText = sanitizePdfText(data.diagnosis).toUpperCase();
    const diagLines = wrapText(diagText, 80);
    let diagX = MARGIN_X + 55;
    for (let di = 0; di < diagLines.length; di++) {
      page.drawText(diagLines[di], {
        x: di === 0 ? diagX : MARGIN_X + 15,
        y,
        size: 9,
        font: boldFont,
        color: maroonColor,
      });
      if (di < diagLines.length - 1) y -= 11;
    }
    y -= 4;
  }

  // 8. Medical & Surgical History (if any)
  if (data.medicalHistory) {
    y -= 13;
    page.drawText(`Medical History: ${sanitizePdfText(data.medicalHistory)}`.slice(0, 100), {
      x: MARGIN_X,
      y,
      size: 8,
      font: regularFont,
      color: darkSlateColor,
    });
  }

  // 9. Clinical Examination / Findings (if any)
  if (data.findings) {
    y -= 13;
    page.drawText(`Clinical Examination: ${sanitizePdfText(data.findings)}`.slice(0, 100), {
      x: MARGIN_X,
      y,
      size: 8,
      font: regularFont,
      color: darkSlateColor,
    });
  }

  // 10. Prescribed Medicines Section (℞ Symbol + Exact Table)
  y -= 18;
  page.drawText('Rx', {
    x: MARGIN_X,
    y,
    size: 18,
    font: boldObliqueFont,
    color: darkSlateColor,
  });

  y -= 14;
  const colMed = MARGIN_X;
  const colMedW = 235;
  const colDos = MARGIN_X + 235;
  const colDosW = 75;
  const colTiming = MARGIN_X + 310;
  const colTimingW = CONTENT_W - 310;
  const thHeight = 15;

  // Table Header Box
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 2,
    width: CONTENT_W,
    height: thHeight,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.75, 0.8, 0.85),
    borderWidth: 0.8,
  });

  page.drawText('Medicine', { x: colMed + 6, y: y + 2, size: 8, font: boldFont, color: darkSlateColor });
  page.drawText('Dosage', { x: colDos + 20, y: y + 2, size: 8, font: boldFont, color: darkSlateColor });
  page.drawText('Timing - Freq. - Duration', { x: colTiming + 6, y: y + 2, size: 8, font: boldFont, color: darkSlateColor });

  y -= thHeight;

  const meds = data.medicines || [];
  for (let i = 0; i < meds.length; i++) {
    const med = meds[i];
    const medName = sanitizePdfText(med.name || 'Not specified').toUpperCase();
    const composition = sanitizePdfText(med.composition);
    const dosageClean = sanitizePdfText(med.dosage || '-').replace(/-/g, ' - ');
    const timingEng = getTimingEnglish(med.dosage, med.timing);
    const duration = sanitizePdfText(med.duration || med.freq_duration);
    const timingFreqDuration = [timingEng, duration ? `(${duration})` : ''].filter(Boolean).join(' • ');
    const note = sanitizePdfText(med.notes || med.note);

    const hasSubline = Boolean(composition || timingEng || note);
    const rowH = hasSubline ? 26 : 18;

    // Row border
    page.drawRectangle({
      x: MARGIN_X,
      y: y - (rowH - 12),
      width: CONTENT_W,
      height: rowH,
      borderColor: rgb(0.88, 0.9, 0.93),
      borderWidth: 0.5,
    });

    // Column 1: Medicine Name & composition
    page.drawText(`${i + 1})  ${medName.slice(0, 38)}`, {
      x: colMed + 6,
      y: y + 2,
      size: 8,
      font: boldFont,
      color: blackColor,
    });

    if (composition) {
      page.drawText(`Composition: ${composition.slice(0, 36)}`, {
        x: colMed + 16,
        y: y - 8,
        size: 6.8,
        font: regularFont,
        color: rgb(0.4, 0.45, 0.5),
      });
    } else if (note) {
      page.drawText(`Note: ${note.slice(0, 36)}`, {
        x: colMed + 16,
        y: y - 8,
        size: 6.8,
        font: boldFont,
        color: maroonColor,
      });
    }

    // Column 2: Dosage (Centered)
    const dosW = boldFont.widthOfTextAtSize(dosageClean, 8);
    page.drawText(dosageClean, {
      x: colDos + (colDosW - dosW) / 2,
      y: y + 2,
      size: 8,
      font: boldFont,
      color: darkSlateColor,
    });

    // Column 3: Timing - Freq - Duration
    page.drawText(timingFreqDuration.slice(0, 34), {
      x: colTiming + 6,
      y: y + 2,
      size: 7.5,
      font: regularFont,
      color: darkSlateColor,
    });

    y -= rowH;
  }

  // 11. Clinical Advice, Diet & Investigations
  if (data.advice || data.dietExercise || data.investigation) {
    y -= 10;
    if (data.advice) {
      page.drawText('ADVICE:', { x: MARGIN_X, y, size: 8, font: boldFont, color: blackColor });
      const advLines = wrapText(sanitizePdfText(data.advice), 90);
      for (const line of advLines) {
        y -= 9.5;
        page.drawText(line, { x: MARGIN_X + 6, y, size: 7.5, font: regularFont, color: darkSlateColor });
      }
    }
    if (data.dietExercise) {
      y -= 10;
      page.drawText(`Diet & Exercise: ${sanitizePdfText(data.dietExercise)}`.slice(0, 95), {
        x: MARGIN_X,
        y,
        size: 7.5,
        font: regularFont,
        color: darkSlateColor,
      });
    }
    if (data.investigation) {
      y -= 10;
      page.drawText(`Tests / Investigations: ${sanitizePdfText(data.investigation)}`.slice(0, 95), {
        x: MARGIN_X,
        y,
        size: 7.5,
        font: regularFont,
        color: darkSlateColor,
      });
    }
  }

  // 12. Next Visit (फेरतपासणी / Follow-Up)
  if (data.followupDate) {
    y -= 13;
    const fDate = formatDateGB(data.followupDate);
    let diffDays = 0;
    try {
      const pD = new Date(data.prescriptionDate || new Date());
      const fD = new Date(data.followupDate);
      diffDays = Math.round((fD.getTime() - pD.getTime()) / (1000 * 60 * 60 * 24));
    } catch { }

    const diffStr = diffDays > 0 ? ` (${diffDays} days later)` : '';
    const nextVisitStr = `Next Visit (Follow-Up): ${fDate}${diffStr}`;
    page.drawText(nextVisitStr, {
      x: MARGIN_X,
      y,
      size: 8,
      font: boldFont,
      color: rgb(0.1, 0.45, 0.35),
    });
  }

  // 13. Doctor Signature (Bottom Right)
  const sigFileName = isGynae ? 'sign1.png' : 'sign.png';
  const sigBytes = await readPublicFileSafe(sigFileName);
  const sigW = 100;
  const sigH = 38;
  const sigX = PAGE_W - MARGIN_X - sigW - 10;
  const sigY = 102;

  if (sigBytes) {
    try {
      const sigImg = await pdfDoc.embedPng(sigBytes);
      page.drawImage(sigImg, {
        x: sigX,
        y: sigY,
        width: sigW,
        height: sigH,
      });
    } catch {
      // ignore
    }
  }

  // Doctor Name Underneath Signature
  const sigDocW = boldFont.widthOfTextAtSize(docName, 8.5);
  page.drawText(docName, {
    x: sigX + (sigW - sigDocW) / 2,
    y: sigY - 8,
    size: 8.5,
    font: boldFont,
    color: darkSlateColor,
  });

  // 14. Validity Note (* Prescription is valid for 30 days only)
  page.drawText('* Prescription is valid for 30 days only', {
    x: MARGIN_X,
    y: 86,
    size: 7.5,
    font: boldFont,
    color: maroonColor,
  });

  // 15. Letterhead Bottom Schedule & Info Banner (Exact Match to PrescriptionLivePreview)
  page.drawLine({
    start: { x: MARGIN_X, y: 78 },
    end: { x: PAGE_W - MARGIN_X, y: 78 },
    thickness: 0.8,
    color: rgb(0.8, 0.83, 0.88),
  });

  // Clinic Schedule Line
  const sched1 = 'HIP & KNEE JOINT CLINIC  •  Every Thursday 6 pm to 8 pm';
  const s1W = boldFont.widthOfTextAtSize(sched1, 7.5);
  page.drawText(sched1, {
    x: (PAGE_W - s1W) / 2,
    y: 67,
    size: 7.5,
    font: boldFont,
    color: maroonColor,
  });

  // Orthopaedics Clinic & OPD Times
  const clinicTitle = 'Orthopaedics Clinic';
  const ctW = boldFont.widthOfTextAtSize(clinicTitle, 8);
  page.drawText(clinicTitle, {
    x: (PAGE_W - ctW) / 2,
    y: 56,
    size: 8,
    font: boldFont,
    color: blackColor,
  });

  const opdTimes = 'OPD Time: Mon. to Fri. - 10 am to 1 pm & 6 pm to 8 pm | Sat. - 10 am to 1 pm & Evening OPD Closed | Sunday OPD Closed';
  const otW = regularFont.widthOfTextAtSize(opdTimes, 6.8);
  page.drawText(opdTimes, {
    x: (PAGE_W - otW) / 2,
    y: 46,
    size: 6.8,
    font: regularFont,
    color: darkSlateColor,
  });

  // Hospital Address & Phone
  const hospAddress = 'Cortex Hospital, Aarti Chowk, Nagpur Road, Wardha - 442001  |  Ph. : 07152-255795, Cell : 9373280505';
  const haW = regularFont.widthOfTextAtSize(hospAddress, 6.8);
  page.drawText(hospAddress, {
    x: (PAGE_W - haW) / 2,
    y: 36,
    size: 6.8,
    font: regularFont,
    color: midSlateColor,
  });

  // Maroon brand accent bar
  page.drawLine({
    start: { x: MARGIN_X, y: 28 },
    end: { x: PAGE_W - MARGIN_X, y: 28 },
    thickness: 1.5,
    color: maroonColor,
  });

  // Footer: Powered by Svasth HMS • Cortex Hospital EMR with logo
  const svasthFooter = 'Powered by Svasth HMS • Cortex Hospital EMR';
  const sfW = regularFont.widthOfTextAtSize(svasthFooter, 7);
  const svasthPdfBytes = (await readPublicFileSafe('Svasth_logo.png')) || (await readPublicFileSafe('svasth_logo.png'));
  if (svasthPdfBytes) {
    try {
      const svasthPdfImg = await pdfDoc.embedPng(svasthPdfBytes);
      page.drawImage(svasthPdfImg, {
        x: PAGE_W - MARGIN_X - sfW - 14,
        y: 15,
        width: 10,
        height: 10,
      });
    } catch {
      // ignore
    }
  }
  page.drawText(svasthFooter, {
    x: PAGE_W - MARGIN_X - sfW,
    y: 17,
    size: 7,
    font: regularFont,
    color: rgb(0.5, 0.55, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST(req: NextRequest) {
  try {
    const body: SendPrescriptionEmailRequest = await req.json();

    if (!body.recipientEmail || !body.recipientEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required' }, { status: 400 });
    }

    if (!body.patientName) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 });
    }

    // Determine Doctor and Sender Email Address
    const docName = body.doctorName || 'Dr. Vipeen Raut';
    const isGynae =
      docName.toLowerCase().includes('shilpa') ||
      docName.toLowerCase().includes('shillpa') ||
      docName.toLowerCase().includes('gynae');

    const doctorEmail = isGynae ? 'drshillparaut@cortexhospital.com' : 'drvipeenraut@cortexhospital.com';
    const doctorTitle = isGynae
      ? 'M.B.B.S., M.D. - Consulting Gynecologist & Obstetrician'
      : 'M.B.B.S., Dip.Ortho., DNB Ortho - Consulting Orthopaedic and Joint Replacement Surgeon';
    const senderDisplayName = `${docName} (Cortex Hospital)`;

    const patientRefClean = body.referenceNumber ? body.referenceNumber.replace(/^CH/i, 'CRX') : 'CRX';
    const subject = `Prescription: ${body.patientName} (${patientRefClean}) - Cortex Hospital`;

    // 1. Load Optimized Lightweight Logos for Email HTML (Keeps HTML < 50 KB, preventing Gmail [Message clipped])
    const emailCortexBuffer = (await readPublicFileSafe('cortex_logo_email.png')) || (await readPublicFileSafe('cortex_logo.png'));
    const emailSvasthBuffer = (await readPublicFileSafe('svasth_logo_email.png')) || (await readPublicFileSafe('Svasth_logo.png')) || (await readPublicFileSafe('svasth_logo.png'));
    const cortexLogoBase64 = emailCortexBuffer ? emailCortexBuffer.toString('base64') : '';
    const svasthLogoBase64 = emailSvasthBuffer ? emailSvasthBuffer.toString('base64') : '';

    // 2. Build Light Email HTML with user's exact body wording and prominent Svasth-HMS branding
    const html = buildHtmlTemplate(body, doctorEmail, doctorTitle, isGynae, svasthLogoBase64, cortexLogoBase64);
    const text = `Dear ${body.patientName},

Thank you for visiting Cortex Hospital & Research Centre.
Please find attached your digital prescription issued by ${docName} following your recent consultation.
The attached PDF contains your prescribed medications, dosage instructions, medical advice and follow-up details.
Please keep this prescription for your records and refer to it when required.
For any queries or assistance, feel free to contact us.

Warm regards,
Cortex Hospital & Research Centre
${docName}
📞 07152-255795 | 9373280505

---
Powered by Svasth-HMS (Hospital Management System)`;

    // 3. Obtain or Generate Prescription PDF matching preview
    let pdfBuffer: Buffer;
    if (body.pdfBase64 && body.pdfBase64.length > 50) {
      pdfBuffer = Buffer.from(body.pdfBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');
    } else {
      pdfBuffer = await generatePrescriptionPdf(body, isGynae, doctorTitle, doctorEmail);
    }

    const safePatientFile = body.patientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfFilename = `Prescription-${safePatientFile}-${patientRefClean}.pdf`;

    const token = process.env.HOSTINGER_MAIL_API_TOKEN;

    // APPROACH B: Hostinger Mail API SDK
    if (token) {
      try {
        const config = new Configuration({
          accessToken: token,
        });
        const accountApi = new AccountApi(config);
        const sendApi = new SendApi(config);

        // Fetch mailboxes authorized for this token
        const accountRes = await accountApi.getCurrentAccount();
        const mailboxes = accountRes.data?.data?.mailboxes || [];

        // Match mailbox by doctor's address or pick first available mailbox
        let matchedMailbox = mailboxes.find(
          (m: any) => (m.address || '').toLowerCase() === doctorEmail.toLowerCase()
        );

        if (!matchedMailbox && mailboxes.length > 0) {
          matchedMailbox = mailboxes[0];
        }

        if (matchedMailbox?.resourceId) {
          // Send official prescription PDF and inline CID images for Cortex Hospital and Svasth logos
          const attachments: any[] = [
            {
              filename: pdfFilename,
              content: pdfBuffer.toString('base64'),
              contentType: 'application/pdf',
            },
          ];

          if (emailCortexBuffer) {
            attachments.push({
              filename: 'cortex_logo.png',
              content: emailCortexBuffer.toString('base64'),
              contentType: 'image/png',
              cid: 'cortexLogo',
            });
          }

          if (emailSvasthBuffer) {
            attachments.push({
              filename: 'svasth_logo.png',
              content: emailSvasthBuffer.toString('base64'),
              contentType: 'image/png',
              cid: 'svasthLogo',
            });
          }

          await sendApi.sendEmail(matchedMailbox.resourceId, {
            to: [body.recipientEmail.trim()],
            displayName: senderDisplayName,
            subject,
            html,
            text,
            attachments,
            cc: [],
            bcc: [],
          } as any);

          return NextResponse.json({
            success: true,
            provider: 'hostinger-mail-api-sdk',
            senderEmail: matchedMailbox.address || doctorEmail,
            recipientEmail: body.recipientEmail,
            hasPdfAttachment: true,
            isGynae,
            message: `Prescription successfully emailed with attached PDF to ${body.recipientEmail} via Hostinger Mail API`,
          });
        }
      } catch (sdkError: any) {
        console.warn(
          'Hostinger Mail SDK failed or token was unauthorized, attempting SMTP fallback:',
          sdkError?.response?.data || sdkError?.message || sdkError
        );
      }
    }

    // SMTP Fallback (Hostinger SMTP or server SMTP configured in .env.local)
    const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER || doctorEmail;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailAttachments: any[] = [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];

      if (emailCortexBuffer) {
        mailAttachments.push({
          filename: 'cortex_logo.png',
          content: emailCortexBuffer,
          cid: 'cortexLogo',
          contentType: 'image/png',
        });
      }

      if (emailSvasthBuffer) {
        mailAttachments.push({
          filename: 'svasth_logo.png',
          content: emailSvasthBuffer,
          cid: 'svasthLogo',
          contentType: 'image/png',
        });
      }

      const mailOptions: any = {
        from: `"${senderDisplayName}" <${doctorEmail}>`,
        to: body.recipientEmail.trim(),
        subject,
        text,
        html,
        attachments: mailAttachments,
      };

      await transporter.sendMail(mailOptions);

      return NextResponse.json({
        success: true,
        provider: 'smtp-fallback',
        senderEmail: doctorEmail,
        recipientEmail: body.recipientEmail,
        hasPdfAttachment: true,
        isGynae,
        message: `Prescription emailed successfully with attached PDF to ${body.recipientEmail} via SMTP`,
      });
    }

    return NextResponse.json(
      {
        error:
          'Hostinger Mail API token is not configured. Please add HOSTINGER_MAIL_API_TOKEN in Cortex-Admin/.env.local',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error sending prescription email:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to send prescription email',
      },
      { status: 500 }
    );
  }
}
