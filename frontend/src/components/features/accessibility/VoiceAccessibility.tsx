import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Download, X, AlertCircle, Headphones } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useAccessibilityStore } from "@/lib/accessibility";

// Map app language codes to BCP-47 language tags for SpeechSynthesis
const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
};

// Language names for display
const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (ತೆಲುಗು)',
  mr: 'Marathi (ಮರಾಠಿ)',
};

// Download instructions by OS
const getDownloadInstructions = (lang: string, os: string, t: (key: string, fallback: string) => string) => {
  const langName = t('languages.' + lang, LANG_NAMES[lang] || lang);
  
  if (os === 'Windows') {
    return {
      title: t('voice_accessibility.install_title', 'Install {{lang}} Voice').replace('{{lang}}', langName),
      steps: [
        t('voice_accessibility.steps.win.1', 'Open Settings (Win + I)'),
        t('voice_accessibility.steps.win.2', 'Go to Time & Language → Speech'),
        t('voice_accessibility.steps.win.3', 'Click "Add voices"'),
        t('voice_accessibility.steps.win.4', 'Search and download "{{lang}}" voice').replace('{{lang}}', langName),
        t('voice_accessibility.steps.win.5', 'Restart your browser'),
        t('voice_accessibility.steps.win.6', 'Enable voice reader again')
      ],
      link: 'ms-settings:speech'
    };
  } else if (os === 'Mac') {
    return {
      title: t('voice_accessibility.install_title', 'Install {{lang}} Voice').replace('{{lang}}', langName),
      steps: [
        t('voice_accessibility.steps.mac.1', 'Open System Preferences'),
        t('voice_accessibility.steps.mac.2', 'Go to Accessibility → Speech'),
        t('voice_accessibility.steps.mac.3', 'Click "System Voice" → "Customize"'),
        t('voice_accessibility.steps.mac.4', 'Download "{{lang}}" voice').replace('{{lang}}', langName),
        t('voice_accessibility.steps.mac.5', 'Restart your browser'),
        t('voice_accessibility.steps.mac.6', 'Enable voice reader again')
      ],
      link: null
    };
  } else if (os === 'Android') {
    return {
      title: t('voice_accessibility.install_title', 'Install {{lang}} Voice').replace('{{lang}}', langName),
      steps: [
        t('voice_accessibility.steps.android.1', 'Open Settings'),
        t('voice_accessibility.steps.android.2', 'Go to System → Languages & input'),
        t('voice_accessibility.steps.android.3', 'Select Text-to-speech output'),
        t('voice_accessibility.steps.android.4', 'Click "Install voice data"'),
        t('voice_accessibility.steps.android.5', 'Download "{{lang}}" voice').replace('{{lang}}', langName),
        t('voice_accessibility.steps.android.6', 'Restart your browser'),
        t('voice_accessibility.steps.android.7', 'Enable voice reader again')
      ],
      link: null
    };
  } else {
    return {
      title: t('voice_accessibility.install_title', 'Install {{lang}} Voice').replace('{{lang}}', langName),
      steps: [
        t('voice_accessibility.steps.default.1', 'Open your system settings'),
        t('voice_accessibility.steps.default.2', 'Search for "Speech" or "Text-to-speech"'),
        t('voice_accessibility.steps.default.3', 'Download "{{lang}}" voice').replace('{{lang}}', langName),
        t('voice_accessibility.steps.default.4', 'Restart your browser'),
        t('voice_accessibility.steps.default.5', 'Enable voice reader again')
      ],
      link: null
    };
  }
};

// Detect operating system
const detectOS = (): string => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'Windows';
  if (userAgent.includes('mac')) return 'Mac';
  if (userAgent.includes('android')) return 'Android';
  if (userAgent.includes('linux')) return 'Linux';
  return 'Unknown';
};

/**
 * VoiceAccessibility — Industrial-grade screen reader / hover-to-speak widget.
 * Features:
 * - Smart voice selection (prefers High-Quality / Natural voices)
 * - Robust state management (handles browser synthesis quirks)
 * - Cross-language support with automatic fallback
 * - Interactive hover-to-speak with debounce
 */
