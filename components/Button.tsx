'use client';

import * as React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        // base
        'inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-tremor-brand-muted',
        // size
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3.5 py-2 text-sm',
        // variants
        variant === 'primary' && 'bg-gray-900 text-white hover:bg-black',
        variant === 'secondary' && 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
        variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700',
        variant === 'outline' && 'bg-transparent text-gray-900 border border-gray-300 hover:bg-gray-50',
        className,
      )}
    />
  );
}

export default Button;


