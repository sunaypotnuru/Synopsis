import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Share2, Search, User, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import api from "@/lib/api";

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  email?: string;
}

interface DocumentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  onSuccess?: () => void;
}

export default function DocumentShareModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onSuccess
}: DocumentShareModalProps) {
  const { t } = useTranslation();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
    }
  }, [isOpen]);

  const filterDoctors = useCallback(() => {
    let filtered = doctors;

    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDoctors(filtered);
  }, [doctors, searchTerm]);

  useEffect(() => {
    filterDoctors();
  }, [filterDoctors]);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      // Fetch list of doctors (using existing doctors endpoint)
      const response = await api.get('/api/v1/doctors');
      setDoctors(response.data || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error(t('patient.docs.doctors_load_failed', "Failed to load doctors list"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedDoctorId) {
      toast.error(t('patient.docs.select_doctor', "Please select a doctor"));
      return;
    }

    setIsSharing(true);
    try {
      await patientPortalAPI.shareDocument(documentId, {
        doctor_id: selectedDoctorId,
        notes: notes.trim() || undefined
      });

      toast.success(t('patient.docs.share_success', "Document shared successfully"));
      
      // Reset form
      setSelectedDoctorId("");
      setNotes("");
      setSearchTerm("");
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error("Error sharing document:", error);
      toast.error(t('patient.docs.share_failed', "Failed to share document"));
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setSelectedDoctorId("");
    setNotes("");
    setSearchTerm("");
    onClose();
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-600" />
            {t('patient.docs.share_document', "Share Document")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Document Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {t('patient.docs.sharing', "Sharing")}:
            </p>
            <p className="font-semibold text-gray-900">{documentTitle}</p>
          </div>

          {/* Doctor Search */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              {t('patient.docs.select_doctor', "Select Doctor")} *
            </Label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('patient.docs.search_doctors', "Search doctors by name or specialization...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Selected Doctor */}
            {selectedDoctor && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedDoctor.full_name}</p>
                    <p className="text-sm text-gray-600">{selectedDoctor.specialization}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoctorId("")}
                  className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </motion.div>
            )}

            {/* Doctors List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {searchTerm
                    ? t('patient.docs.no_doctors_found', "No doctors found")
                    : t('patient.docs.no_doctors', "No doctors available")}
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {filteredDoctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() => setSelectedDoctorId(doctor.id)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      selectedDoctorId === doctor.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedDoctorId === doctor.id ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}>
                      <User className={`w-5 h-5 ${
                        selectedDoctorId === doctor.id ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{doctor.full_name}</p>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                    </div>
                    {selectedDoctorId === doctor.id && (
                      <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              {t('patient.docs.notes', "Notes")} ({t('common.optional', "Optional")})
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('patient.docs.notes_placeholder', "Add any notes or context for the doctor...")}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              ℹ️ {t('patient.docs.share_info', "The selected doctor will be able to view this document in their portal.")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={isSharing}
          >
            {t('common.cancel', "Cancel")}
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedDoctorId || isSharing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('patient.docs.sharing_progress', "Sharing...")}
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                {t('patient.docs.share_button', "Share Document")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
