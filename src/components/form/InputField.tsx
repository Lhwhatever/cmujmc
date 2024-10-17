import { Input, Field } from '@headlessui/react';
import React from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import { IFieldProps } from './baseTypes';
import clsx from 'clsx';
import FieldLabel from './FieldLabel';

export type InputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = IFieldProps<TFieldValues, TFieldName> & {
  valueAsNumber?: true;
};

export default function InputField<
  TFieldValues extends FieldValues = FieldValues,
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  required,
  register,
  name,
  errors,
  valueAsNumber,
}: InputFieldProps<TFieldValues, TFieldName>) {
  const error = errors[name]?.message;

  const inputClass = clsx(
    'block bg-gray-50 border text-sm rounded-lg w-full p-2.5',
    error ? 'border-red-500 text-red-500' : 'border-gray-300 text-gray-900',
  );

  return (
    <Field>
      <FieldLabel label={label} required={required} />
      <Input
        className={inputClass}
        {...register(name, {
          required,
          valueAsNumber,
        })}
      />
      {error && <div className="text-red-500 text-xs">{error as string}</div>}
    </Field>
  );
}