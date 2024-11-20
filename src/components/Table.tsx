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
    'px-3 py-3',
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
  colSpan?: number;
  rowSpan?: number;
};

export function TableCell({
  children,
  className,
  colSpan,
  rowSpan,
}: TableCellProps) {
  return (
    <td
      className={clsx('px-3 py-4', className)}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      {children}
    </td>
  );
}

export type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;

export function TableRow({ children, ...props }: TableRowProps) {
  return <tr {...props}>{children}</tr>;
}

export type TableProps = {
  head?: React.ReactNode;
  foot?: React.ReactNode;
  children?: React.ReactNode;
  className?: React.ReactNode;
  caption?: React.ReactNode;
};

export default function Table({
  head,
  children,
  className,
  foot,
  caption,
}: TableProps) {
  return (
    <div className={clsx('relative overflow-x-auto', className)}>
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 table-fixed">
        {head && (
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            {head}
          </thead>
        )}
        <tbody>{children}</tbody>
        {foot && (
          <tfoot className="text-xs text-gray-700 bg-gray-100">{foot}</tfoot>
        )}
        {caption && <caption className="caption-bottom">{caption}</caption>}
      </table>
    </div>
  );
}
