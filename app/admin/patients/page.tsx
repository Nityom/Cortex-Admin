'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAllPrescriptions, Prescription as PrescriptionType, deletePrescription } from '@/services/prescription';
import { deletePatient, getPatients, migratePatientsToCRX } from '@/services/patients';
import { getAll as getAllBills } from '@/services/bills';
import { Patient } from '@/types/patient';
import Link from 'next/link';
import { Alert } from "@/components/ui/alert";
import PrescriptionHistory from "@/components/PrescriptionHistory";
import { useIsAdmin } from '@/hooks/use-is-admin';
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  FileText,
  Filter,
  User,
  Calendar,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import PrescriptionEmailModal, { PrescriptionEmailModalData } from '@/components/prescription/PrescriptionEmailModal';
import { hospitalConfig } from '@/config/hospital';

// Group prescriptions by patient name to create a patient list
interface Bill {
  id: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
  reference_number?: string;
  prescription_id?: string;
  patient_name?: string;
  phone_number?: string;
  items?: any[];
  notes?: string;
}

interface PrescriptionWithBill extends PrescriptionType {
  bills?: Bill[];
}

interface PatientWithPrescriptions extends Patient {
  latestVisit: string;
  totalVisits: number;
  prescriptions: PrescriptionWithBill[];
  reference_number?: string;
}

