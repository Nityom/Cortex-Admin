type QuantitySchedule = {
  dosage?: string;
  frequency?: string;
  duration?: string;
};

type QuantityMedicine = QuantitySchedule & {
  schedules?: QuantitySchedule[];
};

function parseDurationDays(duration?: string): number | undefined {
  const match = duration?.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  if (/month/i.test(duration || '')) return amount * 30;
  if (/week/i.test(duration || '')) return amount * 7;
  return amount;
}

function dosesPerDay(dosage?: string): number | undefined {
  if (!dosage || /sos|stat|directed/i.test(dosage)) return undefined;
  const parts = dosage.split('-');
  if (parts.length !== 3) return undefined;
  const values = parts.map((part) => {
    const value = Number(part.trim().replace(',', '.'));
    return Number.isFinite(value) && value >= 0 ? value : NaN;
  });
  if (values.some(Number.isNaN)) return undefined;
  return values.reduce((sum, value) => sum + value, 0);
}

export function calculateMedicineQuantity(medicine: QuantityMedicine): number | undefined {
  const schedules = medicine.schedules?.length ? medicine.schedules : [medicine];
  let total = 0;

  for (const schedule of schedules) {
    const dosageCount = dosesPerDay(schedule.dosage);
    const durationDays = parseDurationDays(schedule.duration);
    if (dosageCount === undefined || durationDays === undefined) return undefined;

    const frequency = (schedule.frequency || 'daily').toLowerCase();
    let frequencyCount: number;
    if (/alternate/.test(frequency)) frequencyCount = Math.ceil(durationDays / 2);
    else if (/twice/.test(frequency)) frequencyCount = (durationDays / 7) * 2;
    else if (/thrice/.test(frequency)) frequencyCount = (durationDays / 7) * 3;
    else if (/weekly/.test(frequency)) frequencyCount = durationDays / 7;
    else if (/once a month/.test(frequency)) frequencyCount = durationDays / 30;
    else if (/daily|every day/.test(frequency)) frequencyCount = durationDays;
    else return undefined;

    total += dosageCount * frequencyCount;
  }

  return Math.ceil(total);
}
