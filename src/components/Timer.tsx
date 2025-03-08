import { useState } from 'react';
import { useInterval } from 'react-use';

export interface TimerProps {
  endDate: Date;
  className?: string;
  frameRate?: number;
}

const getTimeLeft = (endDate: Date): number => endDate.valueOf() - Date.now();
const getTimerText = (endDate: Date): string =>
  String(Math.max(Math.floor(getTimeLeft(endDate) / 1000), 0));

export default function Timer({ endDate, className, frameRate }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState('');
  const timerInterval = Math.round(1000 / (frameRate ?? 20));

  useInterval(() => setSecondsLeft(getTimerText(endDate)), timerInterval);

  return <div className={className}>{secondsLeft}</div>;
}
