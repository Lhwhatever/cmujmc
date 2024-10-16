import React from 'react';
import clsx from 'clsx';

export type ButtonProps = {
  onClick?: () => void;
  children?: React.ReactNode;
  color?: 'none';
}

export default function Button({ children, onClick }: ButtonProps) {
  const className = clsx(
    'text-yellow-400 border border-yellow-400',
    'font-medium rounded-lg text-sm',
    'px-5 py-2.5 text-center',
    'hover:text-white hover:bg-yellow-500',
    'focus:ring-4 focus:outline-none focus:ring-yellow-300',
  );

  return <button type="button" onClick={onClick} className={className}>
    {children}
  </button>
}