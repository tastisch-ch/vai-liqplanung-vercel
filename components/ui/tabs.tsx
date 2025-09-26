'use client';

import * as React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...classes: Array<string | undefined | false>) {
  return twMerge(clsx(classes));
}

export type SimpleTab = { label: string; value: string };

type TabsProps = {
  tabs: SimpleTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cx('w-full overflow-x-auto', className)}>
      <div className="flex border-b space-x-4 border-gray-200 dark:border-gray-800" role="tablist" aria-orientation="horizontal">
        {tabs.map((t) => {
          const selected = value === t.value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={selected}
              className={cx(
                'flex whitespace-nowrap truncate max-w-xs outline-none text-sm transition duration-100 -mb-px px-2 py-2',
                selected
                  ? 'border-b-2 border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
                  : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
              )}
              onClick={() => onChange(t.value)}
              type="button"
            >
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


