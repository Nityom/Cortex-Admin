import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

export interface ToothData {
  id: number;
  type: string;
  category: string;
  disease?: string;
}

export interface MedicineEntry {
  name: string;
  dosage: string;
  duration?: string;
  quantity?: number;
  composition?: string;
  timing?: string;
  freq_duration?: string;
  note?: string;
}

export interface PrescriptionData {
  patientName: string;
  age: string;
  sex: string;
  date: string;
  cc: string;
  mh: string;
  oralExamination: string;
  advice: string;
  followupDate: string;
  medicines?: MedicineEntry[];
  dentalNotation: string;
  diagnosisNotes: string;
  selectedTeeth: ToothData[];
  investigation?: string;
  treatmentPlan?: string[];
  treatmentPlanTotal?: number;
  treatmentDone?: { description: string; date?: string }[];
  referenceNumber?: string;
  doctorName?: string;
  bp?: string;
  spo2?: string;
  height?: string;
  weight?: string;
  pulse?: string;
  vitals?: any;
}

// A4 dimensions in points
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 50;
const MARGIN_R = 50;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

/** Replace characters outside WinAnsi range so pdf-lib standard fonts can encode them */
function sanitize(text: string): string {
  if (!text) return '';
  return text
    .replace(/₹/g, 'Rs.')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/[^\x00-\xFF]/g, '?');
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const safe = sanitize(text);
  const paragraphs = safe.split('\n');
  const result: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (!word) continue;
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxW) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    result.push(...(lines.length ? lines : ['']));
  }
  return result.length ? result : [''];
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  maxW: number,
  lineH: number,
  color = rgb(0, 0, 0)
): number {
  const lines = wrapText(text, font, size, maxW);
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineH;
  }
  return y;
}

function formatDate(d: string): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB');
}

