import { useState, useRef } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, Save, Heart, Users, Camera, Upload, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "../../lib/store";
import { profileAPI, patientAPI } from "../../lib/api";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PageTransition } from "@/components/shared/PageTransition";

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    age: profile?.age?.toString() || "",
    gender: profile?.gender || "other",
    blood_type: profile?.blood_type || "",
    address: profile?.address || "",
    language: profile?.language || "en",
  });
  const [callPrefs, setCallPrefs] = useState({
    voice: profile?.call_preferences?.voice ?? true,
    time: profile?.call_preferences?.time || "09:00",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [exportingFhir, setExportingFhir] = useState(false);

  const handleFhirExport = async () => {
    setExportingFhir(true);
    try {
      const apiModule = await import("../../lib/api");
      const response = await apiModule.default.get("/api/v1/patient/export/fhir", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "health_record_fhir.json");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('patient.profile.fhir_exported', 'Health record exported as FHIR JSON!'));
    } catch {
      toast.error(t('patient.profile.fhir_error', 'Failed to export health record.'));
    } finally {
      setExportingFhir(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.full_name.trim()) {
        toast.error(t('patient.profile.name_required', 'Full name is required'));
        setSaving(false);
        return;
      }
      const updates = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
      };
      const result = await updateProfile(updates);
      await patientAPI.updateCallPreferences(callPrefs); // sync call prefs inline

      if (result.success) {
        toast.success(t('patient.profile.updated', 'Profile updated successfully'));
        // Invalidate dashboard queries to force fresh data on navigation
        queryClient.invalidateQueries({ queryKey: ['patientDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] });
      } else {
        toast.error(result.error?.message || t('patient.profile.update_failed', 'Failed to update profile'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred while saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // clear value so the same file can be picked again later
    if (e.target) e.target.value = "";

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("patient.profile.invalid_file_type", "Please select an image file"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("patient.profile.file_too_large", "Image size must be less than 5MB"));
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      const role = user?.role === "doctor" ? "doctor" : "patient";
      const response = await profileAPI.uploadAvatar(file, role);

      if (response.data.success) {
        toast.success(t("patient.profile.photo_updated", "Profile photo updated successfully"));
        // Refresh profile to get new avatar URL
        window.location.reload();
      } else {
        toast.error(t("patient.profile.photo_error", "Failed to upload photo"));
        setAvatarPreview(profile?.avatar_url || null);
      }
    } catch (error) {
      console.error("Upload error:", error);
      // show only one error message
      const errorDetail = error instanceof Error && 'response' in error && typeof (error as {response?: {data?: {detail?: string}}}).response === 'object'
        ? (error as {response?: {data?: {detail?: string}}}).response?.data?.detail
        : undefined;
      toast.error(errorDetail || t("patient.profile.photo_error", "Failed to upload photo"));
      setAvatarPreview(profile?.avatar_url || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-[#0F172A]">{t('patient.profile.title', 'Profile Settings')}</h1>
            {user?.role === "patient" && (
              <Button
                onClick={handleFhirExport}
                disabled={exportingFhir}
                variant="outline"
                className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <Download className="w-4 h-4" />
                {exportingFhir ? t('patient.profile.exporting', 'Exporting...') : t('patient.profile.export_fhir', 'Export FHIR')}
              </Button>
            )}
          </div>

          <Card className="p-8 shadow-xl border border-gray-100">
            {/* Avatar Header */}
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
              <div className="relative group">
                <Avatar className="w-24 h-24 cursor-pointer transition-all group-hover:opacity-80" onClick={handleAvatarClick}>
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt={profile?.full_name || "Profile"} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white text-3xl font-bold">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 bg-[#0D9488] hover:bg-[#0F766E] text-white p-2 rounded-full shadow-lg transition-all disabled:opacity-50"
                  title="Change profile photo"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A]">{profile?.full_name || "Your Name"}</h2>
                <p className="text-[#64748B]">{user?.email}</p>
                <span className="inline-block mt-1 px-3 py-1 bg-[#0D9488]/10 text-[#0D9488] rounded-full text-sm font-semibold capitalize">
                  {user?.role || "patient"}
                </span>
                {uploading && (
                  <p className="text-sm text-[#0D9488] mt-2 flex items-center gap-2">
                    <Upload className="w-4 h-4 animate-bounce" />
                    {t('patient.profile.uploading_photo', 'Uploading photo...')}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('auth.signup.full_name', 'Full Name')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="pl-11" placeholder={t('patient.profile.name_placeholder', 'Enter your full name')} />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.login.email', 'Email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="email" value={user?.email} disabled className="pl-11 bg-gray-50 text-gray-400" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">{t('auth.signup.phone', 'Phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pl-11" placeholder="+91 98765 43210" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Age */}
                <div className="space-y-2">
                  <Label htmlFor="age">{t('patient.profile.age', 'Age')}</Label>
                  <Input id="age" type="number" min={1} max={120} value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="e.g. 28" />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label>{t('patient.profile.gender', 'Gender')}</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                    <SelectTrigger>
                      <Users className="w-4 h-4 mr-2 text-gray-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('patient.profile.male', 'Male')}</SelectItem>
                      <SelectItem value="female">{t('patient.profile.female', 'Female')}</SelectItem>
                      <SelectItem value="other">{t('patient.profile.prefer_not', 'Prefer not to say')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Blood Type */}
              <div className="space-y-2">
                <Label>{t('auth.signup.blood_group', 'Blood Type')}</Label>
                <Select value={formData.blood_type} onValueChange={(v) => setFormData({ ...formData, blood_type: v })}>
                  <SelectTrigger>
                    <Heart className="w-4 h-4 mr-2 text-red-400" />
                    <SelectValue placeholder={t('patient.profile.select_blood', 'Select blood type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">{t('patient.profile.address', 'Address')}</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t('patient.profile.address_placeholder', 'Your city / area')} />
              </div>

              {/* Language Preferences */}
              <div className="space-y-2">
                <Label>{t('patient.profile.language', 'Preferred Spoken Language')}</Label>
                <div className="flex gap-2 items-center text-sm text-gray-500 mb-2">
                  <p>Our autonomous Proactive Nurse will automatically adapt to speak with you in this language during calls.</p>
                </div>
                <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('patient.profile.select_language', 'Select your language')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish (Español)</SelectItem>
                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                    <SelectItem value="fr">French (Français)</SelectItem>
                    <SelectItem value="de">German (Deutsch)</SelectItem>
                    <SelectItem value="zh">Mandarin (中文)</SelectItem>
                    <SelectItem value="ar">Arabic (العربية)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46] text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all">
                <Save className="w-5 h-5 mr-2" />
                {saving ? t('common.saving', 'Saving...') : t('common.save_changes', 'Save Changes')}
              </Button>
            </div>
          </Card>

          <Card className="mt-8 p-8 shadow-xl border border-teal-100 bg-teal-50/20">
            <div className="flex items-center gap-3 mb-6">
              <Phone className="w-8 h-8 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-800">Proactive Nurse AI Calls</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Configure if and when NetraAI's autonomous voice agent should call you daily to check up on your medications and general health.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Enable Daily Voice Check-in</h3>
                  <p className="text-sm text-slate-500">Allow NetraAI to call you directly at your phone number.</p>
                </div>
                <Select value={callPrefs.voice ? "yes" : "no"} onValueChange={(v) => setCallPrefs({ ...callPrefs, voice: v === "yes" })}>
                  <SelectTrigger className="w-32 bg-white">
                    <SelectValue placeholder="Enabled"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Enabled</SelectItem>
                    <SelectItem value="no">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {callPrefs.voice && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800">Preferred Call Time</h3>
                  <div className="flex gap-4 items-center">
                    <Input 
                      type="time" 
                      className="w-48 bg-white" 
                      value={callPrefs.time} 
                      onChange={(e) => setCallPrefs({ ...callPrefs, time: e.target.value })} 
                    />
                    <p className="text-sm text-slate-500 flex-1">This is when the AI will ring you based on your active schedules.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* FAMILY MEMBERS SECTION */}
          {user?.role === 'patient' && (
            <Card className="mt-8 p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8 text-[#0D9488]" />
                <h2 className="text-2xl font-bold text-[#0F172A]">{t('patient.profile.family_members', 'Family Members')}</h2>
              </div>
              <p className="text-[#64748B] mb-6">{t('patient.profile.family_desc', 'Manage health records for your children, elderly parents, or dependents under one single account.')}</p>

              <div className="space-y-4">
                <FamilyMembersList />
              </div>
            </Card>
          )}

        </motion.div>
      </div>
    </div>
  </PageTransition>
);
}

interface FamilyMember {
  id: string;
  name?: string;
  full_name?: string;
  age: number;
  gender: string;
}

function FamilyMembersList() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ full_name: "", age: "", gender: "male" });

  const { data: familyMembers, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['family-members'],
    queryFn: () => patientAPI.getFamilyMembers().then((res) => res.data)
  });

  const addMutation = useMutation({
    mutationFn: (data: { full_name: string; age: number; gender: string }) => patientAPI.addFamilyMember(data),
    onSuccess: () => {
      toast.success(t("patient.profile.member_added", "Family member added!"));
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      setIsAdding(false);
      setNewMember({ full_name: "", age: "", gender: "male" });
    },
    onError: (err) => {
      const errorDetail = err instanceof Error && 'response' in err && typeof (err as {response?: {data?: {detail?: string}}}).response === 'object'
        ? (err as {response?: {data?: {detail?: string}}}).response?.data?.detail
        : undefined;
      toast.error(errorDetail || t("patient.profile.member_error", "Failed to add member"));
    }
  });

  const handleAdd = () => {
    if (!newMember.full_name || !newMember.age) {
      toast.error(t("patient.profile.member_fill_fields", "Please fill all fields"));
      return;
    }
    addMutation.mutate({ ...newMember, age: parseInt(newMember.age) });
  };

  if (isLoading) return <div className="text-gray-500">{t("common.loading_family", "Loading family...")}</div>;

  return (
    <div>
      {familyMembers && familyMembers.length > 0 ? (
        <div className="grid gap-3 mb-6">
          {familyMembers.map((member) => (
            <div key={member.id} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center text-[#0D9488] font-bold">
                  {(member.name || member.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[#0F172A]">{member.name || member.full_name || 'Unknown'}</p>
                  <p className="text-xs text-[#64748B] capitalize">{member.age} {t("patient.profile.yrs", "yrs")} • {t(`patient.profile.${member.gender?.toLowerCase()}`, member.gender)}</p>
                </div>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">{t("patient.profile.dependent", "Dependent")}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 italic mb-6">{t("patient.profile.no_family_members", "No family members added yet.")}</p>
      )}

      {isAdding ? (
        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-4">
          <Input placeholder={t('auth.signup.full_name', "Full Name")} value={newMember.full_name} onChange={e => setNewMember({ ...newMember, full_name: e.target.value })} />
          <div className="flex gap-4">
            <Input type="number" placeholder={t('patient.profile.age', "Age")} className="w-1/3" value={newMember.age} onChange={e => setNewMember({ ...newMember, age: e.target.value })} />
            <Select value={newMember.gender} onValueChange={(v) => setNewMember({ ...newMember, gender: v })}>
              <SelectTrigger className="w-2/3">
                <SelectValue placeholder={t('patient.profile.gender', "Gender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('patient.profile.male', "Male")}</SelectItem>
                <SelectItem value="female">{t('patient.profile.female', "Female")}</SelectItem>
                <SelectItem value="other">{t('patient.profile.prefer_not', "Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending} className="bg-[#0D9488] hover:bg-[#0F766E] text-white">
              {addMutation.isPending ? t("common.adding", "Adding...") : t("patient.profile.save_member", "Save Member")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full border-dashed border-2 py-6 text-[#0D9488] hover:bg-[#0D9488]/5">
          + {t("patient.profile.add_dependent", "Add New Dependent")}
        </Button>
      )}
    </div>
  );
}
