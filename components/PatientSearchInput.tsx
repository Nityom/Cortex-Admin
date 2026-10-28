'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Phone, User, X, CheckCircle2 } from 'lucide-react';
import { Patient } from '@/types/patient';

interface PatientSearchInputProps {
  value: string;
  searchType: 'name' | 'phone';
  onChange: (val: string) => void;
  onSelectPatient: (patient: Patient) => void;
  patients: Patient[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  inputClassName?: string;
}

export default function PatientSearchInput({
  value,
  searchType,
  onChange,
  onSelectPatient,
  patients,
  placeholder = searchType === 'phone' ? 'e.g. 9876543210' : 'Enter patient full name...',
  className = '',
  required = false,
  inputClassName = '',
}: PatientSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [debouncedQuery, setDebouncedQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal searchTerm when parent updates value
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Debounce input (160ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 160);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Filter options based on debounced search query
  const filteredOptions = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query || query.length < 1) {
      return [];
    }

    return patients
      .filter((pt) => {
        const nameMatch = pt.name?.toLowerCase().includes(query);
        const phoneMatch = pt.phone_number?.includes(query);
        const refMatch = pt.reference_number?.toLowerCase().includes(query);
        const cityMatch = pt.address?.toLowerCase().includes(query);
        return nameMatch || phoneMatch || refMatch || cityMatch;
      })
      .sort((a, b) => {
        if (searchType === 'phone') {
          const aPhoneStarts = a.phone_number?.startsWith(query);
          const bPhoneStarts = b.phone_number?.startsWith(query);
          if (aPhoneStarts && !bPhoneStarts) return -1;
          if (!aPhoneStarts && bPhoneStarts) return 1;
        } else {
          const aNameStarts = a.name?.toLowerCase().startsWith(query);
          const bNameStarts = b.name?.toLowerCase().startsWith(query);
          if (aNameStarts && !bNameStarts) return -1;
          if (!aNameStarts && bNameStarts) return 1;
        }
        return (a.name || '').localeCompare(b.name || '');
      })
      .slice(0, 8);
  }, [debouncedQuery, patients, searchType]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelect = (patient: Patient) => {
    setSearchTerm(searchType === 'phone' ? patient.phone_number : patient.name);
    onSelectPatient(patient);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredOptions.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: isOpen && filteredOptions.length > 0 ? 50 : 1 }}>
      <div className="relative flex items-center">
        {searchType === 'phone' ? (
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <Phone size={15} />
          </div>
        ) : (
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            <User size={15} />
          </div>
        )}

        <input
          ref={inputRef}
          type={searchType === 'phone' ? 'tel' : 'text'}
          required={required}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm.trim().length >= 1) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400 ${inputClassName}`}
        />

        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded transition"
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 z-50">
          <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Existing Patients ({filteredOptions.length})</span>
            <span className="text-[10px] text-blue-600 lowercase font-normal">Click to auto-fill</span>
          </div>

          {filteredOptions.map((pt, idx) => {
            const isSelected = highlightedIndex === idx;
            const uhid = (pt.reference_number || '').replace(/^CH/i, 'CRX');

            return (
              <div
                key={pt.id || `${pt.phone_number}-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(pt);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-3 py-2.5 cursor-pointer transition text-left ${
                  isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>{pt.name}</span>
                    {uhid && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold rounded border border-slate-200">
                        {uhid}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {pt.phone_number}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span>
                    {pt.age ? `${pt.age} Y` : '—'} • {pt.sex || '—'}
                  </span>
                  {pt.address && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{pt.address}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
