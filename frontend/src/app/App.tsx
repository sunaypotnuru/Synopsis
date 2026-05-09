import { RouterProvider } from "react-router";
import { useEffect } from "react";
import { router } from "./routes";
import InstallPrompt from "../components/shared/InstallPrompt";
import ErrorBoundary from "../components/shared/ErrorBoundary";
import { Toaster } from "../components/ui/sonner";
import { useAccessibilityStore } from "../lib/accessibility";
import { gamificationAPI } from "../lib/api";
import { useAuthStore } from "../lib/store";
import { useSettingsStore } from "../lib/settingsStore";
import { useThemeStore } from "../lib/themeStore";
import { FuturisticBackground } from "../components/shared/FuturisticBackground";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { AnimationProvider } from "../animations";

export default function App() {
  const { highContrast, largeText, reducedMotion } = useAccessibilityStore();
  const { user } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const { theme, isSeniorMode } = useThemeStore();

  useEffect(() => {
    if (import.meta.env.VITE_BYPASS_AUTH !== "true") {
      fetchSettings();
    }
  }, [fetchSettings]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", highContrast);
    root.classList.toggle("large-text", largeText);
    root.classList.toggle("reduced-motion", reducedMotion);
    root.classList.toggle("senior-mode", isSeniorMode);
    if (user && import.meta.env.VITE_BYPASS_AUTH !== "true") {
      gamificationAPI.trackLogin().catch(console.error);
    }
  }, [highContrast, largeText, reducedMotion, isSeniorMode, user]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <AnimationProvider>
        <WebSocketProvider>
          <FuturisticBackground />
          <RouterProvider router={router} />
          <InstallPrompt />
          <Toaster position="top-right" richColors />
        </WebSocketProvider>
      </AnimationProvider>
    </ErrorBoundary>
  );
}
