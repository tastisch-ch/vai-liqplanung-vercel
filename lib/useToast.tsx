"use client";

// Minimal Tremor toast state util (from docs), scoped to app needs
import * as React from "react";

type ToastVariant = "info" | "success" | "warning" | "error" | "loading";

type ToastItem = {
  id: string;
  title?: string;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type State = {
  toasts: ToastItem[];
};

const memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];

function genId() {
  return Math.random().toString(36).slice(2);
}

function dispatch(action: any) {
  switch (action.type) {
    case "ADD_TOAST": {
      memoryState.toasts = [...memoryState.toasts, action.toast];
      break;
    }
    case "UPDATE_TOAST": {
      memoryState.toasts = memoryState.toasts.map((t) =>
        t.id === action.toast.id ? { ...t, ...action.toast } : t,
      );
      break;
    }
    case "DISMISS_TOAST": {
      const id = action.toastId;
      memoryState.toasts = id
        ? memoryState.toasts.filter((t) => t.id !== id)
        : [];
      break;
    }
  }
  listeners.forEach((l) => l(memoryState));
}

function toast(props: Omit<ToastItem, "id">) {
  const id = genId();
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss();
      },
    },
  });
  // auto close
  const duration = props.duration ?? 3000;
  if (duration > 0) setTimeout(dismiss, duration);
  return { id, dismiss, update: (p: Partial<ToastItem>) => dispatch({ type: "UPDATE_TOAST", toast: { ...p, id } }) };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const i = listeners.indexOf(setState);
      if (i > -1) listeners.splice(i, 1);
    };
  }, [state]);
  return { ...state, toast, dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }) };
}

export { toast, useToast };


