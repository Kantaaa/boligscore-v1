
import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'; // Added 5xl
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl', // Added 5xl
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out"
      onClick={onClose} // Close on backdrop click
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`bg-white rounded-lg shadow-xl m-4 w-full ${sizeClasses[size]} transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow flex flex-col`}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200">
          <h2 id="modal-title" className="text-xl font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Lukk modal"
          >
            &times;
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto max-h-[75vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
