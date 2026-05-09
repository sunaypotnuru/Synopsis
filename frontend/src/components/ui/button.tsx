import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
        outline:
          "border border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:text-gray-200 dark:hover:text-gray-100",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 dark:hover:text-gray-100 transition-colors duration-300",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-3 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={loading || disabled}
        className={cn(buttonVariants({ variant, size, className }), "relative")}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && children}
        {loading && "Please wait..."}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

