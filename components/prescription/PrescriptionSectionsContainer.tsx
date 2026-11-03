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

  // Collapsed state: support collapse & expand for every section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cortex_rx_collapsed_sections_v2');
        if (saved !== null) return JSON.parse(saved);
      } catch {}
    }
    return { drawing_board: true }; // Closed by default for drawing board
  });

  const toggleSectionCollapse = (key: string) => {
    setCollapsedSections((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('cortex_rx_collapsed_sections_v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleExpandAll = () => {
    setCollapsedSections({});
    try {
      localStorage.setItem('cortex_rx_collapsed_sections_v2', JSON.stringify({}));
    } catch {}
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    rxSectionOrder.forEach((k) => { allCollapsed[k] = true; });
    setCollapsedSections(allCollapsed);
    try {
      localStorage.setItem('cortex_rx_collapsed_sections_v2', JSON.stringify(allCollapsed));
    } catch {}
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
        // Medical history commented out / hidden as requested for both doctors
        return null;
      case 'complaints':
        return (
          <PrescriptionComplaintsSection
            complaintsList={form.complaintsList}
            setComplaintsList={form.setComplaintsList}
            date={form.formData.date}
            onUpdateCcSummary={(summary) => form.setFormData((prev: any) => ({ ...prev, cc: summary }))}
            isGynae={true}
            ccSummary={form.formData.cc}
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
            isGynae={true}
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
                  onClick={() => toggleSectionCollapse('drawing_board')}
                  className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition cursor-pointer"
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
            nextReadyPatientName={form.nextReadyPatient?.name}
            onMoveToNextPatient={form.moveToNextReadyPatient}
            movingToNextPatient={form.movingToNextPatient}
            isOpdVisit={Boolean(form.opdVisitId)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Reorderable Clinical Stack Header with Expand / Collapse / Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-sm text-slate-700">
        <div className="flex items-center gap-2 font-bold">
          <GripVertical className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-slate-900 font-extrabold text-sm sm:text-base">Prescription Section Layout</span>
          <span className="text-xs text-slate-500 font-normal hidden lg:inline">
            (1. Vitals • 2. Complaints • 3. Diagnosis • 4. Exam Findings • 5. Drawing • 6. Medicines • 7. Advice & Tests • 8. Next Visit • 9. Signature)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExpandAll}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
            title="Expand all prescription sections"
          >
            <ChevronDown className="w-4 h-4 text-emerald-600" />
            <span>Expand All</span>
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
            title="Collapse all prescription sections"
          >
            <ChevronUp className="w-4 h-4 text-slate-500" />
            <span>Collapse All</span>
          </button>
          <button
            type="button"
            onClick={handleResetSectionOrder}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
            title="Reset prescription sections to standard default order"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Sequence</span>
          </button>
        </div>
      </div>

      {/* Main Clinical Stacked Layout */}
      <div className="space-y-4">
        {rxSectionOrder
          .filter((sectionKey) => sectionKey !== 'history')
          .map((sectionKey, idx) => {
          const isBeingDragged = draggedSection === sectionKey;
          const isOver = dragOverSection === sectionKey && !isBeingDragged;
          const isCollapsed = Boolean(collapsedSections[sectionKey]);

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
                isOver ? 'ring-2 ring-emerald-500 shadow-md translate-y-0.5' : ''
              }`}
            >
              {/* Visual Drop Target Indicator */}
              {isOver && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-full shadow-md pointer-events-none flex items-center gap-1.5 animate-pulse">
                  <span>Drop here to place above {RX_SECTION_TITLES[sectionKey]}</span>
                </div>
              )}

              {/* Drag Handle & Section Header Bar */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200/80 rounded-t-xl border border-b-0 border-slate-200 text-sm transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Dedicated Drag Handle Icon */}
                  <button
                    type="button"
                    onMouseDown={() => setActiveDragHandleKey(sectionKey)}
                    onMouseUp={() => setActiveDragHandleKey(null)}
                    title="Click and drag here to move section"
                    className="p-1 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 cursor-grab active:cursor-grabbing transition shrink-0"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(sectionKey)}
                    className="flex items-center gap-2.5 text-left truncate cursor-pointer group"
                    title={isCollapsed ? `Click to expand ${RX_SECTION_TITLES[sectionKey]}` : `Click to collapse ${RX_SECTION_TITLES[sectionKey]}`}
                  >
                    <span className="text-sm font-bold text-slate-800 tracking-wide group-hover:text-emerald-700 transition">
                      {RX_SECTION_TITLES[sectionKey]}
                    </span>
                    {isCollapsed && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2.5 py-0.5 rounded-full shrink-0">
                        Collapsed
                      </span>
                    )}
                    {sectionKey === 'drawing_board' && form.drawingDataUrl && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                        ✓ Sketch saved
                      </span>
                    )}
                  </button>
                </div>

                {/* Expand / Collapse Toggle Button */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(sectionKey)}
                    className="p-1 px-3 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                    title={isCollapsed ? `Expand ${RX_SECTION_TITLES[sectionKey]}` : `Collapse ${RX_SECTION_TITLES[sectionKey]}`}
                  >
                    {isCollapsed ? (
                      <>
                        <ChevronDown className="w-4 h-4 text-emerald-600" />
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
              </div>

              {/* Section Body */}
              <div className="rounded-b-xl border border-slate-200 overflow-visible bg-white shadow-2xs">
                {isCollapsed ? (
                  sectionKey === 'drawing_board' ? (
                    <div className="p-3.5 bg-slate-50/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
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
                        onClick={() => toggleSectionCollapse('drawing_board')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition cursor-pointer shrink-0 ml-3"
                      >
                        + Open Drawing Board
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => toggleSectionCollapse(sectionKey)}
                      className="p-3 bg-slate-50/60 hover:bg-slate-100/60 flex items-center justify-between text-xs cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="text-[11px] font-medium text-slate-600">
                          {RX_SECTION_TITLES[sectionKey]} is collapsed. Click to expand.
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 hover:underline">
                        + Expand
                      </span>
                    </div>
                  )
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
