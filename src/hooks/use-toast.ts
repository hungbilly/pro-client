
import { 
  Toast, 
  ToastActionElement, 
  ToastProps 
} from "@/components/ui/toast"

import {
  useToast as useToastUI
} from "@/components/ui/use-toast"

type ToastOptions = Partial<
  Pick<Toast, "id" | "title" | "description" | "action" | "className">
>

const useToast = () => {
  const { toast: toastUI } = useToastUI()

  function toast({
    title,
    description,
    action,
    ...props
  }: ToastOptions) {
    toastUI({
      title,
      description,
      action,
      ...props,
    })
  }

  toast.error = (message: string, options?: Omit<ToastOptions, "description">) => {
    toast({
      variant: "destructive",
      title: options?.title || "Error",
      description: message,
      ...options,
    })
  }

  toast.success = (message: string, options?: Omit<ToastOptions, "description">) => {
    toast({
      title: options?.title || "Success",
      description: message,
      ...options,
    })
  }

  toast.warning = (message: string, options?: Omit<ToastOptions, "description">) => {
    toast({
      variant: "warning",
      title: options?.title || "Warning",
      description: message,
      ...options,
    })
  }

  toast.info = (message: string, options?: Omit<ToastOptions, "description">) => {
    toast({
      title: options?.title || "Info",
      description: message,
      ...options,
    })
  }

  return { toast }
}

export { useToast, useToastUI as useToastOriginal }
