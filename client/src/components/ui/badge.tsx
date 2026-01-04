import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge Variants
 * - Usa tokens semânticos (primary, success, warning, destructive, info)
 * - Fundo sempre suave (color/10)
 * - Texto e borda semânticos
 * - Compatível com shadcn/ui e dark mode
 */
const badgeVariants = cva(
  // Badges nunca devem quebrar linha
  "whitespace-nowrap inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 " +
    "text-xs font-semibold transition-colors " +
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
    "hover-elevate",
  {
    variants: {
      variant: {
        /* =========================
           PRIMARY
        ========================== */
        default:
          "bg-primary/10 text-primary border-primary/20",

        /* =========================
           SUCCESS (Confirmado)
        ========================== */
        success:
          "bg-success/10 text-success border-success/20",

        /* =========================
           WARNING (Pendente)
        ========================== */
        warning:
          "bg-warning/10 text-warning border-warning/20",

        /* =========================
           DESTRUCTIVE (Recusado / Erro)
        ========================== */
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20",

        /* =========================
           INFO (Neutro / Dados)
        ========================== */
        info:
          "bg-info/10 text-info border-info/20",

        /* =========================
           SECONDARY (menos usado)
        ========================== */
        secondary:
          "bg-secondary/10 text-secondary-foreground border-secondary/20",

        /* =========================
           OUTLINE (neutro)
        ========================== */
        outline:
          "bg-transparent text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
