import { create } from 'zustand';
import { settingsAPI } from './api';

export interface TeamMember {
    name: string;
    role: string;
    details: string;
}

export interface PlatformSettings {
    github_url: string;
    linkedin_url: string;
    twitter_url: string;
    team_members: TeamMember[];
    [key: string]: unknown;
}

interface SettingsState {
    settings: PlatformSettings;
    isLoading: boolean;
    error: string | null;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: PlatformSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    settings: {
        github_url: "https://github.com/sunaypotnuru",
        linkedin_url: "https://www.linkedin.com/in/sunay-potnuru-81384a380/",
        twitter_url: "https://twitter.com",
        team_members: [
            {
                name: "Sunay Potnuru",
                role: "Founder & Lead Developer",
                details: "Architecture, AI model, full-stack development"
            }
        ]
    },
    isLoading: false,
    error: null,
    fetchSettings: async () => {
        try {
            set({ isLoading: true, error: null });
            const data = await settingsAPI.getPlatformSettings();
            set({ settings: data as PlatformSettings, isLoading: false });
        } catch (err: unknown) {
            // Only log if it's not a 403 Forbidden (which is expected for non-admin users)
            const error = err as { response?: { status?: number } };
            if (error?.response?.status !== 403) {
                console.error('Failed to fetch platform settings', err);
            }
            // Keeps the default settings intact
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
    },
    updateSettings: async (newSettings: PlatformSettings) => {
        try {
            set({ isLoading: true, error: null });
            await settingsAPI.updatePlatformSettings(newSettings);
            set({ settings: newSettings, isLoading: false });
        } catch (err) {
            console.error('Failed to update platform settings', err);
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
            throw err;
        }
    }
}));
