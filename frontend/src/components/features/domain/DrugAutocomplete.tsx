import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DrugSuggestion {
    rxcui: string;
    name: string;
    synonym?: string;
    route?: string;
    strength?: string;
}

interface DrugAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Drug name autocomplete using the free NIH RxTerms API.
 * No API key required.
 * Docs: https://clinicaltables.nlm.nih.gov/apidoc/rxterms/v3/doc.html
 */
export default function DrugAutocomplete({ value, onChange, placeholder = "Type drug name...", className = "" }: DrugAutocompleteProps) {
  const { t } = useTranslation();
    const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const search = async (query: string) => {
        if (!query || query.length < 2) { setSuggestions([]); setOpen(false); return; }
        setLoading(true);
        try {
            // NIH RxTerms API — completely free, no key needed
            const url = `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(query)}&maxList=8&ef=STRENGTHS_AND_FORMS,RXCUIS`;
            const res = await fetch(url);
            const json = await res.json();
            // Response: [total, [names], {STRENGTHS_AND_FORMS, RXCUIS}, [display]]
            const names: string[] = json[1] || [];
            const extras = json[2] || {};
            const forms: string[][] = extras.STRENGTHS_AND_FORMS || [];
            const rxcuis: string[][] = extras.RXCUIS || [];

            const results: DrugSuggestion[] = names.map((name, i) => ({
                rxcui: (rxcuis[i] || [])[0] || "",
                name,
                strength: (forms[i] || []).join(", "),
            }));
            setSuggestions(results);
            setOpen(results.length > 0);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 300);
    };

    const handleSelect = (drug: DrugSuggestion) => {
        onChange(drug.name + (drug.strength ? ` (${drug.strength.split(",")[0]})` : ""));
        setOpen(false);
        setSuggestions([]);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488] pr-8 bg-white"
                    autoComplete="off"
                />
                {loading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-[#0D9488] animate-spin" />
                    </div>
                )}
            </div>

            {open && suggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">{t('components.drug_autocomplete.nih_rxterms_suggestions', "NIH RxTerms Suggestions")}</div>
                    {suggestions.map((drug) => (
                        <button
                            key={`${drug.rxcui}-${drug.name}`}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(drug); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F0FDFA] transition-colors border-b border-gray-50 last:border-0"
                        >
                            <p className="text-sm font-medium text-[#0F172A]">{drug.name}</p>
                            {drug.strength && (
                                <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{drug.strength}</p>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
