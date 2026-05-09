"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";
import { useThemeStore } from "@/lib/themeStore";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useThemeStore();

  return (
    <Sonner
      theme={theme === "system" ? "system" : theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
