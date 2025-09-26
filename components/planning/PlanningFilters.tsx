'use client';

import { TabGroup, TabList, Tab } from '@tremor/react';
import { Card } from '@/components/ui/card';

export default function PlanningFilters() {
  return (
    <Card className="mx-auto">
      <div className="p-4 sm:p-6">
        <TabGroup index={0}>
          <TabList className="w-full overflow-x-auto border-b border-gray-200 dark:border-gray-800">
            <Tab>6 Monate</Tab>
            <Tab>9 Monate</Tab>
            <Tab>12 Monate</Tab>
          </TabList>
        </TabGroup>
      </div>
    </Card>
  );
}


