export type ParagraphProps = {
  children: string | undefined | null;
};

export default function Text({ children }: ParagraphProps) {
  const lines = children?.split('\n');
  return (
    <>
      {lines?.map((line, idx) => (
        <p key={idx} className="text-gray-500 mb-3">
          {line}
        </p>
      ))}
    </>
  );
}
