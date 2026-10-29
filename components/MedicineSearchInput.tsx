'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Medicine } from '@/services/medicine';

interface MedicineSearchInputProps {
  value: string;
  onChangeName: (name: string) => void;
  onSelectMedicine: (medicine: Medicine) => void;
  options: Medicine[];
  placeholder?: string;
  className?: string;
  index: number;
}

export default function MedicineSearchInput({
  value,
  onChangeName,
  onSelectMedicine,
  options,
  placeholder = 'Type medicine name to search...',
  className = '',
}: MedicineSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [debouncedQuery, setDebouncedQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal searchTerm if parent updates value from outside
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Debounce the search query (180ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 180);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Detect whether to open dropdown upwards if near bottom of viewport
  useEffect(() => {
    if (isOpen && containerRef.current && typeof window !== 'undefined') {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > 260) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, debouncedQuery]);

  // Filter options based on debounced search query
  const filteredOptions = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) {
      return options.slice(0, 8);
    }

    return options
      .filter((med) => {
        const nameMatch = med.name?.toLowerCase().includes(query);
        const compMatch = med.composition?.toLowerCase().includes(query);
        const compyMatch = med.company?.toLowerCase().includes(query);
        return nameMatch || compMatch || compyMatch;
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(query);
        const bStarts = bName.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aName.localeCompare(bName);
      })
      .slice(0, 12);
  }, [debouncedQuery, options]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Close dropdown when clicking outside
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
    onChangeName(val);
    setIsOpen(true);
  };

  const handleSelect = (medicine: Medicine) => {
    setSearchTerm(medicine.name);
    onChangeName(medicine.name);
    onSelectMedicine(medicine);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChangeName('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
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
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 99 : 1 }}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-gray-400 pointer-events-none">
          <Search size={15} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-9 pr-8 p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-gray-400"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-0.5 text-gray-400 hover:text-gray-600 rounded transition"
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Clean & Simple Search Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 w-full min-w-[340px] max-w-lg bg-white border border-slate-300 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 z-[100] ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {filteredOptions.length > 0 ? (
            <div>
              {filteredOptions.map((med, optIdx) => {
                const isSelected =
                  highlightedIndex === optIdx ||
                  med.name.toLowerCase() === searchTerm.trim().toLowerCase();
                return (
                  <div
                    key={med.id || `${med.name}-${optIdx}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(med);
                    }}
                    onMouseEnter={() => setHighlightedIndex(optIdx)}
                    className={`px-3 py-2 cursor-pointer transition text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900'
                        : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {med.name}
                      </span>
                      {med.company && (
                        <span className="text-xs text-gray-400 font-normal">
                          {med.company}
                        </span>
                      )}
                    </div>

                    {med.composition && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {med.composition}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2.5 text-xs text-gray-500 text-center">
              No registered medicine matching &quot;{searchTerm}&quot; (custom name will be used)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
