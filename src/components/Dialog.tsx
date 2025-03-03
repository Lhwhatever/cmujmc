import React from 'react';
import {
  Dialog as HeadlessDialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Dialog({
  open,
  onClose,
  title,
  children,
}: DialogProps) {
  return (
    <HeadlessDialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="max-w-xl space-y-4 bg-white p-12">
            {title && <DialogTitle className="font-bold">{title}</DialogTitle>}
            {children}
          </DialogPanel>
        </div>
      </div>
    </HeadlessDialog>
  );
}
