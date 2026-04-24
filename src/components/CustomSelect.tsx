import Select, { Props as SelectProps, GroupBase } from 'react-select';
import '../styles/unified-controls.css';
import { useState } from 'react';

export interface CustomSelectProps<Option = unknown, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>
  extends SelectProps<Option, IsMulti, Group> {
  height?: string | number;
}

export function CustomSelect<Option = unknown, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({
  height = '42px',
  styles = {},
  ...props
}: CustomSelectProps<Option, IsMulti, Group>) {
  const [isHovered, setIsHovered] = useState(false);

  const mergedStyles = {
    container: (base: any, state: any) => ({
      ...base,
      height,
      width: '100%',
      cursor: state.selectProps.isDisabled ? 'not-allowed' : 'pointer'
    }),
    control: (base: any, state: any) => ({
      ...base,
      borderRadius: 'var(--border-radius)',
      borderColor: state.isDisabled ? 'var(--border-color)' : state.isFocused ? 'var(--primary-color)' : 'var(--border-color)',
      padding: '0 14px',
      minHeight: height,
      height: height,
      boxShadow: 'none',
      cursor: state.selectProps.isDisabled ? 'not-allowed' : 'pointer',
      backgroundColor: state.isDisabled ? 'var(--light-color)' : 'var(--card-background)',
      '&:hover': {
        borderColor: state.isDisabled ? 'var(--border-color)' : 'var(--primary-color)'
      }
    }),
    valueContainer: (base: any) => ({
      ...base,
      minHeight: 'auto',
      height: '100%',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden'
    }),
    input: (base: any, state: any) => ({
      ...base,
      cursor: state.selectProps.isDisabled ? 'not-allowed' : 'pointer',
      color: state.selectProps.isDisabled ? 'var(--text-secondary)' : 'var(--text-color)'
    }),
    singleValue: (base: any, state: any) => {
      const customStyle = styles.singleValue ? styles.singleValue(base, state) : {};
      return {
        ...base,
        cursor: state.selectProps.isDisabled ? 'not-allowed' : 'pointer',
        color: state.selectProps.isDisabled ? 'var(--text-secondary)' : 'var(--text-color)',
        maxWidth: 'calc(100% - 40px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        margin: 0,
        padding: 0,
        ...customStyle
      };
    },
    placeholder: (base: any) => ({
      ...base,
      color: 'var(--text-secondary)',
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      margin: 0,
      padding: 0
    }),
    indicatorsContainer: (base: any) => ({
      ...base,
      minHeight: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
      margin: '0',
      flexShrink: 0
    }),
    dropdownIndicator: (base: any, state: any) => ({
      ...base,
      transition: 'all 0.2s ease',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      color: state.selectProps.isDisabled ? 'var(--text-secondary)' : 'var(--text-color)',
      '&:hover': {
        color: state.selectProps.isDisabled ? 'var(--text-secondary)' : 'var(--primary-color)'
      },
      padding: '0 4px',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }),
    separator: (base: any) => ({
      ...base,
      alignSelf: 'center',
      margin: '0 4px',
      height: '20px'
    }),
    clearIndicator: (base: any, state: any) => ({
      ...base,
      padding: '0 4px',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: state.isDisabled ? 'transparent' : '#999',
      opacity: isHovered ? 1 : 0,
      transition: 'opacity 0.2s ease, color 0.2s ease',
      '&:hover': {
        color: '#f44336'
      }
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: 'var(--border-radius)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? 'var(--primary-color)' : state.isFocused ? 'rgba(67,  97, 238, 0.05)' : 'white',
      color: state.isSelected ? 'white' : 'var(--text-color)',
      cursor: 'pointer',
      padding: '12px 16px',
      transition: 'background-color 0.2s ease',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      '&:active': {
        backgroundColor: 'rgba(67, 97, 238, 0.1)'
      }
    }),
    ...styles
  };

  return (
    <div
      className="custom-select-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Select
        {...props}
        styles={mergedStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        closeMenuOnSelect={true}
        blurInputOnSelect={true}
        onMenuClose={() => {
          setIsHovered(false);
          props.onMenuClose?.();
        }}
      />
    </div>
  );
}

export default CustomSelect;