const ViewPatients = () => {
  const [patients, setPatients] = useState<PatientWithPrescriptions[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientWithPrescriptions[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<'All' | 'Dr. Vipeen Raut' | 'Dr. Shillpa Raut'>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PatientWithPrescriptions | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const { isAdmin } = useIsAdmin();
  const patientsPerPage = 10;

  // Email Prescription Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalData, setEmailModalData] = useState<PrescriptionEmailModalData | null>(null);
  const [emailToast, setEmailToast] = useState<string | null>(null);

  const handleEmailPatientRx = (patient: PatientWithPrescriptions, rx?: any) => {
    const targetRx = rx || patient.prescriptions?.[0];
    if (!targetRx) {
      setAlertMessage({ type: 'error', message: 'No prescription available to email for this patient.' });
      return;
    }

    let rawMeds = [];
    if (Array.isArray(targetRx.medicines)) {
      rawMeds = targetRx.medicines;
    } else if (typeof targetRx.medicines === 'string') {
      try {
        rawMeds = JSON.parse(targetRx.medicines || '[]');
      } catch { }
    }

    const rawVitals = typeof targetRx.vitals === 'object' ? targetRx.vitals : {};

    setEmailModalData({
      patientName: patient.name,
      phoneNumber: patient.phone_number,
      email: (patient as any).email || '',
      age: patient.age,
      gender: patient.sex,
      referenceNumber: (patient.reference_number || targetRx.reference_number || '').replace(/^CH/i, 'CRX'),
      doctorName: targetRx.doctor_name || 'Dr. Vipeen Raut',
      prescriptionDate: targetRx.prescription_date || targetRx.date,
      chiefComplaint: targetRx.chief_complaint || targetRx.cc,
      diagnosis: targetRx.diagnosis || targetRx.de,
      medicalHistory: targetRx.medical_history || targetRx.mh,
      findings: targetRx.findings || targetRx.clinical_findings,
      advice: targetRx.advice,
      dietExercise: targetRx.diet_exercise,
      investigation: targetRx.investigation,
      followupDate: targetRx.followup_date,
      medicines: rawMeds,
      vitals: rawVitals,
    });
    setEmailModalOpen(true);
  };

  // Helper to extract doctors associated with a patient
  const getPatientDoctors = useCallback((patient: PatientWithPrescriptions): string[] => {
    const docs = new Set<string>();
    if (patient.prescriptions && patient.prescriptions.length > 0) {
      patient.prescriptions.forEach((p) => {
        const doc = (p.doctor_name || '').toLowerCase();
        if (doc.includes('shilpa') || doc.includes('shillpa') || doc.includes('gynae')) {
          docs.add('Dr. Shillpa Raut');
        } else {
          docs.add('Dr. Vipeen Raut');
        }
      });
    } else {
      docs.add('Dr. Vipeen Raut');
    }
    return Array.from(docs);
  }, []);

  const getPatientLatestDoctor = useCallback((patient: PatientWithPrescriptions): string => {
    const latestRx = patient.prescriptions?.[0];
    if (latestRx?.doctor_name) {
      const doc = latestRx.doctor_name.toLowerCase();
      if (doc.includes('shilpa') || doc.includes('shillpa') || doc.includes('gynae')) {
        return 'Dr. Shillpa Raut';
      }
    }
    return 'Dr. Vipeen Raut';
  }, []);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      // Get prescriptions with bills included
      console.log('Fetching prescriptions...');
      const prescriptions = await getAllPrescriptions();
      if (!prescriptions) {
        throw new Error('No prescriptions data received');
      }
      console.log(`Fetched ${prescriptions.length} prescriptions`);

      // Fetch all bills and create lookup maps by prescription_id and reference_number
      let billsByPrescriptionId = new Map<string, Bill[]>();
      let billsByReferenceNumber = new Map<string, Bill[]>();
      try {
        const allBills = await getAllBills();
        allBills.forEach((bill: any) => {
          const billItem: Bill = {
            id: bill.id || bill._id,
            total_amount: bill.total_amount,
            paid_amount: bill.paid_amount,
            balance_amount: bill.balance_amount !== undefined ? bill.balance_amount : (bill.total_amount - bill.paid_amount),
            payment_status: bill.payment_status || (bill.paid_amount >= bill.total_amount ? 'PAID' : bill.paid_amount > 0 ? 'PARTIAL' : 'PENDING'),
            created_at: bill.created_at || (bill._creationTime ? new Date(bill._creationTime).toISOString() : '') || '',
            reference_number: bill.reference_number,
            items: bill.items,
            notes: bill.notes,
            patient_name: bill.patient_name,
            phone_number: bill.phone_number,
          };

          if (bill.prescription_id && bill.prescription_id !== 'OPD_DIRECT') {
            const existing = billsByPrescriptionId.get(bill.prescription_id) || [];
            existing.push(billItem);
            billsByPrescriptionId.set(bill.prescription_id, existing);
          }

          if (bill.reference_number) {
            const existingRef = billsByReferenceNumber.get(bill.reference_number) || [];
            existingRef.push(billItem);
            billsByReferenceNumber.set(bill.reference_number, existingRef);
          }
        });
        console.log(`Fetched ${allBills.length} bills`);
      } catch (billError) {
        console.error('Error fetching bills:', billError);
        // Continue without bills rather than failing
      }

      // Attach bills to prescriptions: each visit has strictly ONE primary bill
      const prescriptionsWithBills: PrescriptionWithBill[] = prescriptions.map(p => {
        const directBills = p.id ? billsByPrescriptionId.get(p.id) || [] : [];
        const refBills = (p.reference_number ? billsByReferenceNumber.get(p.reference_number) : []) || [];

        let primaryBill: Bill | null = null;

        if (directBills.length > 0) {
          // If a bill is directly linked to this prescription, sort so the paid or most up-to-date bill is first
          directBills.sort((a, b) => {
            if (a.payment_status === 'PAID' && b.payment_status !== 'PAID') return -1;
            if (b.payment_status === 'PAID' && a.payment_status !== 'PAID') return 1;
            return (b.paid_amount || 0) - (a.paid_amount || 0);
          });
          primaryBill = directBills[0];
        } else {
          // Otherwise, match OPD bill created for this patient on this visit date
          const pDate = p.prescription_date?.split('T')[0];
          const sameDayRefBills = refBills.filter((b) => {
            const bDate = b.created_at?.split('T')[0];
            return bDate === pDate;
          });
          if (sameDayRefBills.length > 0) {
            sameDayRefBills.sort((a, b) => {
              if (a.payment_status === 'PAID' && b.payment_status !== 'PAID') return -1;
              if (b.payment_status === 'PAID' && a.payment_status !== 'PAID') return 1;
              return (b.paid_amount || 0) - (a.paid_amount || 0);
            });
            primaryBill = sameDayRefBills[0];
          }
        }

        return {
          ...p,
          bills: primaryBill ? [primaryBill] : [],
        };
      });

      const patientMap = new Map<string, PatientWithPrescriptions>();

      // First, get all patients from the database
      console.log('Fetching patients...');
      migratePatientsToCRX().catch(() => { });
      const dbPatients = await getPatients();
      if (!dbPatients) {
        throw new Error('No patients data received');
      }
      console.log(`Fetched ${dbPatients.length} patients`);

      const dbPatientMap = new Map(dbPatients.map(p => [p.phone_number, p]));

      // Group prescriptions by phone_number, falling back to name if phone is not available
      prescriptionsWithBills.forEach(prescription => {
        const key = prescription.phone_number || `name:${prescription.patient_name}`;

        if (!patientMap.has(key)) {
          // Try to find existing patient in database
          const existingPatient = prescription.phone_number ? dbPatientMap.get(prescription.phone_number) : null;
          patientMap.set(key, {
            id: existingPatient?.id || 'TMP-' + Math.random().toString(36).substring(2, 7), // Use DB ID if exists, or create a temporary ID
            reference_number: existingPatient?.reference_number,
            name: prescription.patient_name,
            phone_number: prescription.phone_number || 'Unknown',
            age: parseInt(prescription.age, 10),
            sex: prescription.sex,
            latestVisit: prescription.prescription_date,
            totalVisits: 1,
            prescriptions: [prescription],
            created_at: existingPatient?.created_at,
            updated_at: existingPatient?.updated_at
          });
        } else {
          const patient = patientMap.get(key)!;
          patient.totalVisits += 1;
          patient.prescriptions.push(prescription);

          // Update latest visit date if this prescription is newer
          if (new Date(prescription.prescription_date) > new Date(patient.latestVisit)) {
            patient.latestVisit = prescription.prescription_date;
            patient.age = parseInt(prescription.age, 10);
            patient.name = prescription.patient_name;

            if (prescription.phone_number && patient.phone_number === 'Unknown') {
              patient.phone_number = prescription.phone_number;
              // Update patient ID if we find a matching patient in the database
              const existingPatient = dbPatientMap.get(prescription.phone_number); if (existingPatient) {
                patient.id = existingPatient.id;
                patient.reference_number = existingPatient.reference_number;
                patient.created_at = existingPatient.created_at;
                patient.updated_at = existingPatient.updated_at;
              }
            }
          }

          patientMap.set(key, patient);
        }
      });
      // Convert map to array and sort by reference number
      const patientList = Array.from(patientMap.values()).sort((a, b) => {
        // Put patients without reference numbers at the end
        if (!a.reference_number && !b.reference_number) return 0;
        if (!a.reference_number) return 1;
        if (!b.reference_number) return -1;

        // Sort by reference number (TS01, TS02, etc.)
        return a.reference_number.localeCompare(b.reference_number);
      });

      setPatients(patientList);
      setFilteredPatients(patientList);
    } catch (err) {
      console.error('Failed to fetch patient data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load patient data: ${errorMessage}. Please try again.`);

      // Log detailed error information for debugging
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    // Filter patients when search term or doctor filter changes
    let result = patients;

    if (selectedDoctorFilter !== 'All') {
      result = result.filter(patient => {
        const docs = getPatientDoctors(patient);
        return docs.includes(selectedDoctorFilter);
      });
    }

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(patient =>
        patient.name.toLowerCase().includes(searchLower) ||
        patient.phone_number.includes(searchTerm) ||
        (patient.reference_number && patient.reference_number.toLowerCase().includes(searchLower))
      );
    }

    setFilteredPatients(result);
    setCurrentPage(1); // Reset to first page on new search or filter change
  }, [searchTerm, selectedDoctorFilter, patients, getPatientDoctors]);

  const orthoCount = useMemo(() => {
    return patients.filter((p) => getPatientDoctors(p).includes('Dr. Vipeen Raut')).length;
  }, [patients, getPatientDoctors]);

  const gynaeCount = useMemo(() => {
    return patients.filter((p) => getPatientDoctors(p).includes('Dr. Shillpa Raut')).length;
  }, [patients, getPatientDoctors]);

  const filteredConsultationsCount = useMemo(() => {
    return filteredPatients.reduce((sum, patient) => {
      if (selectedDoctorFilter === 'All') return sum + patient.totalVisits;
      const docRxCount = patient.prescriptions.filter((p) => {
        const d = (p.doctor_name || '').toLowerCase();
        if (selectedDoctorFilter === 'Dr. Shillpa Raut') {
          return d.includes('shilpa') || d.includes('shillpa');
        }
        return !d.includes('shilpa') && !d.includes('shillpa');
      }).length;
      return sum + (docRxCount || 1);
    }, 0);
  }, [filteredPatients, selectedDoctorFilter]);

  const monthlyPatientsCount = useMemo(() => {
    const today = new Date();
    return filteredPatients.filter(patient => {
      const visitDate = new Date(patient.latestVisit);
      return visitDate.getMonth() === today.getMonth() &&
        visitDate.getFullYear() === today.getFullYear();
    }).length;
  }, [filteredPatients]);

  const handleDelete = async (patient: PatientWithPrescriptions) => {
    if (window.confirm('Are you sure you want to delete this patient and all their prescriptions? This action cannot be undone.')) {
      try {
        setLoading(true); // Show loading state while deleting

        // First delete all prescriptions for this patient
        const deletePromises = patient.prescriptions
          .filter(prescription => prescription.id)
          .map(prescription => deletePrescription(prescription.id!));

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }

        // Then delete the patient if it actually exists in the DB
        // Sometimes patients only exist in prescriptions and have a TMP- ID in the UI
        if (patient.id && !patient.id.toString().startsWith('TMP-')) {
          await deletePatient(patient.id);
        }

        // Add a small delay to ensure database operations are complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh the patient list
        await fetchPatients();

        // Clear any existing error messages
        setError(null);
      } catch (err) {
        console.error('Failed to delete patient:', err);
        setError('Failed to delete patient. Please try again.');
      } finally {
        setLoading(false); // Hide loading state
      }
    }
  };

  const openPatientDetails = (patient: PatientWithPrescriptions) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Pagination
  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="relative">
      {alertMessage && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className={alertMessage.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'}>
            {alertMessage.message}
          </Alert>
        </div>
      )}

      <div className="w-full max-w-[1440px] mx-auto mt-3 sm:mt-6 px-2 sm:px-4 lg:px-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Patient Directory &amp; Records</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {patients.length} Total
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {hospitalConfig.legalName} • Patient Directory
            </p>
          </div>
        </div>

        {/* Doctor Filter, Search & Zoom Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <input
              type="text"
              placeholder="Search patient, phone, UHID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/60"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Doctor Filter Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase px-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Doctor:</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDoctorFilter('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${selectedDoctorFilter === 'All'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              <span>All Doctors</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedDoctorFilter === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                {patients.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDoctorFilter('Dr. Vipeen Raut')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${selectedDoctorFilter === 'Dr. Vipeen Raut'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
            >
              <span>Dr. Vipeen Raut</span>
              <span className="text-[10px] opacity-80">(Ortho)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedDoctorFilter === 'Dr. Vipeen Raut' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                {orthoCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDoctorFilter('Dr. Shillpa Raut')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${selectedDoctorFilter === 'Dr. Shillpa Raut'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-700 hover:bg-pink-50'
                }`}
            >
              <span>Dr. Shillpa Raut</span>
              <span className="text-[10px] opacity-80">(Gynae)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedDoctorFilter === 'Dr. Shillpa Raut' ? 'bg-white/25 text-white' : 'bg-pink-100 text-pink-800'
                }`}>
                {gynaeCount}
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/prescription">
              <button className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>New Patient</span>
              </button>
            </Link>

            <button
              onClick={() => fetchPatients()}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="bg-blue-50/80 p-4 sm:p-5 rounded-xl border border-blue-200/80 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
              {selectedDoctorFilter === 'All' ? 'Total Patients' : `${selectedDoctorFilter} Patients`}
            </h4>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-700">{filteredPatients.length}</p>
              {selectedDoctorFilter !== 'All' && (
                <span className="text-xs text-blue-600 font-bold">of {patients.length} total</span>
              )}
            </div>
          </div>

          <div className="bg-purple-50/80 p-4 sm:p-5 rounded-xl border border-purple-200/80 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-1">
              Consultations ({selectedDoctorFilter === 'All' ? 'All' : selectedDoctorFilter.replace('Dr. ', '')})
            </h4>
            <p className="text-2xl sm:text-3xl font-black text-purple-700">
              {filteredConsultationsCount}
            </p>
          </div>

          <div className="bg-emerald-50/80 p-4 sm:p-5 rounded-xl border border-emerald-200/80 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
              Patients This Month
            </h4>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700">
              {monthlyPatientsCount}
            </p>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-xs font-bold text-slate-600">Loading patient directory...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600">
              <p className="font-bold text-sm">{error}</p>
              <button
                onClick={() => fetchPatients()}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-semibold text-sm">
                No patients found {selectedDoctorFilter !== 'All' ? `for ${selectedDoctorFilter}` : ''}.
              </p>
              {searchTerm && <p className="text-xs text-slate-400 mt-1">Try clearing your search term.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/90 text-slate-700">
                  <tr>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider">Ref. No.</th>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider">Patient Name</th>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider">Phone</th>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider">Age / Gender</th>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider">Attending Doctor</th>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider">Last Visit</th>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-center">Visits</th>
                    <th className="px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {currentPatients.map((patient) => {
                    const doctors = getPatientDoctors(patient);
                    const latestDoc = getPatientLatestDoctor(patient);

                    return (
                      <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Reference No */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {(patient.reference_number || '-').replace(/^CH/i, 'CRX')}
                          </span>
                        </td>

                        {/* Patient Name */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-extrabold text-sm text-slate-900">{patient.name}</div>
                          {patient.email && <div className="text-[11px] text-slate-400">{patient.email}</div>}
                        </td>

                        {/* Phone Number */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs font-semibold text-slate-700 font-mono">
                          {patient.phone_number || '—'}
                        </td>

                        {/* Age & Sex */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs text-slate-700">
                          <span className="font-bold">{patient.age || '—'} Y</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="font-medium text-slate-600">{patient.sex || 'Male'}</span>
                        </td>

                        {/* Attending Doctor */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {doctors.map((d) => {
                              const isGynae = d.toLowerCase().includes('shilpa') || d.toLowerCase().includes('shillpa');
                              return (
                                <span
                                  key={d}
                                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${isGynae
                                      ? 'bg-pink-50 text-pink-700 border-pink-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isGynae ? 'bg-pink-500' : 'bg-blue-500'}`} />
                                  <span>{d}</span>
                                  <span className="text-[9.5px] opacity-75">{isGynae ? '(Gynae)' : '(Ortho)'}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Last Visit */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                          {formatDate(patient.latestVisit)}
                        </td>

                        {/* Total Visits */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-center">
                          <span className="inline-block text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            {patient.totalVisits}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => openPatientDetails(patient)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition flex items-center justify-center shadow-2xs cursor-pointer"
                              title={`View details for ${patient.name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <Link
                              href={`/admin/prescription?patientName=${encodeURIComponent(patient.name)}&phoneNumber=${encodeURIComponent(patient.phone_number)}&phone=${encodeURIComponent(patient.phone_number)}&reference_number=${encodeURIComponent((patient.reference_number || '').replace(/^CH/i, 'CRX'))}&uhid=${encodeURIComponent((patient.reference_number || '').replace(/^CH/i, 'CRX'))}&age=${patient.age}&sex=${patient.sex}&doctorName=${encodeURIComponent(latestDoc)}&medicalHistory=${encodeURIComponent(patient.prescriptions[0]?.medical_history || '')}`}
                            >
                              <button
                                type="button"
                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center justify-center shadow-2xs cursor-pointer"
                                title={`New prescription for ${patient.name} with ${latestDoc}`}
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </Link>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDelete(patient)}
                                className="p-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer flex items-center justify-center"
                                title="Delete patient and records"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filteredPatients.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstPatient + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastPatient, filteredPatients.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredPatients.length}</span> patients
                </div>

                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    const pageNum = currentPage <= 3
                      ? idx + 1
                      : currentPage >= totalPages - 2
                        ? totalPages - 4 + idx
                        : currentPage - 2 + idx;

                    if (pageNum > 0 && pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* Patient Details Modal */}
        {isModalOpen && selectedPatient && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div
                className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                {/* Modal Header */}
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white" id="modal-headline">
                    Patient Details
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-white hover:text-gray-300 focus:outline-none"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-blue-800 mb-3">Patient Information</h4>
                        <div className="space-y-2">
                          <p><span className="font-medium">Name:</span> {selectedPatient.name}</p>
                          <p><span className="font-medium">Phone:</span> {selectedPatient.phone_number}</p>
                          {selectedPatient.email && (
                            <p><span className="font-medium">Email:</span> {selectedPatient.email}</p>
                          )}
                          <p><span className="font-medium">Age:</span> {selectedPatient.age}</p>
                          <p><span className="font-medium">Sex:</span> {selectedPatient.sex}</p>
                          <p><span className="font-medium">Latest Visit:</span> {formatDate(selectedPatient.latestVisit)}</p>
                          <p><span className="font-medium">Total Visits:</span> {selectedPatient.totalVisits}</p>
                        </div>
                      </div>                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-purple-800 mb-3">Medical Summary</h4>
                        <div className="space-y-2">
                          <p><span className="font-medium">Last Diagnoses:</span> {selectedPatient.prescriptions[0]?.diagnosis || 'N/A'}</p>
                          <p><span className="font-medium">Medical History:</span> {selectedPatient.prescriptions[0]?.medical_history || 'N/A'}</p>
                          <p><span className="font-medium">Last Follow-up Date:</span> {selectedPatient.prescriptions[0]?.prescription_date ? formatDate(selectedPatient.prescriptions[0].prescription_date) : 'N/A'}</p>

                          {/* Payment Summary Section */}
                          <div className="mt-6 p-4 bg-white rounded-lg border border-purple-200">
                            <h5 className="text-md font-semibold text-purple-800 mb-3">Payment Summary</h5>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-600">Total Paid Amount:</span>
                                <span className="text-green-600 font-semibold">₹{selectedPatient.prescriptions.reduce((total, p) => {
                                  const bill = p.bills?.[0];
                                  return total + (bill?.paid_amount || 0);
                                }, 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-600">Total Pending Amount:</span>
                                <span className="text-red-600 font-semibold">₹{selectedPatient.prescriptions.reduce((total, p) => {
                                  const bill = p.bills?.[0];
                                  if (!bill) return total;
                                  const pending = bill.balance_amount !== undefined
                                    ? bill.balance_amount
                                    : Math.max(0, (bill.total_amount || 0) - (bill.paid_amount || 0));
                                  return total + (pending > 0 ? pending : 0);
                                }, 0).toFixed(2)}</span>
                              </div>
                              {/* Print All Bills button */}
                              {(() => {
                                const allIds = Array.from(
                                  new Set(
                                    selectedPatient.prescriptions
                                      .map((p) => p.bills?.[0]?.id || (p.bills?.[0] as any)?._id)
                                      .filter(Boolean)
                                  )
                                ) as string[];
                                return allIds.length > 0 ? (
                                  <div className="pt-2 border-t border-purple-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const params = new URLSearchParams({
                                          billIds: allIds.join(','),
                                          signature: 'sign.png',
                                          doctorName: 'Dr. Vipeen Raut',
                                        });
                                        window.open(`/print-bill/statement?${params.toString()}`, '_blank');
                                      }}
                                      className="w-full inline-flex justify-center items-center gap-2 rounded-md px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                      </svg>
                                      Print All Bills ({allIds.length})
                                    </button>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prescription History */}
                  <PrescriptionHistory
                    prescriptions={selectedPatient.prescriptions}
                    isAdmin={isAdmin}
                    onDelete={async (prescriptionId) => {
                      try {
                        // Skip database deletion for temporary IDs (only existing in UI)
                        if (!prescriptionId.toString().startsWith('TMP-')) {
                          await deletePrescription(prescriptionId);
                        }
                        const updatedPrescriptions = selectedPatient.prescriptions.filter(p => p.id !== prescriptionId);
                        setSelectedPatient({
                          ...selectedPatient,
                          prescriptions: updatedPrescriptions,
                          totalVisits: selectedPatient.totalVisits - 1
                        });
                        setPatients(prevPatients =>
                          prevPatients.map(p =>
                            p.id === selectedPatient.id
                              ? {
                                ...p,
                                prescriptions: updatedPrescriptions,
                                totalVisits: p.totalVisits - 1
                              }
                              : p
                          )
                        );
                      } catch (error) {
                        console.error('Failed to delete prescription:', error);
                        setError('Failed to delete prescription. Please try again.');
                      }
                    }}
                  />

                  {/* Modal Footer */}
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse flex-wrap gap-2">
                    {selectedPatient.prescriptions && selectedPatient.prescriptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleEmailPatientRx(selectedPatient, selectedPatient.prescriptions[0])}
                        className="w-full inline-flex justify-center items-center gap-1.5 rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-700 text-base font-medium text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email Latest Rx</span>
                      </button>
                    )}
                    <Link href={`/admin/prescription?patientName=${encodeURIComponent(selectedPatient.name)}&phoneNumber=${encodeURIComponent(selectedPatient.phone_number)}&phone=${encodeURIComponent(selectedPatient.phone_number)}&reference_number=${encodeURIComponent((selectedPatient.reference_number || '').replace(/^CH/i, 'CRX'))}&uhid=${encodeURIComponent((selectedPatient.reference_number || '').replace(/^CH/i, 'CRX'))}&age=${selectedPatient.age}&sex=${selectedPatient.sex}&medicalHistory=${encodeURIComponent(selectedPatient.prescriptions[0]?.medical_history || '')}`}>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Create New Prescription
                      </button>
                    </Link>
                    {(() => {
                      const allBillIds = Array.from(
                        new Set(
                          selectedPatient.prescriptions
                            .map((p) => p.bills?.[0]?.id || (p.bills?.[0] as any)?._id)
                            .filter(Boolean)
                        )
                      ) as string[];
                      return allBillIds.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({
                              billIds: allBillIds.join(','),
                              signature: 'sign.png',
                              doctorName: 'Dr. Vipeen Raut',
                            });
                            window.open(`/print-bill/statement?${params.toString()}`, '_blank');
                          }}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          Print All Bills ({allBillIds.length})
                        </button>
                      ) : null;
                    })()}
                    <button
                      type="button"
                      onClick={closeModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Message */}
        {alertMessage && (
          <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-md p-4 transition-all duration-300 ease-in-out ${alertMessage.type === 'error' ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'}`} role="alert">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {alertMessage.type === 'error' ? (
                  <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2l4 -4m0 0l2 -2l-6 6l-2 2l4 -4z" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${alertMessage.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                  {alertMessage.message}
                </p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setAlertMessage(null)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Toast */}
        {emailToast && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{emailToast}</span>
          </div>
        )}

        {/* Prescription Email Modal */}
        <PrescriptionEmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          data={emailModalData}
          onSuccess={() => {
            setEmailToast('Prescription sent via Hostinger!');
            setTimeout(() => setEmailToast(null), 3000);
          }}
        />
      </div>
    </div>
  );
};

export default ViewPatients;
