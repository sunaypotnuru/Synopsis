import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Shield,
  ArrowLeft,
  UserCheck,
  UserX
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { FamilyMember } from "@/types/patientPortal";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function FamilyMembersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  useEffect(() => {
    filterMembers();
     
  }, [members, searchTerm]);

  const fetchFamilyMembers = async () => {
    setIsLoading(true);
    try {
      const response = await patientPortalAPI.getFamilyMembers();
      setMembers(response.data || []);
    } catch (error) {
      console.error("Error fetching family members:", error);
      toast.error(t('patient.family.load_failed', "Failed to load family members"));
    } finally {
      setIsLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.relationship.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMembers(filtered);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('patient.family.confirm_delete', `Are you sure you want to remove ${name} from your family members?`))) {
      return;
    }

    try {
      await patientPortalAPI.deleteFamilyMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success(t('patient.family.deleted', "Family member removed successfully"));
    } catch (error) {
      console.error("Error deleting family member:", error);
      toast.error(t('patient.family.delete_failed', "Failed to remove family member"));
    }
  };

  const getRelationshipIcon = (relationship: string) => {
    const rel = relationship.toLowerCase();
    if (rel.includes('parent') || rel.includes('mother') || rel.includes('father')) return '👨‍👩‍👦';
    if (rel.includes('child') || rel.includes('son') || rel.includes('daughter')) return '👶';
    if (rel.includes('spouse') || rel.includes('husband') || rel.includes('wife')) return '💑';
    if (rel.includes('sibling') || rel.includes('brother') || rel.includes('sister')) return '👫';
    if (rel.includes('grandparent')) return '👴';
    return '👤';
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.family.loading', "Loading family members...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate("/patient/dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back_to_dashboard', "Back to Dashboard")}
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('patient.family.title', "Family Members")}
              </h1>
              <p className="text-gray-500 text-sm">
                {t('patient.family.subtitle', "Manage your family's health information")}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/patient/family/add")}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-xl shadow-md"
          >
            <Plus className="w-5 h-5" />
            {t('patient.family.add_member', "Add Family Member")}
          </Button>
        </div>

        {/* Stats Card */}
        <Card className="p-6 mb-6 bg-white border-gray-100 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {t('patient.family.total_members', "Total Members")}
                </p>
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {t('patient.family.can_view_records', "Can View Records")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {members.filter(m => m.can_view_records).length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {t('patient.family.can_book', "Can Book Appointments")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {members.filter(m => m.can_book_appointments).length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Search */}
        <Card className="p-4 mb-6 bg-white border-gray-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('patient.family.search_placeholder', "Search family members...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>
        </Card>

        {/* Family Members Grid */}
        {filteredMembers.length === 0 ? (
          <Card className="p-12 text-center bg-white border-gray-100 shadow-sm">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm
                ? t('patient.family.no_results', "No family members found")
                : t('patient.family.no_members', "No family members yet")}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? t('patient.family.try_different_search', "Try a different search term")
                : t('patient.family.add_first', "Add your first family member to get started")}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => navigate("/patient/family/add")}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-xl"
              >
                <Plus className="w-5 h-5" />
                {t('patient.family.add_member', "Add Family Member")}
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredMembers.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 bg-white border-gray-100 shadow-sm hover:shadow-md transition-all">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="text-4xl">{getRelationshipIcon(member.relationship)}</div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {member.name}
                          </h3>
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                            {member.relationship}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {calculateAge(member.date_of_birth)} {t('patient.family.years_old', "years old")} • {member.gender}
                        </span>
                      </div>

                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{member.phone}</span>
                        </div>
                      )}

                      {member.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Permissions */}
                    <div className="flex gap-2 mb-4">
                      {member.can_view_records ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 text-xs">
                          <UserCheck className="w-3 h-3" />
                          {t('patient.family.view_records', "View Records")}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200 flex items-center gap-1 text-xs">
                          <UserX className="w-3 h-3" />
                          {t('patient.family.no_view', "No View")}
                        </Badge>
                      )}

                      {member.can_book_appointments && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3" />
                          {t('patient.family.can_book_short', "Book")}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-100 flex gap-2">
                      <Button
                        onClick={() => navigate(`/patient/family/edit/${member.id}`)}
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {t('common.edit', "Edit")}
                      </Button>
                      <Button
                        onClick={() => handleDelete(member.id, member.name)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Info Card */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">
                {t('patient.family.privacy_title', "Privacy & Permissions")}
              </p>
              <p className="text-sm text-blue-700">
                {t('patient.family.privacy_desc', "Control what information family members can access. You can grant permissions to view medical records or book appointments on your behalf.")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}




