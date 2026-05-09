import { useState, useEffect, useRef } from "react";
import { Search, Loader2, User, Calendar, FileText, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchAPI } from "@/lib/api";
import { useNavigate } from "react-router";
import { useDebounce } from "use-debounce";
import { useTranslation } from "react-i18next";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

interface Patient {
  id: string;
  full_name: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  doctor_id?: string;
}

interface Scan {
  id: string;
  prediction?: string;
  created_at: string;
  doctor_id?: string;
}

interface Document {
  id: string;
  title: string;
  category: string;
  doctor_id?: string;
}

interface SearchResults {
  doctors?: Doctor[];
  patients?: Patient[];
  appointments?: Appointment[];
  scans?: Scan[];
  documents?: Document[];
}

export default function GlobalSearch() {
  const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.length < 2) {
                setResults(null);
                return;
            }
            setLoading(true);
            try {
                const response = await searchAPI.globalSearch(debouncedQuery);
                setResults(response.data.data);
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    const handleSelect = (path: string) => {
        setIsOpen(false);
        setQuery("");
        navigate(path);
    };

    return (
        <div className="relative" ref={searchRef}>
            <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-3 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('components.global_search.search_doctors_patients_scans_placeholder_5', "Search doctors, patients, scans...")}
                    className="w-full sm:w-48 md:w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition-all text-sm"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setIsOpen(false);
                    }}
                />
                {loading && <Loader2 className="w-4 h-4 absolute right-3 text-gray-400 animate-spin" />}
            </div>

            <AnimatePresence>
                {isOpen && query.length >= 2 && results && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-96 overflow-y-auto"
                    >
                        {Object.keys(results).every((k) => !results[k as keyof SearchResults]?.length) ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                No results found for "{query}"
                            </div>
                        ) : (
                            <div className="py-2">
                                {results.doctors && results.doctors.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">{t('components.global_search.doctors', "Doctors")}</div>
                                        {results.doctors.map((doc: Doctor) => (
                                            <button
                                                key={doc.id}
                                                onClick={() => handleSelect(`/patient/doctors/${doc.id}`)}
                                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                                            >
                                                <User className="w-4 h-4 text-[#0EA5E9]" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                                    <p className="text-xs text-gray-500">{doc.specialty}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.patients && results.patients.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">{t('components.global_search.patients_1', "Patients")}</div>
                                        {results.patients.map((patient: Patient) => (
                                            <button
                                                key={patient.id}
                                                onClick={() => handleSelect(`/doctor/patients/${patient.id}`)}
                                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                                            >
                                                <User className="w-4 h-4 text-[#0EA5E9]" />
                                                <p className="text-sm font-medium text-gray-900">{patient.full_name}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.appointments && results.appointments.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">{t('components.global_search.appointments_2', "Appointments")}</div>
                                        {results.appointments.map((appt: Appointment) => (
                                            <button
                                                key={appt.id}
                                                onClick={() => handleSelect(appt.doctor_id ? "/patient/appointments" : "/doctor/appointments")}
                                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                                            >
                                                <Calendar className="w-4 h-4 text-[#8B5CF6]" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {new Date(appt.date).toLocaleDateString()} at {appt.time}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{appt.status}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.scans && results.scans.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">{t('components.global_search.scans_3', "Scans")}</div>
                                        {results.scans.map((scan: Scan) => (
                                            <button
                                                key={scan.id}
                                                onClick={() => handleSelect(scan.doctor_id ? "/doctor/scans" : "/patient/history")}
                                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                                            >
                                                <Activity className="w-4 h-4 text-[#EC4899]" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {scan.prediction || 'Pending Analysis'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(scan.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.documents && results.documents.length > 0 && (
                                    <div>
                                        <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">{t('components.global_search.documents_4', "Documents")}</div>
                                        {results.documents.map((doc: Document) => (
                                            <button
                                                key={doc.id}
                                                onClick={() => handleSelect(doc.doctor_id ? "/doctor/documents" : "/patient/documents")}
                                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                                            >
                                                <FileText className="w-4 h-4 text-[#10B981]" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                                                    <p className="text-xs text-gray-500">{doc.category}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
