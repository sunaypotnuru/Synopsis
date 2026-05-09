import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Save, Eye, FileText, Plus, X, Star, 
  BookOpen, Stethoscope, Calendar, User, CheckCircle,
  AlertTriangle, Copy, Trash2, RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface NoteTemplate {
  id?: string;
  title: string;
  description: string;
  category: 'consultation' | 'follow-up' | 'diagnosis' | 'procedure' | 'discharge' | 'referral';
  format: 'soap' | 'narrative' | 'structured';
  content: string;
  tags: string[];
  is_favorite: boolean;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface SOAPTemplate {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const SOAP_TEMPLATE: SOAPTemplate = {
  subjective: "Chief Complaint:\n\nHistory of Present Illness:\n\nReview of Systems:\n\nPast Medical History:\n\nMedications:\n\nAllergies:\n\nSocial History:",
  objective: "Vital Signs:\n- Temperature: \n- Blood Pressure: \n- Heart Rate: \n- Respiratory Rate: \n- Oxygen Saturation: \n\nPhysical Examination:\n- General Appearance: \n- HEENT: \n- Cardiovascular: \n- Respiratory: \n- Abdomen: \n- Neurological: \n- Extremities: \n\nLaboratory/Diagnostic Results:",
  assessment: "Primary Diagnosis:\n\nDifferential Diagnosis:\n\nClinical Impression:",
  plan: "Treatment Plan:\n\nMedications:\n\nFollow-up:\n\nPatient Education:\n\nReferrals:\n\nReturn Precautions:"
};

const CATEGORY_OPTIONS = [
  { value: 'consultation', label: 'Consultation', icon: Stethoscope },
  { value: 'follow-up', label: 'Follow-up', icon: Calendar },
  { value: 'diagnosis', label: 'Diagnosis', icon: FileText },
  { value: 'procedure', label: 'Procedure', icon: BookOpen },
  { value: 'discharge', label: 'Discharge', icon: CheckCircle },
  { value: 'referral', label: 'Referral', icon: User }
];

const FORMAT_OPTIONS = [
  { value: 'soap', label: 'SOAP Format', description: 'Subjective, Objective, Assessment, Plan' },
  { value: 'narrative', label: 'Narrative', description: 'Free-form narrative documentation' },
  { value: 'structured', label: 'Structured', description: 'Custom structured format' }
];
export default function CreateEditNoteTemplate() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const queryClient = useQueryClient();
  const isEditing = Boolean(templateId);
  
  const [activeTab, setActiveTab] = useState('editor');
  const [template, setTemplate] = useState<NoteTemplate>({
    title: '',
    description: '',
    category: 'consultation',
    format: 'soap',
    content: '',
    tags: [],
    is_favorite: false
  });
  
  const [soapContent, setSoapContent] = useState<SOAPTemplate>(SOAP_TEMPLATE);
  const [newTag, setNewTag] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing template for editing
  const { data: existingTemplate, isLoading } = useQuery({
    queryKey: ['note-template', templateId],
    queryFn: async (): Promise<NoteTemplate> => {
      const response = await fetch(`/api/v1/doctor/templates/notes/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      
      return response.json();
    },
    enabled: isEditing
  });

  // Load template data when editing
  useEffect(() => {
    if (existingTemplate) {
      setTemplate(existingTemplate);
      
      // Parse SOAP content if format is SOAP
      if (existingTemplate.format === 'soap') {
        try {
          const parsed = JSON.parse(existingTemplate.content);
          setSoapContent(parsed);
        } catch {
          // If parsing fails, use default SOAP template
          setSoapContent(SOAP_TEMPLATE);
        }
      }
    }
  }, [existingTemplate]);

  // Track unsaved changes
  useEffect(() => {
    if (existingTemplate) {
      const hasChanges = JSON.stringify(template) !== JSON.stringify(existingTemplate);
      setHasUnsavedChanges(hasChanges);
    } else {
      const hasContent = !!(template.title || template.description || template.content || template.tags.length > 0);
      setHasUnsavedChanges(hasContent);
    }
  }, [template, existingTemplate]);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: NoteTemplate) => {
      const url = isEditing 
        ? `/api/v1/doctor/templates/notes/${templateId}`
        : '/api/v1/doctor/templates/notes';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} template`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-note-templates'] });
      queryClient.invalidateQueries({ queryKey: ['note-template', templateId] });
      toast.success(`Template ${isEditing ? 'updated' : 'created'} successfully`);
      setHasUnsavedChanges(false);
      navigate('/doctor/templates/notes');
    },
    onError: () => {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} template`);
    }
  });

  const handleSave = () => {
    if (!template.title.trim()) {
      toast.error('Please enter a template title');
      return;
    }

    let contentToSave = template.content;
    
    // For SOAP format, stringify the SOAP content
    if (template.format === 'soap') {
      contentToSave = JSON.stringify(soapContent);
    }

    saveTemplateMutation.mutate({
      ...template,
      content: contentToSave
    });
  };

  const handleFormatChange = (newFormat: string) => {
    setTemplate(prev => ({ ...prev, format: newFormat as any }));
    
    // Reset content when changing format
    if (newFormat === 'soap') {
      setSoapContent(SOAP_TEMPLATE);
    } else {
      setTemplate(prev => ({ ...prev, content: '' }));
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !template.tags.includes(newTag.trim())) {
      setTemplate(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTemplate(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSOAPChange = (section: keyof SOAPTemplate, value: string) => {
    setSoapContent(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const resetTemplate = () => {
    if (isEditing && existingTemplate) {
      setTemplate(existingTemplate);
      if (existingTemplate.format === 'soap') {
        try {
          const parsed = JSON.parse(existingTemplate.content);
          setSoapContent(parsed);
        } catch {
          setSoapContent(SOAP_TEMPLATE);
        }
      }
    } else {
      setTemplate({
        title: '',
        description: '',
        category: 'consultation',
        format: 'soap',
        content: '',
        tags: [],
        is_favorite: false
      });
      setSoapContent(SOAP_TEMPLATE);
    }
    setHasUnsavedChanges(false);
  };
  if (isLoading && isEditing) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[400px] rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[200px] rounded-xl" />
              <Skeleton className="h-[150px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/doctor/templates/notes')}
              className="p-2 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
                {isEditing ? 'Edit Template' : 'Create Note Template'}
              </h1>
              <p className="text-[#64748B]">
                {isEditing 
                  ? 'Update your clinical note template'
                  : 'Create a new template for efficient clinical documentation'
                }
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {hasUnsavedChanges && (
              <Button
                variant="outline"
                onClick={resetTemplate}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setActiveTab('preview')}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveTemplateMutation.isPending}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveTemplateMutation.isPending 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Template' : 'Create Template')
              }
            </Button>
          </div>
        </motion.div>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    You have unsaved changes. Don't forget to save your template.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Editor Section */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              {/* Editor Tab */}
              <TabsContent value="editor" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A]">Template Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Format Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-[#0F172A]">Template Format</Label>
                      <div className="grid grid-cols-1 gap-3">
                        {FORMAT_OPTIONS.map((format) => (
                          <div
                            key={format.value}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              template.format === format.value
                                ? 'border-[#0EA5E9] bg-blue-50'
                                : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                            }`}
                            onClick={() => handleFormatChange(format.value)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[#0F172A]">{format.label}</p>
                                <p className="text-sm text-[#64748B]">{format.description}</p>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                template.format === format.value
                                  ? 'border-[#0EA5E9] bg-[#0EA5E9]'
                                  : 'border-[#CBD5E1]'
                              }`}>
                                {template.format === format.value && (
                                  <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* SOAP Format Editor */}
                    {template.format === 'soap' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Stethoscope className="w-5 h-5 text-[#0EA5E9]" />
                          <h3 className="text-lg font-semibold text-[#0F172A]">SOAP Note Template</h3>
                        </div>
                        
                        {/* Subjective */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">S</span>
                            Subjective
                          </Label>
                          <Textarea
                            placeholder="Patient's chief complaint, history of present illness, review of systems..."
                            value={soapContent.subjective}
                            onChange={(e) => handleSOAPChange('subjective', e.target.value)}
                            className="min-h-[120px] resize-none"
                          />
                        </div>

                        {/* Objective */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">O</span>
                            Objective
                          </Label>
                          <Textarea
                            placeholder="Vital signs, physical examination findings, laboratory results..."
                            value={soapContent.objective}
                            onChange={(e) => handleSOAPChange('objective', e.target.value)}
                            className="min-h-[120px] resize-none"
                          />
                        </div>

                        {/* Assessment */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">A</span>
                            Assessment
                          </Label>
                          <Textarea
                            placeholder="Primary diagnosis, differential diagnosis, clinical impression..."
                            value={soapContent.assessment}
                            onChange={(e) => handleSOAPChange('assessment', e.target.value)}
                            className="min-h-[100px] resize-none"
                          />
                        </div>

                        {/* Plan */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">P</span>
                            Plan
                          </Label>
                          <Textarea
                            placeholder="Treatment plan, medications, follow-up instructions, patient education..."
                            value={soapContent.plan}
                            onChange={(e) => handleSOAPChange('plan', e.target.value)}
                            className="min-h-[120px] resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Narrative/Structured Format Editor */}
                    {template.format !== 'soap' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#0F172A]">Template Content</Label>
                        <Textarea
                          placeholder={`Enter your ${template.format} template content here...`}
                          value={template.content}
                          onChange={(e) => setTemplate(prev => ({ ...prev, content: e.target.value }))}
                          className="min-h-[400px] resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-[#64748B]">
                          Use placeholders like [PATIENT_NAME], [DATE], [CHIEF_COMPLAINT] for dynamic content.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Preview Tab */}
              <TabsContent value="preview" className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Template Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {template.format === 'soap' ? (
                      <div className="space-y-6">
                        <div className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold text-[#0F172A] mb-2">Subjective</h4>
                          <div className="whitespace-pre-wrap text-sm text-[#64748B] bg-[#F8FAFC] p-3 rounded">
                            {soapContent.subjective || 'No subjective content entered...'}
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-green-500 pl-4">
                          <h4 className="font-semibold text-[#0F172A] mb-2">Objective</h4>
                          <div className="whitespace-pre-wrap text-sm text-[#64748B] bg-[#F8FAFC] p-3 rounded">
                            {soapContent.objective || 'No objective content entered...'}
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-purple-500 pl-4">
                          <h4 className="font-semibold text-[#0F172A] mb-2">Assessment</h4>
                          <div className="whitespace-pre-wrap text-sm text-[#64748B] bg-[#F8FAFC] p-3 rounded">
                            {soapContent.assessment || 'No assessment content entered...'}
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-orange-500 pl-4">
                          <h4 className="font-semibold text-[#0F172A] mb-2">Plan</h4>
                          <div className="whitespace-pre-wrap text-sm text-[#64748B] bg-[#F8FAFC] p-3 rounded">
                            {soapContent.plan || 'No plan content entered...'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm text-[#64748B] bg-[#F8FAFC] p-4 rounded min-h-[300px]">
                        {template.content || 'No content entered...'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Basic Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A]">Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#0F172A]">Title *</Label>
                  <Input
                    placeholder="Enter template title"
                    value={template.title}
                    onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#0F172A]">Description</Label>
                  <Textarea
                    placeholder="Brief description of this template"
                    value={template.description}
                    onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#0F172A]">Category</Label>
                  <Select 
                    value={template.category} 
                    onValueChange={(value) => setTemplate(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => {
                        const Icon = category.icon;
                        return (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {category.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Favorite Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${template.is_favorite ? 'fill-current text-yellow-500' : 'text-[#64748B]'}`} />
                    <Label className="text-sm font-medium text-[#0F172A]">Add to Favorites</Label>
                  </div>
                  <Switch
                    checked={template.is_favorite}
                    onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, is_favorite: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0F172A]">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Add Tag */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTag}
                    className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tags List */}
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {template.tags.length === 0 && (
                  <p className="text-sm text-[#64748B] text-center py-4">
                    No tags added yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Template Stats (for editing) */}
            {isEditing && existingTemplate && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0F172A]">Template Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748B]">Usage Count</span>
                    <span className="font-medium text-[#0F172A]">{existingTemplate.usage_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748B]">Created</span>
                    <span className="font-medium text-[#0F172A]">
                      {new Date(existingTemplate.created_at!).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748B]">Last Updated</span>
                    <span className="font-medium text-[#0F172A]">
                      {new Date(existingTemplate.updated_at!).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}




