import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Bekreft',
  cancelText = 'Avbryt',
  confirmVariant = 'primary',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="text-slate-600 text-sm mb-6">
        {children}
      </div>
      <div className="flex justify-end items-center space-x-3 mt-4">
        <Button variant="secondary" onClick={onClose}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} autoFocus>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
