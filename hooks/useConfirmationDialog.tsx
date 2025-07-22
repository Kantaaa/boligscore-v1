import React, { useState, useCallback } from 'react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

type ConfirmationOptions = {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

export const useConfirmationDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleClose = () => {
    if (resolvePromise) {
      resolvePromise(false);
    }
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (resolvePromise) {
      resolvePromise(true);
    }
    setIsOpen(false);
  };
  
  const Dialog = (
    options && (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={options.title}
            confirmText={options.confirmText}
            cancelText={options.cancelText}
            confirmVariant={options.confirmVariant}
        >
            {options.message}
        </ConfirmationDialog>
    )
  );

  return { confirm, Dialog };
};
