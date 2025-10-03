"use client";

// Tremor Toaster [v0.0.0]
import { useToast } from "@/lib/useToast";
import { Toast, ToastProvider, ToastViewport } from "./Toast";

const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="right" duration={3000}>
      {toasts.map(({ id, duration, ...props }) => (
        <Toast key={id} {...(props as any)} onOpenChange={(open) => { if (!open) dismiss(id); }} />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};

export { Toaster };


