
import { useToast as useToastOriginal, type ToastProps } from "@/components/ui/toast"
import { toast as toastOriginal } from "@/components/ui/use-toast"

export const useToast = useToastOriginal
export const toast = toastOriginal
export type { ToastProps }
