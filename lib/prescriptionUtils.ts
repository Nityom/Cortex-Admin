export function getTimingFromDosage(dosage?: string): string {
  if (!dosage) return '';
  const trimmed = dosage.trim();
  const parts = trimmed.split('-').map((p) => p.trim());
  if (parts.length === 3) {
    const [m, a, n] = parts;
    const segments: string[] = [];
    if (m && m !== '0') {
      segments.push(`${m} - नाश्ता नंतर`);
    }
    if (a && a !== '0') {
      segments.push(`${a} - दुपारी जेवणानंतर`);
    }
    if (n && n !== '0') {
      segments.push(`${n} - रात्री जेवणानंतर`);
    }
    if (segments.length > 0) {
      return segments.join(', ');
    }
  }
  if (trimmed.toLowerCase() === 'stat') {
    return 'तातडीने (Stat)';
  }
  return '';
}

export function formatPrescriptionDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatFollowup(followupDate?: string, prescriptionDate?: string): string {
  if (!followupDate) return '';
  const fDate = new Date(followupDate);
  if (isNaN(fDate.getTime())) return followupDate;

  const daysOfWeek = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const dayName = daysOfWeek[fDate.getDay()];
  const formattedDate = `${String(fDate.getDate()).padStart(2, '0')}/${String(fDate.getMonth() + 1).padStart(2, '0')}/${fDate.getFullYear()}`;

  let diffPrefix = '';
  if (prescriptionDate) {
    const pDate = new Date(prescriptionDate);
    if (!isNaN(pDate.getTime())) {
      const diffMs = fDate.getTime() - pDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        diffPrefix = `${diffDays} दिवसानंतर `;
      }
    }
  }

  return `${diffPrefix}(${formattedDate} - ${dayName})`;
}

export function parseDosage(dosage: string): number {
  if (!dosage) return 0;
  const dosagePattern = dosage.match(/(\d+)-(\d+)-(\d+)/);
  if (dosagePattern) {
    const morning = parseInt(dosagePattern[1]) || 0;
    const afternoon = parseInt(dosagePattern[2]) || 0;
    const evening = parseInt(dosagePattern[3]) || 0;
    return morning + afternoon + evening;
  }
  const twicePattern = dosage.match(/(\d+)-(\d+)/);
  if (twicePattern) {
    const first = parseInt(twicePattern[1]) || 0;
    const second = parseInt(twicePattern[2]) || 0;
    return first + second;
  }
  const singleNumber = dosage.match(/(\d+)/);
  if (singleNumber) {
    return parseInt(singleNumber[1]) || 0;
  }
  return 0;
}

export function parseDuration(duration: string): number {
  if (!duration) return 0;
  const lowerDuration = duration.toLowerCase();
  const daysPattern = lowerDuration.match(/(\d+)\s*(?:day|days)/);
  if (daysPattern) {
    return parseInt(daysPattern[1]) || 0;
  }
  const weeksPattern = lowerDuration.match(/(\d+)\s*(?:week|weeks)/);
  if (weeksPattern) {
    return (parseInt(weeksPattern[1]) || 0) * 7;
  }
  const monthsPattern = lowerDuration.match(/(\d+)\s*(?:month|months)/);
  if (monthsPattern) {
    return (parseInt(monthsPattern[1]) || 0) * 30;
  }
  const numberOnly = lowerDuration.match(/(\d+)/);
  if (numberOnly) {
    return parseInt(numberOnly[1]) || 0;
  }
  return 0;
}

export function calculateMedicineQuantity(dosage: string, duration: string): number {
  const pillsPerDay = parseDosage(dosage);
  const numberOfDays = parseDuration(duration);
  return pillsPerDay * numberOfDays;
}

