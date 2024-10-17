import React from 'react';
import clsx from 'clsx';

export type TableHeadingProps = {
  scope: 'row' | 'col';
  children?: React.ReactNode;
  className?: string;
};

export function TableHeading({
  children,
  scope,
  className,
}: TableHeadingProps) {
  const classes = clsx(
    'px-6 py-3',
    scope == 'row' && 'font-medium text-gray-900 whitespace-nowrap',
    className,
  );
  return (
    <th scope={scope} className={classes}>
      {children}
    </th>
  );
}

export type TableCellProps = {
  children?: React.ReactNode;
  className?: string;
};

export function TableCell({ children, className }: TableCellProps) {
  return <td className={clsx('px-6 py-4', className)}>{children}</td>;
}

export type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;

export function TableRow({ children, ...props }: TableRowProps) {
  return <tr {...props}>{children}</tr>;
}

export type TableProps = {
  head?: React.ReactNode;
  children?: React.ReactNode;
  className?: React.ReactNode;
};

export default function Table({ head, children, className }: TableProps) {
  return (
    <div className={clsx('relative overflow-x-auto', className)}>
      <table className="w-full text-sm text-left rtl:text-right text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
          {head}
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
