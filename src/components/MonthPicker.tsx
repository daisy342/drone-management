import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  placeholder = '请选择月份',
  min,
  max,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(() => {
    return value ? parseInt(value.split('-')[0]) : new Date().getFullYear();
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

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

  const formatDisplay = (monthStr: string): string => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${year}年${month}月`;
  };

  const selectMonth = (month: number) => {
    const monthStr = String(month).padStart(2, '0');
    const result = `${currentYear}-${monthStr}`;

    if (min && result < min) return;
    if (max && result > max) return;

    onChange(result);
    setIsOpen(false);
  };

  const isDisabled = (month: number): boolean => {
    const monthStr = String(month).padStart(2, '0');
    const result = `${currentYear}-${monthStr}`;

    if (min && result < min) return true;
    if (max && result > max) return true;
    return false;
  };

  const isSelected = (month: number): boolean => {
    if (!value) return false;
    const [year, monthStr] = value.split('-');
    return parseInt(year) === currentYear && parseInt(monthStr) === month;
  };

  const isCurrentMonth = (month: number): boolean => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() + 1 === month;
  };

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="custom-date-picker month-picker" ref={containerRef}>
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
          {value ? formatDisplay(value) : placeholder}
        </span>
        <span className="date-picker-arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      {isOpen && (
        <div
          className="date-picker-dropdown month-picker-dropdown"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 9999
          }}
        >
          <div className="date-picker-header">
            <button type="button" className="month-nav prev" onClick={() => setCurrentYear(y => y - 1)}>‹</button>
            <div className="current-month-year">
              <span className="year">{currentYear}年</span>
            </div>
            <button type="button" className="month-nav next" onClick={() => setCurrentYear(y => y + 1)}>›</button>
          </div>

          <div className="month-picker-grid">
            {months.map((label, index) => {
              const month = index + 1;
              return (
                <button
                  key={month}
                  type="button"
                  className={`month-cell ${isDisabled(month) ? 'disabled' : ''} ${isSelected(month) ? 'selected' : ''} ${isCurrentMonth(month) ? 'today' : ''}`}
                  onClick={() => !isDisabled(month) && selectMonth(month)}
                  disabled={isDisabled(month)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              className="today-btn"
              onClick={() => {
                const now = new Date();
                const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                onChange(result);
                setCurrentYear(now.getFullYear());
                setIsOpen(false);
              }}
            >
              当月
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

export default MonthPicker;
