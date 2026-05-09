import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Users,
  Save,
  User,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  Shield
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { FamilyMember } from "@/types/patientPortal";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

export default function AddEditFamilyMemberPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId?: string }>();
  const isEditMode = !!memberId;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date());
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [canViewRecords, setCanViewRecords] = useState(false);
  const [canBookAppointments, setCanBookAppointments] = useState(false);

  const relationshipOptions = [
    { value: "Parent", label: t('patient.family.rel_parent', "Parent"), icon: "👨‍👩‍👦" },
    { value: "Spouse", label: t('patient.family.rel_spouse', "Spouse"), icon: "💑" },
    { value: "Child", label: t('patient.family.rel_child', "Child"), icon: "👶" },
    { value: "Sibling", label: t('patient.family.rel_sibling', "Sibling"), icon: "👫" },
    { value: "Grandparent", label: t('patient.family.rel_grandparent', "Grandparent"), icon: "👴" },
    { value: "Other", label: t('patient.family.rel_other', "Other"), icon: "👤" }
  ];

  useEffect(() => {
    if (isEditMode && memberId) {
      fetchMemberDetails();
    }
     
  }, [memberId]);

  const fetchMemberDetails = async () => {
    if (!memberId) return;

    setIsLoading(true);
    try {
      const response = await patientPortalAPI.getFamilyMember(memberId);
      const member: FamilyMember = response.data;
      
      setName(member.name);
      setRelationship(member.relationship);
      setDateOfBirth(new Date(member.date_of_birth));
      setGender(member.gender);
      setPhone(member.phone || "");
      setEmail(member.email || "");
      setCanViewRecords(member.can_view_records);
      setCanBookAppointments(member.can_book_appointments);
    } catch (error) {
      console.error("Error fetching member:", error);
      toast.error(t('patient.family.load_failed', "Failed to load family member"));
      navigate("/patient/family");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error(t('patient.family.name_required', "Name is required"));
      return;
    }

    if (!relationship) {
      toast.error(t('patient.family.relationship_required', "Relationship is required"));
      return;
    }

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error(t('patient.family.invalid_email', "Please enter a valid email address"));
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: name.trim(),
        relationship,
        date_of_birth: dateOfBirth.toISOString().split('T')[0],
        gender,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        can_view_records: canViewRecords,
        can_book_appointments: canBookAppointments
      };

      if (isEditMode && memberId) {
        await patientPortalAPI.updateFamilyMember(memberId, data);
        toast.success(t('patient.family.update_success', "Family member updated successfully"));
      } else {
        await patientPortalAPI.addFamilyMember(data);
        toast.success(t('patient.family.add_success', "Family member added successfully"));
      }

      navigate("/patient/family");
    } catch (error) {
      console.error("Error saving family member:", error);
      toast.error(
        isEditMode
          ? t('patient.family.update_failed', "Failed to update family member")
          : t('patient.family.add_failed', "Failed to add family member")
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.family.loading', "Loading...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate("/patient/family")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('patient.family.back_to_list', "Back to Family Members")}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isEditMode
                    ? t('patient.family.edit_member', "Edit Family Member")
                    : t('patient.family.add_new_member', "Add Family Member")}
                </h1>
                <p className="text-gray-600 text-sm">
                  {isEditMode
                    ? t('patient.family.edit_subtitle', "Update family member information")
                    : t('patient.family.add_subtitle', "Add a new family member to your account")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {t('patient.family.basic_info', "Basic Information")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t('patient.family.full_name', "Full Name")} *
                    </Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('patient.family.name_placeholder', "Enter full name")}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t('patient.family.relationship', "Relationship")} *
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {relationshipOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRelationship(option.value)}
                          className={`p-3 rounded-lg border-2 transition-all text-center ${
                            relationship === option.value
                              ? 'bg-purple-50 border-purple-500 shadow-md'
                              : 'bg-white border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="text-2xl mb-1">{option.icon}</div>
                          <p className={`text-sm font-medium ${
                            relationship === option.value ? 'text-purple-700' : 'text-gray-700'
                          }`}>
                            {option.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {t('patient.family.date_of_birth', "Date of Birth")} *
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateOfBirth, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateOfBirth}
                          onSelect={(date) => date && setDateOfBirth(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t('patient.family.gender', "Gender")} *
                    </Label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      required
                    >
                      <option value="Male">{t('patient.family.male', "Male")}</option>
                      <option value="Female">{t('patient.family.female', "Female")}</option>
                      <option value="Other">{t('patient.family.other', "Other")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  {t('patient.family.contact_info', "Contact Information")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {t('patient.family.phone', "Phone Number")}
                    </Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('patient.family.phone_placeholder', "+1 (555) 123-4567")}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {t('patient.family.email', "Email Address")}
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('patient.family.email_placeholder', "email@example.com")}
                    />
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t('patient.family.permissions', "Permissions")}
                </h3>

                <Card className="p-4 bg-gray-50 border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="viewRecords"
                        checked={canViewRecords}
                        onCheckedChange={(checked) => setCanViewRecords(checked as boolean)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="viewRecords"
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {t('patient.family.can_view_records', "Can view medical records")}
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          {t('patient.family.view_records_desc', "Allow this family member to access your medical history and health records")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="bookAppointments"
                        checked={canBookAppointments}
                        onCheckedChange={(checked) => setCanBookAppointments(checked as boolean)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="bookAppointments"
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {t('patient.family.can_book_appointments', "Can book appointments")}
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          {t('patient.family.book_appointments_desc', "Allow this family member to schedule medical appointments on your behalf")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/patient/family")}
                  className="flex-1"
                  disabled={isSaving}
                >
                  {t('common.cancel', "Cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common.saving', "Saving...")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditMode
                        ? t('common.save_changes', "Save Changes")
                        : t('patient.family.add_member', "Add Family Member")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}




