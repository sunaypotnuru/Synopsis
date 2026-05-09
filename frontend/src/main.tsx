import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "@/app/App";
import "./styles/index.css";
import { AuthProvider } from "@/app/contexts/AuthContext";
import "./lib/i18n";
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://dummy@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0,
});

// Register Service Worker for PWA
// import { registerSW } from 'virtual:pwa-register';
// if ('serviceWorker' in navigator) {
//   registerSW({ immediate: true });
// }

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div className="p-4 text-red-500">A fatal application error occurred. Sentry has been notified.</div>}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

