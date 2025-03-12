import clsx from 'clsx';

export interface ParagraphProps {
  className?: string;
  children: string | undefined | null;
}

export default function Text({ children, className }: ParagraphProps) {
  const lines = children?.split('\n');
  return (
    <>
      {lines?.map((line, idx) => (
        <p key={idx} className={clsx('text-gray-500', className)}>
          {line}
        </p>
      ))}
    </>
  );
}
