import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-accent/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-background hover:bg-accent-hover active:bg-accent/90 shadow-sm hover:shadow-md focus-visible:ring-accent/60",
        outline:
          "border-accent/40 text-accent bg-accent/5 hover:bg-accent/15 hover:border-accent/60 active:bg-accent/20",
        secondary:
          "bg-surface-hover text-text-primary border border-border hover:bg-surface-active hover:border-border-hover active:bg-surface",
        ghost:
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-active",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50 active:bg-destructive/25 focus-visible:ring-destructive/40",
        link: "text-accent underline-offset-4 hover:underline hover:text-accent-hover",
      },
      size: {
        default:
          "h-9 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1.5 rounded-md px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 gap-2 px-5 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xl: "h-11 gap-2.5 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs":
          "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        "duration-150"
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
