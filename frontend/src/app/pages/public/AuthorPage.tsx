import { motion } from "framer-motion";
import { Linkedin, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
}

export default function AuthorPage() {
    const { t } = useTranslation();
    
    const { data: team = [], isLoading } = useQuery({
        queryKey: ["publicTeamMembers"],
        queryFn: async () => {
            const res = await api.get("/api/v1/team");
            return res.data as TeamMember[];
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 bg-gray-50 pb-16 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 bg-gray-50 pb-16">
            <div className="max-w-6xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-16">
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-[#0F172A] mb-4">
                        {t("public.author.title", "Meet the Minds Behind NetraAI")}
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl text-gray-600 max-w-2xl mx-auto">
                        {t("public.author.description", "Our platform is built by passionate engineers and medical professionals dedicated to democratizing healthcare. Proudly originating from Universal AI University, Karjat, India.")}
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {team.length > 0 ? (
                        team.map((member) => (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center flex flex-col h-full"
                            >
                                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#0D9488] to-[#0EA5E9] p-1 mb-6 flex-shrink-0">
                                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-3xl font-bold text-[#0D9488] overflow-hidden">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                            member.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-[#0F172A] mb-1">{member.name}</h2>
                                <p className="text-[#0D9488] font-semibold text-sm mb-4">{member.role}</p>
                                <p className="text-gray-600 mb-6 text-sm leading-relaxed flex-grow">{member.bio}</p>

                                <div className="flex justify-center gap-4 mt-auto">
                                    {member.linkedin_url && (
                                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#0A66C2] hover:text-white transition-colors">
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center text-gray-500 py-12 flex flex-col items-center">
                            <User className="w-16 h-16 text-gray-300 mb-4" />
                            <p>{t("public.author.no_team", "No team members configured yet.")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

