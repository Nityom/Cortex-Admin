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
  PrescriptionPastVisitsDashboard,
} from '@/components/prescription';
import { Mail, X } from 'lucide-react';

export default function PrescriptionPage() {
  const form = usePrescriptionForm();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isLoading = !mounted || form.isCheckingHistory;

  return (
    <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 lg:p-6 space-y-5">
      {/* Toast Notification */}
      {form.templateToastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{form.templateToastMessage}</span>
        </div>
      )}

      {/* Main Layout Container: Loading Skeleton, Past Visits Dashboard, or Active Prescription Form */}
      {isLoading ? (
        <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-150">
          {/* Top Patient Banner Skeleton */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      {form.formData.patientName || 'Loading Patient Consultation...'}
                    </span>
                    {form.formData.age && (
                      <span className="text-sm font-bold text-slate-500">
                        ({form.formData.age} Y, {form.formData.sex})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Opening consultation records and previous prescription history...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Checking Past Records
                </span>
              </div>
            </div>
          </div>

          {/* Action Card Skeleton */}
          <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-52 h-12 rounded-xl bg-slate-200 animate-pulse mx-auto" />
            <div className="w-72 h-4 bg-slate-200/70 rounded-md animate-pulse mx-auto" />
          </div>

          {/* Past Visits Skeleton Layout */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
              <div className="w-24 h-7 bg-slate-200 rounded-lg animate-pulse" />
            </div>
            <div className="flex flex-col md:flex-row min-h-[360px]">
              <div className="w-full md:w-44 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/40 p-3 space-y-2 shrink-0">
                <div className="w-16 h-3 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="h-14 bg-slate-200/80 rounded-xl animate-pulse" />
                <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="flex-1 p-5 sm:p-6 space-y-4 bg-white">
                <div className="w-64 h-6 bg-slate-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                </div>
                <div className="h-32 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="w-full h-6 bg-slate-100 rounded animate-pulse" />
                  <div className="w-full h-6 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : form.showPastDashboard && form.pastVisitsList && form.pastVisitsList.length > 0 ? (
        <PrescriptionPastVisitsDashboard
          patientName={form.formData.patientName}
          patientAge={form.formData.age}
          patientSex={form.formData.sex}
          patientPhone={form.formData.phoneNumber}
          patientReference={form.formData.reference_number || form.patientReferenceNumber}
          pastVisits={form.pastVisitsList}
          selectedVisit={form.selectedPastVisit}
          onSelectVisit={form.setSelectedPastVisit}
          onCreateNewVisit={form.handleCreateNewVisit}
          onCloseDashboard={() => form.setShowPastDashboard(false)}
          selectedDoctorName={form.selectedDoctorName}
          handleDoctorSelect={form.handleDoctorSelect}
          availableDoctors={form.availableDoctors}
          onOpenEmailModal={form.handleOpenEmailModal}
          onPrintPastVisit={form.handlePrintPastVisit}
        />
      ) : (
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
            isNewPatient={form.isNewPatient}
            setRepeatPatient={form.setRepeatPatient}
            consultationCharge={form.consultationCharge}
            onOpenLoadTemplate={() => {
              form.refreshTemplates();
              form.setIsLoadTemplateModalOpen(true);
            }}
            onOpenSaveTemplate={() => {
              const diag =
                form.formData.de ||
                (form.diagnosesList && form.diagnosesList.length > 0
                  ? form.diagnosesList.map((d: any) => d.diagnosis).filter(Boolean).join(', ')
                  : '');
              form.setTemplateNameInput(diag ? `${diag} Protocol` : '');
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
          drNotes={form.drNotes}
          investigationText={form.investigationText}
          testsRequested={form.testsRequested}
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
          diagnosesList={form.diagnosesList}
          testsRequested={form.testsRequested}
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
        </div>
      )}

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
        data={form.emailModalCustomData || form.getEmailModalData()}
        onSuccess={() => form.showTemplateToast('Prescription successfully emailed via Hostinger!')}
      />

      {/* 8. Post-Save Quick Email Prompt Banner */}
      {form.emailSuccessPrompt && (
        <div className="fixed bottom-6 right-6 z-40 bg-white border border-emerald-200 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
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
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
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
  );
}
