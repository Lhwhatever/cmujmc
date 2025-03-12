import React from 'react';
import { Label } from '@headlessui/react';

export interface FieldLabelProps {
  label?: React.ReactNode;
  required?: boolean;
}

export default function FieldLabel({ label, required }: FieldLabelProps) {
  return (
    <>
      {label && (
        <Label className="block text-sm font-medium text-gray-900">
          {label}
          {required && '*'}
        </Label>
      )}
    </>
  );
}
