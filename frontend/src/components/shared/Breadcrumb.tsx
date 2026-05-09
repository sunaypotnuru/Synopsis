import { Link, useLocation } from "react-router";
import { ChevronRight, Home } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function Breadcrumb() {
  const location = useLocation();
  const { t } = useTranslation();

  // Don't show breadcrumb on home or auth pages
  if (
    location.pathname === "/" ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/signup")
  ) {
    return null;
  }

  // Parse pathname into segments
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    
    // Format segment name
    let name = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Special cases for better naming
    const nameMap: Record<string, string> = {
      "patient": t("breadcrumb.patient", "Patient Portal"),
      "doctor": t("breadcrumb.doctor", "Doctor Portal"),
      "admin": t("breadcrumb.admin", "Admin Portal"),
      "dashboard": t("breadcrumb.dashboard", "Dashboard"),
      "models": t("breadcrumb.models", "AI Models"),
      "scan": t("breadcrumb.scan", "Anemia Detection"),
      "cataract-scan": t("breadcrumb.cataract", "Cataract Scan"),
      "dr-scan": t("breadcrumb.dr", "Retinopathy Scan"),
      "mental-health": t("breadcrumb.mental_health", "Mental Health"),
      "parkinsons-voice": t("breadcrumb.parkinsons", "Parkinson's Voice"),
      "doctors": t("breadcrumb.doctors", "Find Doctors"),
      "hospitals": t("breadcrumb.hospitals", "Hospitals"),
      "appointments": t("breadcrumb.appointments", "Appointments"),
      "history": t("breadcrumb.history", "Medical History"),
      "profile": t("breadcrumb.profile", "Profile"),
      "messages": t("breadcrumb.messages", "Messages"),
      "settings": t("breadcrumb.settings", "Settings"),
    };

    name = nameMap[segment] || name;

    return { name, path, isLast: index === pathSegments.length - 1 };
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6 px-4 sm:px-6">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-[#0D9488] transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbItems.map((item) => (
        <div key={item.path} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.isLast ? (
            <span className="font-medium text-[#0F172A] dark:text-white">
              {item.name}
            </span>
          ) : (
            <Link
              to={item.path}
              className="hover:text-[#0D9488] transition-colors"
            >
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
