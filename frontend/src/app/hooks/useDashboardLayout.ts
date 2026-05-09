import { useState } from 'react';
import api from '../../lib/api';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

const defaultLayout: LayoutItem[] = [
  { i: 'hero', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
  { i: 'healthScore', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'loginStreak', x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 },
  { i: 'quickActions', x: 0, y: 7, w: 12, h: 4, minW: 6, minH: 3 },
  { i: 'recentScans', x: 0, y: 11, w: 6, h: 5, minW: 4, minH: 4 },
  { i: 'appointments', x: 6, y: 11, w: 6, h: 5, minW: 4, minH: 4 },
];

export const useDashboardLayout = () => {
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    const saved = localStorage.getItem('dashboardLayout');
    return saved ? JSON.parse(saved) : defaultLayout;
  });

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    setLayout(newLayout);
  };

  const saveLayout = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('dashboardLayout', JSON.stringify(layout));

      // Save to backend (optional)
      try {
        await api.post('/api/v1/preferences/dashboard-layout', { layout });
      } catch (error) {
        console.log('Backend save failed, using localStorage only');
      }

      return true;
    } catch (error) {
      console.error('Failed to save layout:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
    localStorage.setItem('dashboardLayout', JSON.stringify(defaultLayout));
  };

  const toggleCustomizing = async () => {
    if (isCustomizing) {
      // Exiting customize mode - save layout
      await saveLayout();
    }
    setIsCustomizing(!isCustomizing);
  };

  return {
    layout,
    isCustomizing,
    isSaving,
    handleLayoutChange,
    saveLayout,
    resetLayout,
    toggleCustomizing,
    setIsCustomizing,
  };
};
