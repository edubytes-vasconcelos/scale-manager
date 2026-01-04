import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button Variants
 * - Usa tokens semânticos (primary, success, warning, destructive, info)
 * - Totalmente compatível com shadcn/ui e dark mode
 * - Hierarquia visual clara (ação principal > secundária > destrutiva)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 " +
    "transition-colors hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        /* =========================
           PRIMARY (ação principal)
        ========================== */
        default:
          "bg-primary text-primary-foreground border border-primary " +
          "hover:bg-primary/90",

        /* =========================
           SUCCESS (confirmar / aceitar)
        ========================== */
        success:
          "bg-success text-success-foreground border border-success " +
          "hover:bg-success/90",

        /* =========================
           WARNING (atenção / pendente)
        ========================== */
        warning:
          "bg-warning text-warning-foreground border border-warning " +
          "hover:bg-warning/90",

        /* =========================
           DESTRUCTIVE (recusar / erro)
        ========================== */
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive " +
          "hover:bg-destructive/90",

        /* =========================
           OUTLINE (neutro)
        ========================== */
        outline:
          "bg-transparent border border-border text-foreground " +
          "hover:bg-muted/10",

        /* =========================
           DESTRUCTIVE OUTLINE
        ========================== */
        "destructive-outline":
          "bg-transparent border border-destructive text-destructive " +
          "hover:bg-destructive/10",

        /* =========================
           SECONDARY
        ========================== */
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary " +
          "hover:bg-secondary/80",

        /* =========================
           GHOST
        ========================== */
        ghost:
          "bg-transparent border border-transparent text-foreground " +
          "hover:bg-muted/10",
      },

      /**
       * Heights são "min-height" para suportar conteúdo dinâmico
       */
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
