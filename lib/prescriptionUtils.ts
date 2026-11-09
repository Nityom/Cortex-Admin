function formatSegmentsWithAani(segments: string[]): string {
  if (segments.length === 0) return '';
  if (segments.length === 1) return segments[0];
  if (segments.length === 2) return `${segments[0]} आणि ${segments[1]}`;
  return `${segments.slice(0, -1).join(', ')} आणि ${segments[segments.length - 1]}`;
}

function formatDoseCount(val: string): string {
  const v = val.trim();
  if (v === '1/2' || v === '0.5' || v === '½') return 'अर्धी गोळी (½)';
  if (v === '1') return '';
  if (v === '2') return '२ गोळ्या';
  if (v === '3') return '३ गोळ्या';
  return `${v} -`;
}

export function getTimingFromDosage(dosage?: string, when?: string): string {
  if (!dosage || typeof dosage !== 'string') return '';
  const trimmed = dosage.trim();
  const clean = trimmed.toLowerCase().replace(/\s+/g, '');
  const wLower = (when || '').toLowerCase();
  const isBefore = wLower.includes('before') || (when || '').includes('आधी') || (when || '').includes('पूर्वी');
  const isEmpty = wLower.includes('empty') || (when || '').includes('उपाशी');
  const isBedtime = wLower.includes('bedtime') || (when || '').includes('झोपण्या');

  if (isEmpty) return 'सकाळी उपाशीपोटी';
  if (isBedtime) return 'रात्री झोपण्यापूर्वी';

  const formatText = (text: string) => {
    if (!text || !isBefore) return text;
    return text
      .replace(/जेवणानंतर/g, 'जेवणाआधी')
      .replace(/नाश्त्यानंतर/g, 'नाश्त्याआधी')
      .replace(/जेवणापूर्वी/g, 'जेवणाआधी')
      .replace(/नाश्त्यापूर्वी/g, 'नाश्त्याआधी');
  };

  // Exact standard clinical dosages mapped to Marathi instructions with "आणि"
  if (clean === '1-0-0') return formatText('सकाळी नाश्त्यानंतर');
  if (clean === '0-1-0') return formatText('दुपारी जेवणानंतर');
  if (clean === '0-0-1') return formatText('रात्री जेवणानंतर');
  if (clean === '1-0-1') return formatText('सकाळी नाश्त्यानंतर आणि रात्री जेवणानंतर');
  if (clean === '1-1-1') return formatText('सकाळी नाश्त्यानंतर, दुपारी जेवणानंतर आणि रात्री जेवणानंतर');
  if (clean === '1-1-0') return formatText('सकाळी नाश्त्यानंतर आणि दुपारी जेवणानंतर');
  if (clean === '0-1-1') return formatText('दुपारी जेवणानंतर आणि रात्री जेवणानंतर');

  // Fractions & multiple combinations
  if (clean === '1/2-0-0' || clean === '0.5-0-0') return formatText('अर्धी गोळी (½) सकाळी नाश्त्यानंतर');
  if (clean === '0-1/2-0' || clean === '0-0.5-0') return formatText('अर्धी गोळी (½) दुपारी जेवणानंतर');
  if (clean === '0-0-1/2' || clean === '0-0-0.5') return formatText('अर्धी गोळी (½) रात्री जेवणानंतर');
  if (clean === '1/2-0-1/2' || clean === '0.5-0-0.5') return formatText('अर्धी गोळी (½) सकाळी नाश्त्यानंतर आणि रात्री जेवणानंतर');
  if (clean === '1/2-1/2-0') return formatText('अर्धी गोळी (½) सकाळी नाश्त्यानंतर आणि दुपारी जेवणानंतर');
  if (clean === '0-1/2-1/2') return formatText('अर्धी गोळी (½) दुपारी जेवणानंतर आणि रात्री जेवणानंतर');
  if (clean === '1/2-1/2-1/2') return formatText('अर्धी गोळी (½) सकाळी नाश्त्यानंतर, दुपारी जेवणानंतर आणि रात्री जेवणानंतर');
  if (clean === '1-0-1/2' || clean === '1-0-0.5') return formatText('१ गोळी सकाळी नाश्त्यानंतर आणि अर्धी गोळी (½) रात्री जेवणानंतर');
  if (clean === '1/2-0-1' || clean === '0.5-0-1') return formatText('अर्धी गोळी (½) सकाळी नाश्त्यानंतर आणि १ गोळी रात्री जेवणानंतर');

  if (clean === '2-0-0') return formatText('२ गोळ्या सकाळी नाश्त्यानंतर');
  if (clean === '0-2-0') return formatText('२ गोळ्या दुपारी जेवणानंतर');
  if (clean === '0-0-2') return formatText('२ गोळ्या रात्री जेवणानंतर');
  if (clean === '1-0-2') return formatText('१ गोळी सकाळी नाश्त्यानंतर आणि २ गोळ्या रात्री जेवणानंतर');
  if (clean === '2-0-1') return formatText('२ गोळ्या सकाळी नाश्त्यानंतर आणि १ गोळी रात्री जेवणानंतर');
  if (clean === '2-0-2') return formatText('२ गोळ्या सकाळी नाश्त्यानंतर आणि २ गोळ्या रात्री जेवणानंतर');
  if (clean === '2-2-2') return formatText('२ गोळ्या सकाळी नाश्त्यानंतर, दुपारी जेवणानंतर आणि रात्री जेवणानंतर');

  // 4 times a day / special patterns
  if (clean === '1-1-1-1') return formatText('दिवसातून ४ वेळा (सकाळी, दुपारी, संध्याकाळी आणि रात्री जेवणानंतर)');
  if (clean === '1-0-0-1') return formatText('सकाळी नाश्त्यानंतर आणि रात्री जेवणानंतर');
  if (clean === 'stat') return 'तातडीने (STAT)';
  if (clean === 'sos') return 'गरज भासल्यास (SOS)';

  // General 3-part quantity handling (e.g. 1.5-0-1.5, 3-0-3, etc.)
  const parts = trimmed.split('-').map((p) => p.trim());
  if (parts.length === 3) {
    const [m, a, n] = parts;
    const segments: string[] = [];
    if (m && m !== '0') {
      const pfx = formatDoseCount(m);
      segments.push(pfx ? `${pfx} सकाळी नाश्त्यानंतर` : 'सकाळी नाश्त्यानंतर');
    }
    if (a && a !== '0') {
      const pfx = formatDoseCount(a);
      segments.push(pfx ? `${pfx} दुपारी जेवणानंतर` : 'दुपारी जेवणानंतर');
    }
    if (n && n !== '0') {
      const pfx = formatDoseCount(n);
      segments.push(pfx ? `${pfx} रात्री जेवणानंतर` : 'रात्री जेवणानंतर');
    }
    if (segments.length > 0) {
      return formatText(formatSegmentsWithAani(segments));
    }
  }

  // 4-part dosages (Morning, Afternoon, Evening, Night)
  if (parts.length === 4) {
    const [m, a, e, n] = parts;
    const segments: string[] = [];
    if (m && m !== '0') segments.push('सकाळी नाश्त्यानंतर');
    if (a && a !== '0') segments.push('दुपारी जेवणानंतर');
    if (e && e !== '0') segments.push('संध्याकाळी');
    if (n && n !== '0') segments.push('रात्री जेवणानंतर');
    if (segments.length > 0) {
      return formatText(formatSegmentsWithAani(segments));
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

