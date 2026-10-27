import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "liquid-btn-primary text-primary-foreground hover:-translate-y-[1px]",
        destructive:
          "bg-gradient-to-b from-rose-500 to-red-600 text-destructive-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_6px_16px_-3px_rgba(225,29,72,0.4)] hover:from-rose-400 hover:to-red-500 hover:-translate-y-[1px]",
        outline:
          "liquid-glass-pill text-foreground hover:bg-white/75 dark:hover:bg-white/10 hover:border-white/90 dark:hover:border-white/20 hover:-translate-y-[1px]",
        secondary:
          "bg-white/60 dark:bg-white/[0.08] backdrop-blur-md border border-white/60 dark:border-white/10 text-secondary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:bg-white/80 dark:hover:bg-white/[0.14]",
        ghost:
          "hover:bg-white/55 dark:hover:bg-white/[0.08] hover:backdrop-blur-md hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
