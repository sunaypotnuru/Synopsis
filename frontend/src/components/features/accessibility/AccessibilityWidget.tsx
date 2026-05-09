import { useState, useEffect } from 'react';
import { Accessibility, Type, Contrast, X, Keyboard, Eye, Palette, ZoomIn, ZoomOut, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from "react-i18next";
import { useAccessibilityStore } from "@/lib/accessibility";

interface AccessibilitySettings {
    highContrast: boolean;
    largeText: boolean;
    fontSize: number;
    keyboardNav: boolean;
    screenReader: boolean;
    colorBlindMode: string;
    reducedMotion: boolean;
    focusIndicator: boolean;
}

export function AccessibilityWidget() {
  const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<AccessibilitySettings>({
        highContrast: false,
        largeText: false,
        fontSize: 100,
        keyboardNav: true,
        screenReader: false,
        colorBlindMode: 'none',
        reducedMotion: false,
        focusIndicator: true
    });

    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('accessibility-settings');
        if (saved) {
            try {
                setSettings(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load accessibility settings', e);
            }
        }
    }, []);

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    }, [settings]);

    // Apply high contrast
    useEffect(() => {
        if (settings.highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }, [settings.highContrast]);

    // Apply large text
    useEffect(() => {
        if (settings.largeText) {
            document.documentElement.classList.add('large-text');
        } else {
            document.documentElement.classList.remove('large-text');
        }
    }, [settings.largeText]);

    // Apply font size
    useEffect(() => {
        document.documentElement.style.fontSize = `${settings.fontSize}%`;
    }, [settings.fontSize]);

    // Apply color blind mode
    useEffect(() => {
        document.documentElement.classList.remove('protanopia', 'deuteranopia', 'tritanopia', 'monochrome');
        if (settings.colorBlindMode !== 'none') {
            document.documentElement.classList.add(settings.colorBlindMode);
        }
    }, [settings.colorBlindMode]);

    // Apply reduced motion
    useEffect(() => {
        if (settings.reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    }, [settings.reducedMotion]);

    // Apply focus indicator
    useEffect(() => {
        if (settings.focusIndicator) {
            document.documentElement.classList.add('enhanced-focus');
        } else {
            document.documentElement.classList.remove('enhanced-focus');
        }
    }, [settings.focusIndicator]);

    // Keyboard navigation
    useEffect(() => {
        if (!settings.keyboardNav) return;

        const handleKeyPress = (e: KeyboardEvent) => {
            // Skip to main content (Alt + M)
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                const main = document.querySelector('main');
                if (main) {
                    (main as HTMLElement).focus();
                    main.scrollIntoView({ behavior: 'smooth' });
                }
            }
            // Open accessibility menu (Alt + A)
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                setIsOpen(true);
            }
            // Close on Escape
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [settings.keyboardNav, isOpen]);

    const updateSetting = <K extends keyof AccessibilitySettings>(
        key: K,
        value: AccessibilitySettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const { 
        voiceReader, 
        toggleVoiceReader, 
        highContrast, 
        toggleHighContrast,
        largeText,
        toggleLargeText,
        reducedMotion,
        toggleReducedMotion
    } = useAccessibilityStore();

    const resetSettings = () => {
        setSettings({
            highContrast: false,
            largeText: false,
            fontSize: 100,
            keyboardNav: true,
            screenReader: false,
            colorBlindMode: 'none',
            reducedMotion: false,
            focusIndicator: true
        });
        if (voiceReader) toggleVoiceReader(false);
        if (highContrast) toggleHighContrast();
        if (largeText) toggleLargeText();
        if (reducedMotion) toggleReducedMotion();
    };

    return (
        <>
            {/* Skip to main content link */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
                aria-label={t('components.accessibility_widget.skip_to_main_content', "Skip to main content")}
            >{t('components.accessibility_widget.skip_to_main_content', "Skip to main content")}</a>

            {/* Floating A11y Button */}
            <motion.button
                className="fixed top-24 right-0 z-50 bg-slate-900 text-white p-3 rounded-l-xl shadow-lg border-y border-l border-slate-700 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onClick={() => setIsOpen(true)}
                aria-label={t('components.accessibility_widget.open_accessibility_options_alt_aria-label_26', "Open Accessibility Options (Alt + A)")}
                aria-expanded={isOpen}
                whileHover={{ x: -4 }}
                tabIndex={0}
            >
                <Accessibility className="w-5 h-5" aria-hidden="true" />
            </motion.button>

            {/* A11y Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-96 bg-white z-[70] shadow-2xl flex flex-col overflow-y-auto"
                            role="dialog"
                            aria-labelledby="accessibility-title"
                            aria-modal="true"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                                        <Accessibility className="w-5 h-5" aria-hidden="true" />
                                    </div>
                                    <h2 id="accessibility-title" className="text-lg font-bold text-slate-900">{t('components.accessibility_widget.accessibility_settings_1', "Accessibility Settings")}</h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    aria-label={t('components.accessibility_widget.close_accessibility_settings_aria-label_27', "Close accessibility settings")}
                                >
                                    <X className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Visual Settings */}
                                <section aria-labelledby="visual-settings">
                                    <h3 id="visual-settings" className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('components.accessibility_widget.visual_settings_2', "Visual Settings")}</h3>

                                    {/* High Contrast Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors mb-4">
                                        <div className="flex items-center gap-3">
                                            <Contrast className="w-5 h-5 text-slate-700" aria-hidden="true" />
                                            <div>
                                                <p className="font-medium text-slate-900">{t('components.accessibility_widget.high_contrast_3', "High Contrast")}</p>
                                                <p className="text-xs text-slate-500">{t('components.accessibility_widget.increase_visual_distinction_4', "Increase visual distinction")}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateSetting('highContrast', !settings.highContrast)}
                                            className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.highContrast ? 'bg-teal-600' : 'bg-slate-200'}`}
                                            role="switch"
                                            aria-checked={settings.highContrast}
                                            aria-label={t('components.accessibility_widget.toggle_high_contrast_mode_aria-label_28', "Toggle high contrast mode")}
                                        >
                                            <motion.div
                                                className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm"
                                                animate={{ left: settings.highContrast ? '26px' : '4px' }}
                                            />
                                        </button>
                                    </div>

                                    {/* Large Text Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors mb-4">
                                        <div className="flex items-center gap-3">
                                            <Type className="w-5 h-5 text-slate-700" aria-hidden="true" />
                                            <div>
                                                <p className="font-medium text-slate-900">{t('components.accessibility_widget.large_text_5', "Large Text")}</p>
                                                <p className="text-xs text-slate-500">{t('components.accessibility_widget.increase_global_font_size_6', "Increase global font size")}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateSetting('largeText', !settings.largeText)}
                                            className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.largeText ? 'bg-teal-600' : 'bg-slate-200'}`}
                                            role="switch"
                                            aria-checked={settings.largeText}
                                            aria-label={t('components.accessibility_widget.toggle_large_text_mode_aria-label_29', "Toggle large text mode")}
                                        >
                                            <motion.div
                                                className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm"
                                                animate={{ left: settings.largeText ? '26px' : '4px' }}
                                            />
                                        </button>
                                    </div>

                                    {/* Font Size Slider */}
                                    <div className="p-4 rounded-xl border border-slate-200 bg-white mb-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label htmlFor="font-size-slider" className="font-medium text-slate-900">
                                                Font Size: {settings.fontSize}%
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateSetting('fontSize', Math.max(75, settings.fontSize - 10))}
                                                    className="p-1 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                                                    aria-label={t('components.accessibility_widget.decrease_font_size_aria-label_30', "Decrease font size")}
                                                >
                                                    <ZoomOut className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => updateSetting('fontSize', Math.min(150, settings.fontSize + 10))}
                                                    className="p-1 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                                                    aria-label={t('components.accessibility_widget.increase_font_size_aria-label_31', "Increase font size")}
                                                >
                                                    <ZoomIn className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            id="font-size-slider"
                                            type="range"
                                            min="75"
                                            max="150"
                                            step="5"
                                            value={settings.fontSize}
                                            onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            aria-valuemin={75}
                                            aria-valuemax={150}
                                            aria-valuenow={settings.fontSize}
                                        />
                                    </div>

                                    {/* Color Blind Mode */}
                                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                                        <label htmlFor="colorblind-mode" className="font-medium text-slate-900 flex items-center gap-2 mb-3">
                                            <Palette className="w-5 h-5 text-slate-700" aria-hidden="true" />{t('components.accessibility_widget.color_blind_mode_7', "Color Blind Mode")}</label>
                                        <select
                                            id="colorblind-mode"
                                            value={settings.colorBlindMode}
                                            onChange={(e) => updateSetting('colorBlindMode', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            aria-label={t('components.accessibility_widget.select_color_blind_mode_aria-label_32', "Select color blind mode")}
                                        >
                                            <option value="none">{t('components.accessibility_widget.none_8', "None")}</option>
                                            <option value="protanopia">Protanopia (Red-Blind)</option>
                                            <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                                            <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                                            <option value="monochrome">{t('components.accessibility_widget.monochrome_9', "Monochrome")}</option>
                                        </select>
                                    </div>
                                </section>

                                {/* Navigation Settings */}
                                <section aria-labelledby="navigation-settings">
                                    <h3 id="navigation-settings" className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('components.accessibility_widget.navigation_10', "Navigation")}</h3>

                                    {/* Keyboard Navigation */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors mb-4">
                                        <div className="flex items-center gap-3">
                                            <Keyboard className="w-5 h-5 text-slate-700" aria-hidden="true" />
                                            <div>
                                                <p className="font-medium text-slate-900">{t('components.accessibility_widget.keyboard_navigation_11', "Keyboard Navigation")}</p>
                                                <p className="text-xs text-slate-500">Alt + M for main content</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateSetting('keyboardNav', !settings.keyboardNav)}
                                            className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.keyboardNav ? 'bg-teal-600' : 'bg-slate-200'}`}
                                            role="switch"
                                            aria-checked={settings.keyboardNav}
                                            aria-label={t('components.accessibility_widget.toggle_keyboard_navigation_aria-label_33', "Toggle keyboard navigation")}
                                        >
                                            <motion.div
                                                className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm"
                                                animate={{ left: settings.keyboardNav ? '26px' : '4px' }}
                                            />
                                        </button>
                                    </div>

                                    {/* Voice Reader Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors mb-4">
                                        <div className="flex items-center gap-3">
                                            <Volume2 className="w-5 h-5 text-slate-700" aria-hidden="true" />
                                            <div>
                                                <p className="font-medium text-slate-900">{t('voice_accessibility.title', "Voice Reader")}</p>
                                                <p className="text-xs text-slate-500">{t('voice_accessibility.subtitle', "Read text on hover")}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleVoiceReader()}
                                            className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${voiceReader ? 'bg-teal-600' : 'bg-slate-200'}`}
                                            role="switch"
                                            aria-checked={voiceReader}
                                            aria-label={t('voice_accessibility.enable_aria_label', "Enable Voice Reader")}
                                        >
                                            <motion.div
                                                className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm"
                                                animate={{ left: voiceReader ? '26px' : '4px' }}
                                            />
                                        </button>
                                    </div>

                                    {/* Enhanced Focus Indicator */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors mb-4">
                                        <div className="flex items-center gap-3">
                                            <Eye className="w-5 h-5 text-slate-700" aria-hidden="true" />
                                            <div>
                                                <p className="font-medium text-slate-900">{t('components.accessibility_widget.enhanced_focus_12', "Enhanced Focus")}</p>
                                                <p className="text-xs text-slate-500">{t('components.accessibility_widget.visible_focus_indicators_13', "Visible focus indicators")}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateSetting('focusIndicator', !settings.focusIndicator)}
                                            className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.focusIndicator ? 'bg-teal-600' : 'bg-slate-200'}`}
                                            role="switch"
                                            aria-checked={settings.focusIndicator}
                                            aria-label={t('components.accessibility_widget.toggle_enhanced_focus_indicators_aria-label_34', "Toggle enhanced focus indicators")}
                                        >
                                            <motion.div
                                                className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm"
                                                animate={{ left: settings.focusIndicator ? '26px' : '4px' }}
                                            />
                                        </button>
                                    </div>

                                    {/* Reduced Motion */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                animate={{ rotate: settings.reducedMotion ? 0 : 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="w-5 h-5 text-slate-700"
                                            >
                                                <Accessibility className="w-5 h-5" aria-hidden="true" />
                                            </motion.div>
                                            <div>
                                                <p className="font-medium text-slate-900">{t('components.accessibility_widget.reduced_motion_14', "Reduced Motion")}</p>
                                                <p className="text-xs text-slate-500">{t('components.accessibility_widget.minimize_animations_15', "Minimize animations")}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                                            className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settings.reducedMotion ? 'bg-teal-600' : 'bg-slate-200'}`}
                                            role="switch"
                                            aria-checked={settings.reducedMotion}
                                            aria-label={t('components.accessibility_widget.toggle_reduced_motion_aria-label_35', "Toggle reduced motion")}
                                        >
                                            <motion.div
                                                className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm"
                                                animate={{ left: settings.reducedMotion ? '26px' : '4px' }}
                                            />
                                        </button>
                                    </div>
                                </section>

                                {/* Keyboard Shortcuts Info */}
                                <section aria-labelledby="shortcuts-info" className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <h3 id="shortcuts-info" className="text-sm font-semibold text-slate-700 mb-3">{t('components.accessibility_widget.keyboard_shortcuts_16', "Keyboard Shortcuts")}</h3>
                                    <ul className="space-y-2 text-sm text-slate-600">
                                        <li><kbd className="px-2 py-1 bg-white border border-slate-300 rounded">Alt + M</kbd>{t('components.accessibility_widget.skip_to_main_content_17', "Skip to main content")}</li>
                                        <li><kbd className="px-2 py-1 bg-white border border-slate-300 rounded">Alt + A</kbd>{t('components.accessibility_widget.open_accessibility_menu_18', "Open accessibility menu")}</li>
                                        <li><kbd className="px-2 py-1 bg-white border border-slate-300 rounded">{t('components.accessibility_widget.esc_19', "Esc")}</kbd>{t('components.accessibility_widget.close_dialogs_20', "Close dialogs")}</li>
                                        <li><kbd className="px-2 py-1 bg-white border border-slate-300 rounded">{t('components.accessibility_widget.tab_21', "Tab")}</kbd>{t('components.accessibility_widget.navigate_forward_22', "Navigate forward")}</li>
                                        <li><kbd className="px-2 py-1 bg-white border border-slate-300 rounded">Shift + Tab</kbd>{t('components.accessibility_widget.navigate_backward_23', "Navigate backward")}</li>
                                    </ul>
                                </section>

                                {/* Reset Button */}
                                <button
                                    onClick={resetSettings}
                                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    aria-label={t('components.accessibility_widget.reset_all_accessibility_settings_aria-label_36', "Reset all accessibility settings to default")}
                                >{t('components.accessibility_widget.reset_to_default_24', "Reset to Default")}</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
