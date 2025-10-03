"use client";

// Tremor Toaster [v0.0.0]
import { useToast } from "@/lib/useToast";
import { Toast, ToastProvider, ToastViewport } from "./Toast";

const Toaster = () => {
  const { toasts, dismiss, toast } = useToast();

  return (
    <ToastProvider swipeDirection="right" duration={3000}>
      {toasts.map((t) => {
        const { id, open = true, onOpenChange, duration, ...rest } = t as any;
        return (
          <Toast
            key={id}
            open={open}
            duration={duration ?? 3000}
            onOpenChange={(o) => {
              if (typeof onOpenChange === 'function') onOpenChange(o);
              if (!o) dismiss(id);
            }}
            {...(rest as any)}
          />
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
};

export { Toaster };


