import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { templatesAPI } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

interface Template {
  id: string;
  name: string;
  description: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  instructions: string;
  usage_count: number;
  is_public: boolean;
}

export default function PrescriptionTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    medications: "",
    instructions: "",
    is_public: false,
  });

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await templatesAPI.getTemplates();
        setTemplates(response.data);
      } catch (error) {
        console.error("Error loading templates:", error);
        toast.error(t('patient.prescriptions.load_failed', "Failed to load templates"));
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplates();
  }, [t]);

  const handleSave = async () => {
    if (!formData.name || !formData.medications) {
      toast.error(t('patient.prescriptions.fill_required', "Please fill in required fields"));
      return;
    }

    try {
      setSaving(true);

      // Parse medications (expecting JSON array or comma-separated)
      let medications;
      try {
        medications = JSON.parse(formData.medications);
      } catch {
        // If not JSON, split by comma
        medications = formData.medications.split(',').map(m => ({
          name: m.trim(),
          dosage: "",
          frequency: "",
          duration: ""
        }));
      }

      const templateData = {
        name: formData.name,
        description: formData.description,
        medications,
        instructions: formData.instructions,
        is_public: formData.is_public,
      };

      if (editingTemplate) {
        await templatesAPI.updateTemplate(editingTemplate.id, templateData);
        toast.success(t('patient.prescriptions.update_success', "Template updated successfully"));
      } else {
        await templatesAPI.createTemplate(templateData);
        toast.success(t('patient.prescriptions.create_success', "Template created successfully"));
      }

      setShowDialog(false);
      resetForm();
      const loadTemplates = async () => {
        try {
          const response = await templatesAPI.getTemplates();
          setTemplates(response.data);
        } catch (error) {
          console.error("Error loading templates:", error);
          toast.error(t('patient.prescriptions.load_failed', "Failed to load templates"));
        } finally {
          setLoading(false);
        }
      };
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      const errorDetail = error instanceof Error && 'response' in error && (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(errorDetail || t('patient.prescriptions.save_failed', "Failed to save template"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      medications: JSON.stringify(template.medications, null, 2),
      instructions: template.instructions,
      is_public: template.is_public,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('patient.prescriptions.delete_confirm', "Are you sure you want to delete this template?"))) return;

    try {
      await templatesAPI.deleteTemplate(id);
      toast.success(t('patient.prescriptions.delete_success', "Template deleted successfully"));
      const loadTemplates = async () => {
        try {
          const response = await templatesAPI.getTemplates();
          setTemplates(response.data);
        } catch (error) {
          console.error("Error loading templates:", error);
          toast.error(t('patient.prescriptions.load_failed', "Failed to load templates"));
        } finally {
          setLoading(false);
        }
      };
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error(t('patient.prescriptions.delete_failed', "Failed to delete template"));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      medications: "",
      instructions: "",
      is_public: false,
    });
    setEditingTemplate(null);
  };

  const handleNewTemplate = () => {
    resetForm();
    setShowDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748B]">{t('patient.prescriptions.loading', "Loading templates...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#0F172A] mb-2">
                {t('patient.prescriptions.title', "Prescription Templates")}
              </h1>
              <p className="text-[#64748B]">
                {t('patient.prescriptions.desc', "Create and manage reusable prescription templates")}
              </p>
            </div>
            <Button
              onClick={handleNewTemplate}
              className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46]"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('patient.prescriptions.new_template', "New Template")}
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
                {t('patient.prescriptions.no_templates', "No templates yet")}
              </h3>
              <p className="text-[#64748B] mb-4">
                {t('patient.prescriptions.no_templates_desc', "Create your first prescription template to speed up your workflow")}
              </p>
              <Button
                onClick={handleNewTemplate}
                className="bg-gradient-to-r from-[#0D9488] to-[#0F766E]"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('patient.prescriptions.create_template', "Create Template")}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[#0F172A] text-lg mb-1">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-[#64748B] line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-[#64748B]">{t('patient.prescriptions.medications', "Medications: ")}</span>
                      <span className="font-medium">{template.medications.length}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-[#64748B]">{t('patient.prescriptions.used', "Used: ")}</span>
                      <span className="font-medium">{template.usage_count} {t('patient.prescriptions.times', "times")}</span>
                    </div>
                    {template.is_public && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {t('patient.prescriptions.public', "Public")}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t('common.edit', "Edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Template Dialog */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl" aria-describedby="template-dialog-description">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? t('patient.prescriptions.edit_template', "Edit Template") : t('patient.prescriptions.new_template', "New Template")}
                </DialogTitle>
              </DialogHeader>
              <p id="template-dialog-description" className="sr-only">
                {t('patient.prescriptions.dialog_desc', "Create or edit a prescription template")}
              </p>

              <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <Label>{t('patient.prescriptions.template_name', "Template Name *")}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('patient.prescriptions.name_placeholder', "e.g., Common Cold Treatment")}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>{t('common.description', "Description")}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('patient.prescriptions.desc_placeholder', "Brief description")}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>{t('patient.prescriptions.medications_label', "Medications * (JSON array or comma-separated)")}</Label>
                  <Textarea
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    placeholder={t('patient.prescriptions.meds_placeholder', '[{"name":"Paracetamol","dosage":"500mg","frequency":"3 times daily"}] or Paracetamol, Ibuprofen')}
                    className="mt-2 font-mono text-sm"
                    rows={6}
                  />
                </div>

                <div>
                  <Label>{t('patient.prescriptions.instructions', "Instructions")}</Label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder={t('patient.prescriptions.instructions_placeholder', "General instructions for the patient")}
                    className="mt-2"
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setShowDialog(false);
                      resetForm();
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('common.cancel', "Cancel")}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-[#0D9488] to-[#0F766E]"
                  >
                    {saving ? t('common.saving', "Saving...") : editingTemplate ? t('common.update', "Update") : t('common.create', "Create")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </div>
  );
}
