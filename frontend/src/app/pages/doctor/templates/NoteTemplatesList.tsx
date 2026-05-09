import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  Plus, Search, Filter, Edit, Trash2, Copy, FileText, 
  Calendar, User, Clock, Star, MoreVertical, Eye,
  AlertTriangle, CheckCircle, BookOpen, Stethoscope, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  category: 'consultation' | 'follow-up' | 'diagnosis' | 'procedure' | 'discharge' | 'referral';
  format: 'soap' | 'narrative' | 'structured';
  content: string;
  tags: string[];
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface NoteTemplatesResponse {
  templates: NoteTemplate[];
  total: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
  popular_tags: string[];
}
export default function NoteTemplatesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');

  // API call to get note templates
  const { data: templatesData, isLoading, refetch } = useQuery({
    queryKey: ['doctor-note-templates', searchTerm, categoryFilter, formatFilter, sortBy],
    queryFn: async (): Promise<NoteTemplatesResponse> => {
      // This connects to: GET /api/v1/doctor/templates/notes
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(formatFilter !== 'all' && { format: formatFilter }),
        sort_by: sortBy
      });
      
      const response = await fetch(`/api/v1/doctor/templates/notes?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch note templates');
      }
      
      return response.json();
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/v1/doctor/templates/notes/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-note-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete template');
    }
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/v1/doctor/templates/notes/${templateId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to duplicate template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-note-templates'] });
      toast.success('Template duplicated successfully');
    },
    onError: () => {
      toast.error('Failed to duplicate template');
    }
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ templateId, isFavorite }: { templateId: string; isFavorite: boolean }) => {
      const response = await fetch(`/api/v1/doctor/templates/notes/${templateId}/favorite`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_favorite: !isFavorite })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-note-templates'] });
    }
  });

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const handleDuplicateTemplate = (templateId: string) => {
    duplicateTemplateMutation.mutate(templateId);
  };

  const handleToggleFavorite = (templateId: string, isFavorite: boolean) => {
    toggleFavoriteMutation.mutate({ templateId, isFavorite });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'consultation': return <Stethoscope className="w-4 h-4" />;
      case 'follow-up': return <Calendar className="w-4 h-4" />;
      case 'diagnosis': return <FileText className="w-4 h-4" />;
      case 'procedure': return <BookOpen className="w-4 h-4" />;
      case 'discharge': return <CheckCircle className="w-4 h-4" />;
      case 'referral': return <User className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'consultation': return 'bg-blue-100 text-blue-700';
      case 'follow-up': return 'bg-green-100 text-green-700';
      case 'diagnosis': return 'bg-purple-100 text-purple-700';
      case 'procedure': return 'bg-orange-100 text-orange-700';
      case 'discharge': return 'bg-teal-100 text-teal-700';
      case 'referral': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="w-[300px] h-[40px]" />
          <div className="flex gap-4">
            <Skeleton className="w-[200px] h-[40px]" />
            <Skeleton className="w-[150px] h-[40px]" />
            <Skeleton className="w-[150px] h-[40px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[200px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!templatesData) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Templates</h2>
          <p className="text-[#64748B] mb-6">There was an error loading your note templates.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { templates, total, categories } = templatesData;
  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Note Templates</h1>
            <p className="text-[#64748B]">Manage your clinical note templates for efficient documentation</p>
          </div>
          <Button 
            onClick={() => navigate('/doctor/templates/notes/new')}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Total Templates</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{total}</p>
                </div>
                <FileText className="w-8 h-8 text-[#0EA5E9]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Categories</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{categories.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-[#22C55E]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Favorites</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {templates.filter(t => t.is_favorite).length}
                  </p>
                </div>
                <Star className="w-8 h-8 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Most Used</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {Math.max(...templates.map(t => t.usage_count), 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#8B5CF6]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] w-4 h-4" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="diagnosis">Diagnosis</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="discharge">Discharge</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>

              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="soap">SOAP</SelectItem>
                  <SelectItem value="narrative">Narrative</SelectItem>
                  <SelectItem value="structured">Structured</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Recently Updated</SelectItem>
                  <SelectItem value="created_at">Recently Created</SelectItem>
                  <SelectItem value="usage_count">Most Used</SelectItem>
                  <SelectItem value="title">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        {/* Templates Grid */}
        {templates.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No Templates Found</h3>
              <p className="text-[#64748B] mb-6">
                {searchTerm || categoryFilter !== 'all' || formatFilter !== 'all' 
                  ? 'Try adjusting your filters to see more templates.'
                  : 'Create your first note template to get started with efficient documentation.'
                }
              </p>
              <Button 
                onClick={() => navigate('/doctor/templates/notes/new')}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getCategoryColor(template.category)} border-0`}>
                            {getCategoryIcon(template.category)}
                            <span className="ml-1 capitalize">{template.category}</span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.format.toUpperCase()}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold text-[#0F172A] mb-1">
                          {template.title}
                        </CardTitle>
                        <p className="text-sm text-[#64748B] line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-1">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/doctor/templates/notes/${template.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/doctor/templates/notes/edit/${template.id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleFavorite(template.id, template.is_favorite)}
                          >
                            <Star className={`w-4 h-4 mr-2 ${template.is_favorite ? 'fill-current text-yellow-500' : ''}`} />
                            {template.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                                <span className="text-red-500">Delete</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Tags */}
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-[#64748B]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{template.usage_count} uses</span>
                          </div>
                        </div>
                        {template.is_favorite && (
                          <Star className="w-4 h-4 fill-current text-yellow-500" />
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(`/doctor/templates/notes/${template.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                          onClick={() => navigate(`/doctor/templates/notes/edit/${template.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}




