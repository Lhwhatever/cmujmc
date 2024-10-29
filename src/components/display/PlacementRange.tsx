import React from 'react';
import clsx from 'clsx';

const placementColors = [
  undefined,
  'bg-yellow-300',
  'bg-gray-300',
  'bg-amber-500',
  'bg-rose-300',
];

export type PlacementProps = {
  placement: number;
};

export const Placement = ({ placement }: PlacementProps) => {
  const styles = clsx(
    'text-sm rounded-full w-4 h-4 flex justify-center items-center text-black',
    placementColors[placement],
  );
  return <div className={styles}>{placement}</div>;
};

export type PlacementRangeProps = {
  min: number;
  max: number;
};

export default function PlacementRange({ min, max }: PlacementRangeProps) {
  return (
    <div className="flex flex-row justify-center items-center">
      <Placement placement={min} />
      {min !== max && (
        <>
          <div className="px-1 text-sm">~</div>
          <Placement placement={max} />
        </>
      )}
    </div>
  );
}
