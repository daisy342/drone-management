import React, { useState } from 'react';
import './InputWithClear.css';

interface InputWithClearProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  disabled?: boolean;
}

export const InputWithClear: React.FC<InputWithClearProps> = ({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  disabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClear = () => {
    onChange('');
  };

  return (
    <div
      className={`input-with-clear ${className} ${disabled ? 'disabled' : ''} ${value ? 'has-value' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {value && !disabled && (
        <button
          type="button"
          className="clear-btn"
          onClick={handleClear}
          style={{ opacity: isHovered ? 1 : 0 }}
          aria-label="清除"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 7L4 4M7 7L10 10M7 7L10 4M7 7L4 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default InputWithClear;
