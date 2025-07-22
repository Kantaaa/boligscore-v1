
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string; // Added placeholder prop
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', wrapperClassName = '', placeholder, ...props }) => {
  return (
    <div className={`mb-4 ${wrapperClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        id={id}
        className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm ${className} ${error ? 'border-red-500' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;