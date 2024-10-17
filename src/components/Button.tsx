import React from 'react';
import clsx from 'clsx';
import { Button as HeadlessButton } from '@headlessui/react';

const colorStyles = {
  outlined: {
    green: 'text-green-400 border-green-400 data-[hover]:bg-green-500',
    yellow: 'text-yellow-400 border-yellow-400 data-[hover]:bg-yellow-500',
    red: 'text-red-400 border-red-400 data-[hover]:bg-red-500',
  },
  filled: {
    green: `bg-green-600 data-[hover]:bg-green-800`,
    yellow: 'bg-yellow-600 data-[hover]:bg-yellow-800',
    red: 'bg-red-600 data-[hover]:bg-red-800',
  },
};

export type ButtonProps = {
  onClick?: () => void;
  leftIcon?: React.ReactNode;
  children?: React.ReactNode;
  color: 'yellow' | 'green' | 'red';
  fill: keyof typeof colorStyles;
};

export default function Button({
  children,
  leftIcon,
  onClick,
  color,
  fill,
}: ButtonProps) {
  const className = clsx(
    'font-medium rounded-lg text-sm px-5 py-2.5 text-center',
    fill === 'outlined' && 'border data-[hover]:text-white',
    fill === 'filled' && 'text-white border',
    colorStyles[fill][color],
  );

  return (
    <HeadlessButton onClick={onClick} className={className}>
      {leftIcon ? (
        <div className="flex flex-row">
          {leftIcon} <div>{children}</div>
        </div>
      ) : (
        children
      )}
    </HeadlessButton>
  );
}
