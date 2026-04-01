import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 font-body",
        className
      )}
      {...props}
    />
  )
}

function InputWithIcon({ className, icon, ...props }: React.ComponentProps<"input"> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <Input
        className={cn("pl-10", className)}
        {...props}
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        {icon}
      </div>
    </div>
  )
}

export { Input, InputWithIcon }
