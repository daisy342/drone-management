import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';
import '../styles/unified-controls.css';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = '请选择日期',
  min,
  max,
  required: _required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // 更新下拉面板位置
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

  // 处理点击打开 - 先计算位置再显示
  const handleOpen = () => {
    if (!isOpen) {
      updateDropdownPosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // 窗口大小变化时更新位置
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 格式化日期显示
  const formatDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${year}-${month}-${day} ${weekday}`;
  };

  // 获取月份天数
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  // 获取当月第一天是星期几
  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  // 生成日历数据
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days: (number | null)[] = [];

    // 前补空
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // 添加日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // 切换月份
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };

  // 选择日期
  const selectDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;

    // 检查是否在范围内
    if (min && dateStr < min) return;
    if (max && dateStr > max) return;

    onChange(dateStr);
    setIsOpen(false);
  };

  // 检查日期是否禁用
  const isDisabled = (day: number): boolean => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;

    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  // 检查是否是今天
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // 检查是否选中
  const isSelected = (day: number): boolean => {
    if (!value) return false;
    const selected = new Date(value);
    return (
      day === selected.getDate() &&
      currentDate.getMonth() === selected.getMonth() &&
      currentDate.getFullYear() === selected.getFullYear()
    );
  };

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="custom-date-picker" ref={containerRef}>
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
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {isOpen && (
        <div
          className="date-picker-dropdown"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <div className="date-picker-header">
            <button
              type="button"
              className="month-nav prev"
              onClick={() => changeMonth(-1)}
            >
              ‹
            </button>
            <div className="current-month-year">
              <span className="year">{currentDate.getFullYear()}年</span>
              <span className="month">{months[currentDate.getMonth()]}</span>
            </div>
            <button
              type="button"
              className="month-nav next"
              onClick={() => changeMonth(1)}
            >
              ›
            </button>
          </div>

          <div className="date-picker-weekdays">
            {weekdays.map(day => (
              <div key={day} className="weekday-header">
                {day}
              </div>
            ))}
          </div>

          <div className="date-picker-days">
            {generateCalendar().map((day, index) => (
              <div
                key={index}
                className={`day-cell ${
                  day === null ? 'empty' : ''
                } ${
                  day !== null && isDisabled(day) ? 'disabled' : ''
                } ${
                  day !== null && isToday(day) ? 'today' : ''
                } ${
                  day !== null && isSelected(day) ? 'selected' : ''
                }`}
                onClick={() => day !== null && !isDisabled(day) && selectDate(day)}
              >
                {day !== null && (
                  <>
                    <span className="day-number">{day}</span>
                    {isToday(day) && <span className="today-dot"></span>}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              className="today-btn"
              onClick={() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                onChange(`${year}-${month}-${day}`);
                setCurrentDate(today);
                setIsOpen(false);
              }}
            >
              今天
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

export default DatePicker;
