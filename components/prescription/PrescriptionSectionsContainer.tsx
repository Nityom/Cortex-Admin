'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  PenTool,
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
  'history',
  'findings',
  'drawing_board',
  'medicines',
  'clinical_notes',
  'next_visit',
  'procedure',
  'signature',
];

export const RX_SECTION_TITLES: Record<PrescriptionSectionKey, string> = {
  vitals: 'Vitals Sequentially Arranged',
  complaints: 'Chief Complaints',
  diagnosis: 'Diagnosis / Conditions',
  history: 'Medical & Surgical History',
  findings: 'Clinical Findings & Examination',
  drawing_board: 'Clinical Sketch / Drawing Board',
  medicines: 'Prescribed Medicines Table',
  clinical_notes: 'Clinical Advice, Diet & Investigations',
  next_visit: 'Follow-Up / Next Visit Date',
  procedure: 'Procedure Done / Treatment Done',
  signature: 'Doctor Signature & Print / Save',
};

interface PrescriptionSectionsContainerProps {
  form: any;
}

export default function PrescriptionSectionsContainer({ form }: PrescriptionSectionsContainerProps) {
  const rxSectionOrder: PrescriptionSectionKey[] = form.rxSectionOrder || DEFAULT_RX_SECTION_ORDER;
  const setRxSectionOrder = form.setRxSectionOrder || (() => {});

  // Collapsed state: ONLY Drawing Board can be collapsed/expanded. All other sections are permanently open.
  const [isDrawingBoardCollapsed, setIsDrawingBoardCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cortex_rx_drawing_board_collapsed');
        if (saved !== null) return JSON.parse(saved);
        // Clean up legacy key so no other section stays collapsed in local cache
        localStorage.removeItem('cortex_rx_collapsed_sections');
      } catch {}
    }
    return true; // Closed by default
  });

  const toggleDrawingBoardCollapse = () => {
    setIsDrawingBoardCollapsed((prev) => {
      const updated = !prev;
      try {
        localStorage.setItem('cortex_rx_drawing_board_collapsed', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

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
      localStorage.setItem('cortex_rx_sections_order_v4', JSON.stringify(updated));
    } catch {}
  };

  const handleResetSectionOrder = () => {
    if (form.resetSectionOrder) {
      form.resetSectionOrder();
    } else {
      setRxSectionOrder(DEFAULT_RX_SECTION_ORDER);
    }
    try {
      localStorage.removeItem('cortex_rx_sections_order_v4');
      localStorage.removeItem('cortex_rx_sections_order_v3');
      localStorage.removeItem('cortex_rx_sections_order');
    } catch {}
  };

  const isGynae = (form.selectedDoctorName || '').toLowerCase().includes('shilpa') ||
                  (form.selectedDoctorName || '').toLowerCase().includes('shillpa') ||
                  (form.selectedDoctorName || '').toLowerCase().includes('gynae');

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
            isGynae={isGynae}
          />
        );
      case 'history':
        return (
          <PrescriptionHistorySection
            value={form.formData.mh}
            onChange={(val) => form.setFormData((prev: any) => ({ ...prev, mh: val }))}
          />
        );
      case 'complaints':
        return (
          <PrescriptionComplaintsSection
            complaintsList={form.complaintsList}
            setComplaintsList={form.setComplaintsList}
            date={form.formData.date}
            onUpdateCcSummary={(summary) => form.setFormData((prev: any) => ({ ...prev, cc: summary }))}
          />
        );
      case 'findings':
        return (
          <PrescriptionFindingsSection
            value={form.findingsText}
            onChange={form.setFindingsText}
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
                <button
                  type="button"
                  onClick={toggleDrawingBoardCollapse}
                  className="text-[11px] font-bold text-slate-500 hover:text-teal-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition cursor-pointer"
                  title="Minimize / Collapse Drawing Board"
                >
                  — Collapse
                </button>
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Reorderable Clinical Stack Header with Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs text-slate-600">
        <div className="flex items-center gap-2 font-semibold">
          <GripVertical className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="text-slate-800 font-bold">Prescription Section Layout</span>
          <span className="text-[11px] text-slate-500 font-normal hidden lg:inline">
            (1. Vitals • 2. Complaints • 3. Diagnosis • 4. History • 5. Exam Findings • 6. Drawing • 7. Medicines • 8. Advice & Tests • 9. Next Visit • 10. Signature)
          </span>
        </div>
        <button
          type="button"
          onClick={handleResetSectionOrder}
          className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
          title="Reset prescription sections to standard default order"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Default Sequence</span>
        </button>
      </div>

      {/* Main Clinical Stacked Layout */}
      <div className="space-y-4">
        {rxSectionOrder.map((sectionKey, idx) => {
          const isBeingDragged = draggedSection === sectionKey;
          const isOver = dragOverSection === sectionKey && !isBeingDragged;

          return (
            <div
              key={sectionKey}
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
              className={`relative rounded-2xl transition-all duration-200 ${
                isBeingDragged ? 'opacity-40 scale-[0.98]' : 'opacity-100'
              } ${
                isOver ? 'ring-2 ring-teal-500 shadow-md translate-y-0.5' : ''
              }`}
            >
              {/* Visual Drop Target Indicator */}
              {isOver && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-teal-600 text-white text-[11px] font-bold rounded-full shadow-md pointer-events-none flex items-center gap-1.5 animate-pulse">
                  <span>Drop here to place above {RX_SECTION_TITLES[sectionKey]}</span>
                </div>
              )}

              {/* Drag Handle & Section Header Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 rounded-t-xl border border-b-0 border-slate-200 text-xs transition">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Dedicated Drag Handle Icon */}
                  <button
                    type="button"
                    onMouseDown={() => setActiveDragHandleKey(sectionKey)}
                    onMouseUp={() => setActiveDragHandleKey(null)}
                    title="Click and drag here to move section"
                    className="p-1 rounded-md text-slate-500 hover:text-teal-700 hover:bg-teal-50 active:bg-teal-100 cursor-grab active:cursor-grabbing transition shrink-0"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>

                  {sectionKey === 'drawing_board' ? (
                    <button
                      type="button"
                      onClick={toggleDrawingBoardCollapse}
                      className="flex items-center gap-2 text-left truncate cursor-pointer group"
                      title={isDrawingBoardCollapsed ? 'Click to expand drawing board' : 'Click to collapse drawing board'}
                    >
                      <span className="text-[11px] font-bold text-slate-700 tracking-wide group-hover:text-teal-700 transition">
                        {RX_SECTION_TITLES[sectionKey]}
                      </span>
                      {isDrawingBoardCollapsed && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full shrink-0">
                          Collapsed
                        </span>
                      )}
                      {isDrawingBoardCollapsed && form.drawingDataUrl && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                          ✓ Sketch saved
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-700 tracking-wide select-none">
                      {RX_SECTION_TITLES[sectionKey]}
                    </span>
                  )}
                </div>

                {/* Expand / Collapse Toggle Button - STRICTLY ONLY for Drawing Board */}
                {sectionKey === 'drawing_board' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={toggleDrawingBoardCollapse}
                      className="p-1 px-2.5 rounded-md text-[11px] font-semibold text-slate-600 hover:text-teal-700 bg-white hover:bg-teal-50 border border-slate-200 shadow-2xs flex items-center gap-1 transition cursor-pointer"
                      title={isDrawingBoardCollapsed ? 'Expand Drawing Board' : 'Collapse Drawing Board'}
                    >
                      {isDrawingBoardCollapsed ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                          <span>Expand</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          <span>Collapse</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Section Body */}
              <div className="rounded-b-xl border border-slate-200 overflow-visible bg-white shadow-2xs">
                {sectionKey === 'drawing_board' && isDrawingBoardCollapsed ? (
                  // Sleek Collapsed Preview Card ONLY for Drawing Board
                  <div className="p-3.5 bg-slate-50/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                        <PenTool className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">Drawing Board & Clinical Sketch</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Expand when needed to draw clinical sketches or annotate anatomy templates
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleDrawingBoardCollapse}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow-xs transition cursor-pointer shrink-0 ml-3"
                    >
                      + Open Drawing Board
                    </button>
                  </div>
                ) : (
                  renderSectionContent(sectionKey)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
