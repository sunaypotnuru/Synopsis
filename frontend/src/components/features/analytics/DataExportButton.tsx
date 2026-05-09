/**
 * Data Export Button Component
 * 
 * Allows exporting analytics data in multiple formats:
 * - CSV (Comma-Separated Values)
 * - JSON (JavaScript Object Notation)
 * - PDF (Portable Document Format) - using jsPDF
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { analyticsAPI } from '@/services/api';

interface DataExportButtonProps {
  type: 'users' | 'appointments' | 'ai_usage' | 'revenue' | 'messaging' | 'all';
  dateRange?: {
    start_date: string;
    end_date: string;
  };
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function DataExportButton({
  type,
  dateRange,
  label = 'Export Data',
  variant = 'default',
  size = 'default',
}: DataExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    setShowMenu(false);

    try {
      // Call export API
      const response = await analyticsAPI.exportAnalytics({
        type,
        format,
        date_range: dateRange || {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
        },
      });

      // Use the download URL from the response
      if (response.download_url) {
        const link = document.createElement('a');
        link.href = response.download_url;
        link.download = `netra-ai-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success(`Data exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setShowMenu(!showMenu)}
        variant={variant}
        size={size}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {label}
          </>
        )}
      </Button>

      {/* Export Menu */}
      {showMenu && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
          <button
            onClick={() => handleExport('csv')}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-medium text-gray-700 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Export as CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-medium text-gray-700 transition-colors"
          >
            <FileText className="w-5 h-5 text-blue-600" />
            Export as JSON
          </button>
        </div>
      )}

      {/* Backdrop to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
