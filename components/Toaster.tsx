"use client";

// Tremor Toaster [v0.0.0]
import { useToast } from "@/lib/useToast";
import { Toast, ToastProvider, ToastViewport } from "./Toast";

const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="right" duration={3000}>
      {toasts.map((t) => {
        const { id, open = true, onOpenChange: _ignored, ...rest } = t as any;
        return (
          <Toast
            key={id}
            open={open}
            onOpenChange={(o) => { if (!o) dismiss(id); }}
            {...(rest as any)}
          />
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
};

export { Toaster };


