'use client';

import * as React from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...classes: Array<string | undefined | false>) {
  return twMerge(clsx(classes));
}

export const TabNavigation = React.forwardRef<
  React.ElementRef<typeof NavigationMenu.Root>,
  Omit<React.ComponentPropsWithoutRef<typeof NavigationMenu.Root>, 'orientation' | 'defaultValue' | 'dir'>
>(({ className, children, ...props }, ref) => (
  <NavigationMenu.Root ref={ref} {...props}>
    <NavigationMenu.List
      className={cx(
        'flex items-center justify-start whitespace-nowrap border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'border-gray-200 dark:border-gray-800',
        className,
      )}
    >
      {children}
    </NavigationMenu.List>
  </NavigationMenu.Root>
));

TabNavigation.displayName = 'TabNavigation';

export const TabNavigationLink = React.forwardRef<
  React.ElementRef<typeof NavigationMenu.Link>,
  Omit<React.ComponentPropsWithoutRef<typeof NavigationMenu.Link>, 'onSelect'> & { disabled?: boolean; active?: boolean }
>(({ asChild, disabled, active, className, children, ...props }, ref) => (
  <NavigationMenu.Item className="flex" aria-disabled={disabled}>
    <NavigationMenu.Link
      aria-disabled={disabled}
      className={cx('group relative flex shrink-0 select-none items-center justify-center', disabled ? 'pointer-events-none' : '')}
      ref={ref}
      onSelect={() => {}}
      asChild={asChild}
      {...props}
    >
      <span
        className={cx(
          '-mb-px flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 pb-2 text-sm font-medium transition-all',
          'text-gray-500 dark:text-gray-500',
          'group-hover:text-gray-700 dark:group-hover:text-gray-400',
          'group-hover:border-gray-300 dark:group-hover:border-gray-400',
          active ? 'border-blue-500 text-blue-500' : '',
          className,
        )}
      >
        {children}
      </span>
    </NavigationMenu.Link>
  </NavigationMenu.Item>
));

TabNavigationLink.displayName = 'TabNavigationLink';


