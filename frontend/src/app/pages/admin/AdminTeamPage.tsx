import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Users, Plus, Edit2, Trash2, LinkIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  is_active: boolean;
}

export default function AdminTeamPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    bio: "",
    linkedin_url: "",
    is_active: true
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["adminTeam"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/team");
      return response.data as TeamMember[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editingMember) {
        return api.put(`/api/v1/admin/team/${editingMember.id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        return api.post("/api/v1/admin/team", data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeam"] });
      toast.success(editingMember ? "Team member updated!" : "Team member added!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to save team member");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/v1/admin/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeam"] });
      toast.success("Team member deleted");
    },
    onError: () => {
      toast.error("Failed to delete team member");
    },
  });

  const resetForm = () => {
    setEditingMember(null);
    setFormData({ name: "", role: "", bio: "", linkedin_url: "", is_active: true });
    setAvatarFile(null);
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name || "",
      role: member.role || "",
      bio: member.bio || "",
      linkedin_url: member.linkedin_url || "",
      is_active: member.is_active
    });
    setAvatarFile(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("role", formData.role);
    if (formData.bio) fd.append("bio", formData.bio);
    if (formData.linkedin_url) fd.append("linkedin_url", formData.linkedin_url);
    fd.append("is_active", String(formData.is_active));
    if (avatarFile) fd.append("avatar", avatarFile);

    saveMutation.mutate(fd);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">{t('admin.team.title', 'Team Members')}</h1>
          <p className="text-[#64748B] text-lg">{t('admin.team.subtitle', 'Manage the public facing team roster')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2 border-none">
              <Plus className="w-4 h-4" /> {t('admin.team.add_member', 'Add Member')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingMember ? t('admin.team.edit', 'Edit Member') : t('admin.team.add', 'Add New Member')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('admin.team.name', 'Full Name')}</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Dr. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.team.role', 'Role / Job Title')}</Label>
                <Input required value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} placeholder="Chief Medical Officer" />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.team.bio', 'Short Bio')}</Label>
                <Textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} placeholder="Brief background..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.team.linkedin', 'LinkedIn URL (Optional)')}</Label>
                <Input type="url" value={formData.linkedin_url} onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.team.avatar', 'Avatar Image')}</Label>
                <div className="flex items-center gap-4">
                  {(editingMember?.avatar_url || avatarFile) && (
                    <img src={avatarFile ? URL.createObjectURL(avatarFile) : editingMember?.avatar_url} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-dashed border-gray-300" />
                  )}
                  <div className="flex-1">
                    <Input type="file" accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setAvatarFile(e.target.files[0]);
                    }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="rounded text-[#8B5CF6] focus:ring-[#8B5CF6]" />
                <Label htmlFor="isActive" className="cursor-pointer">{t('admin.team.is_active', 'Active (Visible on public page)')}</Label>
              </div>
              <Button type="submit" className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED]" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save Member')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {teamMembers?.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className={`p-6 border ${member.is_active ? 'border-gray-100 hover:border-[#8B5CF6]/30' : 'border-red-100 bg-red-50/20 grayscale hover:grayscale-0'} transition-all group h-full flex flex-col`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6] font-bold text-xl overflow-hidden shadow-sm shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(member)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if(confirm(t('common.confirm_delete', 'Are you sure?'))) deleteMutation.mutate(member.id); }} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-[#0F172A]">{member.name}</h3>
                  <p className="text-sm text-[#8B5CF6] font-medium mb-3">{member.role}</p>
                  {member.bio && (
                    <p className="text-sm text-[#64748B] line-clamp-3 mb-4">{member.bio}</p>
                  )}
                  {member.linkedin_url && (
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0EA5E9] hover:underline">
                        <LinkIcon className="w-4 h-4" /> LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
          {teamMembers?.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">{t('admin.team.no_members', 'No Team Members')}</h3>
              <p className="text-[#64748B] mb-6">{t('admin.team.no_members_desc', 'Start by adding people to your public team roster.')}</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
                {t('admin.team.add_member', 'Add Member')}
              </Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

