
"use client"

import * as React from "react"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast as useToastPrimitive } from "@radix-ui/react-toast"

export const ToastContext = React.createContext<{
  toast: (props: ToastProps) => void;
  dismiss: (toastId?: string) => void;
}>({
  toast: () => {},
  dismiss: () => {},
})

export interface ToastInfo {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive" | "success" | "warning"
  duration?: number
}

export type ToastProps = Omit<ToastInfo, "id">

const ToastContainerInner = () => {
  const { toasts, toast, dismiss } = useToast()

  React.useEffect(() => {
    return () => {
      toasts.forEach((toast) => dismiss(toast.id))
    }
  }, [dismiss, toasts])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

export const ToastContainer = React.memo(ToastContainerInner)

// Store for toasts
type ToastActionType = 
  | { type: "ADD_TOAST"; toast: ToastInfo }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastInfo>; id: string }
  | { type: "DISMISS_TOAST"; id?: string }
  | { type: "REMOVE_TOAST"; id: string }

interface State {
  toasts: ToastInfo[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      id: toastId,
    })
  }, 1000)

  toastTimeouts.set(toastId, timeout)
}

const reducer = (state: State, action: ToastActionType): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { id } = action

      if (id) {
        addToRemoveQueue(id)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          id === undefined || t.id === id
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }

    case "REMOVE_TOAST":
      if (action.id === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

const dispatch = (action: ToastActionType) => {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    toasts: state.toasts,
    toast: React.useCallback(
      ({ title, description, variant = "default", action, ...props }: ToastProps) => {
        const id = crypto.randomUUID()
        
        dispatch({
          type: "ADD_TOAST",
          toast: {
            id,
            title,
            description,
            variant,
            action,
            open: true,
            ...props,
          },
        })

        return id
      },
      []
    ),
    dismiss: React.useCallback((toastId?: string) => {
      dispatch({ type: "DISMISS_TOAST", id: toastId })
    }, []),
  }
}

export const toast = {
  error: (description: string, options?: Omit<ToastProps, "description">) => {
    const { toast: toastFn } = useToast()
    return toastFn({ description, variant: "destructive", ...options })
  },
  success: (description: string, options?: Omit<ToastProps, "description">) => {
    const { toast: toastFn } = useToast()
    return toastFn({ description, variant: "success", ...options })
  },
  warning: (description: string, options?: Omit<ToastProps, "description">) => {
    const { toast: toastFn } = useToast()
    return toastFn({ description, variant: "warning", ...options })
  },
  info: (description: string, options?: Omit<ToastProps, "description">) => {
    const { toast: toastFn } = useToast()
    return toastFn({ description, ...options })
  },
}
