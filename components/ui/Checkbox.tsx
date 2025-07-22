
import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  wrapperClassName?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, id, wrapperClassName = '', className = '', ...props }) => {
  return (
    <div className={`flex items-center ${wrapperClassName} mb-4`}>
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 text-green-600 border-slate-300 rounded focus:ring-green-500 ${className}`}
        {...props}
      />
      <label htmlFor={id} className="ml-2 block text-sm text-slate-700">
        {label}
      </label>
    </div>
  );
};

export default Checkbox;