'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  ChevronUp,
  PenTool,
  Activity,
  User,
  Stethoscope,
  ClipboardList,
  Pill,
  BookOpen,
  Calendar,
  History,
  Layers,
  FileCheck,
} from 'lucide-react';
import {
  PrescriptionHistorySection,
  PrescriptionComplaintsSection,
  PrescriptionFindingsSection,
  PrescriptionVitalsSection,
  PrescriptionDiagnosisSection,
  PrescriptionProcedureSection,
  PrescriptionNextVisitSection,
  PrescriptionClinicalNotesSection,
  PrescriptionDoctorSignatureCard,
} from '@/components/prescription';
import HealthPlixMedicineTable from '@/components/HealthPlixMedicineTable';
import HealthPlixDrawingBoard from '@/components/HealthPlixDrawingBoard';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';

export type PrescriptionSectionKey =
  | 'vitals'
  | 'history'
  | 'complaints'
  | 'findings'
  | 'diagnosis'
  | 'procedure'
  | 'medicines'
  | 'clinical_notes'
  | 'next_visit'
  | 'drawing_board'
  | 'signature';

export const DEFAULT_RX_SECTION_ORDER: PrescriptionSectionKey[] = [
  'vitals',
  'complaints',
  'diagnosis',
  'findings',
  'drawing_board',
  'medicines',
  'clinical_notes',
  'next_visit',
  'procedure',
  'history',
  'signature',
];

export const RX_SECTION_TITLES: Record<PrescriptionSectionKey, string> = {
  vitals: 'Vitals',
  complaints: 'Chief Complaints',
  diagnosis: 'Diagnosis',
  findings: 'Clinical Findings & Examination',
  drawing_board: 'Drawing Board',
  medicines: 'Prescribed Medicines',
  clinical_notes: 'Advice, Diet & Investigations',
  next_visit: 'Follow-up / Next Visit Date',
  history: 'Medical & Surgical History',
  procedure: 'Procedure Done',
  signature: 'Doctor Signature & Print / Save',
};

interface PrescriptionSectionsContainerProps {
  form: any;
}

