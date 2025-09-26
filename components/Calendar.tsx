'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export type Matcher = any;

type CalendarProps = React.ComponentProps<typeof DayPicker> & { className?: string };

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      weekStartsOn={1}
      className={className}
      classNames={{
        months: 'flex flex-row space-x-4 sm:space-x-6',
        month: 'space-y-2',
        caption: 'flex justify-between items-center py-2',
        caption_label: 'text-sm font-semibold text-gray-900 dark:text-gray-50',
        nav: 'flex items-center gap-2',
        nav_button:
          'h-8 w-8 inline-flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell:
          'w-9 text-[0.75rem] font-semibold text-gray-500 dark:text-gray-400 uppercase',
        row: 'flex w-full mt-1',
        cell: 'relative p-0 text-center text-sm',
        day: 'h-9 w-9 p-0 font-normal rounded-md hover:bg-gray-100 dark:hover:bg-gray-900',
        day_selected:
          'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 focus:bg-emerald-200',
        day_range_middle: 'bg-emerald-50 text-emerald-900',
        day_today: 'outline outline-1 outline-emerald-500',
        day_outside: 'text-gray-300 opacity-60',
        day_disabled: 'text-gray-400 opacity-50',
        day_hidden: 'invisible',
      }}
      {...props}
    />
  );
}

export { DayPicker as CalendarPrimitive };


