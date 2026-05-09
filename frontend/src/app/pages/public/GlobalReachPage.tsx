import React from 'react';
import { motion } from 'framer-motion';
import { Globe, MapPin, Users } from 'lucide-react';

export default function GlobalReachPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Globe className="w-16 h-16 text-teal-600 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Our Global Reach
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Breaking down geographical barriers to deliver AI-powered diagnostics to the most remote areas of the world.
          </p>
        </motion.div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {[
            { icon: Users, stat: "50,000+", label: "Patients Reached" },
            { icon: MapPin, stat: "15+", label: "Countries Active" },
            { icon: Globe, stat: "30+", label: "Rural Clinics Equipped" }
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <item.icon className="w-12 h-12 text-teal-600 mx-auto mb-4 opacity-80" />
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{item.stat}</div>
              <div className="text-gray-500 dark:text-gray-400">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
