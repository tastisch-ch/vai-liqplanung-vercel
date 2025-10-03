"use client";

// Tremor toast state util per docs
import * as React from "react";

type Variant = "info" | "success" | "warning" | "error" | "loading";

type Toast = {
  id: string;
  title?: string;
  description?: React.ReactNode;
  variant?: Variant;
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type State = { toasts: Toast[] };

const memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];

function genId() { return Math.random().toString(36).slice(2); }

function dispatch(action: any) {
  switch (action.type) {
    case "ADD_TOAST":
      memoryState.toasts = [...memoryState.toasts, action.toast];
      break;
    case "UPDATE_TOAST":
      memoryState.toasts = memoryState.toasts.map((t) => t.id === action.toast.id ? { ...t, ...action.toast } : t);
      break;
    case "DISMISS_TOAST": {
      const id = action.toastId as string | undefined;
      memoryState.toasts = id ? memoryState.toasts.filter((t) => t.id !== id) : [];
      break;
    }
  }
  for (const l of listeners) l(memoryState);
}

function toast(props: Omit<Toast, "id">) {
  const id = genId();
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => { if (!open) dismiss(); },
    },
  });
  const duration = props.duration ?? 3000;
  if (duration > 0) {
    const timer = setTimeout(() => dismiss(), duration);
    // ensure timer cleared on manual dismiss
    const originalDismiss = dismiss;
    // override dismiss for this scope
    (dismiss as any) = () => { clearTimeout(timer); originalDismiss(); };
  }
  return { id, dismiss, update: (p: Partial<Toast>) => dispatch({ type: "UPDATE_TOAST", toast: { ...p, id } }) };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const i = listeners.indexOf(setState);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  return { ...state, toast, dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }) };
}

export { toast, useToast };


