// lib/doctorColors.ts
// Standard Doctor Branding & Color Schemes
// Dr. Vipeen Raut (Orthopaedics) -> Green (Emerald)
// Dr. Shillpa / Shilpa Raut (Gynaecology & Obstetrics) -> Pink

export function isShillpaDoctor(doctorName?: string): boolean {
  if (!doctorName) return false;
  return /shillpa|shilpa|anjali|gyn/i.test(doctorName);
}

export function isVipeenDoctor(doctorName?: string): boolean {
  if (!doctorName) return false;
  return /vipeen|vipen|ortho/i.test(doctorName);
}

export function getDoctorBadgeStyle(doctorName?: string) {
  const isGyn = isShillpaDoctor(doctorName);
  return {
    isGyn,
    badge: isGyn
      ? "bg-pink-50 text-pink-700 border-pink-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200",
    text: isGyn ? "text-pink-700" : "text-emerald-800",
    bg: isGyn ? "bg-pink-50" : "bg-emerald-50",
    border: isGyn ? "border-pink-200" : "border-emerald-200",
    dot: isGyn ? "bg-pink-500" : "bg-emerald-500",
    buttonSelected: isGyn
      ? "bg-pink-600 text-white shadow-xs hover:bg-pink-700"
      : "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700",
    filterPillSelected: isGyn
      ? "bg-pink-50 text-pink-700 border-pink-300 font-bold shadow-2xs"
      : "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs",
  };
}

