import jsPDF from 'jspdf';

export interface BillItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemType: 'medicine' | 'procedure' | 'consultation' | 'other';
}

export interface BillData {
  clinic?: {
    name?: string;
  };
  patient: {
    name: string;
    age?: string;
    sex?: string;
    date?: string;
    id?: string;
    contactDetails?: string;
    reference_number?: string;
  };
  invoice: {
    number: string;
    date: string;
    paymentMethod: string;
    paymentStatus: string;
  };
  items: BillItem[];
  financials: {
    consultationFee: number;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
  };
  teeth?: string;
  diagnosis?: string;
}

function formatDate(dateStr: string | number): string {
  try {
    let date: Date;
    if (typeof dateStr === 'number') {
      date = new Date(dateStr * 1000);
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

export function formatCurrency(amount: number): string {
  return (
    'INR ' +
    (amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function generateBillDoc(billData: BillData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setProperties({
    title: `Bill - ${billData.patient.name}`,
    author: billData.clinic?.name || 'Cortex Hospital',
    subject: 'Hospital Bill',
    keywords: 'hospital, invoice, bill',
    creator: 'Cortex Hospital Billing System',
  });

  const primaryColor = '#1a56db'; // Blue
  const secondaryColor = '#064e3b'; // Teal

  doc.setFont('helvetica');

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = margin;

  const centerText = (text: string, y: number, fontSize: number) => {
    doc.setFontSize(fontSize);
    const textWidth =
      (doc.getStringUnitWidth(text) * fontSize) / doc.internal.scaleFactor;
    const textX = (pageWidth - textWidth) / 2;
    doc.text(text, textX, y);
  };

  // Clinic Header
  doc.setTextColor(primaryColor);
  doc.setFontSize(18);
  centerText('Cortex Hospital', yPos, 18);
  yPos += 7;

  doc.setTextColor('#666666');
  doc.setFontSize(10);
  centerText('Professional Medical & Healthcare Services', yPos, 10);
  yPos += 15;

  doc.setFontSize(8);
  centerText(
    'Beside Urich Mall, Aarti Square, Mohini Nagar, Nagpur Road, Wardha (M.S) - 442001',
    yPos,
    8
  );
  yPos += 4;
  centerText('Maharashtra, India - 442001', yPos, 8);
  yPos += 4;
  centerText(
    'Phone: +91 9373280505 | +91 7184273030 | Email: drvipeenraut@cortexhospital.com',
    yPos,
    8
  );
  yPos += 8;

  // Header separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Date
  const dateText = 'Date: ' + billData.invoice.date;
  doc.text(
    dateText,
    pageWidth -
      margin -
      (doc.getStringUnitWidth(dateText) * 12) / doc.internal.scaleFactor,
    yPos
  );
  yPos += 10;

  // Invoice Title
  doc.setTextColor(secondaryColor);
  doc.setFontSize(14);
  centerText('INVOICE', yPos, 14);
  yPos += 10;

  // Two-column layout
  const colWidth = (pageWidth - 2 * margin) / 2;
  const leftCol = margin;
  const rightCol = margin + colWidth;

  // Left column (Invoice details)
  doc.setTextColor('#000000');
  doc.setFontSize(10);

  doc.text('Invoice No:', leftCol, yPos);
  doc.text('Date:', leftCol, yPos + 7);
  doc.text('Payment Method:', leftCol, yPos + 14);

  doc.setFont('helvetica', 'normal');
  const invoiceNoX =
    leftCol +
    colWidth -
    5 -
    (doc.getStringUnitWidth(billData.invoice.number || '') * 10) /
      doc.internal.scaleFactor;
  doc.text(billData.invoice.number || '', invoiceNoX, yPos);

  const dateX =
    leftCol +
    colWidth -
    5 -
    (doc.getStringUnitWidth(billData.invoice.date || '') * 10) /
      doc.internal.scaleFactor;
  doc.text(billData.invoice.date || '', dateX, yPos + 7);

  const paymentMethodX =
    leftCol +
    colWidth -
    5 -
    (doc.getStringUnitWidth(billData.invoice.paymentMethod || '') * 10) /
      doc.internal.scaleFactor;
  doc.text(billData.invoice.paymentMethod || 'Cash', paymentMethodX, yPos + 14);

  doc.text('Payment Status:', leftCol, yPos + 21);
  const paymentStatusX =
    leftCol +
    colWidth -
    5 -
    (doc.getStringUnitWidth(billData.invoice.paymentStatus || '') * 10) /
      doc.internal.scaleFactor;
  doc.text(billData.invoice.paymentStatus || 'PENDING', paymentStatusX, yPos + 21);

  yPos += 7;

  // Right column (Patient details)
  doc.text('Patient Name:', rightCol, yPos);
  doc.text('Age/Sex:', rightCol, yPos + 7);
  if (billData.patient.reference_number) {
    doc.text('Reference No:', rightCol, yPos + 14);
  }

  const patientNameX =
    pageWidth -
    margin -
    (doc.getStringUnitWidth(billData.patient.name || '') * 10) /
      doc.internal.scaleFactor;
  doc.text(billData.patient.name || 'Patient', patientNameX, yPos);

  const ageSexText = `${billData.patient.age || '—'} / ${billData.patient.sex || '—'}`;
  const ageSexX =
    pageWidth -
    margin -
    (doc.getStringUnitWidth(ageSexText) * 10) / doc.internal.scaleFactor;
  doc.text(ageSexText, ageSexX, yPos + 7);

  if (billData.patient.reference_number) {
    const refNumberX =
      pageWidth -
      margin -
      (doc.getStringUnitWidth(billData.patient.reference_number) * 10) /
        doc.internal.scaleFactor;
    doc.text(billData.patient.reference_number, refNumberX, yPos + 14);
  }

  yPos += 25;

  // Treatment Information if available
  if (billData.diagnosis || billData.teeth) {
    doc.setTextColor(secondaryColor);
    doc.setFontSize(12);
    doc.text('Treatment Information', margin, yPos);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos + 1, margin + 40, yPos + 1);
    yPos += 7;

    doc.setTextColor('#000000');
    doc.setFontSize(9);

    if (billData.diagnosis) {
      doc.text(`Diagnosis: ${billData.diagnosis}`, margin, yPos);
      yPos += 5;
    }

    if (billData.teeth) {
      doc.text(`Details/Area: ${billData.teeth}`, margin, yPos);
      yPos += 5;
    }

    yPos += 5;
  }

  // Bill Items Title
  doc.setTextColor(secondaryColor);
  doc.setFontSize(12);
  doc.text('Bill Items', margin, yPos);
  yPos += 7;

  // Custom table setup
  const tableX = margin;
  const tableWidth = pageWidth - 2 * margin;

  const colWidths = [
    0.08 * tableWidth, // S.No
    0.42 * tableWidth, // Description
    0.1 * tableWidth,  // Qty
    0.2 * tableWidth,  // Unit Price
    0.2 * tableWidth,  // Total
  ];

  const colX = [
    tableX,
    tableX + colWidths[0],
    tableX + colWidths[0] + colWidths[1],
    tableX + colWidths[0] + colWidths[1] + colWidths[2],
    tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
  ];

  const rowHeight = 8;

  // Table header
  doc.setFillColor(26, 86, 219);
  doc.rect(tableX, yPos, tableWidth, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  doc.text('S.No', colX[0] + colWidths[0] / 2, yPos + 5.5, { align: 'center' });
  doc.text('Description', colX[1] + colWidths[1] / 2, yPos + 5.5, {
    align: 'center',
  });
  doc.text('Qty', colX[2] + colWidths[2] / 2, yPos + 5.5, { align: 'center' });
  doc.text('Unit Price (in INR)', colX[3] + colWidths[3] / 2, yPos + 5.5, {
    align: 'center',
  });
  doc.text('Total (in INR)', colX[4] + colWidths[4] / 2, yPos + 5.5, {
    align: 'center',
  });

  yPos += rowHeight;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const hasConsultationFee = billData.items.some(
    (item) => item.itemType === 'consultation'
  );

  const allItems: BillItem[] =
    hasConsultationFee || !billData.financials?.consultationFee
      ? billData.items
      : [
          ...billData.items,
          {
            id: billData.items.length + 1,
            description: 'Consultation Fee',
            quantity: 1,
            unitPrice: billData.financials.consultationFee,
            total: billData.financials.consultationFee,
            itemType: 'consultation',
          },
        ];

  allItems.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(tableX, yPos, tableWidth, rowHeight, 'F');
    }

    if (item.itemType === 'consultation') {
      doc.setFillColor(230, 240, 255);
      doc.rect(tableX, yPos, tableWidth, rowHeight, 'F');
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    doc.text((index + 1).toString(), colX[0] + colWidths[0] / 2, yPos + 5.5, {
      align: 'center',
    });

    let description = item.description || '';
    if (description.length > 40) {
      description = description.substring(0, 37) + '...';
    }
    doc.text(description, colX[1] + 3, yPos + 5.5);

    doc.text((item.quantity || 1).toString(), colX[2] + colWidths[2] / 2, yPos + 5.5, {
      align: 'center',
    });

    doc.text(
      formatCurrency(item.unitPrice || 0),
      colX[3] + colWidths[3] - 3,
      yPos + 5.5,
      { align: 'right' }
    );

    doc.text(
      formatCurrency(item.total || 0),
      colX[4] + colWidths[4] - 3,
      yPos + 5.5,
      { align: 'right' }
    );

    doc.setDrawColor(200, 200, 200);
    doc.line(tableX, yPos + rowHeight, tableX + tableWidth, yPos + rowHeight);

    yPos += rowHeight;
  });

  // Vertical column dividers
  doc.setDrawColor(200, 200, 200);
  const tableBottom = yPos;
  const tableTop = tableBottom - (allItems.length + 1) * rowHeight;

  colX.forEach((x, i) => {
    if (i > 0) {
      doc.line(x, tableTop, x, tableBottom);
    }
  });

  // Outline
  doc.setDrawColor(26, 86, 219);
  doc.setLineWidth(0.5);
  doc.rect(tableX, tableTop, tableWidth, tableBottom - tableTop);
  doc.setLineWidth(0.1);

  yPos += 10;

  // Totals Section
  const totalsWidth = 70;
  const totalsX = pageWidth - margin - totalsWidth;

  doc.setFontSize(10);
  doc.setTextColor('#000000');

  // Subtotal
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(
    formatCurrency(billData.financials.subtotal),
    pageWidth - margin,
    yPos,
    { align: 'right' }
  );
  yPos += 7;

  // Discount
  const discountText = `Discount (${billData.financials.discountPercent || 0}%):`;
  doc.text(discountText, totalsX, yPos);
  doc.text(
    formatCurrency(billData.financials.discountAmount || 0),
    pageWidth - margin,
    yPos,
    { align: 'right' }
  );
  yPos += 10;

  // Total amount box
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(59, 130, 246);
  doc.rect(totalsX - 3, yPos - 5, pageWidth - totalsX - margin + 5, 10, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', totalsX, yPos);
  doc.text(
    formatCurrency(billData.financials.total),
    pageWidth - margin,
    yPos,
    { align: 'right' }
  );
  yPos += 6;

  // Balance due if not fully paid
  if (
    billData.invoice.paymentStatus !== 'Full Payment' &&
    billData.invoice.paymentStatus !== 'PAID'
  ) {
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', totalsX, yPos);
    doc.text(
      formatCurrency(billData.financials.amountPaid || 0),
      pageWidth - margin,
      yPos,
      { align: 'right' }
    );

    yPos += 9;
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(239, 68, 68);
    doc.rect(totalsX - 3, yPos - 5, pageWidth - totalsX - margin + 5, 10, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('Balance Due:', totalsX, yPos);
    doc.text(
      formatCurrency(billData.financials.balanceDue || 0),
      pageWidth - margin,
      yPos,
      { align: 'right' }
    );
    doc.setTextColor('#000000');
  }

  yPos += 15;

  // Footer notes
  doc.setTextColor('#666666');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  centerText(
    'Thank you for choosing Cortex Hospital for your healthcare needs.',
    yPos,
    9
  );
  yPos += 5;
  centerText('We wish you a speedy recovery and the best of health.', yPos, 9);
  yPos += 5;

  // Terms & Conditions at bottom
  const pageHeight = doc.internal.pageSize.getHeight();
  yPos = pageHeight - 35;

  doc.setTextColor('#999999');
  doc.setFontSize(8);
  doc.text('Terms & Conditions:', margin, yPos);
  doc.text(
    '1. This is a computer-generated invoice and does not require a signature.',
    margin,
    yPos + 5
  );
  doc.text(
    '2. Please bring this invoice for any future reference or in case of follow-up visits.',
    margin,
    yPos + 10
  );
  doc.text('3. Payment is due at the time of service.', margin, yPos + 15);

  return doc;
}

export function generateBillPdfBlob(billData: BillData): Blob {
  const doc = generateBillDoc(billData);
  return doc.output('blob');
}

export function viewBillPdf(billData: BillData): void {
  const blob = generateBillPdfBlob(billData);
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export function downloadBillPdf(billData: BillData, filename?: string): void {
  const doc = generateBillDoc(billData);
  const defaultFilename = `bill-${(billData.patient.name || 'patient').replace(/\s+/g, '-')}-${billData.invoice.date || 'invoice'}.pdf`;
  doc.save(filename || defaultFilename);
}

export function printBillPdf(billData: BillData): void {
  const blob = generateBillPdfBlob(billData);
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
}

export function convertBillRecordToBillData(
  bill: any,
  patientDetails?: {
    name?: string;
    age?: string | number;
    sex?: string;
    contactDetails?: string;
    reference_number?: string;
    date?: string;
  }
): BillData {
  const items: BillItem[] = Array.isArray(bill.items)
    ? bill.items.map((item: any, idx: number) => ({
        id: item.id || idx + 1,
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice || item.unit_price) || 0,
        total:
          parseFloat(item.total) ||
          (parseFloat(item.quantity) || 1) *
            (parseFloat(item.unitPrice || item.unit_price) || 0),
        itemType: item.itemType || item.item_type || 'other',
      }))
    : [];

  const consultationItem = items.find((i) => i.itemType === 'consultation');
  const consultationFee = consultationItem ? consultationItem.unitPrice : 0;

  const totalAmount = parseFloat(bill.total_amount || bill.total) || 0;
  const paidAmount = parseFloat(bill.paid_amount || bill.amountPaid) || 0;
  const balanceDue =
    parseFloat(bill.balance_amount || bill.balanceDue) ??
    Math.max(totalAmount - paidAmount, 0);

  return {
    clinic: {
      name: 'Cortex Hospital',
    },
    patient: {
      name: patientDetails?.name || bill.patient_name || 'Patient',
      age: patientDetails?.age?.toString() || bill.patient_age?.toString() || '',
      sex: patientDetails?.sex || bill.patient_sex || '',
      date: patientDetails?.date || formatDate(bill.created_at || Date.now()),
      reference_number:
        patientDetails?.reference_number || bill.reference_number || '',
      contactDetails:
        patientDetails?.contactDetails || bill.phone_number || '',
    },
    invoice: {
      number: bill.bill_number || bill.id || 'INV-001',
      date: formatDate(bill.bill_date || bill.created_at || Date.now()),
      paymentMethod: bill.payment_method || 'Cash',
      paymentStatus: bill.payment_status || 'PENDING',
    },
    items,
    financials: {
      consultationFee,
      subtotal: totalAmount,
      discountPercent: parseFloat(bill.discount_percent) || 0,
      discountAmount: parseFloat(bill.discount_amount) || 0,
      total: totalAmount,
      amountPaid: paidAmount,
      balanceDue,
    },
    teeth: bill.teeth_treated || '',
    diagnosis: bill.diagnosis || bill.notes || '',
  };
}
