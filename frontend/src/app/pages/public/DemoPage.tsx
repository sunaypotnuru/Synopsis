import React from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Experience Netra AI in Action
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Watch our interactive demo to see how we use AI to detect Anemia, Cataracts, and Diabetic Retinopathy in seconds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden aspect-video relative flex items-center justify-center border border-gray-100 dark:border-gray-700"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-blue-600/10 dark:from-teal-900/40 dark:to-blue-900/40" />
          <div className="text-center z-10 p-6">
             <PlayCircle className="w-20 h-20 text-teal-600 dark:text-teal-400 mx-auto mb-4 opacity-80" />
             <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Interactive Demo Coming Soon</h3>
             <p className="mt-2 text-gray-500 dark:text-gray-400">We are currently preparing an interactive sandbox environment for you.</p>
          </div>
        </motion.div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 text-left">
          {[
            "Instant AI Diagnostics",
            "HIPAA Compliant Security",
            "Seamless Doctor Routing"
          ].map((feature, i) => (
            <motion.div 
              key={feature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <CheckCircle2 className="w-6 h-6 text-teal-600 flex-shrink-0" />
              <span className="font-medium text-gray-800 dark:text-gray-200">{feature}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-12">
            <Link to="/signup/patient">
                <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 rounded-full">
                    Try For Free
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}
