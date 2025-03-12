import React, { ElementType } from 'react';
import clsx from 'clsx';
import {
  Button as HeadlessButton,
  ButtonProps as HeadlessButtonProps,
} from '@headlessui/react';

export const buttonColorStyles = {
  outlined: {
    green: {
      enabled: 'text-green-700 border-green-700 data-[hover]:bg-green-800',
      disabled: 'text-gray-400 border-gray-300',
    },
    yellow: {
      enabled: 'text-yellow-400 border-yellow-400 data-[hover]:bg-yellow-500',
      disabled: 'text-gray-400 border-gray-300',
    },
    red: {
      enabled: 'text-red-400 border-red-400 data-[hover]:bg-red-500',
      disabled: 'text-gray-400 border-gray-300',
    },
    blue: {
      enabled: 'text-blue-700 border-blue-700 data-[hover]:bg-blue-800',
      disabled: 'text-gray-400 border-gray-300',
    },
  },
  filled: {
    green: {
      enabled: `bg-green-600 data-[hover]:bg-green-800`,
      disabled: 'bg-green-400',
    },
    yellow: {
      enabled: 'bg-yellow-600 data-[hover]:bg-yellow-800',
      disabled: 'bg-yellow-400',
    },
    red: {
      enabled: 'bg-red-600 data-[hover]:bg-red-800',
      disabled: 'bg-red-400',
    },
    blue: {
      enabled: 'bg-blue-600 data-[hover]:bg-blue-800',
      disabled: 'bg-blue-400',
    },
  },
};

export type ButtonProps<TTag extends ElementType = 'button'> =
  HeadlessButtonProps<TTag> & {
    children?: React.ReactNode;
    color: 'yellow' | 'green' | 'red' | 'blue';
    fill: keyof typeof buttonColorStyles;
    icon?: boolean;
    disabled?: boolean;
    className?: string;
    roundSided?: 'right';
  };

export default function Button<TTag extends ElementType = 'button'>({
  color,
  fill,
  disabled,
  icon,
  roundSided,
  className,
  ...other
}: ButtonProps<TTag>) {
  const combinedClassName = clsx(
    'font-medium text-sm inline-flex items-center border',
    icon && 'rounded-lg p-1',
    !icon && 'px-5 py-2.5',
    !icon && roundSided === 'right' && 'rounded-r-lg',
    !icon && roundSided === undefined && 'rounded-lg',
    fill === 'outlined' && !disabled && 'data-[hover]:text-white',
    fill === 'filled' && !disabled && 'text-white',
    buttonColorStyles[fill][color][disabled ? 'disabled' : 'enabled'],
    disabled && 'cursor-not-allowed',
    className,
  );

  return <HeadlessButton className={combinedClassName} {...other} />;
}
