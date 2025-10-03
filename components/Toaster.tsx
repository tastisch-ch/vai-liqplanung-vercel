"use client";

// Tremor Toaster [v0.0.0]
import { useToast } from "@/lib/useToast";
import { Toast, ToastProvider, ToastViewport } from "./Toast";

const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="right" duration={3000}>
      {toasts.map(({ id, open, ...props }) => (
        <Toast key={id} open onOpenChange={(o)=>{ if(!o) dismiss(id); }} {...(props as any)} />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};

export { Toaster };


