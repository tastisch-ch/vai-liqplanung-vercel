'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { TabNavigation, TabNavigationLink } from '@/components/ui/tab-navigation';
import { DateRangePicker, type DateRange } from '@/components/DatePicker';

type Props = {
  value: '6m' | '9m' | '12m';
  onChange: (v: '6m' | '9m' | '12m') => void;
};

export default function PlanningFilters({ value, onChange }: Props) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  return (
    <Card className="mx-auto">
      <div className="p-4 sm:p-6">
        <TabNavigation>
          <TabNavigationLink href="#" active={value === '6m'} onClick={(e) => { e.preventDefault(); onChange('6m'); }}>
            6 Monate
          </TabNavigationLink>
          <TabNavigationLink href="#" active={value === '9m'} onClick={(e) => { e.preventDefault(); onChange('9m'); }}>
            9 Monate
          </TabNavigationLink>
          <TabNavigationLink href="#" active={value === '12m'} onClick={(e) => { e.preventDefault(); onChange('12m'); }}>
            12 Monate
          </TabNavigationLink>
        </TabNavigation>
      </div>
      <div className="p-6 pt-0">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-50">Zeitraum</label>
        <div className="mt-2 w-60">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            className="w-60"
          />
        </div>
      </div>
    </Card>
  );
}


