'use client';

import { Card, TabGroup, TabList, Tab } from '@tremor/react';

export default function PlanningFilters() {
  return (
    <Card className="rounded-tremor-default border border-tremor-border bg-tremor-background shadow-tremor-input dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:shadow-dark-tremor-input">
      <div className="border-b border-tremor-border p-4 sm:p-6 dark:border-dark-tremor-border">
        <TabGroup index={0}>
          <TabList className="w-full overflow-x-auto">
            <Tab>6 Monate</Tab>
            <Tab>9 Monate</Tab>
            <Tab>12 Monate</Tab>
          </TabList>
        </TabGroup>
      </div>
    </Card>
  );
}


