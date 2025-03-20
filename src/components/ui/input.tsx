
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Reset validation state when form resets
    React.useEffect(() => {
      const inputRef = ref as React.RefObject<HTMLInputElement>;
      if (inputRef?.current) {
        // Set up a custom event listener for form resets
        const onReset = () => {
          if (inputRef.current) {
            // Remove any ARIA attributes that might be set for validation
            inputRef.current.removeAttribute('aria-invalid');
            // Reset custom validity
            inputRef.current.setCustomValidity('');
          }
        };
        
        const form = inputRef.current.closest('form');
        form?.addEventListener('reset', onReset);
        
        return () => {
          form?.removeEventListener('reset', onReset);
        };
      }
    }, [ref]);
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
