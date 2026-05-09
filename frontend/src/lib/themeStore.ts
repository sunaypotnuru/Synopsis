import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isSeniorMode: boolean;
    setSeniorMode: (active: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'light',
            setTheme: (theme) => set({ theme }),
            isSeniorMode: false,
            setSeniorMode: (isSeniorMode) => set({ isSeniorMode }),
        }),
        {
            name: 'netra-theme-storage',
        }
    )
);
