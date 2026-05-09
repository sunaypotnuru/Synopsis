import { ReactNode } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/resizable.css';

interface DashboardGridLayoutProps {
  layout: Layout[];
  onLayoutChange: (layout: Layout[]) => void;
  isCustomizing: boolean;
  children: ReactNode;
}

export default function DashboardGridLayout({
  layout,
  onLayoutChange,
  isCustomizing,
  children,
}: DashboardGridLayoutProps) {
  const handleLayoutChange = (newLayout: Layout) => {
    onLayoutChange(newLayout as unknown as Layout[]);
    // Persist layout to localStorage
    localStorage.setItem('dashboardLayout', JSON.stringify(newLayout));
  };

  const GridLayoutAny = GridLayout as any;

  return (
    <div className={`relative ${isCustomizing ? 'dashboard-customizing' : ''}`}>
      <GridLayoutAny
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        onLayoutChange={handleLayoutChange}
        isDraggable={isCustomizing}
        isResizable={isCustomizing}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        draggableHandle=".drag-handle"
      >
        {children}
      </GridLayoutAny>

      <style>{`
        .dashboard-customizing .react-grid-item {
          border: 2px dashed #0D9488;
          background: rgba(13, 148, 136, 0.05);
          transition: all 0.2s ease;
          cursor: move;
        }

        .dashboard-customizing .react-grid-item:hover {
          border-color: #0F766E;
          background: rgba(13, 148, 136, 0.1);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
        }

        .dashboard-customizing .react-grid-item.react-grid-placeholder {
          background: rgba(13, 148, 136, 0.2);
          border: 2px dashed #0D9488;
          border-radius: 12px;
        }

        .react-grid-item > .react-resizable-handle {
          background-image: none;
        }

        .react-grid-item > .react-resizable-handle::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid #0D9488;
          border-bottom: 2px solid #0D9488;
        }

        .drag-handle {
          cursor: move;
          display: none;
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10;
          padding: 4px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: opacity 0.2s;
        }

        .dashboard-customizing .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drag-handle:hover {
          background: #f3f4f6;
        }

        .react-grid-item.react-draggable-dragging {
          opacity: 0.8;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .react-grid-item.resizing {
          opacity: 0.9;
        }

        /* Smooth transitions */
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }

        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
        }
      `}</style>
    </div>
  );
}
