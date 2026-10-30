'use client';

import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle2, AlertCircle, Loader2, FileText, User } from 'lucide-react';

export interface PrescriptionEmailModalData {
  patientName: string;
  phoneNumber?: string;
  email?: string;
  age?: string | number;
  gender?: string;
  referenceNumber?: string;
  doctorName?: string;
  prescriptionDate?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  medicalHistory?: string;
  findings?: string;
  vitals?: any;
  medicines?: any[];
  advice?: string;
  dietExercise?: string;
  investigation?: string;
  followupDate?: string;
  pdfBase64?: string;
}

interface PrescriptionEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PrescriptionEmailModalData | null;
  onSuccess?: () => void;
}

export default function PrescriptionEmailModal({
  isOpen,
  onClose,
  data,
  onSuccess,
}: PrescriptionEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto populate email when data changes
  React.useEffect(() => {
    if (data?.email) {
      setRecipientEmail(data.email);
    } else {
      setRecipientEmail('');
    }
    setError(null);
    setSuccessMessage(null);
  }, [data, isOpen]);

  if (!isOpen || !data) return null;

  const doctorName = data.doctorName || 'Dr. Vipeen Raut';
  const isGynae = doctorName.toLowerCase().includes('shilpa') || doctorName.toLowerCase().includes('shillpa') || doctorName.toLowerCase().includes('gynae');
  const senderEmail = isGynae ? 'drshillparaut@cortexhospital.com' : 'drvipeenraut@cortexhospital.com';

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/prescriptions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          patientName: data.patientName,
          age: data.age,
          gender: data.gender,
          phoneNumber: data.phoneNumber,
          referenceNumber: data.referenceNumber,
          doctorName: doctorName,
          prescriptionDate: data.prescriptionDate,
          chiefComplaint: data.chiefComplaint,
          diagnosis: data.diagnosis,
          medicalHistory: data.medicalHistory,
          findings: data.findings,
          vitals: data.vitals,
          medicines: data.medicines,
          advice: data.advice,
          dietExercise: data.dietExercise,
          investigation: data.investigation,
          followupDate: data.followupDate,
          pdfBase64: data.pdfBase64,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send email');
      }

      setSuccessMessage(resData.message || `Prescription sent to ${recipientEmail}`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Failed to send prescription email:', err);
      setError(err.message || 'Could not send email. Please check configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 text-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Email Prescription</h3>
              <p className="text-[11px] text-slate-500 font-medium">Deliver digital prescription & PDF directly to patient</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSendEmail} className="p-5 space-y-4">
          {/* Patient & Doctor Snapshot Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Patient:
              </span>
              <span className="font-extrabold text-slate-900">{data.patientName}</span>
            </div>

            {data.referenceNumber && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">UHID / Ref:</span>
                <span className="font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded text-[11px]">
                  {data.referenceNumber.replace(/^CH/i, 'CRX')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-semibold">Attending Doctor:</span>
              <span className="font-bold text-slate-800">{doctorName}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Sending From:</span>
              <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {senderEmail}
              </span>
            </div>
          </div>

          {/* Recipient Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Patient Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition shadow-2xs"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500">
              The prescription summary and attached PDF will be dispatched from <strong>{senderEmail}</strong>.
            </p>
          </div>

          {/* Email Features Summary Badges */}
          <div className="space-y-1.5 pt-1">
            {/* Obstetrics & Antenatal Record badge for Dr. Shillpa Raut */}
            {isGynae && (data.vitals?.lmp || data.vitals?.edd || data.vitals?.gestational_age) && (
              <div className="flex items-center gap-2 p-2 bg-pink-50 border border-pink-200 rounded-lg text-xs text-pink-900">
                <span className="text-pink-600 font-bold shrink-0">🌸 Antenatal:</span>
                <span>Includes <strong>Obstetrics Record</strong> (LMP • EDD • Gestational Age).</span>
              </div>
            )}

            {/* PDF attachment indicator */}
            <div className="flex items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900">
              <span className="text-emerald-700 font-bold shrink-0">📎 Attachment:</span>
              <span>Signed prescription PDF with hospital letterhead and doctor signature.</span>
            </div>

            {/* Medicines preview count */}
            {data.medicines && data.medicines.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-teal-50/70 border border-teal-200 rounded-lg text-xs text-teal-900">
                <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Includes <strong>{data.medicines.length} prescribed medicines</strong> with Marathi timing instructions.</span>
              </div>
            )}
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1 font-bold">{successMessage}</div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !recipientEmail}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Prescription Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

