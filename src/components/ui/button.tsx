import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_3px_0_0] shadow-primary/30 hover:shadow-[0_1px_0_0] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px]",
        outline:
          "border border-border bg-card text-foreground hover:bg-secondary hover:border-foreground/20 active:scale-[0.98]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive:
          "bg-destructive text-white shadow-[0_3px_0_0] shadow-destructive/30 hover:shadow-[0_1px_0_0] hover:translate-y-[2px]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        link: "underline-offset-4 hover:underline text-primary p-0 h-auto shadow-none rounded-none",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
