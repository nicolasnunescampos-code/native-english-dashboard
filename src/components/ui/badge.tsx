import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-white/25 bg-primary/90 text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_2px_8px_-2px_rgba(0,112,243,0.35)] hover:bg-primary",
        secondary:
          "border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/10 text-secondary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-none hover:bg-white/80 dark:hover:bg-white/15",
        destructive:
          "border-white/25 bg-destructive/90 text-destructive-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_8px_-2px_rgba(225,29,72,0.35)] hover:bg-destructive",
        outline:
          "liquid-glass-pill text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