export default function PrescriptionSectionsContainer({ form }: PrescriptionSectionsContainerProps) {
  const rxSectionOrder: PrescriptionSectionKey[] = form.rxSectionOrder || DEFAULT_RX_SECTION_ORDER;
  const setRxSectionOrder = form.setRxSectionOrder || (() => { });

  // Only Drawing Board has open/collapse toggle
  const [isDrawingBoardOpen, setIsDrawingBoardOpen] = useState(false);

  useEffect(() => {
    const handleExpandCustom = (e: any) => {
      if (e.detail === 'drawing_board') {
        setIsDrawingBoardOpen(true);
      }
    };
    window.addEventListener('cortex_expand_section', handleExpandCustom);
    return () => window.removeEventListener('cortex_expand_section', handleExpandCustom);
  }, []);

  const [activeDragHandleKey, setActiveDragHandleKey] = useState<PrescriptionSectionKey | null>(null);
  const [draggedSection, setDraggedSection] = useState<PrescriptionSectionKey | null>(null);
  const [dragOverSection, setDragOverSection] = useState<PrescriptionSectionKey | null>(null);

  // Auto-scroll when dragging a section near top or bottom edges
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastDragYRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!draggedSection) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastDragYRef.current = null;
      return;
    }

    // Locate the scrollable container (e.g. admin layout's overflow-y-auto parent or window)
    const getScrollContainer = (): HTMLElement | Window => {
      if (!containerRef.current) return window;
      let el: HTMLElement | null = containerRef.current.parentElement;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return window;
    };

    const scrollContainer = getScrollContainer();

    const doAutoScroll = () => {
      const clientY = lastDragYRef.current;
      if (clientY !== null && draggedSection) {
        let topBoundary = 0;
        let bottomBoundary = window.innerHeight;

        if (scrollContainer instanceof HTMLElement) {
          const rect = scrollContainer.getBoundingClientRect();
          topBoundary = Math.max(0, rect.top);
          bottomBoundary = Math.min(window.innerHeight, rect.bottom);
        }

        const edgeThreshold = 140; // 140px sensitive scroll zone at top & bottom
        const minSpeed = 4;
        const maxSpeed = 26;
        let deltaY = 0;

        if (clientY < topBoundary + edgeThreshold) {
          // Near top: auto-scroll upwards
          const dist = Math.max(0, (topBoundary + edgeThreshold) - clientY);
          const ratio = Math.min(1, dist / edgeThreshold);
          deltaY = -Math.round(minSpeed + ratio * (maxSpeed - minSpeed));
        } else if (clientY > bottomBoundary - edgeThreshold) {
          // Near bottom: auto-scroll downwards
          const dist = Math.max(0, clientY - (bottomBoundary - edgeThreshold));
          const ratio = Math.min(1, dist / edgeThreshold);
          deltaY = Math.round(minSpeed + ratio * (maxSpeed - minSpeed));
        }

        if (deltaY !== 0) {
          if (scrollContainer instanceof HTMLElement) {
            const prev = scrollContainer.scrollTop;
            scrollContainer.scrollTop += deltaY;
            // Fallback to window scroll if element is bounded
            if (scrollContainer.scrollTop === prev && window.scrollY !== undefined) {
              window.scrollBy(0, deltaY);
            }
          } else {
            window.scrollBy(0, deltaY);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(doAutoScroll);
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      lastDragYRef.current = e.clientY;
    };

    const handleWindowDragEnd = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastDragYRef.current = null;
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragend', handleWindowDragEnd);
    window.addEventListener('drop', handleWindowDragEnd);

    animFrameRef.current = requestAnimationFrame(doAutoScroll);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragend', handleWindowDragEnd);
      window.removeEventListener('drop', handleWindowDragEnd);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastDragYRef.current = null;
    };
  }, [draggedSection]);

  const handleMoveSection = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= rxSectionOrder.length) return;
    const updated = [...rxSectionOrder];
    const [removed] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, removed);
    setRxSectionOrder(updated);
    try {
      localStorage.setItem('cortex_rx_sections_order_v6', JSON.stringify(updated));
    } catch { }
  };

  const handleResetSectionOrder = () => {
    if (form.resetSectionOrder) {
      form.resetSectionOrder();
    } else {
      setRxSectionOrder(DEFAULT_RX_SECTION_ORDER);
    }
    try {
      localStorage.removeItem('cortex_rx_sections_order_v6');
      localStorage.removeItem('cortex_rx_sections_order_v5');
      localStorage.removeItem('cortex_rx_sections_order_v4');
      localStorage.removeItem('cortex_rx_sections_order_v3');
      localStorage.removeItem('cortex_rx_sections_order');
    } catch { }
  };

  const isGynae = (form.selectedDoctorName || '').toLowerCase().includes('shilpa') ||
    (form.selectedDoctorName || '').toLowerCase().includes('shillpa') ||
    (form.selectedDoctorName || '').toLowerCase().includes('gynae');
  const doctorCategory = isGynae ? 'Obstetrics & Gynaecology' : 'Orthopaedics';

  const renderSectionContent = (sectionKey: PrescriptionSectionKey) => {
    switch (sectionKey) {
      case 'vitals':
        return (
          <PrescriptionVitalsSection
            bpSystolic={form.bpSystolic}
            setBpSystolic={form.setBpSystolic}
            bpDiastolic={form.bpDiastolic}
            setBpDiastolic={form.setBpDiastolic}
            pulseVal={form.pulseVal}
            setPulseVal={form.setPulseVal}
            heightVal={form.heightVal}
            setHeightVal={form.setHeightVal}
            weightVal={form.weightVal}
            setWeightVal={form.setWeightVal}
            tempVal={form.tempVal}
            setTempVal={form.setTempVal}
            displayBmi={form.bmiVal}
            waistHipVal={form.waistHipVal}
            setWaistHipVal={form.setWaistHipVal}
            spo2Val={form.spo2Val}
            setSpo2Val={form.setSpo2Val}
            lmpDate={form.lmpDate}
            setLmpDate={form.setLmpDate}
            eddDate={form.eddDate}
            setEddDate={form.setEddDate}
            gestationalWeeks={form.gestationalWeeks}
            setGestationalWeeks={form.setGestationalWeeks}
            gestationalDays={form.gestationalDays}
            setGestationalDays={form.setGestationalDays}
            showObstetrics={form.showObstetrics}
            setShowObstetrics={form.setShowObstetrics}
            isGynae={isGynae}
            onRestorePreviousVitals={form.restorePreviousVitals}
          />
        );
      case 'history':
        // Medical history commented out / hidden as requested for both doctors
        return null;
      case 'complaints':
        return (
          <PrescriptionComplaintsSection
            complaintsList={form.complaintsList}
            setComplaintsList={form.setComplaintsList}
            date={form.formData.date}
            onUpdateCcSummary={(summary) => form.setFormData((prev: any) => ({ ...prev, cc: summary }))}
            isGynae={form.isGynaeDoc}
            ccSummary={form.formData.cc}
            onRestorePreviousComplaints={form.restorePreviousComplaints}
            prescriptionId={form.prescriptionId}
            onApplyMasterTemplate={form.applyPrescriptionTemplate}
          />
        );
      case 'findings':
        return (
          <PrescriptionFindingsSection
            value={form.findingsText}
            onChange={form.setFindingsText}
            category={doctorCategory}
            onRestorePreviousFindings={form.restorePreviousFindings}
          />
        );
      case 'diagnosis':
        return (
          <PrescriptionDiagnosisSection
            diagnosesList={form.diagnosesList}
            setDiagnosesList={form.setDiagnosesList}
            diagnosisSummary={form.formData.de}
            onUpdateDiagnosisSummary={(summary) => form.setFormData((prev: any) => ({ ...prev, de: summary }))}
            date={form.formData.date}
            prescriptionId={form.prescriptionId || undefined}
            isGynae={form.isGynaeDoc}
            onApplyMasterTemplate={form.applyPrescriptionTemplate}
            onRestorePreviousDiagnosis={form.restorePreviousDiagnosis}
          />
        );
      case 'procedure':
        return (
          <PrescriptionProcedureSection
            dentalProcedures={form.dentalProcedures}
            treatmentItems={form.treatmentItems}
            setTreatmentItems={form.setTreatmentItems}
            applyConsultationCharge={form.applyConsultationCharge}
            setApplyConsultationCharge={form.setApplyConsultationCharge}
            consultationCharge={form.consultationCharge}
            setConsultationCharge={form.setConsultationCharge}
            isNewPatient={form.isNewPatient}
            setRepeatPatient={form.setRepeatPatient}
            saveProcedureToCatalog={form.saveProcedureToCatalog}
            defaultDate={form.formData.date}
          />
        );
      case 'medicines':
        return (
          <div className="w-full">
            <HealthPlixMedicineTable
              medicines={form.medicines}
              onChange={form.setMedicines}
              medicineOptions={form.filteredMedicineOptions}
              prescriptionDate={form.formData.date}
              onAutoSaveMedicine={form.autoSaveMedicineIfNew}
              category={doctorCategory}
              onRestorePreviousMedicines={form.restorePreviousMedicines}
            />
          </div>
        );
      case 'next_visit':
        return (
          <PrescriptionNextVisitSection
            followupCount={form.followupCount}
            setFollowupCount={form.setFollowupCount}
            followupUnit={form.followupUnit}
            setFollowupUnit={form.setFollowupUnit}
            followupDate={form.formData.followupDate}
            onUpdateFollowupDate={(d) => form.setFormData((prev: any) => ({ ...prev, followupDate: d }))}
          />
        );
      case 'clinical_notes':
        return (
          <PrescriptionClinicalNotesSection
            drNotes={form.drNotes}
            setDrNotes={form.setDrNotes}
            quickNotes={form.quickNotes}
            setQuickNotes={form.setQuickNotes}
            procedureAdvice={form.procedureAdvice}
            setProcedureAdvice={form.setProcedureAdvice}
            advice={form.formData.advice}
            onUpdateAdvice={(val) => form.setFormData((prev: any) => ({ ...prev, advice: val }))}
            testsRequested={form.testsRequested}
            setTestsRequested={form.setTestsRequested}
            referralDocName={form.referralDocName}
            setReferralDocName={form.setReferralDocName}
            referralSpeciality={form.referralSpeciality}
            setReferralSpeciality={form.setReferralSpeciality}
            referralPhone={form.referralPhone}
            setReferralPhone={form.setReferralPhone}
            referralEmail={form.referralEmail}
            setReferralEmail={form.setReferralEmail}
            dietExercise={form.dietExercise}
            setDietExercise={form.setDietExercise}
            investigationText={form.investigationText}
            setInvestigationText={form.setInvestigationText}
            pastMedication={form.pastMedication}
            setPastMedication={form.setPastMedication}
            systemicExam={form.systemicExam}
            setSystemicExam={form.setSystemicExam}
            generalExam={form.generalExam}
            setGeneralExam={form.setGeneralExam}
            selectedDoctorName={form.selectedDoctorName}
            onRestorePreviousNote={form.restorePreviousClinicalNote}
          />
        );
      case 'drawing_board':
        return (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Drawing Board
              </label>
              <div className="flex items-center gap-2">
                <SectionTemplatePicker
                  sectionKey="drawing_board"
                  sectionTitle="Drawing Board"
                  currentValue={form.drawingDataUrl}
                  onApplyPreset={(val) => form.setDrawingDataUrl(val)}
                  align="right"
                />
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Sketch clinical diagrams or annotate anatomical regions
                </span>
              </div>
            </div>
            <HealthPlixDrawingBoard
              onChange={form.setDrawingDataUrl}
              value={form.drawingDataUrl}
              storageKey={
                form.prescriptionId ? `cortex_drawing_${form.prescriptionId}` : 'cortex_drawing_draft'
              }
            />
          </div>
        );
      case 'signature':
        return (
          <PrescriptionDoctorSignatureCard
            availableDoctors={form.availableDoctors}
            selectedDoctorName={form.selectedDoctorName}
            handleDoctorSelect={form.handleDoctorSelect}
            includeSignature={form.includeSignature}
            setIncludeSignature={form.setIncludeSignature}
            loading={form.loading}
            saving={form.saving}
            isEditMode={form.isEditMode}
            handlePrintablePrescription={form.handlePrintablePrescription}
            onEmailPrescription={form.handleOpenEmailModal}
            nextReadyPatientName={form.nextReadyPatient?.name}
            onMoveToNextPatient={form.moveToNextReadyPatient}
            movingToNextPatient={form.movingToNextPatient}
            isOpdVisit={Boolean(form.opdVisitId)}
            onOpenSaveTemplate={() => {
              const diag =
                form.formData.de ||
                (form.diagnosesList && form.diagnosesList.length > 0
                  ? form.diagnosesList.map((d: any) => d.diagnosis).filter(Boolean).join(', ')
                  : '');
              form.setTemplateNameInput(diag ? `${diag} Protocol` : '');
              form.setIsSaveTemplateModalOpen(true);
            }}
          />
        );
      default:
        return null;
    }
  };

  const getSectionIcon = (key: PrescriptionSectionKey) => {
    switch (key) {
      case 'vitals':
        return <Activity className="w-4 h-4 text-slate-700" />;
      case 'complaints':
        return <User className="w-4 h-4 text-slate-700" />;
      case 'diagnosis':
        return <Stethoscope className="w-4 h-4 text-slate-700" />;
      case 'findings':
        return <ClipboardList className="w-4 h-4 text-slate-700" />;
      case 'drawing_board':
        return <PenTool className="w-4 h-4 text-slate-700" />;
      case 'medicines':
        return <Pill className="w-4 h-4 text-slate-700" />;
      case 'clinical_notes':
        return <BookOpen className="w-4 h-4 text-slate-700" />;
      case 'next_visit':
        return <Calendar className="w-4 h-4 text-slate-700" />;
      case 'history':
        return <History className="w-4 h-4 text-slate-700" />;
      case 'procedure':
        return <Layers className="w-4 h-4 text-slate-700" />;
      case 'signature':
        return <FileCheck className="w-4 h-4 text-slate-700" />;
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Main Clinical Stacked Layout */}
      <div className="space-y-3">
        {rxSectionOrder
          .filter((sectionKey) => sectionKey !== 'history')
          .map((sectionKey, idx) => {
            const isBeingDragged = draggedSection === sectionKey;
            const isOver = dragOverSection === sectionKey && !isBeingDragged;
            const isCollapsed = sectionKey === 'drawing_board' && !isDrawingBoardOpen;

            return (
              <div
                key={sectionKey}
                id={`rx-section-${sectionKey}`}
                draggable={activeDragHandleKey === sectionKey}
                onDragStart={(e) => {
                  setDraggedSection(sectionKey);
                  e.dataTransfer.setData('text/plain', sectionKey);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSection !== sectionKey) {
                    setDragOverSection(sectionKey);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverSection === sectionKey) {
                    setDragOverSection(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const sourceKey = (e.dataTransfer.getData('text/plain') || draggedSection) as PrescriptionSectionKey;
                  if (sourceKey && sourceKey !== sectionKey) {
                    const fromIdx = rxSectionOrder.indexOf(sourceKey);
                    const toIdx = rxSectionOrder.indexOf(sectionKey);
                    if (fromIdx !== -1 && toIdx !== -1) {
                      handleMoveSection(fromIdx, toIdx);
                    }
                  }
                  setDraggedSection(null);
                  setDragOverSection(null);
                  setActiveDragHandleKey(null);
                }}
                onDragEnd={() => {
                  setDraggedSection(null);
                  setDragOverSection(null);
                  setActiveDragHandleKey(null);
                }}
                style={{ zIndex: 40 - idx }}
                className={`relative rounded-2xl transition-all duration-150 ${isBeingDragged ? 'opacity-40 scale-[0.98]' : 'opacity-100'
                  } ${isOver ? 'ring-2 ring-emerald-500 shadow-md translate-y-0.5' : ''
                  }`}
              >
                {/* Visual Drop Target Indicator */}
                {isOver && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-2.5 py-0.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-sm pointer-events-none flex items-center gap-1.5">
                    <span>Drop here to place above {RX_SECTION_TITLES[sectionKey]}</span>
                  </div>
                )}

                {isCollapsed ? (
                  /* Collapsed Drawing Board Row */
                  <div
                    onClick={() => setIsDrawingBoardOpen(true)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 select-none group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setActiveDragHandleKey(sectionKey);
                        }}
                        onMouseUp={() => setActiveDragHandleKey(null)}
                        onClick={(e) => e.stopPropagation()}
                        title="Click and drag here to move section"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-slate-600 transition -ml-2 cursor-grab active:cursor-grabbing shrink-0"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>

                      <div className="text-slate-700 shrink-0">
                        {getSectionIcon(sectionKey)}
                      </div>

                      <span className="text-sm font-bold text-slate-800 tracking-tight shrink-0">
                        {RX_SECTION_TITLES[sectionKey]}
                      </span>

                      {form.drawingDataUrl && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0 ml-1">
                          ✓ Sketch saved
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDrawingBoardOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-300/80 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Open Drawing Board</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded Card (Always Open for all sections except Drawing Board) */
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-visible">
                    <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onMouseDown={() => setActiveDragHandleKey(sectionKey)}
                          onMouseUp={() => setActiveDragHandleKey(null)}
                          title="Click and drag to reorder section"
                          className="p-1 text-slate-400 hover:text-slate-700 transition -ml-1 cursor-grab active:cursor-grabbing shrink-0"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <div className="text-slate-700 shrink-0">
                          {getSectionIcon(sectionKey)}
                        </div>
                        <span className="text-sm font-bold text-slate-900 tracking-tight">
                          {RX_SECTION_TITLES[sectionKey]}
                        </span>
                        {sectionKey === 'drawing_board' && form.drawingDataUrl && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                            ✓ Sketch saved
                          </span>
                        )}
                      </div>

                      {sectionKey === 'drawing_board' && (
                        <button
                          type="button"
                          onClick={() => setIsDrawingBoardOpen(false)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        >
                          <ChevronUp className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                          <span>Collapse</span>
                        </button>
                      )}
                    </div>

                    <div className="p-3 sm:p-5">
                      {renderSectionContent(sectionKey)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
