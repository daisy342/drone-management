import React, { useState } from 'react';
import YearPicker from '../components/YearPicker';

const YearPickerTest: React.FC = () => {
  const [year, setYear] = useState<string>('');

  return (
    <div style={{
      padding: '40px',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h1>Year Picker Test</h1>
      <div style={{
        marginBottom: '20px'
      }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          选择年份:
        </label>
        <YearPicker
                  value={year}
                  onChange={setYear}
                  placeholder="请选择年份"
                  minYear={2020}
                  maxYear={2030}
                />
      </div>
      <div style={{
        marginTop: '20px',
        padding: '16px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px'
      }}>
        <p>已选择的年份: {year || '未选择'}</p>
      </div>
    </div>
  );
};

export default YearPickerTest;