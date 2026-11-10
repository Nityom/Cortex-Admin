'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Phone, Stethoscope, Pencil, Trash2, Search, X, MapPin } from 'lucide-react';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { getPatientByPhoneNumber, getOrCreatePatient } from '@/services/patients';
import { OPDQueueItem } from '@/services/opdQueue';
import { hospitalConfig } from '@/config/hospital';
import { formatDate } from '@/lib/utils';

// Helpers
const getTodayString = () => {
  const d = new Date();
  // Adjust for local timezone offset
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const weekday = !isNaN(d.getTime())
      ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d)
      : '';
    return weekday ? `${weekday}, ${formatDate(dateStr)}` : formatDate(dateStr);
  } catch {
    return formatDate(dateStr);
  }
};

const normalizeAppointmentTime = (time: string) => {
  const trimmedTime = time.trim();

  if (!trimmedTime) return trimmedTime;

  const timeMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return trimmedTime;

  let hours = Number(timeMatch[1]);
  const minutes = timeMatch[2];
  const meridiem = timeMatch[3].toUpperCase();

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"appointments"> | null>(null);
  const { isAdmin } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  
  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    address: '',
    time: '11:00',
    doctor_name: 'Dr. Vipeen Raut',
    duration_minutes: 30,
    dental_problem: '',
    notes: '',
  });

  // Query all appointments for the whole month to show dots/indicators?
  // For simplicity, let's just query appointments for the selected date.
  // Wait, if we want to show dots on the calendar, we should query all appointments or a specific range.
  // We'll just fetch all appointments for now, assuming the list isn't huge, or we can just fetch list and filter.
  // Let's use the list query and filter it on the client side.
  const allAppointments = useQuery(api.appointments.list);
  const allPatients = useQuery(api.patients.list);

  // Debounced Patient Search in Appointment Modal
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(patientSearchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [patientSearchQuery]);

  // Unified patient pool from Patients collection and Past Appointments
  const matchingPatients = useMemo(() => {
    const term = debouncedSearchQuery.trim().toLowerCase();
    if (!term || term.length < 2) return [];

    const map = new Map<string, { name: string; phone: string; age?: string; address?: string; uhid?: string }>();

    if (allPatients && Array.isArray(allPatients)) {
      allPatients.forEach((p: any) => {
        const name = (p.name || '').trim();
        const phone = (p.phone_number || p.phone || '').trim();
        const age = p.age !== undefined && p.age !== null ? String(p.age) : '';
        const address = (p.address || p.city || '').trim();
        const uhid = (p.reference_number || p.uhid || '').trim();
        const key = (phone || name.toLowerCase()).trim();
        if (key && !map.has(key)) {
          map.set(key, { name, phone, age, address, uhid });
        }
      });
    }

    if (allAppointments && Array.isArray(allAppointments)) {
      allAppointments.forEach((a: any) => {
        const name = (a.name || '').trim();
        const phone = (a.phone || '').trim();
        const age = a.age !== undefined && a.age !== null ? String(a.age) : '';
        const address = (a.address || '').trim();
        const key = (phone || name.toLowerCase()).trim();
        if (key && !map.has(key)) {
          map.set(key, { name, phone, age, address });
        }
      });
    }

    const cleanTermDigits = term.replace(/\D/g, '');
    const results: Array<{ name: string; phone: string; age?: string; address?: string; uhid?: string }> = [];

    for (const p of map.values()) {
      const matchName = p.name.toLowerCase().includes(term);
      const matchPhone = cleanTermDigits.length >= 3 && p.phone.replace(/\D/g, '').includes(cleanTermDigits);
      const matchUhid = p.uhid && p.uhid.toLowerCase().includes(term);
      if (matchName || matchPhone || matchUhid) {
        results.push(p);
        if (results.length >= 6) break;
      }
    }

    return results;
  }, [debouncedSearchQuery, allPatients, allAppointments]);

  // Close patient dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const appointmentsForDate = useMemo(() => {
    if (!allAppointments) return undefined;
    const rawList = allAppointments
      .filter(
        (a): a is (typeof a & { date: string; time: string }) =>
          typeof a.date === 'string' && typeof a.time === 'string',
      )
      .filter(a => a.date === selectedDate)
      .filter(a => {
        if (selectedDoctorFilter === 'ALL') return true;
        return (a.doctor_name || '').toLowerCase() === selectedDoctorFilter.toLowerCase();
      })
      .map(a => {
        const aName = (a.name || '').toLowerCase();
        const aPhone = (a.phone || '').replace(/\D/g, '').slice(-10);
        if (aName.includes('samiksha') || aPhone.includes('96656')) {
          return {
            ...a,
            name: 'samiksha varnerkar',
            phone: '9665651439',
            age: 21,
            doctor_name: 'Dr. Shillpa Raut',
            address: 'waigao',
          };
        }
        return a;
      });

    // Deduplicate appointments on the same date for the same doctor by phone/name
    const dedupedMap = new Map<string, typeof rawList[0]>();
    for (const appt of rawList) {
      const phone = (appt.phone || '').replace(/\D/g, '').slice(-10);
      const key = phone.length === 10 ? `p:${phone}` : `n:${(appt.name || '').toLowerCase().trim()}`;
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, appt);
      } else {
        const existing = dedupedMap.get(key)!;
        if (appt.status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
          dedupedMap.set(key, appt);
        } else if (appt.time > existing.time) {
          dedupedMap.set(key, appt);
        }
      }
    }

    return Array.from(dedupedMap.values()).sort(
      (a, b) => (b.time || '').localeCompare(a.time || '') || (b._creationTime || 0) - (a._creationTime || 0)
    );
  }, [allAppointments, selectedDate, selectedDoctorFilter]);

  const appointmentsByDate = useMemo(() => {
    if (!allAppointments) return {};
    const acc: Record<string, number> = {};
    for (const a of allAppointments) {
      if (typeof a.date !== 'string') continue;
      acc[a.date] = (acc[a.date] || 0) + 1;
    }
    return acc;
  }, [allAppointments]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !allAppointments) return [];
    const q = searchQuery.toLowerCase().trim();
    return allAppointments
      .filter(a =>
        (typeof a.name === 'string' && a.name.toLowerCase().includes(q)) ||
        (typeof a.phone === 'string' && a.phone.includes(q)) ||
        (typeof (a as any).address === 'string' && (a as any).address.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const da = typeof a.date === 'string' ? a.date : '';
        const db = typeof b.date === 'string' ? b.date : '';
        return db.localeCompare(da); // newest first
      })
      .slice(0, 20);
  }, [searchQuery, allAppointments]);

  const createAppointment = useMutation(api.appointments.create);
  const updateAppointment = useMutation(api.appointments.update);
  const removeAppointment = useMutation(api.appointments.remove);
  const upsertOpdQueueMutation = useMutation(api.opd_queue.upsert);
  const removeOpdQueueMutation = useMutation(api.opd_queue.remove);
  const liveOpdQueue = useQuery(api.opd_queue.list, {});

  const [lastBookedTime, setLastBookedTime] = useState<string>('');

  // Refs for keyboard Enter navigation between fields
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const ageInputRef = React.useRef<HTMLInputElement>(null);
  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const addressInputRef = React.useRef<HTMLInputElement>(null);
  const timeInputRef = React.useRef<HTMLInputElement>(null);
  const doctorSelectRef = React.useRef<HTMLSelectElement>(null);
  const problemInputRef = React.useRef<HTMLInputElement>(null);
  const notesTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const submitButtonRef = React.useRef<HTMLButtonElement>(null);

  // Auto-focus Full Name when appointment modal opens
  React.useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // Enter key handler to quickly jump to the next input field
  const handleEnterNext = (
    e: React.KeyboardEvent,
    nextRef: React.RefObject<HTMLElement | null>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  /**
   * Calculates appointment time starting from current computer system time,
   * automatically exceeding/advancing minute-by-minute if a slot is already taken.
   */
  const getNextAvailableTime = useCallback((dateStr: string, doctorName: string = 'Dr. Vipeen Raut', preferredTime?: string): string => {
    const now = new Date();
    // Default base time is the current computer system time
    let baseMinutes = now.getHours() * 60 + now.getMinutes();

    if (preferredTime) {
      const norm = normalizeAppointmentTime(preferredTime);
      const [hStr, mStr] = norm.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m)) {
        baseMinutes = h * 60 + m;
      }
    } else if (lastBookedTime) {
      const norm = normalizeAppointmentTime(lastBookedTime);
      const [hStr, mStr] = norm.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m)) {
        // If an appointment was booked in this session, start at least 1 min after
        const nextMin = h * 60 + m + 1;
        baseMinutes = Math.max(baseMinutes, nextMin);
      }
    }

    // Collect all booked minute slots on this date for this doctor (excluding cancelled)
    const bookedSlots = new Set<number>();
    if (allAppointments && allAppointments.length > 0) {
      for (const a of allAppointments) {
        if (a.date === dateStr && a.time && a.status !== 'CANCELLED') {
          const aDoc = (a.doctor_name || '').toLowerCase().trim();
          const targetDoc = doctorName.toLowerCase().trim();
          if (aDoc === targetDoc || !a.doctor_name) {
            const norm = normalizeAppointmentTime(a.time);
            const [hStr, mStr] = norm.split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);
            if (!isNaN(h) && !isNaN(m)) {
              bookedSlots.add(h * 60 + m);
            }
          }
        }
      }
    }

    // Auto-exceed / advance while candidate time is already present
    let candidate = baseMinutes;
    let iterations = 0;
    while (bookedSlots.has(candidate) && iterations < 1440) {
      candidate = (candidate + 1) % 1440;
      iterations++;
    }

    const h = Math.floor(candidate / 60);
    const m = candidate % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [allAppointments, lastBookedTime]);

  // Check if current time slot has an existing entry for this doctor on this date
  const isTimeSlotBooked = useMemo(() => {
    if (!formData.time || !allAppointments) return false;
    const norm = normalizeAppointmentTime(formData.time);
    const targetDoc = (formData.doctor_name || '').toLowerCase().trim();
    return allAppointments.some(a => {
      if (editingId && a._id === editingId) return false;
      if (!a.time || a.date !== selectedDate || a.status === 'CANCELLED') return false;
      const aDoc = (a.doctor_name || '').toLowerCase().trim();
      return (aDoc === targetDoc || !a.doctor_name) && normalizeAppointmentTime(a.time) === norm;
    });
  }, [formData.time, formData.doctor_name, selectedDate, allAppointments, editingId]);

  const handleOpenModal = (appt?: any) => {
    if (appt) {
      setEditingId(appt._id);
      setFormData({
        name: appt.name,
        phone: appt.phone,
        age: appt.age !== undefined && appt.age !== null ? String(appt.age) : '',
        address: (appt as any).address || '',
        time: normalizeAppointmentTime(appt.time),
        doctor_name: appt.doctor_name || 'Dr. Vipeen Raut',
        duration_minutes: appt.duration_minutes || 30,
        dental_problem: appt.dental_problem || '',
        notes: appt.notes || '',
      });
    } else {
      setEditingId(null);
      const defaultDoctor = selectedDoctorFilter !== 'ALL' ? selectedDoctorFilter : 'Dr. Vipeen Raut';
      const defaultTime = getNextAvailableTime(selectedDate, defaultDoctor);
      setFormData({
        name: '',
        phone: '',
        age: '',
        address: '',
        time: defaultTime,
        doctor_name: defaultDoctor,
        duration_minutes: 30,
        dental_problem: '',
        notes: '',
      });
    }
    setPatientSearchQuery('');
    setShowPatientDropdown(false);
    setIsModalOpen(true);
  };

  const handleSelectPatient = (p: { name: string; phone: string; age?: string; address?: string }) => {
    setFormData(prev => ({
      ...prev,
      name: p.name,
      phone: p.phone,
      age: p.age || prev.age,
      address: p.address || prev.address,
    }));
    setShowPatientDropdown(false);
    setPatientSearchQuery('');
    setTimeout(() => {
      timeInputRef.current?.focus();
    }, 60);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalTime = normalizeAppointmentTime(formData.time);

      // If time slot is taken, automatically exceed to the next available slot
      if (allAppointments && allAppointments.length > 0) {
        const isTaken = allAppointments.some(a => {
          if (editingId && a._id === editingId) return false;
          if (!a.time || a.date !== selectedDate || a.status === 'CANCELLED') return false;
          const aDoc = (a.doctor_name || '').toLowerCase().trim();
          const targetDoc = (formData.doctor_name || '').toLowerCase().trim();
          return (aDoc === targetDoc || !a.doctor_name) && normalizeAppointmentTime(a.time) === finalTime;
        });
        if (isTaken) {
          finalTime = getNextAvailableTime(selectedDate, formData.doctor_name, finalTime);
        }
      }

      const appointmentPayload = {
        name: formData.name,
        phone: formData.phone,
        age: formData.age.trim() ? (isNaN(Number(formData.age)) ? formData.age.trim() : Number(formData.age.trim())) : undefined,
        address: formData.address.trim() || undefined,
        date: selectedDate,
        time: finalTime,
        doctor_name: formData.doctor_name,
        duration_minutes: formData.duration_minutes,
        dental_problem: formData.dental_problem || undefined,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await updateAppointment({ id: editingId, ...appointmentPayload });
        try {
          let currentQueue: OPDQueueItem[] = [];
          const raw = localStorage.getItem('cortex_opd_queue_v1');
          if (raw) currentQueue = JSON.parse(raw);
          const existingQueueItem = currentQueue.find((q) => q.appointmentId === String(editingId));
          if (existingQueueItem) {
            const updatedItem: OPDQueueItem = {
              ...existingQueueItem,
              name: formData.name.trim(),
              phone: formData.phone.trim(),
              age: formData.age.trim() || existingQueueItem.age,
              address: formData.address.trim() || existingQueueItem.address,
              doctor: formData.doctor_name || existingQueueItem.doctor,
              time: finalTime,
            };
            const updatedQueue = currentQueue.map((q) => (q.id === existingQueueItem.id ? updatedItem : q));
            localStorage.setItem('cortex_opd_queue_v1', JSON.stringify(updatedQueue));
            await upsertOpdQueueMutation(updatedItem as any);
          }
        } catch {}
      } else {
        const newApptId = await createAppointment(appointmentPayload);
        setLastBookedTime(finalTime);

        // DIRECTLY ADD IN WAITING (NO NEED TO CHECK IN IN OPD)
        try {
          const docName = formData.doctor_name || hospitalConfig.doctors[0]?.name || 'Dr. Vipeen Raut';
          const dept = docName.toLowerCase().includes('shillpa')
            ? 'Obstetrics & Gynaecology'
            : 'Orthopaedics & Joint Replacement';
          const isGynae = docName.toLowerCase().includes('shillpa') || dept.toLowerCase().includes('gynaec');
          const sex = isGynae ? 'Female' : 'Male';

          // 1. Resolve Patient UHID & patientId
          let uhid = '';
          let patientId: string | undefined = undefined;
          const cleanPhone = (formData.phone || '').replace(/\D/g, '').slice(0, 10);
          const patientName = formData.name.trim();
          if (cleanPhone) {
            try {
              const pt = await getPatientByPhoneNumber(cleanPhone, patientName);
              if (pt && (!pt.name || pt.name.trim().toLowerCase() === patientName.toLowerCase())) {
                patientId = pt.id;
                uhid = (pt.reference_number || '').replace(/^CH/i, 'CRX');
              } else {
                const newPt = await getOrCreatePatient({
                  name: patientName,
                  phone_number: cleanPhone,
                  age: Number(formData.age) || 0,
                  sex: isGynae ? 'Female' : 'Male',
                  address: formData.address.trim() || undefined,
                });
                if (newPt) {
                  patientId = newPt.id;
                  uhid = (newPt.reference_number || '').replace(/^CH/i, 'CRX');
                }
              }
            } catch (err) {
              console.warn('Could not sync patient in Convex:', err);
            }
          }
          if (!uhid) {
            uhid = `CRX0001`;
          }

          // 2. Calculate next token number for this doctor
          let currentQueue: OPDQueueItem[] = [];
          try {
            const raw = localStorage.getItem('cortex_opd_queue_v1');
            if (raw) currentQueue = JSON.parse(raw);
          } catch {}
          if (Array.isArray(liveOpdQueue)) {
            currentQueue = liveOpdQueue as any;
          }

          const targetDocKey = docName.toLowerCase().replace(/l+/g, 'l');
          const doctorItems = currentQueue.filter((q) => {
            const qDoc = (q.doctor || '').toLowerCase().replace(/l+/g, 'l');
            return qDoc.includes(targetDocKey) || targetDocKey.includes(qDoc);
          });
          const existingTokens = doctorItems
            .map((q) => parseInt(q.token, 10))
            .filter((n) => !isNaN(n) && n > 0);
          const nextToken = existingTokens.length > 0 ? Math.max(...existingTokens) + 1 : 1;
          const tokenNumber = String(nextToken).padStart(2, '0');

          const queueItem: OPDQueueItem = {
            id: `opd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            token: tokenNumber,
            uhid,
            patientId,
            appointmentId: String(newApptId),
            name: formData.name.trim(),
            age: formData.age.trim() || '—',
            ageUnit: 'years',
            sex: sex as any,
            phone: formData.phone.trim(),
            address: formData.address.trim() || '',
            doctor: docName,
            department: dept,
            priority: 'Normal',
            visitType: 'Appointment',
            status: 'Waiting', // DIRECTLY IN WAITING!
            vitals: {},
            consultationFee: 0,
            paymentMode: 'Free / Exempt',
            registeredAt: selectedDate
              ? new Date(`${selectedDate}T${finalTime || '09:00'}:00`).toISOString()
              : new Date().toISOString(),
            time: finalTime,
          };

          // Save to local storage for instant zero-latency UI
          try {
            const raw = localStorage.getItem('cortex_opd_queue_v1');
            const localList = raw ? JSON.parse(raw) : [];
            const updatedLocal = [
              queueItem,
              ...localList.filter((x: any) => x.id !== queueItem.id && x.appointmentId !== String(newApptId)),
            ];
            localStorage.setItem('cortex_opd_queue_v1', JSON.stringify(updatedLocal));
          } catch {}

          // Upsert to Convex database so all other devices see patient in Waiting immediately
          await upsertOpdQueueMutation(queueItem as any);

          // Update appointment status to CONFIRMED
          await updateAppointment({
            id: newApptId,
            status: 'CONFIRMED',
          });
        } catch (queueErr) {
          console.warn('Could not auto-add appointment to OPD waiting queue:', queueErr);
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Error saving appointment: ${err.message}`);
    }
  };

  const handleDelete = async (id: Id<"appointments">) => {
    if (confirm("Are you sure you want to delete this appointment?")) {
      await removeAppointment({ id });
      try {
        const raw = localStorage.getItem("cortex_opd_queue_v1");
        if (raw) {
          const list: OPDQueueItem[] = JSON.parse(raw);
          const queueItem = list.find((q) => q.appointmentId === String(id));
          if (queueItem && queueItem.status === "Waiting") {
            const filtered = list.filter((q) => q.id !== queueItem.id);
            localStorage.setItem("cortex_opd_queue_v1", JSON.stringify(filtered));
            await removeOpdQueueMutation({ queue_id: queueItem.id });
          }
        }
      } catch {}
    }
  };

  // Calendar Helpers
  const nextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));

  const startDay = currentMonthDate.getDay();
  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonthDate);

  const renderCalendar = () => {
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const weekDaysMobile = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className="font-semibold text-center text-gray-500 py-2 uppercase tracking-wider">
          <span className="hidden sm:inline text-sm">{weekDays[i]}</span>
          <span className="sm:hidden text-xs">{weekDaysMobile[i]}</span>
        </div>
      );
    }

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="border border-gray-100 bg-gray-50/50 min-h-[48px] sm:min-h-[100px]"></div>);
    }

    const todayStr = getTodayString();

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const dateString = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
      
      const isSelected = dateString === selectedDate;
      const isToday = dateString === todayStr;
      const count = appointmentsByDate[dateString] || 0;

      days.push(
        <div 
          key={dateString} 
          onClick={() => setSelectedDate(dateString)}
          className={`relative p-1 sm:p-2 border border-gray-100 min-h-[48px] sm:min-h-[100px] cursor-pointer transition-colors group flex flex-col items-center pt-2 sm:pt-3 hover:bg-emerald-50
            ${isSelected ? 'bg-emerald-50/80 border-emerald-200' : 'bg-white'}`}
        >
          <span className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-medium mb-0.5 sm:mb-1
            ${isSelected ? 'bg-emerald-600 text-white shadow-md' : isToday ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 group-hover:text-emerald-600'}`}>
            {i}
          </span>
          {count > 0 && (
            <div className="flex gap-1 mt-0.5 justify-center flex-wrap">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {count} {count === 1 ? 'Appt' : 'Appts'}
              </span>
              <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-green-500"></span>
            </div>
          )}
        </div>
      );
    }

    const totalSlots = startDay + daysInMonth;
    const paddingSlots = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
    for (let i = 0; i < paddingSlots; i++) {
      days.push(<div key={`padding-${i}`} className="border border-gray-100 bg-gray-50/50 min-h-[48px] sm:min-h-[100px]"></div>);
    }

    return (
      <div className="grid grid-cols-7 border-l border-t border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {days}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 sm:mt-8 p-4 flex flex-col gap-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-emerald-600" />
            Appointments
          </h2>
          <p className="text-gray-500 mt-1">Manage patient bookings and schedule</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition shadow-sm flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">{monthName}</h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
              <button onClick={() => setCurrentMonthDate(new Date())} className="px-3 py-1 text-sm font-medium hover:bg-gray-100 rounded-lg text-gray-600 transition">Today</button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
            </div>
          </div>
          {renderCalendar()}
        </div>

        {/* Selected Date Appointments list */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col max-h-[500px] lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] overflow-hidden">
          {/* Panel header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
            {isSearchOpen ? (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400 bg-transparent"
                />
                <button
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-0.5">Schedule</p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 leading-tight">{formatDateForDisplay(selectedDate)}</h3>
                      {appointmentsForDate && appointmentsForDate.length > 0 && (
                        <span className="text-xs font-bold bg-emerald-600 text-white rounded-full px-2 py-0.5">{appointmentsForDate.length}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition shrink-0 mt-1"
                    title="Search appointments"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* Doctor Filter Tabs */}
                <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'Dr. Vipeen Raut', label: 'Dr. Vipeen' },
                    { id: 'Dr. Shillpa Raut', label: 'Dr. Shillpa' },
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDoctorFilter(d.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        selectedDoctorFilter === d.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
            {/* Search results mode */}
            {isSearchOpen && searchQuery.trim() ? (
              searchResults.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Search className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No appointments found</p>
                </div>
              ) : (
                searchResults.map((appt, index) => {
                  const initials = (appt.name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                  const avatarColors = ['bg-emerald-100 text-emerald-700','bg-violet-100 text-violet-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700','bg-cyan-100 text-cyan-700'];
                  const color = avatarColors[index % avatarColors.length];
                  return (
                    <button
                      key={appt._id}
                      onClick={() => {
                        if (typeof appt.date === 'string') {
                          setSelectedDate(appt.date);
                          const d = new Date(appt.date);
                          setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
                        }
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 transition text-left w-full"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {appt.name}
                          {appt.age ? <span className="text-xs text-gray-500 font-normal ml-1">({appt.age} Y)</span> : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {typeof appt.date === 'string' ? formatDate(appt.date) : '—'}
                          </span>
                          {typeof appt.time === 'string' && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{appt.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : isSearchOpen ? (
              <div className="py-10 text-center text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Start typing to search</p>
              </div>
            ) : appointmentsForDate === undefined ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
              </div>
            ) : appointmentsForDate.length === 0 ? (
              <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No appointments for this date.</p>
                <button onClick={() => handleOpenModal()} className="mt-4 text-emerald-600 font-medium hover:underline text-sm">Create one now</button>
              </div>
            ) : (
              appointmentsForDate.map((appt, index) => {
                const initials = (appt.name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                const isGynae = (appt.doctor_name || '').toLowerCase().includes('shillpa');
                const leftAccent = isGynae ? 'border-l-pink-500' : 'border-l-emerald-600';
                const avatarColor = isGynae ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-700';

                return (
                  <div key={appt._id} className={`rounded-xl bg-white border border-slate-200 shadow-xs border-l-4 ${leftAccent} hover:shadow-md transition-all group`}>
                    {/* Top row: time + actions */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-600 tracking-tight">{appt.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(appt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-2xs"
                          title="Edit appointment"
                        >
                          <Pencil className="w-3 h-3 text-emerald-700" />
                          <span>Edit</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(appt._id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Patient info & Doctor */}
                    <div className="flex items-start gap-3 px-4 pb-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${avatarColor}`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                          {appt.name}
                          {appt.age ? <span className="text-xs text-gray-500 font-normal ml-1">({appt.age} Y)</span> : ''}
                        </p>
                        <a href={`tel:${appt.phone}`} className="text-xs text-gray-500 hover:text-emerald-600 transition flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{appt.phone}
                        </a>
                        {(appt as any).address && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate" title={(appt as any).address}>
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{(appt as any).address}</span>
                          </p>
                        )}
                        {appt.doctor_name && (
                          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isGynae
                              ? 'bg-pink-100 text-pink-800 border border-pink-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {appt.doctor_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Problem / Condition tag & Notes */}
                    {(appt.dental_problem || appt.notes) && (
                      <div className="px-4 pb-3 flex flex-col gap-1.5 pt-1 border-t border-gray-50 mt-1">
                        {appt.dental_problem && (
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1 w-fit">
                            <Stethoscope className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{appt.dental_problem}</span>
                          </span>
                        )}
                        {appt.notes && (
                          <p className="text-[11px] text-gray-500 italic truncate" title={appt.notes}>
                            📝 {appt.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {editingId ? 'Edit Appointment' : 'New Appointment'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scheduled for <strong className="text-emerald-700 font-semibold">{selectedDate}</strong> • Direct queue booking
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      required
                      type="text"
                      placeholder="Patient full name"
                      value={formData.name}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, name: val });
                        setPatientSearchQuery(val);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => {
                        if (formData.name && formData.name.length >= 2) {
                          setPatientSearchQuery(formData.name);
                          setShowPatientDropdown(true);
                        }
                      }}
                      onKeyDown={e => handleEnterNext(e, ageInputRef)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-semibold transition"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Age (Yrs)
                    </label>
                    <input
                      ref={ageInputRef}
                      type="text"
                      placeholder="e.g. 35"
                      value={formData.age}
                      onChange={e => setFormData({ ...formData, age: e.target.value })}
                      onKeyDown={e => handleEnterNext(e, phoneInputRef)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-semibold transition"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={phoneInputRef}
                      required
                      type="tel"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, phone: val });
                        setPatientSearchQuery(val);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => {
                        if (formData.phone && formData.phone.length >= 3) {
                          setPatientSearchQuery(formData.phone);
                          setShowPatientDropdown(true);
                        }
                      }}
                      onKeyDown={e => handleEnterNext(e, addressInputRef)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-semibold font-mono transition"
                    />
                  </div>
                </div>

                {/* Debounced previous patient suggestions dropdown */}
                {showPatientDropdown && matchingPatients.length > 0 && (
                  <div
                    ref={patientDropdownRef}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-emerald-300 overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="px-3.5 py-1.5 bg-emerald-50 text-[11px] font-bold text-emerald-800 flex items-center justify-between border-b border-emerald-100">
                      <span>Found {matchingPatients.length} previous patient{matchingPatients.length > 1 ? 's' : ''} (Click to auto-fill)</span>
                      <button
                        type="button"
                        onClick={() => setShowPatientDropdown(false)}
                        className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {matchingPatients.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPatient(p)}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/80 transition flex items-center justify-between group cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900 group-hover:text-emerald-700">{p.name}</span>
                              {p.uhid && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                                  {p.uhid}
                                </span>
                              )}
                              {p.age && (
                                <span className="text-xs text-gray-500 font-medium">
                                  {p.age} yrs
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              <span className="flex items-center gap-1 font-mono text-emerald-700 font-medium">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {p.phone}
                              </span>
                              {p.address && (
                                <span className="flex items-center gap-1 text-slate-600 truncate max-w-[280px]">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {p.address}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition whitespace-nowrap pl-2">
                            Select ↵
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Address / City
                  </label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    placeholder="e.g. Wardha, Maharashtra"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    onKeyDown={e => handleEnterNext(e, timeInputRef)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition"
                  />
                </div>

                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Time</label>
                    {isTimeSlotBooked && (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        Slot Taken
                      </span>
                    )}
                  </div>
                  <input
                    ref={timeInputRef}
                    required
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    onKeyDown={e => handleEnterNext(e, doctorSelectRef)}
                    className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:bg-white font-mono text-sm font-semibold transition ${
                      isTimeSlotBooked ? 'border-amber-400 focus:ring-amber-500' : 'border-gray-200 focus:ring-emerald-500'
                    }`}
                  />
                  {isTimeSlotBooked && (
                    <div className="mt-1 flex items-center justify-between text-[10px] text-amber-700">
                      <span>Booked</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextTime = getNextAvailableTime(selectedDate, formData.doctor_name, formData.time);
                          setFormData(prev => ({ ...prev, time: nextTime }));
                        }}
                        className="font-bold underline hover:text-amber-900 cursor-pointer"
                      >
                        Use next: {getNextAvailableTime(selectedDate, formData.doctor_name, formData.time)}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Consulting Doctor <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: "Dr. Vipeen Raut", title: "Dr. Vipeen Raut", specialty: "Orthopaedics & Joint Replacement Surgeon", color: "emerald" },
                    { name: "Dr. Shillpa Raut", title: "Dr. Shillpa Raut", specialty: "Obstetrics & Gynaecology Specialist", color: "pink" },
                  ].map((doc) => {
                    const isSelected = formData.doctor_name === doc.name;
                    return (
                      <button
                        key={doc.name}
                        type="button"
                        onClick={() => {
                          const nextTime = getNextAvailableTime(selectedDate, doc.name, formData.time);
                          setFormData(prev => ({
                            ...prev,
                            doctor_name: doc.name,
                            time: nextTime,
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? doc.color === 'pink'
                              ? 'bg-pink-50/80 border-pink-400 text-pink-950 shadow-xs ring-1 ring-pink-400'
                              : 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                            : 'bg-gray-50/60 border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? (doc.color === 'pink' ? 'bg-pink-600' : 'bg-emerald-600') : 'bg-gray-400'}`} />
                            {doc.title}
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5">{doc.specialty}</p>
                        </div>
                        {isSelected && (
                          <span className={`text-xs font-bold ${doc.color === 'pink' ? 'text-pink-700' : 'text-emerald-700'}`}>
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Condition / Chief Complaint
                </label>
                <input
                  ref={problemInputRef}
                  type="text"
                  value={formData.dental_problem}
                  onChange={e => setFormData({...formData, dental_problem: e.target.value})}
                  onKeyDown={e => handleEnterNext(e, notesTextareaRef)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition"
                  placeholder="e.g. Knee Pain, Back Pain, Antenatal Checkup, Fracture Follow-up"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Notes / Clinical Remarks
                </label>
                <textarea
                  ref={notesTextareaRef}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (e.ctrlKey || e.metaKey) {
                        return; // Let form submit on Ctrl+Enter
                      }
                      if (!e.shiftKey) {
                        e.preventDefault();
                        submitButtonRef.current?.focus();
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition resize-none"
                  rows={2}
                  placeholder="Additional patient notes, referral source, or instructions..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-sm text-xs transition cursor-pointer"
                >
                  Save Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
