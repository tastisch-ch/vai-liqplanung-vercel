'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...classes: Array<string | undefined | false>) {
  return twMerge(clsx(classes));
}

export interface CardProps extends React.ComponentPropsWithoutRef<'div'> {
  asChild?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, ref) => {
    const Component = asChild ? Slot : 'div';
    return (
      <Component
        ref={ref}
        className={cx(
          // base
          'relative w-full rounded-lg border p-6 text-left shadow-xs',
          // background color
          'bg-white dark:bg-[#090E1A]',
          // border color
          'border-gray-200 dark:border-gray-900',
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';


