import React from 'react';
import clsx from 'clsx';

const styles = {
  h1: 'text-5xl font-extrabold',
  h2: 'text-4xl font-bold',
  h3: 'text-3xl font-bold',
  h4: 'text-2xl font-bold',
  h5: 'text-xl font-bold',
  h6: 'text-lg font-bold',
};

export type HeadingProps = {
  level: keyof typeof styles;
  children?: React.ReactNode;
  className?: string;
};

export default function Heading({ level, children, className }: HeadingProps) {
  return React.createElement(
    level,
    {
      className: clsx(styles[level], className),
    },
    children,
  );
}
