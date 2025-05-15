
import * as React from "react";

// Define base interface first
interface ToastProps {
  variant?: "default" | "destructive" | "warning";
  className?: string;
}

// Define ToastActionElement
type ToastActionElement = React.ReactElement;

// Define base Toast interface without circular reference
interface ToastInfo {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  className?: string;
  duration?: number;
  variant?: "default" | "destructive" | "warning"; // Add variant property here
}

// Extend ToastInfo to create the ToasterToast interface
interface ToasterToast extends ToastInfo {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: ToastProps["variant"];
}

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: string;
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// Define the toast function type and implementation
function toast(props: ToastInfo) {
  const id = props.id || genId();

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

// Helper functions for different toast types
toast.error = (message: string, options: Omit<ToastInfo, "description"> = {}) => {
  return toast({
    ...options,
    variant: "destructive",
    title: options.title || "Error",
    description: message,
  });
};

toast.success = (message: string, options: Omit<ToastInfo, "description"> = {}) => {
  return toast({
    ...options,
    variant: "default", // Default variant for success messages
    title: options.title || "Success",
    description: message,
  });
};

toast.warning = (message: string, options: Omit<ToastInfo, "description"> = {}) => {
  return toast({
    ...options,
    variant: "warning",
    title: options.title || "Warning",
    description: message,
  });
};

toast.info = (message: string, options: Omit<ToastInfo, "description"> = {}) => {
  return toast({
    ...options,
    variant: "default", // Default variant for info messages
    title: options.title || "Info",
    description: message,
  });
};

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    toast,
    toasts: state.toasts,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

// Export all necessary types and functions
export type { ToastProps, ToastActionElement, ToastInfo };
export { toast, useToast };
