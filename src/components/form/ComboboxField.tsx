import React, { useState } from 'react';
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Field,
} from '@headlessui/react';
import FieldLabel from './FieldLabel';
import clsx from 'clsx';

type DummyEntryProps = {
  children?: React.ReactNode;
};

const DummyEntry = ({ children }: DummyEntryProps) => {
  return <div className="block px-4 py-2 text-gray-600">{children}</div>;
};

type OptionsProps<T, K extends React.Key> = {
  onChange: (value: T) => void;
  keyOf?: (value: T) => K;
  options: T[];
  displayValue: (value: T) => string;
};

const Options = <T, K extends React.Key>({
  options,
  onChange,
  displayValue,
  keyOf,
}: OptionsProps<T, K>) => {
  if (options.length === 0) {
    return <DummyEntry>No options available.</DummyEntry>;
  }

  return (
    <>
      {options.map((option, idx) => (
        <ComboboxOption
          value={option}
          key={keyOf ? keyOf(option) : idx}
          className="block px-4 py-2 data-[focus]:bg-gray-100 data-[hover]:bg-gray-100 cursor-pointer"
          onClick={() => onChange(option)}
          order={idx}
        >
          {displayValue(option)}
        </ComboboxOption>
      ))}
    </>
  );
};

export type ComboboxFieldProps<T, K extends React.Key> = {
  onChange: (value: T) => void;
  keyOf?: (value: T) => K;
  options: T[] | null;
  displayValue: (value: T) => string;
  label?: string;
  required?: boolean;
  value: T;
  query: string;
  onQueryChange: (query: string) => void;
};

export default function ComboboxField<T, K extends React.Key>({
  label,
  required,
  value,
  onChange,
  onQueryChange,
  displayValue,
  options,
  keyOf,
}: ComboboxFieldProps<T, K>) {
  const [isDirty, setIsDirty] = useState(false);
  const hasErrors = (value === null && isDirty && required)!;

  const inputClasses = clsx(
    'block bg-gray-50 border text-sm rounded-lg w-full p-2.5',
    hasErrors ? 'border-red-500' : 'border-gray-300',
  );

  return (
    <Field>
      <FieldLabel label={label} required={required} />
      <Combobox
        immediate
        value={value}
        onChange={onChange}
        onClose={() => onQueryChange('')}
      >
        <ComboboxInput
          aria-label={label}
          displayValue={displayValue}
          onBlur={() => setIsDirty(true)}
          onChange={(event) => onQueryChange(event.target.value)}
          required={required}
          className={inputClasses}
        />
        <ComboboxOptions
          anchor="bottom"
          className="border mt-1 empty:invisible bg-white rounded-lg w-auto"
        >
          {options === null ? (
            <DummyEntry>Loading...</DummyEntry>
          ) : (
            <Options
              options={options}
              onChange={onChange}
              keyOf={keyOf}
              displayValue={displayValue}
            />
          )}
        </ComboboxOptions>
      </Combobox>
      {hasErrors && (
        <div className="text-xs text-red-500">Cannot be empty!</div>
      )}
    </Field>
  );
}
