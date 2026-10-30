export function getTimingFromDosage(dosage?: string): string {
  if (!dosage || typeof dosage !== 'string') return '';
  const trimmed = dosage.trim();
  const clean = trimmed.toLowerCase();

  // Standard clinical dosages mapped to Marathi instructions
  if (clean === '1-0-0') return 'सकाळी नाश्त्यानंतर (Morning after breakfast)';
  if (clean === '0-1-0') return 'दुपारी जेवणानंतर (Afternoon after lunch)';
  if (clean === '0-0-1') return 'रात्री जेवणानंतर (Night after dinner)';
  if (clean === '1-0-1') return 'सकाळी नाश्त्यानंतर, रात्री जेवणानंतर';
  if (clean === '1-1-1') return 'सकाळी नाश्त्यानंतर, दुपारी जेवणानंतर, रात्री जेवणानंतर';
  if (clean === '1-1-0') return 'सकाळी नाश्त्यानंतर, दुपारी जेवणानंतर';
  if (clean === '0-1-1') return 'दुपारी जेवणानंतर, रात्री जेवणानंतर';
  if (clean === 'stat') return 'तातडीने (Immediately / Stat)';
  if (clean === 'sos') return 'गरज भासल्यास (As needed / SOS)';

  // General quantity handling (e.g. 2-0-0, 2-0-2, 1/2-0-1/2)
  const parts = trimmed.split('-').map((p) => p.trim());
  if (parts.length === 3) {
    const [m, a, n] = parts;
    const segments: string[] = [];
    if (m && m !== '0') {
      segments.push(m === '1' ? 'सकाळी नाश्त्यानंतर' : `${m} - सकाळी नाश्त्यानंतर`);
    }
    if (a && a !== '0') {
      segments.push(a === '1' ? 'दुपारी जेवणानंतर' : `${a} - दुपारी जेवणानंतर`);
    }
    if (n && n !== '0') {
      segments.push(n === '1' ? 'रात्री जेवणानंतर' : `${n} - रात्री जेवणानंतर`);
    }
    if (segments.length > 0) {
      return segments.join(', ');
    }
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

