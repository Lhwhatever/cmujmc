import { Key } from 'react';
import { Field, Select } from '@headlessui/react';
import FieldLabel from './FieldLabel';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

export type Option = string | number | readonly string[];

export interface RadioGroupFieldProps<T extends Option> {
  label?: string;
  getKey?: (_t: T, _index: number) => Key;
  displayOption: (_: T) => string;
  options: T[];
  value: T;
  onChange: (_: T) => void;
  required?: boolean;
}

export default function SelectField<T extends Option>({
  label,
  options,
  getKey,
  value,
  onChange,
  displayOption,
  required,
}: RadioGroupFieldProps<T>) {
  const selectClass = clsx(
    'block w-full appearance-none rounded-lg border text-sm p-2.5 bg-gray-50',
    'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-green/25',
  );

  return (
    <Field>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <Select className={selectClass} value={value}>
          {options.map((option, index) => (
            <option
              value={option}
              key={getKey ? getKey(option, index) : index}
              onClick={() => onChange(option)}
            >
              {displayOption(option)}
            </option>
          ))}
        </Select>
        <ChevronDownIcon
          className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-black/60"
          aria-hidden="true"
        />
      </div>
    </Field>
  );
}
