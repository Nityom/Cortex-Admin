'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { usePrescriptionForm } from '@/hooks/usePrescriptionForm';
import {
  PrescriptionPatientBanner,
  PrescriptionSectionsContainer,
  PrescriptionMasterTemplateModals,
  PrescriptionPastVisitsModal,
  PrescriptionPaymentModal,
  PrescriptionLivePreview,
  PrescriptionPrintModal,
  PrescriptionEmailModal,
} from '@/components/prescription';
import { Mail, X } from 'lucide-react';

export default function PrescriptionPage() {
  const form = usePrescriptionForm();

  return (
    <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 lg:p-6 space-y-5">
      {/* Toast Notification */}
      {form.templateToastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{form.templateToastMessage}</span>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto space-y-5">
        <form onSubmit={form.handleSubmit} className="space-y-5">
          {/* 1. Patient Info Banner with Visit Controls & Doctor Selection */}
          <PrescriptionPatientBanner
            formData={form.formData}
            handleChange={form.handleChange}
            handlePhoneNumberChange={form.handlePhoneNumberChange}
            selectedDoctorName={form.selectedDoctorName}
            handleDoctorSelect={form.handleDoctorSelect}
            availableDoctors={form.availableDoctors}
            activeTab={form.activeTab}
            setActiveTab={form.handleTabChange}
            onOpenLoadTemplate={() => {
              form.refreshTemplates();
              form.setIsLoadTemplateModalOpen(true);
            }}
            onOpenSaveTemplate={() => {
              form.setTemplateNameInput(form.formData.de ? `${form.formData.de} Protocol` : '');
              form.setIsSaveTemplateModalOpen(true);
            }}
            onOpenEmailModal={form.handleOpenEmailModal}
          />

          {/* 2. Reorderable Clinical Stack Container with Dedicated Drag Handle & Move Arrows */}
          <PrescriptionSectionsContainer form={form} />
        </form>

        {/* 3. Prescription Live Preview (Below Save & Print Prescription) */}
        <PrescriptionLivePreview
          formData={form.formData}
          patientReferenceNumber={form.formData.reference_number || form.patientReferenceNumber}
          selectedDoctorName={form.selectedDoctorName}
          availableDoctors={form.availableDoctors}
          includeSignature={form.includeSignature}
          medicines={form.medicines}
          handlePrintablePrescription={form.handlePrintablePrescription}
          loading={form.loading}
          saving={form.saving}
          diagnosesList={form.diagnosesList}
          complaintsList={form.complaintsList}
          findingsText={form.findingsText}
          dietExercise={form.dietExercise}
          procedureAdvice={form.procedureAdvice}
          referralDocName={form.referralDocName}
          referralSpeciality={form.referralSpeciality}
          referralPhone={form.referralPhone}
          drawingDataUrl={form.drawingDataUrl}
          bpSystolic={form.bpSystolic}
          bpDiastolic={form.bpDiastolic}
          pulseVal={form.pulseVal}
          heightVal={form.heightVal}
          weightVal={form.weightVal}
          spo2Val={form.spo2Val}
          tempVal={form.tempVal}
          bmiVal={form.bmiVal}
          lmpDate={form.lmpDate}
          eddDate={form.eddDate}
          gestationalWeeks={form.gestationalWeeks}
          gestationalDays={form.gestationalDays}
          rxSectionOrder={form.rxSectionOrder}
          enabledSections={form.enabledPrintSections}
        />

        {/* 4. Master Template Modals */}
        <PrescriptionMasterTemplateModals
          isLoadTemplateModalOpen={form.isLoadTemplateModalOpen}
          setIsLoadTemplateModalOpen={form.setIsLoadTemplateModalOpen}
          savedTemplatesList={form.savedTemplatesList}
          templateCategoryFilter={form.templateCategoryFilter}
          setTemplateCategoryFilter={form.setTemplateCategoryFilter}
          applyPrescriptionTemplate={form.applyPrescriptionTemplate}
          isSaveTemplateModalOpen={form.isSaveTemplateModalOpen}
          setIsSaveTemplateModalOpen={form.setIsSaveTemplateModalOpen}
          templateNameInput={form.templateNameInput}
          setTemplateNameInput={form.setTemplateNameInput}
          templateCategoryInput={form.templateCategoryInput}
          setTemplateCategoryInput={form.setTemplateCategoryInput}
          selectedDoctorName={form.selectedDoctorName}
          formData={form.formData}
          medicines={form.medicines}
          followupCount={form.followupCount}
          followupUnit={form.followupUnit}
          onSaveTemplate={form.handleSavePrescriptionTemplate}
        />

        {/* 4. Past Visits Modal (Triggered by 'View Past' tab) */}
        <PrescriptionPastVisitsModal
          isOpen={form.isPastVisitsModalOpen}
          onClose={() => form.setIsPastVisitsModalOpen(false)}
          patientPhone={form.formData.phoneNumber}
          patientName={form.formData.patientName}
          patientReference={form.formData.reference_number || form.patientReferenceNumber}
          onLoadPastPrescription={form.handleLoadPastPrescription}
        />

        {/* 5. Payment Modal */}
        {form.showPaymentModal && form.currentBill && (
          <PrescriptionPaymentModal
            showPaymentModal={form.showPaymentModal}
            setShowPaymentModal={form.setShowPaymentModal}
            currentBill={form.currentBill}
            paymentDetails={form.paymentDetails}
            setPaymentDetails={form.setPaymentDetails}
            handlePrintBill={form.handlePrintBill}
          />
        )}

        {/* 6. Prescription Print Confirmation & Section Customizer Modal */}
        <PrescriptionPrintModal
          isOpen={form.isPrintModalOpen}
          onClose={() => form.setIsPrintModalOpen(false)}
          onConfirmPrint={form.executePrintPrescription}
          form={form}
        />

        {/* 7. Email Prescription Modal */}
        <PrescriptionEmailModal
          isOpen={form.isEmailModalOpen}
          onClose={() => form.setIsEmailModalOpen(false)}
          data={form.getEmailModalData()}
          onSuccess={() => form.showTemplateToast('Prescription successfully emailed via Hostinger!')}
        />

        {/* 8. Post-Save Quick Email Prompt Banner */}
        {form.emailSuccessPrompt && (
          <div className="fixed bottom-6 right-6 z-40 bg-white border border-teal-200 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="font-extrabold text-slate-900">Prescription Saved!</div>
              <div className="text-slate-500 text-[11px]">Would you like to email this prescription to the patient?</div>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={() => {
                  form.setEmailSuccessPrompt(false);
                  form.handleOpenEmailModal();
                }}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <span>Email Rx</span>
              </button>
              <button
                type="button"
                onClick={() => form.setEmailSuccessPrompt(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
