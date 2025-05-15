
"use client"

import * as React from "react"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast as useToastOriginal } from "@/components/ui/use-toast"

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
  variant?: "default" | "destructive" | "success"
  duration?: number
}

export type ToastProps = Omit<ToastInfo, "id">

const ToastContainerInner = () => {
  const { toasts, toast, dismiss } = useToastOriginal()

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

export function useToast() {
  const { toast, dismiss } = useToastOriginal()
  
  return {
    toast: React.useCallback(
      ({ title, description, variant = "default", action, ...props }: ToastProps) => {
        return toast({ title, description, variant, action, ...props })
      },
      [toast]
    ),
    dismiss,
  }
}

export const toast = {
  error: (description: string, options?: Omit<ToastProps, "description">) => {
    useToastOriginal().toast({ description, variant: "destructive", ...options })
  },
  success: (description: string, options?: Omit<ToastProps, "description">) => {
    useToastOriginal().toast({ description, variant: "success", ...options })
  },
  info: (description: string, options?: Omit<ToastProps, "description">) => {
    useToastOriginal().toast({ description, ...options })
  },
  warning: (description: string, options?: Omit<ToastProps, "description">) => {
    useToastOriginal().toast({ description, variant: "destructive", ...options })
  },
}
