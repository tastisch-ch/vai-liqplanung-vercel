'use client';

import * as React from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export type Matcher = any;

type CalendarProps = React.ComponentProps<typeof DayPicker> & { className?: string };

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={className}
      weekStartsOn={1}
      {...props}
    />
  );
}

export { DayPicker as CalendarPrimitive };


