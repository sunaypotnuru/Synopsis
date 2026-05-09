import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import api from "@/lib/api";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: string;
  filters?: Record<string, unknown>;
}

export default function ExportDialog({ open, onClose, entityType, filters }: ExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const availableColumns: Record<string, string[]> = {
    appointments: ['id', 'patient_name', 'doctor_name', 'scheduled_at', 'status', 'type', 'reason'],
    patients: ['id', 'full_name', 'email', 'phone', 'date_of_birth', 'created_at'],
    scans: ['id', 'patient_name', 'prediction', 'confidence', 'created_at'],
    prescriptions: ['id', 'patient_name', 'doctor_name', 'medications', 'created_at']
  };

  const columns = availableColumns[entityType] || [];

  const handleExport = async () => {
    setLoading(true);
    try {
      const endpoint = format === 'csv' ? '/api/v1/export/csv' : '/api/v1/export/json';
      
      const response = await api.post(endpoint, {
        entity_type: entityType,
        filters: filters || {},
        columns: selectedColumns.length > 0 ? selectedColumns : columns
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entityType}_export_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export completed successfully!');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(columns);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {entityType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('components.export_dialog.export_format', "Export Format")}</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel Compatible)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />{t('components.export_dialog.json_1', "JSON")}</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('components.export_dialog.select_columns_2', "Select Columns")}</label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllColumns}>{t('components.export_dialog.select_all_3', "Select All")}</Button>
                <Button variant="ghost" size="sm" onClick={deselectAllColumns}>{t('components.export_dialog.deselect_all_4', "Deselect All")}</Button>
              </div>
            </div>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {columns.map(column => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={column}
                      checked={selectedColumns.length === 0 || selectedColumns.includes(column)}
                      onCheckedChange={() => toggleColumn(column)}
                    />
                    <label
                      htmlFor={column}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Export Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{t('components.export_dialog.note_5', "Note:")}</strong> The export will include all data matching your current filters.
              {selectedColumns.length > 0 && ` Selected ${selectedColumns.length} columns.`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>{t('components.export_dialog.cancel_6', "Cancel")}</Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
