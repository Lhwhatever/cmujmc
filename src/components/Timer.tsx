import { useNow } from 'next-intl';

export interface TimerProps {
  endDate: Date;
  className?: string;
  refreshMs?: number;
}

export default function Timer({ endDate, className, refreshMs }: TimerProps) {
  const now = useNow({ updateInterval: refreshMs ?? 50 });

  const timeLeft = endDate.valueOf() - now.valueOf();
  const timerText = String(Math.max(Math.floor(timeLeft / 1000), 0));

  return <div className={className}>{timerText}</div>;
}
