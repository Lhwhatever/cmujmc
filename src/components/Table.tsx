import React from "react";
import clsx from 'clsx';

export type HeadingProps = {
  scope: 'row' | 'col';
  children?: React.ReactNode;
}

function Heading({ children, scope }: HeadingProps) {
  const className = clsx(
    'px-6 py-3',
    scope == 'row' && 'font-medium text-gray-900 whitespace-nowrap'
  );
  return (
    <th scope={scope} className={className}>{children}</th>
  )
}

export type RowProps = {
  children?: React.ReactNode;
}

export type CellProps = {
  children?: React.ReactNode;
}

function Cell({ children }: CellProps) {
  return (<td className="px-6 py-4">{children}</td>)
}

function Row({ children }: RowProps) {
  return (
    <tr>
      {children}
    </tr>
  )
}

export type Props = {
  head?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Table({ head, children }: Props) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
        {head}
        </thead>
        <tbody>
        {children}
        </tbody>
      </table>
    </div>
  )
}

Table.Row = Row;
Table.Heading = Heading;
Table.Cell = Cell;