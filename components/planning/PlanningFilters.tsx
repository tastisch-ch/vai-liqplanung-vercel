'use client';

import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';

export default function PlanningFilters() {
  return (
    <Card className="mx-auto">
      <div className="p-4 sm:p-6">
        <Tabs
          tabs={[
            { label: '6 Monate', value: '6m' },
            { label: '9 Monate', value: '9m' },
            { label: '12 Monate', value: '12m' },
          ]}
          value={'6m'}
          onChange={() => {}}
        />
      </div>
    </Card>
  );
}


