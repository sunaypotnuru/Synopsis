#!/usr/bin/env node

/**
 * Update Relative Imports Script
 * 
 * This script updates relative imports from ../components/ or ../../components/
 * to use the new @/components/ alias structure
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

    // Pattern 1: Update ../components/ui/* to @/components/ui/*
    const uiPattern = /from\s+["']\.\.\/components\/ui\/([^"']+)["']/g;
    const uiMatches = [...content.matchAll(uiPattern)];
    if (uiMatches.length > 0) {
      updatedContent = updatedContent.replace(uiPattern, 'from "@/components/ui/$1"');
      changesMade += uiMatches.length;
      if (VERBOSE) {
        uiMatches.forEach(match => {
          log(`  ${path.basename(filePath)}: ../components/ui/${match[1]} → @/components/ui/${match[1]}`, 'verbose');
        });
      }
    }

    // Pattern 2: Update ../components/* (non-ui) to appropriate new paths
    const componentPattern = /from\s+["']\.\.\/components\/([A-Z][^"']+)["']/g;
    const componentMatches = [...content.matchAll(componentPattern)];
    if (componentMatches.length > 0) {
      componentMatches.forEach(match => {
        const componentName = match[1];
        const newPath = getNewComponentPath(componentName);
        if (newPath) {
          updatedContent = updatedContent.replace(match[0], `from "${newPath}"`);
          changesMade++;
          if (VERBOSE) {
            log(`  ${path.basename(filePath)}: ../components/${componentName} → ${newPath}`, 'verbose');
          }
        }
      });
    }

    // Pattern 3: Update ../../components/* patterns
    const doublePattern = /from\s+["']\.\.\/\.\.\/components\/([^"']+)["']/g;
    const doubleMatches = [...content.matchAll(doublePattern)];
    if (doubleMatches.length > 0) {
      doubleMatches.forEach(match => {
        const componentPath = match[1];
        if (componentPath.startsWith('ui/')) {
          updatedContent = updatedContent.replace(match[0], `from "@/components/${componentPath}"`);
          changesMade++;
          if (VERBOSE) {
            log(`  ${path.basename(filePath)}: ../../components/${componentPath} → @/components/${componentPath}`, 'verbose');
          }
        } else {
          const newPath = getNewComponentPath(componentPath);
          if (newPath) {
            updatedContent = updatedContent.replace(match[0], `from "${newPath}"`);
            changesMade++;
            if (VERBOSE) {
              log(`  ${path.basename(filePath)}: ../../components/${componentPath} → ${newPath}`, 'verbose');
            }
          }
        }
      });
    }

    // Pattern 4: Update @/app/components/* to new paths
    const aliasPattern = /from\s+["']@\/app\/components\/([^"']+)["']/g;
    const aliasMatches = [...content.matchAll(aliasPattern)];
    if (aliasMatches.length > 0) {
      aliasMatches.forEach(match => {
        const componentPath = match[1];
        if (componentPath.startsWith('ui/')) {
          updatedContent = updatedContent.replace(match[0], `from "@/components/${componentPath}"`);
          changesMade++;
        } else {
          const newPath = getNewComponentPath(componentPath);
          if (newPath) {
            updatedContent = updatedContent.replace(match[0], `from "${newPath}"`);
            changesMade++;
          }
        }
      });
    }

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

function getNewComponentPath(componentPath) {
  // Remove .tsx extension if present
  const cleanPath = componentPath.replace('.tsx', '');
  
  // Map component names to their new locations
  const componentMap = {
    // Accessibility
    'AccessibilityWidget': '@/components/features/accessibility/AccessibilityWidget',
    'AccessibleClickable': '@/components/features/accessibility/AccessibleClickable',
    'AccessibleFormInput': '@/components/features/accessibility/AccessibleFormInput',
    'AccessibleFormSelect': '@/components/features/accessibility/AccessibleFormSelect',
    'AccessibleFormTextarea': '@/components/features/accessibility/AccessibleFormTextarea',
    'VoiceAccessibility': '@/components/features/accessibility/VoiceAccessibility',
    
    // AI
    'AIAssistantWidget': '@/components/features/ai/AIAssistantWidget',
    'AILogicBreakdown': '@/components/features/ai/AILogicBreakdown',
    'XAIVisualizer': '@/components/features/ai/XAIVisualizer',
    'XAIVisualizationPanel': '@/components/features/ai/XAIVisualizationPanel',
    'ChatbotWidget': '@/components/features/ai/ChatbotWidget',
    'FloatingChatbot': '@/components/features/ai/FloatingChatbot',
    'ScribePanel': '@/components/features/ai/ScribePanel',
    
    // Analytics
    'AnalyticsDashboard': '@/components/features/analytics/AnalyticsDashboard',
    'FDAApmChart': '@/components/features/analytics/FDAApmChart',
    
    // Auth
    'MFAEnforcement': '@/components/features/auth/MFAEnforcement',
    'MFALogin': '@/components/features/auth/MFALogin',
    'MFASetup': '@/components/features/auth/MFASetup',
    
    // Compliance
    'ComplianceAlert': '@/components/features/compliance/ComplianceAlert',
    'ComplianceScoreCard': '@/components/features/compliance/ComplianceScoreCard',
    'SOC2ControlCard': '@/components/features/compliance/SOC2ControlCard',
    'TraceabilityMatrix': '@/components/features/compliance/TraceabilityMatrix',
    
    // Messaging
    'MessageBubble': '@/components/features/messaging/MessageBubble',
    'MessageInput': '@/components/features/messaging/MessageInput',
    'EmojiPicker': '@/components/features/messaging/EmojiPicker',
    
    // Video
    'VideoPlayer': '@/components/features/video/VideoPlayer',
    'VideoRecorder': '@/components/features/video/VideoRecorder',
    'VoiceNoteRecorder': '@/components/features/video/VoiceNoteRecorder',
    
    // Layout
    'Navbar': '@/components/layout/Navbar',
    'NavbarMain': '@/components/layout/NavbarMain',
    'Footer': '@/components/layout/Footer',
    'Hero': '@/components/layout/Hero',
    'HeroRealistic': '@/components/layout/HeroRealistic',
    'HeroStoryAnimation': '@/components/layout/HeroStoryAnimation',
    'AboutSection': '@/components/layout/AboutSection',
    'ContactSection': '@/components/layout/ContactSection',
    'HowItWorks': '@/components/layout/HowItWorks',
    'ReviewSection': '@/components/layout/ReviewSection',
    
    // Shared
    'ErrorBoundary': '@/components/shared/ErrorBoundary',
    'ErrorMessage': '@/components/shared/ErrorMessage',
    'LoadingSpinner': '@/components/shared/LoadingSpinner',
    'PageLoadingSkeleton': '@/components/shared/PageLoadingSkeleton',
    'PageTransition': '@/components/shared/PageTransition',
    'ThemeToggle': '@/components/shared/ThemeToggle',
    'LanguageSwitcher': '@/components/shared/LanguageSwitcher',
    'GlobalSearch': '@/components/shared/GlobalSearch',
    'CommandPalette': '@/components/shared/CommandPalette',
    'AdvancedSearchModal': '@/components/shared/AdvancedSearchModal',
    'Breadcrumb': '@/components/shared/Breadcrumb',
    'ExportDialog': '@/components/shared/ExportDialog',
    'DocumentShareModal': '@/components/shared/DocumentShareModal',
    'InstallPrompt': '@/components/shared/InstallPrompt',
    'WakeUpButton': '@/components/shared/WakeUpButton',
    'SOSButton': '@/components/shared/SOSButton',
    'AmbientBackground': '@/components/shared/AmbientBackground',
    'FuturisticBackground': '@/components/shared/FuturisticBackground',
    'PortalHeroOverlay': '@/components/shared/PortalHeroOverlay',
    'RevealOnScroll': '@/components/shared/RevealOnScroll',
    
    // Domain
    'AdminLayoutWrapper': '@/components/features/domain/AdminLayoutWrapper',
    'AdminRoute': '@/components/features/domain/AdminRoute',
    'ProtectedRoute': '@/components/features/domain/ProtectedRoute',
    'DashboardGridLayout': '@/components/features/domain/DashboardGridLayout',
    'FamilyProfileSwitcher': '@/components/features/domain/FamilyProfileSwitcher',
    'PrescriptionPad': '@/components/features/domain/PrescriptionPad',
    'PrescriptionSummary': '@/components/features/domain/PrescriptionSummary',
    'ClinicalReportGenerator': '@/components/features/domain/ClinicalReportGenerator',
    'DrugAutocomplete': '@/components/features/domain/DrugAutocomplete',
    'SOAPEditor': '@/components/features/domain/SOAPEditor',
    'Whiteboard': '@/components/features/domain/Whiteboard',
    'UploadSection': '@/components/features/domain/UploadSection',
    'ResultCard': '@/components/features/domain/ResultCard',
    'BadgeDisplay': '@/components/features/domain/BadgeDisplay',
    'StreakDisplay': '@/components/features/domain/StreakDisplay',
    'ChallengeCard': '@/components/features/domain/ChallengeCard',
    'AnimatedCounter': '@/components/features/domain/AnimatedCounter',
    'LiveAuditLog': '@/components/features/domain/LiveAuditLog',
  };

  return componentMap[cleanPath] || null;
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
      'components/**', // Don't update the new component directory itself
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