export function VoiceAccessibility() {
  const { language, t } = useTranslation();
  const { voiceReader: enabled, toggleVoiceReader: setEnabled } = useAccessibilityStore();
  const [speaking, setSpeaking] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDownloadAlert, setShowDownloadAlert] = useState(false);
  const [missingVoiceLang, setMissingVoiceLang] = useState<string | null>(null);
  
  // Ref to track the current utterance to prevent garbage collection
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenRef = useRef('');
  const timeoutRef = useRef<number | null>(null);

  // Initialize voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      // Voices are loaded when length > 0
      window.speechSynthesis.getVoices();
    };

    // Chrome requires this event to load voices
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); // Initial check for Safari/Firefox

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      currentUtteranceRef.current = null;
    }
  }, []);

  const speak = useCallback((text: string, isManualTrigger = false) => {
    if (!text || (!isManualTrigger && text === lastSpokenRef.current)) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Clean text (remove extra spaces, icons, etc)
    const cleanText = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDDFF]/g, '').trim();
    if (!cleanText) return;

    lastSpokenRef.current = text;
    stopSpeaking();

    // Small delay ensures previous speech is fully canceled before starting new one
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.92; // Slightly slower for better clarity in medical context
        utterance.pitch = 1;
        utterance.volume = 1;

        // Pick a voice that matches the current app language
        const targetLang = LANG_MAP[language] ?? 'en-US';
        const voices = window.speechSynthesis.getVoices();
        
        // Strategy: 1. Natural/Premium 2. Exact Language Match 3. Language Group Match 4. English Fallback
        const preferred =
          voices.find(v => v.lang.replace('_', '-') === targetLang && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))) ||
          voices.find(v => v.lang.replace('_', '-') === targetLang) ||
          voices.find(v => v.lang.startsWith(targetLang.split('-')[0])) ||
          voices.find(v => v.lang.startsWith('en'));
        
        if (!preferred && !targetLang.startsWith('en')) {
          setMissingVoiceLang(language);
          // Fallback to English but don't show alert for every hover
        }
        
        if (preferred) {
          utterance.voice = preferred;
          utterance.lang = preferred.lang;
        } else {
          utterance.lang = targetLang;
        }

        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => {
          setSpeaking(false);
          currentUtteranceRef.current = null;
        };
        utterance.onerror = (e) => {
          console.error("SpeechSynthesis Error:", e);
          setSpeaking(false);
          currentUtteranceRef.current = null;
        };

        // Keep reference to prevent GC
        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, 40);
  }, [language, stopSpeaking]);

  const getReadableText = (el: Element): string => {
    // Priority: aria-label > title > alt > placeholder > innerText
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const title = el.getAttribute('title');
    if (title) return title;

    const alt = el.getAttribute('alt');
    if (alt) return alt;

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder;

    // For buttons and inputs, check labels
    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'SELECT') {
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return (label as HTMLElement).innerText?.trim();
      }
    }

    const text = (el as HTMLElement).innerText?.trim();
    if (text && text.length > 0 && text.length < 300) return text;

    return '';
  };

  // Handle language changes
  useEffect(() => {
    lastSpokenRef.current = '';
    stopSpeaking();

    if (enabled && language !== 'en') {
        const voices = window.speechSynthesis.getVoices();
        const targetLang = LANG_MAP[language] ?? 'en-US';
        const hasVoice = voices.some(v => v.lang.replace('_', '-') === targetLang || v.lang.startsWith(targetLang.split('-')[0]));
        
        if (!hasVoice && voices.length > 0) {
            setMissingVoiceLang(language);
            setShowDownloadAlert(true);
        }
    }
  }, [language, enabled, stopSpeaking]);

  // Handle hover events
  useEffect(() => {
    if (!enabled) return;

    const handleMouseOver = (e: MouseEvent) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = window.setTimeout(() => {
        const target = e.target as Element;
        if (!target || target === document.body) return;

        // Find nearest readable element
        let el: Element | null = target;
        let text = '';
        let depth = 0;
        
        while (el && el !== document.body && depth < 5) {
          text = getReadableText(el);
          if (text) break;
          el = el.parentElement;
          depth++;
        }

        if (text) speak(text);
      }, 350); // Balanced debounce delay
    };

    const handleMouseOut = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, speak]);


  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (!next) {
      stopSpeaking();
      setShowDownloadAlert(false);
    } else {
      speak(t('voice_accessibility.enabled_announcement', 'Voice reader enabled. Hover over elements to hear them read aloud.'), true);
    }
  };

  const openSystemSettings = () => {
    const os = detectOS();
    const instructions = getDownloadInstructions(missingVoiceLang || language, os, t);
    
    if (instructions.link && os === 'Windows') {
      window.open(instructions.link, '_blank');
    } else {
      alert(instructions.steps.join('\n\n'));
    }
  };

  return (
    <>
      <AnimatePresence>
        {showDownloadAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setShowDownloadAlert(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg p-8 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <button
                onClick={() => setShowDownloadAlert(false)}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Headphones className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {t('voice_accessibility.alert_title', 'Voice Package Missing')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    {t('languages.' + (missingVoiceLang || language), LANG_NAMES[missingVoiceLang || language])} {t('voice_accessibility.alert_subtitle', 'language pack is not installed on your device.')}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t('voice_accessibility.alert_desc', 'For the best experience in your language, please install the high-quality speech pack in your system settings.')}
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-[#0D9488]" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {t('voice_accessibility.quick_steps', 'Installation Steps')} ({detectOS()})
                    </span>
                  </div>
                  <ol className="text-sm text-gray-700 dark:text-gray-200 space-y-2.5">
                    {getDownloadInstructions(missingVoiceLang || language, detectOS(), t).steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-[10px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={openSystemSettings}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] text-white rounded-xl font-bold hover:shadow-xl hover:shadow-teal-500/20 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-5 h-5" />
                    {t('voice_accessibility.open_settings', 'Open Settings')}
                  </button>
                  <button
                    onClick={() => setShowDownloadAlert(false)}
                    className="px-6 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('common.got_it', 'I understand')}
                  </button>
                </div>
                
                <p className="text-[11px] text-center text-gray-400 font-medium italic">
                  {t('voice_accessibility.fallback_note', '💡 Tip: The system will use English voices until the new pack is installed.')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating control widget */}
      <div className="fixed bottom-24 left-8 z-[60] flex flex-col items-start gap-3">
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 shadow-2xl mb-1"
            >
              {enabled 
                ? t('voice_accessibility.enabled_tooltip', 'Voice Reader Active — Hover to listen')
                : t('voice_accessibility.disabled_tooltip', 'Enable Voice Reader Accessibility')}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          {/* Stop Button (only when speaking) */}
          <AnimatePresence>
            {enabled && speaking && (
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                onClick={stopSpeaking}
                className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors group"
                title={t('voice_accessibility.stop', 'Stop Speaking')}
              >
                <VolumeX className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Main Toggle Button */}
          <motion.button
            onClick={toggle}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-2xl transition-all duration-500 ${
              enabled 
                ? "bg-gradient-to-br from-[#0D9488] to-[#0EA5E9] text-white ring-4 ring-teal-500/20"
                : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-[#0D9488] dark:hover:text-[#2DD4BF]"
            }`}
          >
            {/* Visual pulse when speaking */}
            {enabled && speaking && (
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-[1.25rem] bg-teal-400" 
              />
            )}
            
            <Volume2 className={`w-7 h-7 transition-all duration-300 ${enabled ? 'scale-110 drop-shadow-md' : 'scale-90 opacity-60'}`} />
            
            {/* Indicator Dot */}
            <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 transition-all duration-300 ${enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
          </motion.button>
        </div>
      </div>
    </>
  );
}
