"use client";

// Tremor Toast [v1.0.0]
// Source adapted from Tremor docs: https://tremor.so/docs/ui/toast

import React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiErrorWarningFill,
  RiInformationFill,
  RiLoader2Fill,
} from "@remixicon/react";

import { cx } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, forwardedRef) => (
  <ToastPrimitives.Viewport
    ref={forwardedRef}
    className={cx(
      "fixed right-0 top-0 z-[9999] m-0 flex w-full max-w-[96vw] list-none flex-col gap-2 p-[var(--viewport-padding)] [--viewport-padding:_12px] sm:max-w-sm",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

interface ActionProps {
  label: string;
  altText: string;
  onClick: () => void | Promise<void>;
}

export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  variant?: "info" | "success" | "warning" | "error" | "loading";
  title?: string;
  description?: string;
  action?: ActionProps;
  disableDismiss?: boolean;
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(
  (
    {
      className,
      variant,
      title,
      description,
      action,
      disableDismiss = false,
      ...props
    }: ToastProps,
    forwardedRef,
  ) => {
    let Icon: React.ReactNode;
    switch (variant) {
      case "success":
        Icon = (
          <RiCheckboxCircleFill
            className="size-5 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
        );
        break;
      case "warning":
        Icon = (
          <RiErrorWarningFill
            className="size-5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
        );
        break;
      case "error":
        Icon = (
          <RiCloseCircleFill
            className="size-5 shrink-0 text-red-600"
            aria-hidden="true"
          />
        );
        break;
      case "loading":
        Icon = (
          <RiLoader2Fill
            className="size-5 shrink-0 animate-spin text-gray-600"
            aria-hidden="true"
          />
        );
        break;
      default:
        Icon = (
          <RiInformationFill
            className="size-5 shrink-0 text-blue-500"
            aria-hidden="true"
          />
        );
        break;
    }

    return (
      <ToastPrimitives.Root
        ref={forwardedRef}
        className={cx(
          "flex items-center gap-3 w-full overflow-hidden rounded-md border shadow-lg shadow-black/5 max-w-[22rem]",
          "bg-white px-3 py-2", // compact height
          "border-gray-200",
          "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
          "data-[state=open]:animate-slide-left-and-fade",
          "data-[state=closed]:animate-hide",
          className,
        )}
        {...props}
      >
        {Icon}
        <div className="flex min-w-0 flex-1 items-center">
          <div className="min-w-0">{/* text block */}
            {title && (
              <ToastPrimitives.Title className="text-sm font-semibold text-gray-900 truncate">
                {title}
              </ToastPrimitives.Title>
            )}
            {description && (
              <ToastPrimitives.Description className="text-sm text-gray-600 truncate">
                {description}
              </ToastPrimitives.Description>
            )}
          </div>
        </div>
        {!disableDismiss && (
          <ToastPrimitives.Close asChild aria-label="Close">
            <button className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-50 text-gray-500 hover:text-gray-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </ToastPrimitives.Close>
        )}
      </ToastPrimitives.Root>
    );
  },
);

Toast.displayName = "Toast";

type ToastActionElement = ActionProps;

export { Toast, ToastProvider, ToastViewport, type ToastActionElement };


