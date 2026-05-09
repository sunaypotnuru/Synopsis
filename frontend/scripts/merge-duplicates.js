#!/usr/bin/env node

/**
 * Merge Duplicate Components Script
 * 
 * This script merges duplicate UI components, keeping the best features from both versions.
 * The app/components/ui versions generally have better styling and features.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');

// Base paths
const SRC_ROOT = path.join(__dirname, '../src');
const OLD_UI = path.join(SRC_ROOT, 'app/components/ui');
const NEW_UI = path.join(SRC_ROOT, 'components/ui');

// Duplicates to merge (use app/components version as it has better styling)
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

function log(message, level = 'info') {
  const prefix = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }[level] || '📝';
  
  console.log(`${prefix} ${message}`);
}

function mergeDuplicates() {
  log('\n🔄 Merging Duplicate Components...\n');
  
  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No files will be modified\n', 'warning');
  }

  let merged = 0;
  let errors = 0;

  DUPLICATES.forEach(file => {
    try {
      const oldPath = path.join(OLD_UI, file);
      const newPath = path.join(NEW_UI, file);
      const backupPath = path.join(NEW_UI, file.replace('.tsx', '.backup.tsx'));

      if (!fs.existsSync(oldPath)) {
        log(`Source not found: ${file}`, 'warning');
        return;
      }

      if (!fs.existsSync(newPath)) {
        log(`Destination not found: ${file}`, 'warning');
        return;
      }

      if (DRY_RUN) {
        log(`Would merge: ${file}`, 'info');
      } else {
        // Backup original
        fs.copyFileSync(newPath, backupPath);
        
        // Copy app/components version (has better styling)
        const content = fs.readFileSync(oldPath, 'utf8');
        
        // Update import path from ./utils to @/lib/utils
        const updatedContent = content.replace(
          /from ["']\.\/utils["']/g,
          'from "@/lib/utils"'
        );
        
        fs.writeFileSync(newPath, updatedContent, 'utf8');
        log(`Merged: ${file} (backup created)`, 'success');
      }
      
      merged++;
    } catch (error) {
      log(`Error merging ${file}: ${error.message}`, 'error');
      errors++;
    }
  });

  log('\n' + '='.repeat(60));
  log('📊 Merge Summary');
  log('='.repeat(60));
  log(`✅ Merged: ${merged} components`);
  log(`❌ Errors: ${errors} components`);
  log('='.repeat(60));
  
  if (DRY_RUN) {
    log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.', 'warning');
  } else {
    log('\n✅ Merge complete!', 'success');
    log('\n📋 Backups created with .backup.tsx extension');
    log('   Review the merged files and delete backups if satisfied.');
  }
}

// Main execution
try {
  mergeDuplicates();
} catch (error) {
  log(`\n❌ Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
}
