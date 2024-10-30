import {
  FieldErrors,
  FieldPath,
  FieldValues,
  UseFormRegister,
} from 'react-hook-form';
import React from 'react';

export interface IFieldProps<
  TFieldValues extends FieldValues,
  TFieldName extends FieldPath<TFieldValues>,
> {
  name: TFieldName;
  label?: React.ReactNode;
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
  required?: boolean;
  description?: React.ReactNode;
}
