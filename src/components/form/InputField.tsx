import { Input, Field } from '@headlessui/react';
import React from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import { IFieldProps } from './baseTypes';
import clsx from 'clsx';
import FieldLabel from './FieldLabel';
import _ from 'lodash';

type VariantText = {
  type?: 'text';
};

type VariantNumber = {
  type: 'number';
  step?: number;
  min?: number;
  max?: number;
  defaultValue?: number;
};

type VariantDatetime = {
  type: 'datetime-local';
  min?: Date;
  max?: Date;
};

type Variants = VariantText | VariantNumber | VariantDatetime;

const dispatchVariants = (v: Variants) => {
  switch (v.type) {
    case undefined:
    case 'text':
      return [{ type: 'text' }, {}];
    case 'number':
      return [v, { valueAsNumber: true }];
    case 'datetime-local':
      return [
        {
          type: 'datetime-local',
          min: v.min?.toISOString(),
          max: v.max?.toISOString(),
        },
        { valueAsDate: true },
      ];
  }
};

export type InputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = IFieldProps<TFieldValues, TFieldName> & Variants;

export default function InputField<
  TFieldValues extends FieldValues = FieldValues,
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  required,
  register,
  name,
  errors,
  ...variant
}: InputFieldProps<TFieldValues, TFieldName>) {
  const error = _.get(errors, name)?.message;

  const inputClass = clsx(
    'block bg-gray-50 border text-sm rounded-lg w-full p-2.5',
    error ? 'border-red-500 text-red-500' : 'border-gray-300 text-gray-900',
  );

  const [props, options] = dispatchVariants(variant);

  return (
    <Field>
      <FieldLabel label={label} required={required} />
      <Input
        className={inputClass}
        {...props}
        {...register(name, { required, ...options })}
      />
      {error && <div className="text-red-500 text-xs">{error as string}</div>}
    </Field>
  );
}
