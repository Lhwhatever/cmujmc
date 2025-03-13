import { useFormatter, DateTimeFormatOptions, useNow } from 'next-intl';

interface AbsoluteVariantProps {
  date: Date;
  relative?: false;
  format?: DateTimeFormatOptions;
}

const AbsoluteVariant = ({ date, format }: AbsoluteVariantProps) => {
  const formatter = useFormatter();
  return <>{formatter.dateTime(date, format)}</>;
};

interface RelativeVariantProps {
  date: Date;
  relative: true;
  format?: DateTimeFormatOptions;
  refreshMs?: number;
}

const RelativeVariant = ({
  date,
  format,
  refreshMs = 60000,
}: RelativeVariantProps) => {
  const formatter = useFormatter();
  const now = useNow({ updateInterval: refreshMs });

  return <>{formatter.relativeTime(date, { now, ...format })}</>;
};

type Variants = RelativeVariantProps | AbsoluteVariantProps;

export type DateTimeProps = Variants;

export default function DateTime(props: DateTimeProps) {
  return (
    <time dateTime={props.date.toISOString()}>
      {props.relative ? (
        <RelativeVariant
          date={props.date}
          relative={true}
          refreshMs={props.refreshMs}
          format={props.format}
        />
      ) : (
        <AbsoluteVariant date={props.date} format={props.format} />
      )}
    </time>
  );
}
