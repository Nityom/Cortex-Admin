'use client';

import React, { useState } from 'react';
import { Edit2, Plus, Undo2 } from 'lucide-react';
import SectionTemplatePicker from '@/components/SectionTemplatePicker';

export interface ComplaintRow {
  id: string;
  complaint: string;
  frequency: string;
  severity: string;
  duration: string;
  date: string;
}

interface PrescriptionComplaintsSectionProps {
  complaintsList: ComplaintRow[];
  setComplaintsList: React.Dispatch<React.SetStateAction<ComplaintRow[]>>;
  date?: string;
  onUpdateCcSummary?: (summary: string) => void;
}

export default function PrescriptionComplaintsSection({
  complaintsList,
  setComplaintsList,
  date = new Date().toISOString().slice(0, 10),
  onUpdateCcSummary,
}: PrescriptionComplaintsSectionProps) {
  const [newComplaintText, setNewComplaintText] = useState('');
  const [newComplaintFreq, setNewComplaintFreq] = useState('');
  const [newComplaintSeverity, setNewComplaintSeverity] = useState('');
  const [newComplaintDuration, setNewComplaintDuration] = useState('');

  const handleAddComplaint = () => {
    if (!newComplaintText.trim()) return;
    const updated: ComplaintRow[] = [
      ...complaintsList,
      {
        id: String(Date.now()),
        complaint: newComplaintText.trim(),
        frequency: newComplaintFreq,
        severity: newComplaintSeverity,
        duration: newComplaintDuration,
        date: date || new Date().toISOString().slice(0, 10),
      },
    ];
    setComplaintsList(updated);
    if (onUpdateCcSummary) {
      onUpdateCcSummary(updated.map((c) => c.complaint).join(', '));
    }
    setNewComplaintText('');
    setNewComplaintFreq('');
    setNewComplaintSeverity('');
    setNewComplaintDuration('');
  };

  const handleRemove = (id: string) => {
    const updated = complaintsList.filter((x) => x.id !== id);
    setComplaintsList(updated);
    if (onUpdateCcSummary) {
      onUpdateCcSummary(updated.map((c) => c.complaint).join(', '));
    }
  };

  const handleClearAll = () => {
    setComplaintsList([]);
    if (onUpdateCcSummary) {
      onUpdateCcSummary('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-800">Complaints</label>
          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              title="Edit Complaints"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Add Complaint Row"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              onClick={handleAddComplaint}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <SectionTemplatePicker
              sectionKey="complaints"
              sectionTitle="Complaints"
              currentValue={complaintsList}
              align="left"
              onApplyPreset={(val) => {
                if (Array.isArray(val)) {
                  const mapped: ComplaintRow[] = [
                    ...complaintsList,
                    ...val.map((x: any, i: number) => ({
                      id: 'tc_' + Date.now() + '_' + i,
                      complaint: x.complaint,
                      frequency: x.frequency || '',
                      severity: x.severity || '',
                      duration: x.duration || '',
                      date: date || new Date().toISOString().slice(0, 10),
                    })),
                  ];
                  setComplaintsList(mapped);
                  if (onUpdateCcSummary) {
                    onUpdateCcSummary(mapped.map((c) => c.complaint).join(', '));
                  }
                }
              }}
            />
            <button
              type="button"
              title="Reset / Clear All Complaints"
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              onClick={handleClearAll}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
        <div className="grid grid-cols-12 bg-slate-50 text-slate-600 font-semibold py-2 px-3 border-b border-slate-200">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Complaints</div>
          <div className="col-span-2">Frequency</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {/* Existing Complaints */}
        {complaintsList.map((c, idx) => (
          <div
            key={c.id}
            className="grid grid-cols-12 items-center py-2 px-3 border-b border-slate-100 hover:bg-slate-50/50"
          >
            <div className="col-span-1 text-slate-400">{idx + 1}</div>
            <div className="col-span-4 font-semibold text-slate-800">{c.complaint}</div>
            <div className="col-span-2 text-slate-600">{c.frequency || '—'}</div>
            <div className="col-span-2 text-slate-600">{c.severity || '—'}</div>
            <div className="col-span-2 text-slate-600">{c.duration || '—'}</div>
            <div className="col-span-1 text-right">
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold"
                title="Remove complaint"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Inline Add Complaint Row */}
        <div className="grid grid-cols-12 items-center py-1.5 px-3 bg-slate-50/30 gap-2">
          <div className="col-span-1 text-slate-400 font-mono">{complaintsList.length + 1}</div>
          <div className="col-span-4">
            <input
              type="text"
              value={newComplaintText}
              onChange={(e) => setNewComplaintText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddComplaint();
                }
              }}
              placeholder="Add Complaints (e.g. Joint pain in right knee, fever, back pain)..."
              className="w-full p-1.5 border border-slate-200 rounded text-slate-800 bg-white focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          <div className="col-span-2">
            <select
              value={newComplaintFreq}
              onChange={(e) => setNewComplaintFreq(e.target.value)}
              className="w-full p-1.5 border border-slate-200 rounded text-slate-700 bg-white outline-none cursor-pointer"
            >
              <option value="">Frequency...</option>
              <option value="Continuous">Continuous</option>
              <option value="Intermittent">Intermittent</option>
              <option value="Occasionally">Occasionally</option>
              <option value="Night time">Night time</option>
            </select>
          </div>
          <div className="col-span-2">
            <select
              value={newComplaintSeverity}
              onChange={(e) => setNewComplaintSeverity(e.target.value)}
              className="w-full p-1.5 border border-slate-200 rounded text-slate-700 bg-white outline-none cursor-pointer"
            >
              <option value="">Severity...</option>
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </div>
          <div className="col-span-2">
            <input
              type="text"
              value={newComplaintDuration}
              onChange={(e) => setNewComplaintDuration(e.target.value)}
              placeholder="e.g. 3 days"
              className="w-full p-1.5 border border-slate-200 rounded text-slate-700 bg-white outline-none"
            />
          </div>
          <div className="col-span-1 text-right">
            <button
              type="button"
              onClick={handleAddComplaint}
              className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs cursor-pointer shadow-xs"
              title="Add complaint"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

