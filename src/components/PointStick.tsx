import clsx from 'clsx';

const circleSizeClasses = {
  [1]: 'w-1 h-1',
  [2]: 'w-1.5 h-1.5',
  [3]: 'w-2 h-2',
};

const circleFillColors = {
  white: 'bg-white',
  dark: 'bg-slate-700',
  red: 'bg-red-700',
  green: 'bg-green-800',
};

interface CircleProps {
  size: keyof typeof circleSizeClasses;
  fill: keyof typeof circleFillColors;
}

const Circle = ({ size, fill }: CircleProps) => {
  return (
    <div
      className={clsx(
        circleFillColors[fill],
        circleSizeClasses[size],
        'rounded-full',
      )}
    />
  );
};

export type PointStickProps =
  | { value: 100; style: 'traditional' }
  | { value: 100; style: 'modern' }
  | { value: 500; style: 'modern' }
  | { value: 1000; style: 'traditional' }
  | { value: 1000; style: 'modern' }
  | { value: 5000; style: 'traditional' }
  | { value: 5000; style: 'modern' }
  | { value: 10000; style: 'traditional' }
  | { value: 10000; style: 'modern' };

const getBgColor = (props: PointStickProps): string => {
  if (props.style === 'traditional') {
    return 'bg-white';
  }
  switch (props.value) {
    case 100:
      return 'bg-white';
    case 500:
      return 'bg-green-700';
    case 1000:
      return 'bg-blue-700';
    case 5000:
      return 'bg-yellow-400';
    case 10000:
      return 'bg-red-700';
  }
};

export default function PointStick(props: PointStickProps) {
  const bgs: (keyof typeof circleFillColors)[] =
    props.style === 'traditional' ? ['red', 'green'] : ['white', 'white'];

  return (
    <div
      className={clsx(
        'max-w-40 w-full h-4 border border-gray-800 flex flex-row justify-center items-center gap-0.5 rounded-sm',
        getBgColor(props),
      )}
    >
      {(props.value === 100 || props.value === 500) && (
        <>
          {new Array(4).fill(0).map((_, i) => {
            const fill = props.value === 100 ? 'dark' : 'white';
            return (
              <div className="flex flex-col justify-center gap-px" key={i}>
                <Circle size={1} fill={fill} />
                <Circle size={1} fill={fill} />
              </div>
            );
          })}
        </>
      )}
      {props.value === 1000 && <Circle size={2} fill={bgs[0]} />}
      {props.value === 5000 && (
        <>
          <div className="flex flex-col justify-center gap-px">
            <Circle size={1} fill={bgs[0]} />
            <Circle size={1} fill={bgs[0]} />
          </div>
          <Circle size={2} fill={bgs[0]} />
          <div className="flex flex-col justify-center gap-px">
            <Circle size={1} fill={bgs[0]} />
            <Circle size={1} fill={bgs[0]} />
          </div>
        </>
      )}
      {props.value === 10000 && (
        <>
          <div className="mx-2">
            <Circle size={3} fill={bgs[1]} />
          </div>
          <Circle size={1} fill={bgs[0]} />
          <div className="flex flex-col justify-center gap-px">
            <Circle size={1} fill={bgs[0]} />
            <Circle size={1} fill={bgs[0]} />
          </div>
          <Circle size={2} fill={bgs[1]} />
          <div className="flex flex-col justify-center gap-px">
            <Circle size={1} fill={bgs[0]} />
            <Circle size={1} fill={bgs[0]} />
          </div>
          <Circle size={1} fill={bgs[0]} />
          <div className="mx-2">
            <Circle size={3} fill={bgs[1]} />
          </div>
        </>
      )}
    </div>
  );
}
