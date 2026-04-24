import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  placeholder = '请选择日期范围',
  min,
  max,
  required: _required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>(startDate ? 'end' : 'start');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 当弹窗打开时，保持之前的选择状态
  useEffect(() => {
    if (isOpen) {
      if (startDate && !endDate) {
        setSelectionMode('end');
      } else if (startDate && endDate) {
        // 保持当前模式，或者默认为start
        setSelectionMode('start');
      } else {
        setSelectionMode('start');
      }
    }
  }, [isOpen, startDate, endDate]);

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
    return `${year}-${month}-${day}`;
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

    if (selectionMode === 'start') {
      // 选择开始日期
      onChange(dateStr, '');
      setSelectionMode('end');
    } else {
      // 选择结束日期
      // 确保结束日期不早于开始日期
      if (dateStr < startDate) {
        onChange(dateStr, dateStr);
      } else {
        onChange(startDate, dateStr);
      }
      setIsOpen(false);
    }
  };

  // 检查日期是否禁用
  const isDisabled = (day: number): boolean => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;

    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    if (selectionMode === 'end' && dateStr < startDate) return true;
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

  // 检查是否是开始日期
  const isStartDate = (day: number): boolean => {
    if (!startDate) return false;
    const selected = new Date(startDate);
    return (
      day === selected.getDate() &&
      currentDate.getMonth() === selected.getMonth() &&
      currentDate.getFullYear() === selected.getFullYear()
    );
  };

  // 检查是否是结束日期
  const isEndDate = (day: number): boolean => {
    if (!endDate) return false;
    const selected = new Date(endDate);
    return (
      day === selected.getDate() &&
      currentDate.getMonth() === selected.getMonth() &&
      currentDate.getFullYear() === selected.getFullYear()
    );
  };

  // 检查是否在日期范围内
  const isInRange = (day: number): boolean => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    // 如果已经选择了开始和结束日期，检查是否在范围内
    if (startDate && endDate) {
      return dateStr >= startDate && dateStr <= endDate;
    }
    // 如果正在选择结束日期，显示鼠标悬停的范围
    if (startDate && selectionMode === 'end' && hoveredDate) {
      return dateStr >= startDate && dateStr <= hoveredDate || dateStr >= hoveredDate && dateStr <= startDate;
    }
    return false;
  };

  // 处理鼠标悬停
  const handleMouseEnter = (day: number) => {
    if (selectionMode === 'end' && startDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      
      // 检查日期是否禁用
      if (!isDisabled(day)) {
        setHoveredDate(dateStr);
      }
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    setHoveredDate(null);
  };

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="custom-date-picker" ref={containerRef}>
      <div
        className={`date-picker-trigger ${isOpen ? 'open' : ''} ${startDate || endDate ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
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
          {startDate && endDate
            ? `${formatDisplay(startDate)} 至 ${formatDisplay(endDate)}`
            : startDate
            ? `${formatDisplay(startDate)} 至`
            : placeholder}
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
        <div className="date-picker-dropdown" style={{ zIndex: 9999 }}>
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
                className={`day-cell ${day === null ? 'empty' : ''} ${day !== null && isDisabled(day) ? 'disabled' : ''} ${day !== null && isToday(day) ? 'today' : ''} ${day !== null && isStartDate(day) ? 'selected start-date' : ''} ${day !== null && isEndDate(day) ? 'selected end-date' : ''} ${day !== null && isInRange(day) ? 'in-range' : ''}`}
                onClick={() => day !== null && !isDisabled(day) && selectDate(day)}
                onMouseEnter={() => day !== null && handleMouseEnter(day)}
                onMouseLeave={handleMouseLeave}
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
                const todayStr = `${year}-${month}-${day}`;
                if (selectionMode === 'start') {
                  onChange(todayStr, '');
                  setSelectionMode('end');
                } else {
                  onChange(startDate || todayStr, todayStr);
                  setIsOpen(false);
                }
              }}
            >
              今天
            </button>
            <button
              type="button"
              className="clear-btn"
              onClick={() => {
                onChange('', '');
                setSelectionMode('start');
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

export default DateRangePicker;