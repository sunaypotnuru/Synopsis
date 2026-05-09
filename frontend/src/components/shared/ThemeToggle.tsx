import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore } from "@/lib/themeStore";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "text-white hover:text-white/80 hover:bg-white/10" }: { className?: string }) {
    const { theme, setTheme } = useThemeStore();

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className={`rounded-full w-10 h-10 transition-colors ${className}`}
            title={`Current theme: ${theme} (Click to change)`}
        >
            {theme === 'light' && <Sun className="w-5 h-5" />}
            {theme === 'dark' && <Moon className="w-5 h-5" />}
            {theme === 'system' && <Monitor className="w-5 h-5" />}
        </Button>
    );
}
