import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  Plus, Edit2, Trash2, FileText, Image as ImageIcon, Search, Filter,
  Eye, Calendar, User, Tag, Globe, BookOpen, MoreVertical, Copy,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Download, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface Blog {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  image_url: string;
  published: boolean;
  featured: boolean;
  tags: string[];
  meta_description: string;
  slug: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface BlogsResponse {
  blogs: Blog[];
  total: number;
  total_published: number;
  total_drafts: number;
  popular_tags: string[];
}

export default function AdminBlogsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    author: 'Netra AI Team',
    image_url: '',
    published: false,
    featured: false,
    tags: [] as string[],
    meta_description: '',
    slug: ''
  });

  const [newTag, setNewTag] = useState('');

  // API call to get blogs
  const { data: blogsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-blogs', searchTerm, statusFilter, sortBy],
    queryFn: async (): Promise<BlogsResponse> => {
      // This connects to: GET /api/v1/blogs
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sort_by: sortBy
      });
      
      const response = await fetch(`/api/v1/blogs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch blogs');
      }
      
      return response.json();
    }
  });

  // Create blog mutation
  const createBlogMutation = useMutation({
    mutationFn: async (blogData: typeof formData) => {
      const response = await fetch('/api/v1/blogs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blogData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create blog');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      toast.success('Blog created successfully');
      setIsFormOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create blog');
    }
  });

  // Update blog mutation
  const updateBlogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await fetch(`/api/v1/blogs/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update blog');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      toast.success('Blog updated successfully');
      setIsFormOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update blog');
    }
  });

  // Delete blog mutation
  const deleteBlogMutation = useMutation({
    mutationFn: async (blogId: string) => {
      const response = await fetch(`/api/v1/blogs/${blogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete blog');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      toast.success('Blog deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete blog');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      author: 'Netra AI Team',
      image_url: '',
      published: false,
      featured: false,
      tags: [],
      meta_description: '',
      slug: ''
    });
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a blog title');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Please enter blog content');
      return;
    }

    // Auto-generate slug if not provided
    if (!formData.slug) {
      formData.slug = formData.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Auto-generate excerpt if not provided
    if (!formData.excerpt) {
      formData.excerpt = formData.content.substring(0, 150) + '...';
    }

    if (editingId) {
      updateBlogMutation.mutate({ id: editingId, data: formData });
    } else {
      createBlogMutation.mutate(formData);
    }
  };

  const handleDelete = (blogId: string) => {
    deleteBlogMutation.mutate(blogId);
  };

  const handleEdit = (blog: Blog) => {
    setFormData({
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt,
      author: blog.author,
      image_url: blog.image_url,
      published: blog.published,
      featured: blog.featured,
      tags: blog.tags,
      meta_description: blog.meta_description,
      slug: blog.slug
    });
    setEditingId(blog.id);
    setIsFormOpen(true);
  };

  const handleDuplicate = (blog: Blog) => {
    setFormData({
      title: `${blog.title} (Copy)`,
      content: blog.content,
      excerpt: blog.excerpt,
      author: blog.author,
      image_url: blog.image_url,
      published: false,
      featured: false,
      tags: blog.tags,
      meta_description: blog.meta_description,
      slug: `${blog.slug}-copy`
    });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const generateSlug = () => {
    if (formData.title) {
      const slug = formData.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
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
              <Skeleton key={i} className="h-[300px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!blogsData) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Unable to Load Blogs</h2>
          <p className="text-[#64748B] mb-6">There was an error loading the blog data.</p>
          <Button onClick={() => refetch()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { blogs, total, total_published, total_drafts } = blogsData;

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
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Blog Management</h1>
            <p className="text-[#64748B]">Create and manage blog posts for your healthcare platform</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Blog Post
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Total Posts</p>
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
                  <p className="text-sm text-[#64748B] mb-1">Published</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{total_published}</p>
                </div>
                <Globe className="w-8 h-8 text-[#22C55E]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Drafts</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{total_drafts}</p>
                </div>
                <Clock className="w-8 h-8 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Total Views</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {blogs.reduce((sum, blog) => sum + blog.views, 0).toLocaleString()}
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
                    placeholder="Search blog posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posts</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Recently Created</SelectItem>
                  <SelectItem value="updated_at">Recently Updated</SelectItem>
                  <SelectItem value="published_at">Recently Published</SelectItem>
                  <SelectItem value="views">Most Viewed</SelectItem>
                  <SelectItem value="title">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

      {isFormOpen && (
        <Card className="p-6 mb-8 border-t-4 border-t-teal-600 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            {editingId ? 'Edit Article' : 'Draft New Article'}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="The Future of AI in Healthcare" 
                />
              </div>
              <div>
                <Label>Author</Label>
                <Input 
                  required 
                  value={formData.author} 
                  onChange={e => setFormData({ ...formData, author: e.target.value })} 
                />
              </div>
            </div>
            
            <div>
              <Label>Cover Image URL (Optional)</Label>
              <div className="flex gap-2">
                 <ImageIcon className="w-10 h-10 p-2 bg-gray-100 rounded-lg text-gray-400" />
                 <Input 
                  value={formData.image_url} 
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })} 
                  placeholder="https://..." 
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Content (Markdown supported)</Label>
              <textarea 
                required
                rows={8}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Write your insightful article here..."
              />
            </div>

            <div className="flex items-center gap-2 mt-4 p-4 bg-gray-50 rounded-lg border">
              <input 
                type="checkbox" 
                id="published"
                checked={formData.published}
                onChange={e => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
              />
              <Label htmlFor="published" className="font-semibold cursor-pointer">Publish Immediately</Label>
              <span className="text-sm text-gray-500 ml-2">(If unchecked, it saves as a Draft)</span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                {isLoading ? 'Saving...' : (editingId ? 'Update Blog' : 'Save Blog')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading && !isFormOpen ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <motion.div 
              key={blog.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {blog.image_url ? (
                <img src={blog.image_url} alt={blog.title} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
                  <FileText className="w-12 h-12 text-teal-200" />
                </div>
              )}
              
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${blog.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {blog.published ? 'Published' : 'Draft'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(blog)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(blog.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{blog.title}</h3>
                <p className="text-sm text-gray-500 mb-4 font-medium">By {blog.author}</p>
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">{blog.content}</p>
                
                <div className="text-xs text-gray-400 pt-4 border-t">
                  Created: {new Date(blog.created_at).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))}

          {blogs.length === 0 && !isLoading && (
            <div className="col-span-full py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No blogs found. Create your first article!</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Form */}
      {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0EA5E9]" />
                  {editingId ? 'Edit Blog Post' : 'Create New Blog Post'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="content" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="seo">SEO & Meta</TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent value="content" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-[#0F172A]">Title *</Label>
                          <Input
                            placeholder="Enter blog post title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-[#0F172A]">Author</Label>
                          <Input
                            placeholder="Author name"
                            value={formData.author}
                            onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-[#0F172A]">Excerpt</Label>
                          <Textarea
                            placeholder="Brief description of the blog post"
                            value={formData.excerpt}
                            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                            className="mt-1 resize-none"
                            rows={3}
                          />
                          <p className="text-xs text-[#64748B] mt-1">
                            {formData.excerpt.length}/150 characters
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-[#0F172A]">Featured Image URL</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={formData.image_url}
                              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm">
                              <ImageIcon className="w-4 h-4" />
                            </Button>
                          </div>
                          {formData.image_url && (
                            <div className="mt-2">
                              <img 
                                src={formData.image_url} 
                                alt="Preview" 
                                className="w-full h-32 object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-[#0F172A]">Tags</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              placeholder="Add a tag"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                              className="flex-1"
                            />
                            <Button 
                              type="button"
                              onClick={handleAddTag}
                              size="sm"
                              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {formData.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1 hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0F172A]">Content *</Label>
                      <Textarea
                        placeholder="Write your blog post content here... (Markdown supported)"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        className="mt-1 min-h-[300px] resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-[#64748B] mt-1">
                        Supports Markdown formatting. {formData.content.length} characters
                      </p>
                    </div>
                  </TabsContent>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <Label className="text-sm font-medium text-[#0F172A]">Publish Status</Label>
                            <p className="text-xs text-[#64748B]">Make this post visible to the public</p>
                          </div>
                          <Switch
                            checked={formData.published}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <Label className="text-sm font-medium text-[#0F172A]">Featured Post</Label>
                            <p className="text-xs text-[#64748B]">Highlight this post on the homepage</p>
                          </div>
                          <Switch
                            checked={formData.featured}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-[#F8FAFC] rounded-lg">
                          <h3 className="font-medium text-[#0F172A] mb-2">Publishing Info</h3>
                          <div className="space-y-2 text-sm text-[#64748B]">
                            <p>Status: {formData.published ? 'Published' : 'Draft'}</p>
                            <p>Featured: {formData.featured ? 'Yes' : 'No'}</p>
                            <p>Tags: {formData.tags.length} tags</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* SEO Tab */}
                  <TabsContent value="seo" className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-[#0F172A]">URL Slug</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="blog-post-url-slug"
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                            className="flex-1"
                          />
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={generateSlug}
                            size="sm"
                          >
                            Generate
                          </Button>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1">
                          URL: /blog/{formData.slug || 'your-slug-here'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-[#0F172A]">Meta Description</Label>
                        <Textarea
                          placeholder="Brief description for search engines (150-160 characters)"
                          value={formData.meta_description}
                          onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                          className="mt-1 resize-none"
                          rows={3}
                        />
                        <p className="text-xs text-[#64748B] mt-1">
                          {formData.meta_description.length}/160 characters
                        </p>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] rounded-lg">
                        <h3 className="font-medium text-[#0F172A] mb-2">SEO Preview</h3>
                        <div className="space-y-1">
                          <p className="text-blue-600 text-sm font-medium">
                            {formData.title || 'Blog Post Title'}
                          </p>
                          <p className="text-green-600 text-xs">
                            https://netra-ai.com/blog/{formData.slug || 'blog-post-slug'}
                          </p>
                          <p className="text-[#64748B] text-sm">
                            {formData.meta_description || formData.excerpt || 'Meta description will appear here...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator className="my-6" />

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={createBlogMutation.isPending || updateBlogMutation.isPending}
                    className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                  >
                    {createBlogMutation.isPending || updateBlogMutation.isPending
                      ? 'Saving...' 
                      : editingId 
                        ? 'Update Post' 
                        : 'Create Post'
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {/* Blog List */}
        {blogs.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No Blog Posts Found</h3>
              <p className="text-[#64748B] mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters to see more posts.'
                  : 'Create your first blog post to get started.'
                }
              </p>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="relative">
                    {blog.image_url ? (
                      <img 
                        src={blog.image_url} 
                        alt={blog.title} 
                        className="w-full h-48 object-cover rounded-t-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-[#0EA5E9]/10 to-[#22C55E]/10 flex items-center justify-center rounded-t-lg">
                        <FileText className="w-12 h-12 text-[#0EA5E9]" />
                      </div>
                    )}
                    
                    {/* Status Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge 
                        className={
                          blog.published 
                            ? 'bg-green-100 text-green-700 border-0' 
                            : 'bg-yellow-100 text-yellow-700 border-0'
                        }
                      >
                        {blog.published ? 'Published' : 'Draft'}
                      </Badge>
                      {blog.featured && (
                        <Badge className="bg-purple-100 text-purple-700 border-0">
                          Featured
                        </Badge>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="bg-white/80 backdrop-blur-sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/blog/${blog.slug}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Post
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(blog)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(blog)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
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
                                <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{blog.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(blog.id)}
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
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-[#0F172A] mb-2 line-clamp-2">
                          {blog.title}
                        </h3>
                        <p className="text-sm text-[#64748B] line-clamp-3">
                          {blog.excerpt || blog.content.substring(0, 150) + '...'}
                        </p>
                      </div>

                      {/* Tags */}
                      {blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {blog.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {blog.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{blog.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-[#64748B] pt-3 border-t">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{blog.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{blog.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{blog.likes}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(`/blog/${blog.slug}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                          onClick={() => handleEdit(blog)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
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