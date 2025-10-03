"use client";

// Tremor toast state util (closely following docs)
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
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function genId() { return Math.random().toString(36).slice(2); }

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
      const id = action.toastId as string | undefined;
      if (id) {
        memoryState.toasts = memoryState.toasts.map((t) =>
          t.id === id ? { ...t, open: false } : t,
        );
      } else {
        memoryState.toasts = memoryState.toasts.map((t) => ({ ...t, open: false }));
      }
      break;
    }
    case "REMOVE_TOAST": {
      const id = action.toastId as string | undefined;
      if (id) {
        memoryState.toasts = memoryState.toasts.filter((t) => t.id !== id);
      } else {
        memoryState.toasts = [];
      }
      break;
    }
  }
  for (const l of listeners) l(memoryState);
}

function toast(props: Omit<Toast, "id">) {
  const id = genId();
  const dismiss = () => {
    dispatch({ type: "DISMISS_TOAST", toastId: id });
    const timeout = timers.get(id);
    if (timeout) clearTimeout(timeout);
    timers.set(
      id,
      setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId: id }), 200),
    );
  };
  const duration = props.duration ?? 3000;
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => { if (!open) dismiss(); },
    },
  });
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(), duration),
    );
  }
  const update = (p: Partial<Toast>) => dispatch({ type: "UPDATE_TOAST", toast: { ...p, id } });
  return { id, dismiss, update };
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


