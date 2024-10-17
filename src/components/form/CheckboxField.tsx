import { Field, Label, Checkbox } from '@headlessui/react';
import React from 'react';
import { CheckIcon } from '@heroicons/react/16/solid';

export type CheckboxFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export default function CheckboxField({
  label,
  checked,
  onChange,
}: CheckboxFieldProps) {
  return (
    <Field className="flex items-center gap-2">
      <Checkbox
        className="group block size-4 rounded border bg-white data-[checked]:bg-blue-500"
        checked={checked}
        onChange={onChange}
      >
        <CheckIcon className="text-white opacity-0 group-data-[checked]:opacity-100" />
      </Checkbox>
      {label && (
        <Label className="block text-sm font-medium text-gray-900">
          {label}
        </Label>
      )}
    </Field>
  );
}
