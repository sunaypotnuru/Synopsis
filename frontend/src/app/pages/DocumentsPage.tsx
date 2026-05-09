import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Upload, FileText, Trash2, Download, Filter, Plus, Loader2, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { documentsAPI } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";
import { useTranslation as useI18Next } from "react-i18next";
import { useLocation } from "react-router";
import DocumentShareModal from "@/components/shared/DocumentShareModal";

interface Document {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  created_at: string;
}

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { i18n } = useI18Next();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<Document | null>(null);
  const location = useLocation();
  
  const isDoctor = location.pathname.startsWith('/doctor');
  const primaryColor = isDoctor ? '#0EA5E9' : '#0D9488';
  const primaryColorDark = isDoctor ? '#0284C7' : '#0F766E';
  const primaryGradient = isDoctor ? 'from-[#0EA5E9] to-[#0284C7]' : 'from-[#0D9488] to-[#0F766E]';
  const primaryHoverGradient = isDoctor ? 'hover:from-[#0284C7] hover:to-[#0369A1]' : 'hover:from-[#0F766E] hover:to-[#065F46]';
  const bgLight = isDoctor ? 'bg-[#0EA5E9]/10' : 'bg-[#0D9488]/10';
  const bgPage = isDoctor ? 'from-[#F0F9FF] via-white to-[#F8FAFC]' : 'from-[#F0FDFA] via-white to-[#F8FAFC]';

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await documentsAPI.getDocuments(selectedCategory || undefined);
        setDocuments(response.data);
      } catch (error) {
        console.error("Error loading documents:", error);
        toast.error(t('patient.docs.failed_load', "Failed to load documents"));
      } finally {
        setLoading(false);
      }
    };

    const loadCategories = async () => {
      try {
        const response = await documentsAPI.getCategories();
        setCategories(response.data.categories);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadDocuments();
    loadCategories();
  }, [selectedCategory, t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";

    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t('patient.docs.invalid_type', "Invalid file type. Only PDF and images allowed."));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('patient.docs.too_large', "File too large. Maximum size is 10MB."));
        return;
      }

      setUploadFile(file);
      if (!uploadTitle) setUploadTitle(file.name);
    }
  };

  /** Fetch a short-lived signed URL from the backend and open it */
  const handleDownload = async (docId: string) => {
    setDownloadingId(docId);
    try {
      const res = await documentsAPI.getSignedUrl(docId);
      window.open(res.data.signedUrl, '_blank', 'noopener');
    } catch (err) {
      const errorDetail = err instanceof Error && 'response' in err && (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(errorDetail || t('patient.docs.download_failed', "Failed to get download link. Please try again."));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error(t('patient.docs.select_file', "Please select a file"));
      return;
    }

    try {
      setUploading(true);
      await documentsAPI.uploadDocument(
        uploadFile,
        uploadTitle,
        uploadDescription,
        uploadCategory
      );

      toast.success(t('patient.docs.upload_success', "Document uploaded successfully"));
      setShowUploadDialog(false);
      resetUploadForm();
      const loadDocuments = async () => {
        try {
          const response = await documentsAPI.getDocuments(selectedCategory || undefined);
          setDocuments(response.data);
        } catch (error) {
          console.error("Error loading documents:", error);
          toast.error(t('patient.docs.failed_load', "Failed to load documents"));
        } finally {
          setLoading(false);
        }
      };
      loadDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorDetail = error instanceof Error && 'response' in error && (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(errorDetail || t('patient.docs.upload_failed', "Failed to upload document"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('patient.docs.confirm_delete', "Are you sure you want to delete this document?"))) return;

    try {
      await documentsAPI.deleteDocument(id);
      toast.success(t('patient.docs.delete_success', "Document deleted successfully"));
      const loadDocuments = async () => {
        try {
          const response = await documentsAPI.getDocuments(selectedCategory || undefined);
          setDocuments(response.data);
        } catch (error) {
          console.error("Error loading documents:", error);
          toast.error(t('patient.docs.failed_load', "Failed to load documents"));
        } finally {
          setLoading(false);
        }
      };
      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(t('patient.docs.delete_failed', "Failed to delete document"));
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadDescription("");
    setUploadCategory("general");
  };

  const handleShareClick = (doc: Document) => {
    setSelectedDocForShare(doc);
    setShowShareModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("image")) return "🖼️";
    return "📎";
  };

  if (loading) {
    return (
      <div className={`min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br ${bgPage} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}></div>
          <p className="text-[#64748B]">{t('patient.docs.loading', "Loading documents...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br ${bgPage}`}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#0F172A] mb-2">
                {t('patient.docs.title', "My Documents")}
              </h1>
              <p className="text-[#64748B]">
                {t('patient.docs.subtitle', "Upload and manage your medical documents")}
              </p>
            </div>
            <Button
              onClick={() => setShowUploadDialog(true)}
              className={`bg-gradient-to-r ${primaryGradient} ${primaryHoverGradient}`}
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('patient.docs.upload_btn', "Upload Document")}
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-[#64748B]" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder={t('patient.docs.all_categories', "All Categories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('patient.docs.all_categories', "All Categories")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Documents Grid */}
          {documents.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
                {t('patient.docs.no_docs', "No documents yet")}
              </h3>
              <p className="text-[#64748B] mb-4">
                {t('patient.docs.no_docs_desc', "Upload your first medical document to get started")}
              </p>
              <Button
                onClick={() => setShowUploadDialog(true)}
                className={`bg-gradient-to-r ${primaryGradient}`}
              >
                <Upload className="w-5 h-5 mr-2" />
                {t('patient.docs.upload_btn', "Upload Document")}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{getFileIcon(doc.file_type)}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShareClick(doc)}
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        title={t('patient.docs.share', "Share with doctor")}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={downloadingId === doc.id}
                        onClick={() => handleDownload(doc.id)}
                      >
                        {downloadingId === doc.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Download className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-[#0F172A] mb-2 truncate">
                    {doc.title}
                  </h3>

                  {doc.description && (
                    <p className="text-sm text-[#64748B] mb-3 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className={`px-2 py-1 ${bgLight} rounded`} style={{ color: primaryColorDark }}>
                      {categories.find(c => c.value === doc.category)?.label || doc.category}
                    </span>
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>

                  <div className="mt-3 text-xs text-[#64748B]">
                    {new Intl.DateTimeFormat(i18n.language || 'en').format(new Date(doc.created_at))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Upload Dialog */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogContent className="max-w-md" aria-describedby="upload-document-description">
              <DialogHeader>
                <DialogTitle>{t('patient.docs.upload_title', "Upload Document")}</DialogTitle>
              </DialogHeader>
              <p id="upload-document-description" className="sr-only">
                {t('patient.docs.dialog_desc', "Upload a medical document (PDF or image, max 10MB)")}
              </p>

              <div className="space-y-4 mt-4">
                <div>
                  <Label>{t('patient.docs.file_label', "File")}</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="mt-2"
                  />
                  {uploadFile && (
                    <p className="text-sm text-[#64748B] mt-2">
                      {t('patient.docs.selected', "Selected")}: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>

                <div>
                  <Label>{t('patient.docs.title_label', "Title")}</Label>
                  <Input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder={t('patient.docs.title_placeholder', "Document title")}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>{t('patient.docs.desc_label', "Description (Optional)")}</Label>
                  <Input
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder={t('patient.docs.desc_placeholder', "Brief description")}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>{t('patient.docs.category_label', "Category")}</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowUploadDialog(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('common.cancel', "Cancel")}
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadFile || uploading}
                    className={`flex-1 bg-gradient-to-r ${primaryGradient}`}
                  >
                    {uploading ? t('patient.docs.uploading', "Uploading...") : t('patient.docs.upload', "Upload")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Share Modal */}
          {selectedDocForShare && (
            <DocumentShareModal
              isOpen={showShareModal}
              onClose={() => {
                setShowShareModal(false);
                setSelectedDocForShare(null);
              }}
              documentId={selectedDocForShare.id}
              documentTitle={selectedDocForShare.title}
              onSuccess={() => {
                // Optionally refresh documents list
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
