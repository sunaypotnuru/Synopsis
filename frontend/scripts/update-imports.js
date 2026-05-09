#!/usr/bin/env node

/**
 * Import Update Script
 * 
 * This script updates all imports from the old component structure to the new one:
 * OLD: @/app/components/ui/button
 * NEW: @/components/ui
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Base paths
const SRC_ROOT = path.join(__dirname, '../src');

// Import mapping rules
const IMPORT_MAPPINGS = {
  // UI Components
  '@/app/components/ui/': '@/components/ui/',
  
  // Feature Components
  '@/app/components/AccessibilityWidget': '@/components/features/accessibility/AccessibilityWidget',
  '@/app/components/AccessibleClickable': '@/components/features/accessibility/AccessibleClickable',
  '@/app/components/AccessibleFormInput': '@/components/features/accessibility/AccessibleFormInput',
  '@/app/components/AccessibleFormSelect': '@/components/features/accessibility/AccessibleFormSelect',
  '@/app/components/AccessibleFormTextarea': '@/components/features/accessibility/AccessibleFormTextarea',
  '@/app/components/VoiceAccessibility': '@/components/features/accessibility/VoiceAccessibility',
  
  '@/app/components/AIAssistantWidget': '@/components/features/ai/AIAssistantWidget',
  '@/app/components/AILogicBreakdown': '@/components/features/ai/AILogicBreakdown',
  '@/app/components/XAIVisualizer': '@/components/features/ai/XAIVisualizer',
  '@/app/components/XAIVisualizationPanel': '@/components/features/ai/XAIVisualizationPanel',
  '@/app/components/ChatbotWidget': '@/components/features/ai/ChatbotWidget',
  '@/app/components/FloatingChatbot': '@/components/features/ai/FloatingChatbot',
  '@/app/components/ScribePanel': '@/components/features/ai/ScribePanel',
  
  '@/app/components/AnalyticsDashboard': '@/components/features/analytics/AnalyticsDashboard',
  '@/app/components/FDAApmChart': '@/components/features/analytics/FDAApmChart',
  
  '@/app/components/MFAEnforcement': '@/components/features/auth/MFAEnforcement',
  '@/app/components/MFALogin': '@/components/features/auth/MFALogin',
  '@/app/components/MFASetup': '@/components/features/auth/MFASetup',
  
  '@/app/components/ComplianceAlert': '@/components/features/compliance/ComplianceAlert',
  '@/app/components/ComplianceScoreCard': '@/components/features/compliance/ComplianceScoreCard',
  '@/app/components/SOC2ControlCard': '@/components/features/compliance/SOC2ControlCard',
  '@/app/components/TraceabilityMatrix': '@/components/features/compliance/TraceabilityMatrix',
  
  '@/app/components/MessageBubble': '@/components/features/messaging/MessageBubble',
  '@/app/components/MessageInput': '@/components/features/messaging/MessageInput',
  '@/app/components/EmojiPicker': '@/components/features/messaging/EmojiPicker',
  
  '@/app/components/VideoPlayer': '@/components/features/video/VideoPlayer',
  '@/app/components/VideoRecorder': '@/components/features/video/VideoRecorder',
  '@/app/components/VoiceNoteRecorder': '@/components/features/video/VoiceNoteRecorder',
  
  // Layout Components
  '@/app/components/Navbar': '@/components/layout/Navbar',
  '@/app/components/NavbarMain': '@/components/layout/NavbarMain',
  '@/app/components/Footer': '@/components/layout/Footer',
  '@/app/components/Hero': '@/components/layout/Hero',
  '@/app/components/HeroRealistic': '@/components/layout/HeroRealistic',
  '@/app/components/HeroStoryAnimation': '@/components/layout/HeroStoryAnimation',
  '@/app/components/AboutSection': '@/components/layout/AboutSection',
  '@/app/components/ContactSection': '@/components/layout/ContactSection',
  '@/app/components/HowItWorks': '@/components/layout/HowItWorks',
  '@/app/components/ReviewSection': '@/components/layout/ReviewSection',
  
  // Shared Components
  '@/app/components/ErrorBoundary': '@/components/shared/ErrorBoundary',
  '@/app/components/ErrorMessage': '@/components/shared/ErrorMessage',
  '@/app/components/LoadingSpinner': '@/components/shared/LoadingSpinner',
  '@/app/components/PageLoadingSkeleton': '@/components/shared/PageLoadingSkeleton',
  '@/app/components/PageTransition': '@/components/shared/PageTransition',
  '@/app/components/ThemeToggle': '@/components/shared/ThemeToggle',
  '@/app/components/LanguageSwitcher': '@/components/shared/LanguageSwitcher',
  '@/app/components/GlobalSearch': '@/components/shared/GlobalSearch',
  '@/app/components/CommandPalette': '@/components/shared/CommandPalette',
  '@/app/components/AdvancedSearchModal': '@/components/shared/AdvancedSearchModal',
  '@/app/components/Breadcrumb': '@/components/shared/Breadcrumb',
  '@/app/components/ExportDialog': '@/components/shared/ExportDialog',
  '@/app/components/DocumentShareModal': '@/components/shared/DocumentShareModal',
  '@/app/components/InstallPrompt': '@/components/shared/InstallPrompt',
  '@/app/components/WakeUpButton': '@/components/shared/WakeUpButton',
  '@/app/components/SOSButton': '@/components/shared/SOSButton',
  '@/app/components/AmbientBackground': '@/components/shared/AmbientBackground',
  '@/app/components/FuturisticBackground': '@/components/shared/FuturisticBackground',
  '@/app/components/PortalHeroOverlay': '@/components/shared/PortalHeroOverlay',
  '@/app/components/RevealOnScroll': '@/components/shared/RevealOnScroll',
  
  // Domain Components
  '@/app/components/AdminLayoutWrapper': '@/components/features/domain/AdminLayoutWrapper',
  '@/app/components/AdminRoute': '@/components/features/domain/AdminRoute',
  '@/app/components/ProtectedRoute': '@/components/features/domain/ProtectedRoute',
  '@/app/components/DashboardGridLayout': '@/components/features/domain/DashboardGridLayout',
  '@/app/components/FamilyProfileSwitcher': '@/components/features/domain/FamilyProfileSwitcher',
  '@/app/components/PrescriptionPad': '@/components/features/domain/PrescriptionPad',
  '@/app/components/PrescriptionSummary': '@/components/features/domain/PrescriptionSummary',
  '@/app/components/ClinicalReportGenerator': '@/components/features/domain/ClinicalReportGenerator',
  '@/app/components/DrugAutocomplete': '@/components/features/domain/DrugAutocomplete',
  '@/app/components/SOAPEditor': '@/components/features/domain/SOAPEditor',
  '@/app/components/Whiteboard': '@/components/features/domain/Whiteboard',
  '@/app/components/UploadSection': '@/components/features/domain/UploadSection',
  '@/app/components/ResultCard': '@/components/features/domain/ResultCard',
  '@/app/components/BadgeDisplay': '@/components/features/domain/BadgeDisplay',
  '@/app/components/StreakDisplay': '@/components/features/domain/StreakDisplay',
  '@/app/components/ChallengeCard': '@/components/features/domain/ChallengeCard',
  '@/app/components/AnimatedCounter': '@/components/features/domain/AnimatedCounter',
  '@/app/components/LiveAuditLog': '@/components/features/domain/LiveAuditLog',
  
  // Subdirectories
  '@/app/components/ai/': '@/components/features/ai/',
  '@/app/components/analytics/': '@/components/features/analytics/',
  '@/app/components/figma/': '@/components/features/figma/',
  '@/app/components/messaging/': '@/components/features/messaging/',
  '@/app/components/video/': '@/components/features/video/',
};

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  errors: 0,
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

function updateImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let changesMade = 0;

    // Sort mappings by length (longest first) to avoid partial replacements
    const sortedMappings = Object.entries(IMPORT_MAPPINGS).sort(
      ([a], [b]) => b.length - a.length
    );

    // Update imports
    sortedMappings.forEach(([oldPath, newPath]) => {
      const regex = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = (updatedContent.match(regex) || []).length;
      
      if (matches > 0) {
        updatedContent = updatedContent.replace(regex, newPath);
        changesMade += matches;
        log(`  ${path.basename(filePath)}: ${oldPath} → ${newPath}`, 'verbose');
      }
    });

    if (changesMade > 0) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
      }
      stats.filesModified++;
      stats.importsUpdated += changesMade;
      log(`Updated ${changesMade} import(s) in ${path.relative(SRC_ROOT, filePath)}`, 'success');
      return true;
    }

    return false;
  } catch (error) {
    log(`Error processing ${path.basename(filePath)}: ${error.message}`, 'error');
    stats.errors++;
    return false;
  }
}

async function updateAllImports() {
  log('\n🚀 Starting Import Update...\n');
  
  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No files will be modified\n', 'warning');
  }

  log('📂 Scanning files...');
  
  // Find all TypeScript/TSX files
  const files = await glob('**/*.{ts,tsx}', {
    cwd: SRC_ROOT,
    ignore: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts',
    ],
    absolute: true,
  });

  log(`Found ${files.length} files to scan\n`);

  for (const file of files) {
    stats.filesScanned++;
    updateImportsInFile(file);
  }
}

function printSummary() {
  log('\n' + '='.repeat(60));
  log('📊 Import Update Summary');
  log('='.repeat(60));
  log(`📂 Files scanned: ${stats.filesScanned}`);
  log(`✅ Files modified: ${stats.filesModified}`);
  log(`🔄 Imports updated: ${stats.importsUpdated}`);
  log(`❌ Errors: ${stats.errors}`);
  log('='.repeat(60));
  
  if (DRY_RUN) {
    log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.', 'warning');
  } else {
    log('\n✅ Import update complete!', 'success');
    log('\n📋 Next Steps:');
    log('   1. Test build: npm run build');
    log('   2. Fix any TypeScript errors');
    log('   3. Test pages: npm run dev');
    log('   4. Run tests: npm test');
  }
}

// Main execution
(async () => {
  try {
    await updateAllImports();
    printSummary();
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
})();
