'use client';

import { Tab, TabGroup, TabList } from '@tremor/react';

type TabKey = 'monthly' | 'quarterly' | 'yearly';

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

export default function PlanningTabs({ activeTab, onTabChange }: Props) {
  const tabs: TabKey[] = ['monthly', 'quarterly', 'yearly'];
  const index = tabs.indexOf(activeTab);

  return (
    <div className="relative rounded-tremor-default border border-tremor-border bg-tremor-background shadow-tremor-input dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:shadow-dark-tremor-input">
      <div className="border-b border-tremor-border p-4 sm:p-6 dark:border-dark-tremor-border">
        <TabGroup index={index} onIndexChange={(i) => onTabChange(tabs[i] ?? 'monthly')}>
          <TabList className="w-full overflow-x-auto">
            <Tab>3 Monate</Tab>
            <Tab>9 Monate</Tab>
            <Tab>1 Jahr</Tab>
          </TabList>
        </TabGroup>
      </div>
    </div>
  );
}


