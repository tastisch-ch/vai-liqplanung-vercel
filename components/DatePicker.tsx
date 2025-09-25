'use client';

import * as React from 'react';
import { DayPicker, DateRange as RDateRange } from 'react-day-picker';

export type DateRange = RDateRange;

type Props = {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  fromDate?: Date;
  toDate?: Date;
  className?: string;
  id?: string;
  name?: string;
};

export function DateRangePicker({ value, onChange, fromDate, toDate, className, id, name }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const display = React.useMemo(() => {
    const from = value?.from ? value.from.toLocaleDateString('de-CH') : '';
    const to = value?.to ? value.to.toLocaleDateString('de-CH') : '';
    return from && to ? `${from} – ${to}` : from ? `${from} –` : 'Zeitraum wählen';
  }, [value]);

  return (
    <div ref={ref} className={className} id={id}>
      <button
        name={name}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full outline-none text-left whitespace-nowrap truncate rounded-tremor-default focus:ring-2 transition duration-100 border pr-8 py-2 shadow-tremor-input focus:border-tremor-brand-subtle focus:ring-tremor-brand-muted dark:shadow-dark-tremor-input dark:focus:border-dark-tremor-brand-subtle dark:focus:ring-dark-tremor-brand-muted pl-3 bg-tremor-background dark:bg-dark-tremor-background hover:bg-tremor-background-muted dark:hover:bg-dark-tremor-background-muted text-tremor-content-emphasis dark:text-dark-tremor-content-emphasis border-tremor-border dark:border-dark-tremor-border relative"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg className="flex-none shrink-0 h-5 w-5 -ml-0.5 mr-2 inline text-tremor-content-subtle dark:text-dark-tremor-content-subtle" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
        <span className="truncate align-middle">{display}</span>
        <span className="absolute inset-y-0 right-0 flex items-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-tremor-content-subtle dark:text-dark-tremor-content-subtle"><path d="M12 13.171 16.95 8.222 18.364 9.636 12 16l-6.364-6.364L7.05 8.222z"/></svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 rounded-tremor-default border border-tremor-border bg-white p-2 shadow-lg dark:border-dark-tremor-border dark:bg-dark-tremor-background">
          <DayPicker
            mode="range"
            selected={value}
            onSelect={(r) => onChange?.(r)}
            fromDate={fromDate}
            toDate={toDate}
            weekStartsOn={1}
            numberOfMonths={1}
          />
        </div>
      )}
    </div>
  );
}


