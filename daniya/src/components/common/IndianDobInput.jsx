import React, { useState, useEffect, useRef } from 'react';
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseIndianDate, formatToIndianDate, toInputDateFormat } from '../../utils/indianDateUtils';

export default function IndianDobInput({
  value = '',
  onChange,
  id = 'dob',
  disabled = false
}) {
  // Parse initial day, month, year from value
  const parseParts = (val) => {
    if (!val) return { day: '', month: '', year: '' };
    const parsed = parseIndianDate(val);
    if (!parsed) {
      // Try raw split if user was typing
      const parts = String(val).split(/[\/\-\.]/);
      return {
        day: parts[0] || '',
        month: parts[1] || '',
        year: parts[2] || ''
      };
    }
    return {
      day: String(parsed.getDate()).padStart(2, '0'),
      month: String(parsed.getMonth() + 1).padStart(2, '0'),
      year: String(parsed.getFullYear())
    };
  };

  const [parts, setParts] = useState(() => parseParts(value));
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const calendarPickerRef = useRef(null);

  // Sync when prop value changes externally
  useEffect(() => {
    const newParts = parseParts(value);
    setParts(newParts);
  }, [value]);

  const emitDate = (newParts) => {
    const { day, month, year } = newParts;
    if (day && month && year && year.length === 4) {
      const dNum = parseInt(day, 10);
      const mNum = parseInt(month, 10);
      const yNum = parseInt(year, 10);
      const currentYear = new Date().getFullYear();

      if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12 && yNum >= 1920 && yNum <= currentYear) {
        const dStr = String(dNum).padStart(2, '0');
        const mStr = String(mNum).padStart(2, '0');
        const formatted = `${dStr}/${mStr}/${yNum}`;
        onChange(formatted);
        return;
      }
    }
    // If not complete/valid yet, don't set invalid full date
    if (!day && !month && !year) {
      onChange('');
    }
  };

  // Handle Day input
  const handleDayChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    const newParts = { ...parts, day: val };
    setParts(newParts);

    // Auto-advance to Month when 2 digits are entered or if > 3 (e.g. typing 4, 5...)
    if (val.length === 2 || (val.length === 1 && parseInt(val, 10) > 3)) {
      if (val.length === 1) {
        newParts.day = `0${val}`;
        setParts({ ...newParts });
      }
      monthRef.current?.focus();
    }
    emitDate(newParts);
  };

  // Handle Month input
  const handleMonthChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    const newParts = { ...parts, month: val };
    setParts(newParts);

    // Auto-advance to Year when 2 digits are entered or if > 1 (e.g. typing 2..9)
    if (val.length === 2 || (val.length === 1 && parseInt(val, 10) > 1)) {
      if (val.length === 1) {
        newParts.month = `0${val}`;
        setParts({ ...newParts });
      }
      yearRef.current?.focus();
    }
    emitDate(newParts);
  };

  // Handle Year input
  const handleYearChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    const newParts = { ...parts, year: val };
    setParts(newParts);
    emitDate(newParts);
  };

  // Handle Keyboard backspace navigation
  const handleKeyDown = (field, e) => {
    if (e.key === 'Backspace') {
      if (field === 'year' && !parts.year) {
        monthRef.current?.focus();
      } else if (field === 'month' && !parts.month) {
        dayRef.current?.focus();
      }
    } else if (e.key === '/' || e.key === '-' || e.key === '.') {
      e.preventDefault();
      if (field === 'day') monthRef.current?.focus();
      if (field === 'month') yearRef.current?.focus();
    }
  };

  // Handle native calendar picker selection (hidden input fallback)
  const handleCalendarPick = (e) => {
    const pickedIso = e.target.value; // YYYY-MM-DD
    if (pickedIso) {
      const indianStr = formatToIndianDate(pickedIso);
      onChange(indianStr);
    }
  };

  const isComplete = parts.day.length === 2 && parts.month.length === 2 && parts.year.length === 4;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 bg-stone-50/80 border border-stone-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl p-1.5 transition-all">
        
        {/* Day Box */}
        <div className="flex-1 flex flex-col items-center">
          <input
            ref={dayRef}
            id={`${id}-day`}
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="DD"
            value={parts.day}
            onChange={handleDayChange}
            onKeyDown={(e) => handleKeyDown('day', e)}
            disabled={disabled}
            className="w-full text-center py-1.5 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm font-bold placeholder:text-stone-300 focus:outline-none focus:border-amber-500"
            title="Day (01-31)"
          />
          <span className="text-[9px] uppercase font-bold text-stone-400 mt-0.5">Day</span>
        </div>

        <span className="text-stone-300 font-bold text-base pb-3">/</span>

        {/* Month Box */}
        <div className="flex-1 flex flex-col items-center">
          <input
            ref={monthRef}
            id={`${id}-month`}
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="MM"
            value={parts.month}
            onChange={handleMonthChange}
            onKeyDown={(e) => handleKeyDown('month', e)}
            disabled={disabled}
            className="w-full text-center py-1.5 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm font-bold placeholder:text-stone-300 focus:outline-none focus:border-amber-500"
            title="Month (01-12)"
          />
          <span className="text-[9px] uppercase font-bold text-stone-400 mt-0.5">Month</span>
        </div>

        <span className="text-stone-300 font-bold text-base pb-3">/</span>

        {/* Year Box */}
        <div className="flex-[1.4] flex flex-col items-center">
          <input
            ref={yearRef}
            id={`${id}-year`}
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="YYYY"
            value={parts.year}
            onChange={handleYearChange}
            onKeyDown={(e) => handleKeyDown('year', e)}
            disabled={disabled}
            className="w-full text-center py-1.5 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm font-bold placeholder:text-stone-300 focus:outline-none focus:border-amber-500 font-mono"
            title="Year (e.g. 2003)"
          />
          <span className="text-[9px] uppercase font-bold text-stone-400 mt-0.5">Year</span>
        </div>

        {/* Calendar Picker Trigger Button */}
        <div className="pr-1 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (calendarPickerRef.current) {
                if (typeof calendarPickerRef.current.showPicker === 'function') {
                  calendarPickerRef.current.showPicker();
                } else {
                  calendarPickerRef.current.focus();
                }
              }
            }}
            className="p-2 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-800 transition-colors"
            title="Pick from calendar"
          >
            <Calendar className="w-4 h-4 text-amber-700" />
          </button>
          <span className="text-[9px] uppercase font-bold text-stone-400 mt-0.5">Cal</span>

          {/* Hidden native date picker */}
          <input
            ref={calendarPickerRef}
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={toInputDateFormat(value)}
            onChange={handleCalendarPick}
            className="sr-only"
            tabIndex={-1}
          />
        </div>

      </div>

    </div>
  );
}
