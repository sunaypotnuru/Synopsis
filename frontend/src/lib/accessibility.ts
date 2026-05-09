import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccessibilityState {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    voiceReader: boolean;
    toggleHighContrast: () => void;
    toggleLargeText: () => void;
    toggleReducedMotion: () => void;
    toggleVoiceReader: (enabled?: boolean) => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
    persist(
        (set) => ({
            highContrast: false,
            largeText: false,
            reducedMotion: false,
            voiceReader: false,
            toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
            toggleLargeText: () => set((state) => ({ largeText: !state.largeText })),
            toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
            toggleVoiceReader: (enabled) => set((state) => ({ 
                voiceReader: enabled !== undefined ? enabled : !state.voiceReader 
            })),
        }),
        {
            name: 'netra-accessibility-storage',
        }
    )
);