export async function generatePrescriptionPdfBlob(data: PrescriptionData): Promise<Blob> {
  // Build teeth string
  if (data.selectedTeeth && data.selectedTeeth.length > 0) {
    const teethInfo = data.selectedTeeth.map(tooth => {
      if (tooth.category === 'General') return tooth.disease || '';
      const id = tooth.id.toString();
      const q = id[0];
      const n = parseInt(id.slice(1));
      const disp = n >= 9 && n <= 13
        ? `${q}${String.fromCharCode('A'.charCodeAt(0) + n - 9)}`
        : id;
      return `#${disp} (${tooth.disease || tooth.type})`;
    }).join('; ');
    data.dentalNotation = teethInfo;
  }

  // Load signature image
  const docNameLower = (data.doctorName || '').toLowerCase();
  const sigUrl = (docNameLower.includes('shillpa') || docNameLower.includes('anjali')) ? '/sign1.png' : '/sign.png';
  let signImageBytes: Uint8Array | null = null;
  try {
    const resp = await fetch(sigUrl);
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      signImageBytes = new Uint8Array(buf);
    }
  } catch {
    // skip signature image if fetch fails
  }

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let signImage = null;
  if (signImageBytes) {
    try {
      signImage = await pdfDoc.embedPng(signImageBytes);
    } catch {
      // not png or failed to embed
    }
  }

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 40;

  // Header
  const clinicName = 'CORTEX HOSPITAL';
  const clinicNameW = boldFont.widthOfTextAtSize(clinicName, 18);
  page.drawText(clinicName, {
    x: (PAGE_W - clinicNameW) / 2, y,
    size: 18, font: boldFont, color: rgb(0.05, 0.2, 0.4),
  });
  y -= 20;

  const docSubtitle = data.doctorName ? `Consultant: ${data.doctorName}` : 'Outpatient Department Prescription';
  const docSubtitleW = regularFont.widthOfTextAtSize(docSubtitle, 11);
  page.drawText(docSubtitle, {
    x: (PAGE_W - docSubtitleW) / 2, y,
    size: 11, font: regularFont, color: rgb(0.2, 0.2, 0.2),
  });
  y -= 14;

  page.drawLine({ start: { x: MARGIN_L, y }, end: { x: PAGE_W - MARGIN_R, y }, thickness: 1.5, color: rgb(0, 0, 0) });
  y -= 14;

  // Patient info grid
  const sz = 10;
  const lh = 16;
  const col1x = MARGIN_L + 4;
  const col2x = MARGIN_L + CONTENT_W / 2;
  const lblW = 100;

  const infoRows: [string, string, string, string][] = [
    ['Patient Name', data.patientName || '—', 'UHID / Number', data.referenceNumber || '—'],
    ['Age', data.age || '—', 'Date', formatDate(data.date)],
    ['Sex', data.sex || '—', 'Doctor', data.doctorName || 'Dr. Vipeen Raut'],
  ];
  if (data.followupDate) {
    infoRows.push(['Visit Type', 'Consultation', 'Follow-up', formatDate(data.followupDate)]);
  }

  // Vitals Row (BP, SpO2, Height, Weight)
  const vit = data.vitals || {};
  const bp = data.bp || vit.bp || (vit.bp_systolic && vit.bp_diastolic ? `${vit.bp_systolic}/${vit.bp_diastolic} mmHg` : '');
  const spo2 = data.spo2 || vit.spo2 ? `${data.spo2 || vit.spo2}%` : '';
  const height = data.height || vit.height ? `${data.height || vit.height} cm` : '';
  const weight = data.weight || vit.weight ? `${data.weight || vit.weight} kg` : '';

  if (bp || spo2 || height || weight) {
    const leftVitals = [bp ? `BP: ${bp}` : '', spo2 ? `SpO2: ${spo2}` : ''].filter(Boolean).join('  |  ');
    const rightVitals = [height ? `Ht: ${height}` : '', weight ? `Wt: ${weight}` : ''].filter(Boolean).join('  |  ');
    infoRows.push(['Vitals', leftVitals || '—', 'Measurements', rightVitals || '—']);
  }

  for (const [l1, v1, l2, v2] of infoRows) {
    page.drawText(`${l1}:`, { x: col1x, y, size: sz, font: boldFont, color: rgb(0, 0, 0) });
    page.drawText(sanitize(v1), { x: col1x + lblW, y, size: sz, font: regularFont, color: rgb(0, 0, 0) });
    page.drawText(`${l2}:`, { x: col2x, y, size: sz, font: boldFont, color: rgb(0, 0, 0) });
    page.drawText(sanitize(v2), { x: col2x + lblW, y, size: sz, font: regularFont, color: rgb(0, 0, 0) });
    y -= lh;
  }
  y -= 4;

  page.drawLine({ start: { x: MARGIN_L, y }, end: { x: PAGE_W - MARGIN_R, y }, thickness: 1.5, color: rgb(0, 0, 0) });
  y -= 14;

  // Section helpers
  const SH = 11;
  const SB = 10;
  const SLH = 15;

  function drawSection(heading: string, text: string) {
    page.drawText(heading, { x: MARGIN_L, y, size: SH, font: boldFont, color: rgb(0, 0, 0) });
    const hw = boldFont.widthOfTextAtSize(heading, SH);
    page.drawLine({ start: { x: MARGIN_L, y: y - 1 }, end: { x: MARGIN_L + hw, y: y - 1 }, thickness: 0.8, color: rgb(0, 0, 0) });
    y -= SH + 4;
    y = drawWrappedText(page, text, MARGIN_L + 16, y, regularFont, SB, CONTENT_W - 20, SLH);
    y -= 6;
  }

  // Diagnosis Section
  const diagParts: string[] = [];
  if (data.oralExamination) diagParts.push(data.oralExamination);
  if (data.dentalNotation) diagParts.push(`Findings: ${data.dentalNotation}`);
  if (data.diagnosisNotes) diagParts.push(data.diagnosisNotes);
  if (diagParts.length > 0) drawSection('DIAGNOSIS', diagParts.join('; '));

  if (data.investigation) drawSection('INVESTIGATION', data.investigation);

  // Medications table
  if (data.medicines && data.medicines.length > 0) {
    page.drawText('MEDICATIONS (Rx)', { x: MARGIN_L, y, size: SH, font: boldFont, color: rgb(0, 0, 0) });
    const mhw = boldFont.widthOfTextAtSize('MEDICATIONS (Rx)', SH);
    page.drawLine({ start: { x: MARGIN_L, y: y - 1 }, end: { x: MARGIN_L + mhw, y: y - 1 }, thickness: 0.8, color: rgb(0, 0, 0) });
    y -= SH + 6;

    const colSno = MARGIN_L;
    const colName = MARGIN_L + 30;
    const colDos = MARGIN_L + 280;
    const colDur = MARGIN_L + 390;
    const tableRight = PAGE_W - MARGIN_R;
    const rowH = 18;

    page.drawRectangle({ x: colSno, y: y - 2, width: CONTENT_W, height: rowH, color: rgb(0.9, 0.9, 0.9) });
    page.drawRectangle({ x: colSno, y: y - 2, width: CONTENT_W, height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
    page.drawText('#', { x: colSno + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
    page.drawText('Medication', { x: colName + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
    page.drawText('Dosage', { x: colDos + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
    page.drawText('Timing / Duration', { x: colDur + 4, y: y + 4, size: 9, font: boldFont, color: rgb(0, 0, 0) });
    for (const cx of [colName, colDos, colDur, tableRight]) {
      page.drawLine({ start: { x: cx, y: y - 2 }, end: { x: cx, y: y + rowH - 2 }, thickness: 0.5, color: rgb(0, 0, 0) });
    }
    y -= rowH;

    for (let i = 0; i < data.medicines.length; i++) {
      const med = data.medicines[i];
      const nameLines = wrapText(med.name, regularFont, 9, colDos - colName - 10);
      const rowHeight = Math.max(rowH, nameLines.length * 13 + 6);

      page.drawRectangle({ x: colSno, y: y - rowHeight + rowH, width: CONTENT_W, height: rowHeight, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
      for (const cx of [colName, colDos, colDur, tableRight]) {
        page.drawLine({ start: { x: cx, y: y - rowHeight + rowH }, end: { x: cx, y: y + 2 }, thickness: 0.5, color: rgb(0, 0, 0) });
      }
      page.drawText(`${i + 1}`, { x: colSno + 4, y: y + 4, size: 9, font: regularFont, color: rgb(0, 0, 0) });
      let nyRow = y + 4;
      for (const nl of nameLines) {
        page.drawText(nl, { x: colName + 4, y: nyRow, size: 9, font: regularFont, color: rgb(0, 0, 0) });
        nyRow -= 13;
      }
      page.drawText(sanitize(med.dosage || '—'), { x: colDos + 4, y: y + 4, size: 9, font: regularFont, color: rgb(0, 0, 0) });
      const durationTiming = [med.duration, med.timing].filter(Boolean).join(' - ') || '—';
      page.drawText(sanitize(durationTiming), { x: colDur + 4, y: y + 4, size: 9, font: regularFont, color: rgb(0, 0, 0) });
      y -= rowHeight;
    }
    y -= 8;
  }

  if (data.advice) drawSection('ADVICE / INSTRUCTIONS', data.advice);
  if (data.followupDate) drawSection('NEXT APPOINTMENT', formatDate(data.followupDate));

  // Signature block
  const sigY = Math.min(y - 30, 160);
  const sigBlockX = PAGE_W - MARGIN_R - 160;

  if (signImage) {
    const imgDims = signImage.scaleToFit(110, 55);
    page.drawImage(signImage, {
      x: sigBlockX + (160 - imgDims.width) / 2,
      y: sigY,
      width: imgDims.width,
      height: imgDims.height,
    });
  }

  const sigLabelY = sigY - 14;
  const sigLabel = "Doctor's Signature";
  const sigLabelW = boldFont.widthOfTextAtSize(sigLabel, 9);
  page.drawText(sigLabel, { x: sigBlockX + (160 - sigLabelW) / 2, y: sigLabelY, size: 9, font: boldFont, color: rgb(0, 0, 0) });
  const consLabel = data.doctorName || 'Consultant';
  const consLabelW = regularFont.widthOfTextAtSize(consLabel, 8.5);
  page.drawText(consLabel, { x: sigBlockX + (160 - consLabelW) / 2, y: sigLabelY - 12, size: 8.5, font: regularFont, color: rgb(0.3, 0.3, 0.3) });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
