import React, { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fieldset } from '@headlessui/react';
import InputField from '../form/InputField';
import PointStick from '../PointStick';
import FieldLabel from '../form/FieldLabel';

export type StickInputProps = {
  onChange: (value: number) => void;
};

const schema = z.object({
  '100': z.number().int().min(0),
  '500': z.number().int().min(0),
  '1000': z.number().int().min(0),
  '5000': z.number().int().min(0),
  '10000': z.number().int().min(0),
  loan: z.number().step(10000).min(0),
});

export default function StickInput({ onChange }: StickInputProps) {
  const defaultValues = useMemo(
    () => ({
      '100': 0,
      '500': 0,
      '1000': 0,
      '5000': 0,
      '10000': 0,
      loan: 0,
    }),
    [],
  );

  const { register, formState, watch } = useForm({
    mode: 'onChange',
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    const { unsubscribe } = watch((value) => {
      const total =
        (value['100'] ?? 0) * 100 +
        (value['500'] ?? 0) * 500 +
        (value['1000'] ?? 0) * 1000 +
        (value['5000'] ?? 0) * 5000 +
        (value['10000'] ?? 0) * 10000 -
        (value.loan ?? 0);
      onChange(total);
    }, defaultValues);
    return unsubscribe;
  }, [watch, onChange, defaultValues]);

  return (
    <div>
      <Fieldset className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <FieldLabel label="100 Points" required />
          <PointStick value={100} style="traditional" />
          <InputField
            name="100"
            register={register}
            errors={formState.errors}
            type="number"
            min={0}
          />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel label="1000 Points" required />
          <PointStick value={1000} style="traditional" />
          <InputField
            name="1000"
            register={register}
            errors={formState.errors}
            type="number"
            min={0}
          />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel label="5000 Points" required />
          <PointStick value={5000} style="traditional" />
          <InputField
            name="5000"
            register={register}
            errors={formState.errors}
            type="number"
            min={0}
          />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel label="10000 Points" required />
          <PointStick value={10000} style="traditional" />
          <InputField
            name="10000"
            register={register}
            errors={formState.errors}
            type="number"
            min={0}
          />
        </div>

        <InputField
          name="loan"
          register={register}
          errors={formState.errors}
          type="number"
          label="Loaned Points"
          required
          min={0}
          step={10000}
        />
      </Fieldset>
    </div>
  );
}
