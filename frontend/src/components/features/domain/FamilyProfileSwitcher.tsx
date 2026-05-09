import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, User, ChevronDown } from "lucide-react";
import { patientAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useTranslation } from "react-i18next";

interface FamilyMember {
  id: string;
  user_id: string;
  full_name: string;
  relationship?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

interface ApiResponse {
  data: FamilyMember[];
}

export default function FamilyProfileSwitcher() {
  const { t } = useTranslation();
    const { profile, activePatientProfile, setActivePatientProfile } = useAuthStore();

    const { data: familyMembers, isLoading } = useQuery({
        queryKey: ['family-members'],
        queryFn: () => patientAPI.getFamilyMembers().then((res: ApiResponse) => res.data),
        enabled: !!profile // Only fetch if logged in
    });

    // Automatically ensure active profile is set to main if empty
    useEffect(() => {
        if (profile && !activePatientProfile) {
            setActivePatientProfile(profile);
        }
    }, [profile, activePatientProfile, setActivePatientProfile]);

    if (!profile || isLoading || !familyMembers) return null;

    // Include self + family members
    const allProfiles = [profile, ...familyMembers];

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100">
                <Users className="w-4 h-4" />
                <span className="text-sm font-semibold max-w-[100px] truncate">
                    {activePatientProfile?.id === profile.id ? "My Record" : activePatientProfile?.full_name?.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">{t('components.family_profile_switcher.viewing_context', "Viewing Context")}</div>

                {allProfiles.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setActivePatientProfile(p)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors
              ${activePatientProfile?.id === p.id ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <User className="w-4 h-4 opacity-50 shrink-0" />
                            <span className="truncate">{p.id === profile.id ? `${p.full_name} (Self)` : p.full_name}</span>
                        </div>
                        {activePatientProfile?.id === p.id && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
