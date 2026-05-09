import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import api from "@/lib/api";
import { useTranslation } from "react-i18next";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  status?: string;
}

interface AdvancedSearchModalProps {
  open: boolean;
  onClose: () => void;
  onResults: (results: SearchResult[]) => void;
}

export default function AdvancedSearchModal({ open, onClose, onResults }: AdvancedSearchModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/v1/search/advanced', {
        q: query,
        filters: {
          entity_type: entityType || null,
          date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
          date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : null,
          status: status || null,
          category: category || null,
          sort_by: sortBy,
          sort_order: sortOrder,
          limit: 50
        }
      });
      onResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setEntityType('');
    setStatus('');
    setCategory('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy('created_at');
    setSortOrder('desc');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />{t('components.advanced_search_modal.advanced_search', "Advanced Search")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Query */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('components.advanced_search_modal.search_query_1', "Search Query")}</label>
            <div className="flex gap-2">
              <Input
                placeholder={t('components.advanced_search_modal.search_across_all_data_placeholder_28', "Search across all data...")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <h3 className="font-medium">{t('components.advanced_search_modal.filters_2', "Filters")}</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-1" />{t('components.advanced_search_modal.clear_all_3', "Clear All")}</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Entity Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('components.advanced_search_modal.entity_type_4', "Entity Type")}</label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('components.advanced_search_modal.all_types_5', "All types")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('components.advanced_search_modal.all_types_5', "All types")}</SelectItem>
                    <SelectItem value="doctors">{t('components.advanced_search_modal.doctors_6', "Doctors")}</SelectItem>
                    <SelectItem value="patients">{t('components.advanced_search_modal.patients_7', "Patients")}</SelectItem>
                    <SelectItem value="appointments">{t('components.advanced_search_modal.appointments_8', "Appointments")}</SelectItem>
                    <SelectItem value="scans">{t('components.advanced_search_modal.scans_9', "Scans")}</SelectItem>
                    <SelectItem value="documents">{t('components.advanced_search_modal.documents_10', "Documents")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('components.advanced_search_modal.status_23', "Status")}</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('components.advanced_search_modal.any_status_12', "Any status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('components.advanced_search_modal.any_status_12', "Any status")}</SelectItem>
                    <SelectItem value="scheduled">{t('components.advanced_search_modal.scheduled_13', "Scheduled")}</SelectItem>
                    <SelectItem value="completed">{t('components.advanced_search_modal.completed_14', "Completed")}</SelectItem>
                    <SelectItem value="cancelled">{t('components.advanced_search_modal.cancelled_15', "Cancelled")}</SelectItem>
                    <SelectItem value="pending">{t('components.advanced_search_modal.pending_16', "Pending")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('components.advanced_search_modal.date_from_17', "Date From")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('components.advanced_search_modal.date_to_18', "Date To")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('components.advanced_search_modal.sort_by_19', "Sort By")}</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">{t('components.advanced_search_modal.date_created_20', "Date Created")}</SelectItem>
                    <SelectItem value="updated_at">{t('components.advanced_search_modal.date_updated_21', "Date Updated")}</SelectItem>
                    <SelectItem value="name">{t('components.advanced_search_modal.name_22', "Name")}</SelectItem>
                    <SelectItem value="status">{t('components.advanced_search_modal.status_11', "Status")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('components.advanced_search_modal.sort_order_24', "Sort Order")}</label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">{t('components.advanced_search_modal.newest_first_25', "Newest First")}</SelectItem>
                    <SelectItem value="asc">{t('components.advanced_search_modal.oldest_first_26', "Oldest First")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Save Search */}
          <div className="border-t pt-4">
            <Button variant="outline" disabled={!query}>{t('components.advanced_search_modal.save_this_search_27', "Save This Search")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
