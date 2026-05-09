import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { FileText, Calendar, User } from 'lucide-react';

interface Blog {
  id: string;
  title: string;
  content: string;
  author: string;
  image_url: string;
  created_at: string;
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase text-sm mb-4 block">Netra AI Blog</span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Latest Insights & Research
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Stay updated with the latest advancements in AI-driven healthcare, telemedicine, and our platform updates.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
          </div>
        ) : blogs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog, idx) => (
              <motion.article
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group"
              >
                {blog.image_url ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={blog.image_url} 
                      alt={blog.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-teal-200 dark:text-teal-800" />
                  </div>
                )}
                
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                    {blog.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-6">
                    {blog.content}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{blog.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16 bg-white dark:bg-gray-800 rounded-3xl p-16 shadow-sm border border-gray-100 dark:border-gray-700 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">No Articles Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Check back soon for our first publication!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

