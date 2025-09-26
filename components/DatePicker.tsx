'use client';

import * as React from 'react';
import { Calendar as CalendarPrimitive } from './Calendar';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import { type Locale } from 'date-fns';

export type DateRange = DayPickerDateRange;

type Props = {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  fromDate?: Date;
  toDate?: Date;
  enableYearNavigation?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
  locale?: Locale;
  presets?: { label: string; dateRange: DateRange }[];
  translations?: { cancel?: string; apply?: string; range?: string };
  className?: string;
  id?: string;
  name?: string;
};

export function DateRangePicker({ value, onChange, fromDate, toDate, enableYearNavigation, disabled=false, hasError=false, placeholder='Set date', locale, presets, translations, className, id, name }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [temp, setTemp] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  React.useEffect(() => { setTemp(value); }, [value]);

  const display = React.useMemo(() => {
    const from = value?.from ? value.from.toLocaleDateString() : '';
    const to = value?.to ? value.to.toLocaleDateString() : '';
    return from && to ? `${from} – ${to}` : placeholder;
  }, [value, placeholder]);

  return (
    <div ref={ref} className={className} id={id}>
      <button
        name={name}
        type="button"
        onClick={() => !disabled && setOpen((s) => !s)}
        className={`w-full outline-hidden text-left whitespace-nowrap truncate rounded-tremor-default transition duration-100 border pr-8 py-2 shadow-tremor-input pl-3 relative bg-tremor-background dark:bg-dark-tremor-background hover:bg-tremor-background-muted dark:hover:bg-dark-tremor-background-muted text-tremor-content-emphasis dark:text-dark-tremor-content-emphasis border-tremor-border dark:border-dark-tremor-border ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${hasError ? 'ring-2 ring-red-200 border-red-500' : 'focus:ring-2 focus:border-tremor-brand-subtle focus:ring-tremor-brand-muted dark:focus:border-dark-tremor-brand-subtle dark:focus:ring-dark-tremor-brand-muted'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
      >
        <svg className="flex-none shrink-0 h-5 w-5 -ml-0.5 mr-2 inline text-tremor-content-subtle dark:text-dark-tremor-content-subtle" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
        <span className="truncate align-middle">{display}</span>
        <span className="absolute inset-y-0 right-0 flex items-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-tremor-content-subtle dark:text-dark-tremor-content-subtle"><path d="M12 13.171 16.95 8.222 18.364 9.636 12 16l-6.364-6.364L7.05 8.222z"/></svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 rounded-tremor-default border border-tremor-border bg-white p-3 shadow-lg dark:border-dark-tremor-border dark:bg-dark-tremor-background">
          <div className="flex gap-4">
            {presets && presets.length > 0 && (
              <div className="w-40 flex flex-col gap-1 pr-3 border-r border-gray-200 dark:border-gray-800">
                <div className="text-xs text-gray-500 mb-1">{translations?.range ?? 'Range'}</div>
                {presets.map((p)=> (
                  <button key={p.label} className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={()=> setTemp(p.dateRange)}>{p.label}</button>
                ))}
              </div>
            )}
            <CalendarPrimitive
              mode="range"
              selected={temp}
              onSelect={(r) => setTemp(r)}
              fromDate={fromDate}
              toDate={toDate}
              weekStartsOn={1}
              numberOfMonths={2}
              captionLayout={enableYearNavigation ? 'dropdown' : 'buttons'}
              fromYear={fromDate?.getFullYear() ?? 2010}
              toYear={(toDate ?? new Date()).getFullYear() + 1}
              locale={locale}
              className="rdp-tremor"
              modifiersClassNames={{
                selected: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
                range_start: 'bg-emerald-200 text-emerald-900',
                range_end: 'bg-emerald-200 text-emerald-900',
                range_middle: 'bg-emerald-50 text-emerald-900',
                today: 'ring-1 ring-emerald-500',
                outside: 'text-gray-300',
              }}
              disabled={(date: Date)=> (toDate ? date > toDate : false) || (fromDate ? date < fromDate : false)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={()=> { setTemp(value); setOpen(false); }}>{translations?.cancel ?? 'Cancel'}</button>
            <button className="px-3 py-1.5 text-sm rounded-md bg-gray-900 text-white hover:bg-black" onClick={()=> { onChange?.(temp); setOpen(false); }}>{translations?.apply ?? 'Apply'}</button>
          </div>
        </div>
      )}
    </div>
  );
}


