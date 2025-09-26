'use client';

import { Card } from '@/components/ui/card';
import { TabNavigation, TabNavigationLink } from '@/components/ui/tab-navigation';

export default function PlanningFilters() {
  return (
    <Card className="mx-auto">
      <div className="p-4 sm:p-6">
        <TabNavigation>
          <TabNavigationLink href="#" active>
            6 Monate
          </TabNavigationLink>
          <TabNavigationLink href="#">9 Monate</TabNavigationLink>
          <TabNavigationLink href="#">12 Monate</TabNavigationLink>
        </TabNavigation>
      </div>
    </Card>
  );
}


