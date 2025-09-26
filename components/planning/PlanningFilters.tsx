'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { DateRangePicker, type DateRange } from '@/components/DatePicker';
import { addMonths } from 'date-fns';

export default function PlanningFilters() {
  // Default: 6 Monate ab morgen
  const tomorrow = React.useMemo(() => {
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(0,0,0,0); return t;
  }, []);
  const defaultRange: DateRange = React.useMemo(() => ({ from: tomorrow, to: addMonths(tomorrow, 6) }), [tomorrow]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);
  // emit custom event so page can pick up range changes
  React.useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    const ev = new CustomEvent('planning:date-range', { detail: dateRange });
    window.dispatchEvent(ev);
  }, [dateRange]);
  const presets = React.useMemo(() => ([
    { label: '6 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 6) } },
    { label: '9 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 9) } },
    { label: '12 Monate', dateRange: { from: tomorrow, to: addMonths(tomorrow, 12) } },
  ]), [tomorrow]);
  return (
    <Card className="mx-auto">
      <div className="p-6 pt-0">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-50">Zeitraum</label>
        <div className="mt-2 w-60">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-60"
            presets={presets}
          />
        </div>
      </div>
    </Card>
  );
}


