import { useTranslation } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', native: 'English', hasTranslation: true },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', hasTranslation: true },
  { code: 'mr', name: 'Marathi', native: 'मराठी', hasTranslation: true },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', hasTranslation: true },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', hasTranslation: true },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', hasTranslation: true },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="w-[140px] bg-transparent border-gray-300">
        <Languages className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex items-center gap-2">
              <span>{lang.native}</span>
              {lang.hasTranslation && (
                <span title="Live translation supported"><Globe className="w-3 h-3 text-green-500" /></span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
