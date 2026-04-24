import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

interface YearPickerProps {
  value: string;
  onChange: (year: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export const YearPicker: React.FC<YearPickerProps> = ({
  value,
  onChange,
  placeholder = '请选择年份',
  min,
  max,
  minYear,
  maxYear,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startYear, setStartYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    return value ? Math.floor(parseInt(value) / 10) * 10 : Math.floor(currentYear / 10) * 10;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // 将 minYear/maxYear 转换为 min/max 字符串
  const effectiveMin = min ?? (minYear ? minYear.toString() : undefined);
  const effectiveMax = max ?? (maxYear ? maxYear.toString() : undefined);

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleOpen = () => {
    if (!isOpen) {
      updateDropdownPosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (isOpen) updateDropdownPosition();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectYear = (year: number) => {
    const yearStr = year.toString();

    if (effectiveMin && yearStr < effectiveMin) return;
    if (effectiveMax && yearStr > effectiveMax) return;

    onChange(yearStr);
    setIsOpen(false);
  };

  const isDisabled = (year: number): boolean => {
    const yearStr = year.toString();
    if (effectiveMin && yearStr < effectiveMin) return true;
    if (effectiveMax && yearStr > effectiveMax) return true;
    return false;
  };

  const isSelected = (year: number): boolean => {
    return value ? parseInt(value) === year : false;
  };

  const isCurrentYear = (year: number): boolean => {
    return new Date().getFullYear() === year;
  };

  const years = Array.from({ length: 10 }, (_, i) => startYear + i);

  return (
    <div className="custom-date-picker year-picker" ref={containerRef}>
      <div
        ref={triggerRef}
        className={`date-picker-trigger ${isOpen ? 'open' : ''} ${value ? 'has-value' : ''} ${className}`}
        onClick={handleOpen}
      >
        <span className="date-picker-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </span>
        <span className="date-picker-value">
          {value ? `${value}年` : placeholder}
        </span>
        <span className="date-picker-arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      {isOpen && (
        <div
          className="date-picker-dropdown year-picker-dropdown"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 9999
          }}
        >
          <div className="date-picker-header">
            <button type="button" className="month-nav prev" onClick={() => setStartYear(y => y - 10)}>‹</button>
            <div className="current-month-year">
              <span className="year">{startYear}-{startYear + 9}</span>
            </div>
            <button type="button" className="month-nav next" onClick={() => setStartYear(y => y + 10)}>›</button>
          </div>

          <div className="year-picker-grid">
            {years.map(year => (
              <button
                key={year}
                type="button"
                className={`year-cell ${isDisabled(year) ? 'disabled' : ''} ${isSelected(year) ? 'selected' : ''} ${isCurrentYear(year) ? 'today' : ''}`}
                onClick={() => !isDisabled(year) && selectYear(year)}
                disabled={isDisabled(year)}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              className="today-btn"
              onClick={() => {
                const now = new Date().getFullYear().toString();
                onChange(now);
                setStartYear(Math.floor(new Date().getFullYear() / 10) * 10);
                setIsOpen(false);
              }}
            >
              今年
            </button>
            <button
              type="button"
              className="clear-btn"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearPicker;
