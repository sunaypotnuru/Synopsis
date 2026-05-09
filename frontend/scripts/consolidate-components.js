#!/usr/bin/env node

/**
 * Component Consolidation Script
 * 
 * This script consolidates components from src/app/components/ to src/components/
 * following the new component hierarchy:
 * 
 * src/components/
 * ├── ui/              - UI primitives (shadcn/ui + animated)
 * ├── features/        - Feature-specific components
 * ├── layout/          - Layout components
 * └── shared/          - Shared utility components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Base paths
const SRC_ROOT = path.join(__dirname, '../src');
const OLD_COMPONENTS = path.join(SRC_ROOT, 'app/components');
const NEW_COMPONENTS = path.join(SRC_ROOT, 'components');

// Component categorization
const COMPONENT_MAP = {
  // UI Components - Move to src/components/ui/
  ui: [
    'accordion.tsx',
    'alert-dialog.tsx',
    'alert.tsx',
    'aspect-ratio.tsx',
    'avatar.tsx',
    'badge.tsx',
    'breadcrumb.tsx',
    'button.tsx', // Will merge with existing
    'calendar.tsx',
    'card.tsx', // Will merge with existing
    'carousel.tsx',
    'chart.tsx',
    'checkbox.tsx',
    'collapsible.tsx',
    'command.tsx',
    'context-menu.tsx',
    'date-range-picker.tsx',
    'dialog.tsx', // Will merge with existing
    'drawer.tsx',
    'dropdown-menu.tsx', // Will merge with existing
    'form.tsx',
    'hover-card.tsx',
    'input-otp.tsx',
    'input.tsx', // Will merge with existing
    'label.tsx',
    'menubar.tsx',
    'navigation-menu.tsx',
    'pagination.tsx',
    'popover.tsx',
    'progress.tsx',
    'radio-group.tsx',
    'resizable.tsx',
    'scroll-area.tsx',
    'select.tsx', // Will merge with existing
    'separator.tsx',
    'sheet.tsx',
    'sidebar.tsx',
    'skeleton.tsx', // Will merge with existing
    'slider.tsx',
    'sonner.tsx', // Will merge with existing
    'switch.tsx',
    'table.tsx',
    'tabs.tsx', // Will merge with existing
    'textarea.tsx',
    'toggle-group.tsx',
    'toggle.tsx',
    'tooltip.tsx',
    'use-mobile.ts',
    'utils.ts',
  ],

  // Accessibility Components - Move to src/components/features/accessibility/
  accessibility: [
    'AccessibilityWidget.tsx',
    'AccessibleClickable.tsx',
    'AccessibleFormInput.tsx',
    'AccessibleFormSelect.tsx',
    'AccessibleFormTextarea.tsx',
    'VoiceAccessibility.tsx',
  ],

  // AI Components - Move to src/components/features/ai/
  ai: [
    'AIAssistantWidget.tsx',
    'AILogicBreakdown.tsx',
    'XAIVisualizer.tsx',
    'XAIVisualizationPanel.tsx',
    'ChatbotWidget.tsx',
    'FloatingChatbot.tsx',
    'ScribePanel.tsx',
  ],

  // Analytics Components - Move to src/components/features/analytics/
  analytics: [
    'AnalyticsDashboard.tsx',
    'FDAApmChart.tsx',
  ],

  // Auth Components - Move to src/components/features/auth/
  auth: [
    'MFAEnforcement.tsx',
    'MFALogin.tsx',
    'MFASetup.tsx',
  ],

  // Compliance Components - Move to src/components/features/compliance/
  compliance: [
    'ComplianceAlert.tsx',
    'ComplianceScoreCard.tsx',
    'SOC2ControlCard.tsx',
    'TraceabilityMatrix.tsx',
  ],

  // Messaging Components - Move to src/components/features/messaging/
  messaging: [
    'MessageBubble.tsx',
    'MessageInput.tsx',
    'EmojiPicker.tsx',
  ],

  // Video Components - Move to src/components/features/video/
  video: [
    'VideoPlayer.tsx',
    'VideoRecorder.tsx',
    'VoiceNoteRecorder.tsx',
  ],

  // Layout Components - Move to src/components/layout/
  layout: [
    'Navbar.tsx',
    'NavbarMain.tsx',
    'Footer.tsx',
    'Hero.tsx',
    'HeroRealistic.tsx',
    'HeroStoryAnimation.tsx',
    'hero-animations.css',
    'AboutSection.tsx',
    'ContactSection.tsx',
    'HowItWorks.tsx',
    'ReviewSection.tsx',
  ],

  // Shared Components - Move to src/components/shared/
  shared: [
    'ErrorBoundary.tsx',
    'ErrorMessage.tsx',
    'LoadingSpinner.tsx',
    'PageLoadingSkeleton.tsx',
    'PageTransition.tsx',
    'ThemeToggle.tsx',
    'LanguageSwitcher.tsx',
    'GlobalSearch.tsx',
    'CommandPalette.tsx',
    'AdvancedSearchModal.tsx',
    'Breadcrumb.tsx',
    'ExportDialog.tsx',
    'DocumentShareModal.tsx',
    'InstallPrompt.tsx',
    'WakeUpButton.tsx',
    'SOSButton.tsx',
    'AmbientBackground.tsx',
    'FuturisticBackground.tsx',
    'PortalHeroOverlay.tsx',
    'RevealOnScroll.tsx',
  ],

  // Domain-Specific Components - Move to src/components/features/domain/
  domain: [
    'AdminLayoutWrapper.tsx',
    'AdminRoute.tsx',
    'ProtectedRoute.tsx',
    'DashboardGridLayout.tsx',
    'FamilyProfileSwitcher.tsx',
    'PrescriptionPad.tsx',
    'PrescriptionSummary.tsx',
    'ClinicalReportGenerator.tsx',
    'DrugAutocomplete.tsx',
    'SOAPEditor.tsx',
    'Whiteboard.tsx',
    'UploadSection.tsx',
    'ResultCard.tsx',
    'BadgeDisplay.tsx',
    'StreakDisplay.tsx',
    'ChallengeCard.tsx',
    'AnimatedCounter.tsx',
    'LiveAuditLog.tsx',
  ],
};

// Subdirectories to move entirely
const SUBDIRS_TO_MOVE = {
  'ai': 'features/ai',
  'analytics': 'features/analytics',
  'figma': 'features/figma',
  'messaging': 'features/messaging',
  'video': 'features/video',
};

// Duplicates that need special handling
const DUPLICATES = [
  'button.tsx',
  'card.tsx',
  'dialog.tsx',
  'dropdown-menu.tsx',
  'input.tsx',
  'select.tsx',
  'skeleton.tsx',
  'sonner.tsx',
  'tabs.tsx',
];

// Statistics
const stats = {
  moved: 0,
  skipped: 0,
  errors: 0,
  duplicates: 0,
};

function log(message, level = 'info') {
  if (level === 'verbose' && !VERBOSE) return;
  
  const prefix = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    verbose: '🔍',
  }[level] || '📝';
  
  console.log(`${prefix} ${message}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    if (!DRY_RUN) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    log(`Created directory: ${path.relative(SRC_ROOT, dirPath)}`, 'verbose');
  }
}

function moveFile(sourcePath, destPath) {
  try {
    const sourceExists = fs.existsSync(sourcePath);
    const destExists = fs.existsSync(destPath);

    if (!sourceExists) {
      log(`Source not found: ${path.relative(SRC_ROOT, sourcePath)}`, 'warning');
      stats.skipped++;
      return false;
    }

    if (destExists) {
      const fileName = path.basename(sourcePath);
      if (DUPLICATES.includes(fileName)) {
        log(`Duplicate found: ${fileName} (needs manual merge)`, 'warning');
        stats.duplicates++;
        return false;
      }
      log(`Destination exists: ${path.relative(SRC_ROOT, destPath)}`, 'warning');
      stats.skipped++;
      return false;
    }

    if (DRY_RUN) {
      log(`Would move: ${path.relative(SRC_ROOT, sourcePath)} → ${path.relative(SRC_ROOT, destPath)}`, 'verbose');
    } else {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(sourcePath, destPath);
      log(`Moved: ${path.basename(sourcePath)}`, 'success');
    }
    
    stats.moved++;
    return true;
  } catch (error) {
    log(`Error moving ${path.basename(sourcePath)}: ${error.message}`, 'error');
    stats.errors++;
    return false;
  }
}

function moveComponentsByCategory() {
  log('\n🚀 Starting Component Consolidation...\n');
  
  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No files will be moved\n', 'warning');
  }

  // Move UI components
  log('\n📦 Moving UI Components...');
  const uiDestDir = path.join(NEW_COMPONENTS, 'ui');
  ensureDir(uiDestDir);
  
  COMPONENT_MAP.ui.forEach(file => {
    const sourcePath = path.join(OLD_COMPONENTS, 'ui', file);
    const destPath = path.join(uiDestDir, file);
    moveFile(sourcePath, destPath);
  });

  // Move feature components
  Object.keys(COMPONENT_MAP).forEach(category => {
    if (category === 'ui') return; // Already handled
    
    log(`\n📦 Moving ${category.charAt(0).toUpperCase() + category.slice(1)} Components...`);
    
    const destDir = category === 'shared' || category === 'layout'
      ? path.join(NEW_COMPONENTS, category)
      : path.join(NEW_COMPONENTS, 'features', category);
    
    ensureDir(destDir);
    
    COMPONENT_MAP[category].forEach(file => {
      const sourcePath = path.join(OLD_COMPONENTS, file);
      const destPath = path.join(destDir, file);
      moveFile(sourcePath, destPath);
    });
  });

  // Move subdirectories
  log('\n📦 Moving Subdirectories...');
  Object.entries(SUBDIRS_TO_MOVE).forEach(([sourceDir, destDir]) => {
    const sourcePath = path.join(OLD_COMPONENTS, sourceDir);
    const destPath = path.join(NEW_COMPONENTS, destDir);
    
    if (fs.existsSync(sourcePath)) {
      log(`Moving directory: ${sourceDir} → ${destDir}`, 'verbose');
      if (!DRY_RUN) {
        ensureDir(path.dirname(destPath));
        fs.cpSync(sourcePath, destPath, { recursive: true });
        log(`Moved directory: ${sourceDir}`, 'success');
        stats.moved++;
      }
    }
  });
}

function createIndexFiles() {
  log('\n📝 Creating Index Files...');
  
  const indexFiles = {
    'ui/index.ts': generateUIIndex(),
    'features/accessibility/index.ts': generateFeatureIndex('accessibility'),
    'features/ai/index.ts': generateFeatureIndex('ai'),
    'features/analytics/index.ts': generateFeatureIndex('analytics'),
    'features/auth/index.ts': generateFeatureIndex('auth'),
    'features/compliance/index.ts': generateFeatureIndex('compliance'),
    'features/messaging/index.ts': generateFeatureIndex('messaging'),
    'features/video/index.ts': generateFeatureIndex('video'),
    'features/domain/index.ts': generateFeatureIndex('domain'),
    'layout/index.ts': generateFeatureIndex('layout'),
    'shared/index.ts': generateFeatureIndex('shared'),
    'index.ts': generateMainIndex(),
  };

  Object.entries(indexFiles).forEach(([filePath, content]) => {
    const fullPath = path.join(NEW_COMPONENTS, filePath);
    if (DRY_RUN) {
      log(`Would create: ${filePath}`, 'verbose');
    } else {
      ensureDir(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content);
      log(`Created: ${filePath}`, 'success');
    }
  });
}

function generateUIIndex() {
  return `// UI Components - Auto-generated
// This file exports all UI primitives from shadcn/ui and animated variants

// Base UI Components
export * from './button';
export * from './card';
export * from './dialog';
export * from './input';
export * from './select';
export * from './tabs';
export * from './accordion';
export * from './alert';
export * from './alert-dialog';
export * from './avatar';
export * from './badge';
export * from './calendar';
export * from './checkbox';
export * from './command';
export * from './dropdown-menu';
export * from './form';
export * from './label';
export * from './popover';
export * from './progress';
export * from './radio-group';
export * from './scroll-area';
export * from './separator';
export * from './sheet';
export * from './skeleton';
export * from './slider';
export * from './switch';
export * from './table';
export * from './textarea';
export * from './tooltip';

// Animated Variants
export * from './animated-accordion';
export * from './animated-button';
export * from './animated-card';
export * from './animated-checkbox';
export * from './animated-drawer';
export * from './animated-dropdown';
export * from './animated-input';
export * from './animated-modal';
export * from './animated-page-transition';
export * from './animated-progress';
export * from './animated-skeleton';
export * from './animated-switch';
export * from './animated-tabs';
export * from './animated-toast';
export * from './animated-tooltip';
`;
}

function generateFeatureIndex(category) {
  const components = COMPONENT_MAP[category] || [];
  const exports = components
    .filter(file => file.endsWith('.tsx'))
    .map(file => {
      const name = file.replace('.tsx', '');
      return `export { default as ${name} } from './${name}';`;
    })
    .join('\n');
  
  return `// ${category.charAt(0).toUpperCase() + category.slice(1)} Components - Auto-generated\n\n${exports}\n`;
}

function generateMainIndex() {
  return `// Component Library - Auto-generated
// Main export file for all components

// UI Components
export * from './ui';

// Feature Components
export * from './features/accessibility';
export * from './features/ai';
export * from './features/analytics';
export * from './features/auth';
export * from './features/compliance';
export * from './features/messaging';
export * from './features/video';
export * from './features/domain';

// Layout Components
export * from './layout';

// Shared Components
export * from './shared';
`;
}

function printSummary() {
  log('\n' + '='.repeat(60));
  log('📊 Consolidation Summary');
  log('='.repeat(60));
  log(`✅ Moved: ${stats.moved} components`);
  log(`⚠️  Skipped: ${stats.skipped} components`);
  log(`🔄 Duplicates (need manual merge): ${stats.duplicates} components`);
  log(`❌ Errors: ${stats.errors} components`);
  log('='.repeat(60));
  
  if (stats.duplicates > 0) {
    log('\n⚠️  Manual Merge Required:');
    DUPLICATES.forEach(file => {
      log(`   - ${file}`, 'warning');
    });
    log('\n   Compare and merge these files manually before proceeding.');
  }
  
  if (DRY_RUN) {
    log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.', 'warning');
  } else {
    log('\n✅ Consolidation complete!', 'success');
    log('\n📋 Next Steps:');
    log('   1. Manually merge duplicate components');
    log('   2. Update imports across codebase');
    log('   3. Test build: npm run build');
    log('   4. Test pages: npm run dev');
    log('   5. Delete old directory: src/app/components/');
  }
}

// Main execution
try {
  moveComponentsByCategory();
  createIndexFiles();
  printSummary();
} catch (error) {
  log(`\n❌ Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
}
