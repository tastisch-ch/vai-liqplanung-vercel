'use client';

import React from 'react';
import { cx } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, actions, className }: Props) {
  return (
    <div className={cx('sm:flex sm:items-center sm:justify-between sm:space-x-10', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="mt-4 sm:mt-0 flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default PageHeader;


