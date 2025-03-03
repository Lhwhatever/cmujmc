import { Input, Field, Description } from '@headlessui/react';
import React from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import { IFieldProps } from './baseTypes';
import clsx from 'clsx';
import FieldLabel from './FieldLabel';
import _ from 'lodash';

interface VariantText {
  type?: 'text';
}

interface VariantNumber {
  type: 'number';
  step?: number;
  min?: number;
  max?: number;
  defaultValue?: number;
}

interface VariantDatetime {
  type: 'datetime-local';
  min?: Date;
  max?: Date;
}

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
> = IFieldProps<TFieldValues, TFieldName> &
  Variants & {
    rightButton?: React.ReactNode;
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
  description,
  rightButton,
  ...variant
}: InputFieldProps<TFieldValues, TFieldName>) {
  const error = _.get(errors, name)?.message;

  const inputClass = clsx(
    'block bg-gray-50 border text-sm w-full p-2.5',
    error ? 'border-red-500 text-red-500' : 'border-gray-300 text-gray-900',
    rightButton ? 'rounded-l-lg' : 'rounded-lg',
  );

  const [props, options] = dispatchVariants(variant);

  return (
    <Field>
      <FieldLabel label={label} required={required} />

      {description && (
        <Description className="text-sm text-gray-600">
          {description}
        </Description>
      )}
      <div className="flex flex-row">
        <Input
          className={inputClass}
          {...props}
          {...register(name, { required, ...options })}
        />
        {rightButton}
      </div>
      {error && <div className="text-red-500 text-xs">{error as string}</div>}
    </Field>
  );
}
