#!/usr/bin/env node

/**
 * Fix Component Internal Imports Script
 * 
 * This script fixes imports within the moved components themselves
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');

// Base paths
const SRC_ROOT = path.join(__dirname, '../src');
const COMPONENTS_DIR = path.join(SRC_ROOT, 'components');

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  errors: 0,
};

function log(message, level = 'info') {
  const prefix = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }[level] || '📝';
  
  console.log(`${prefix} ${message}`);
}

function fixImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let changesMade = 0;

    // Fix relative imports to ui components
    const patterns = [
      // UI components
      { from: /from ["']\.\/ui\/([^"']+)["']/g, to: 'from "@/components/ui/$1"' },
      { from: /from ["']\.\.\/ui\/([^"']+)["']/g, to: 'from "@/components/ui/$1"' },
      { from: /from ["']\.\.\/\.\.\/ui\/([^"']+)["']/g, to: 'from "@/components/ui/$1"' },
      { from: /from ["']\.\.\/components\/ui\/([^"']+)["']/g, to: 'from "@/components/ui/$1"' },
      { from: /from ["']\.\.\/\.\.\/components\/ui\/([^"']+)["']/g, to: 'from "@/components/ui/$1"' },
      
      // Cross-component imports (layout importing from shared, etc.)
      { from: /from ["']\.\.\/shared\/([^"']+)["']/g, to: 'from "@/components/shared/$1"' },
      { from: /from ["']\.\.\/layout\/([^"']+)["']/g, to: 'from "@/components/layout/$1"' },
      { from: /from ["']\.\.\/features\/([^"']+)["']/g, to: 'from "@/components/features/$1"' },
      { from: /from ["']\.\/([A-Z][^"']+)["']/g, to: (match, p1) => {
        // Handle same-directory component imports
        const filePath = match.split('/').slice(0, -1).join('/');
        return `from "@/components/${getCurrentCategory(filePath)}/${p1}"`;
      }},
      
      // Lib imports
      { from: /from ["']\.\.\/\.\.\/lib\/([^"']+)["']/g, to: 'from "@/lib/$1"' },
      { from: /from ["']\.\.\/lib\/([^"']+)["']/g, to: 'from "@/lib/$1"' },
      { from: /from ["']\.\.\/\.\.\/\.\.\/lib\/([^"']+)["']/g, to: 'from "@/lib/$1"' },
      
      // Services imports
      { from: /from ["']\.\.\/services\/([^"']+)["']/g, to: 'from "@/services/$1"' },
      { from: /from ["']\.\.\/\.\.\/services\/([^"']+)["']/g, to: 'from "@/services/$1"' },
      { from: /from ["']\.\.\/\.\.\/\.\.\/services\/([^"']+)["']/g, to: 'from "@/services/$1"' },
      
      // Contexts imports
      { from: /from ["']\.\.\/contexts\/([^"']+)["']/g, to: 'from "@/app/contexts/$1"' },
      { from: /from ["']\.\.\/\.\.\/contexts\/([^"']+)["']/g, to: 'from "@/app/contexts/$1"' },
      { from: /from ["']\.\.\/\.\.\/\.\.\/contexts\/([^"']+)["']/g, to: 'from "@/app/contexts/$1"' },
      
      // Types imports
      { from: /from ["']\.\.\/types\/([^"']+)["']/g, to: 'from "@/types/$1"' },
      { from: /from ["']\.\.\/\.\.\/types\/([^"']+)["']/g, to: 'from "@/types/$1"' },
      { from: /from ["']\.\.\/\.\.\/\.\.\/types\/([^"']+)["']/g, to: 'from "@/types/$1"' },
      
      // Utils imports
      { from: /from ["']\.\.\/utils\/([^"']+)["']/g, to: 'from "@/utils/$1"' },
      { from: /from ["']\.\.\/\.\.\/utils\/([^"']+)["']/g, to: 'from "@/utils/$1"' },
      { from: /from ["']\.\.\/\.\.\/\.\.\/utils\/([^"']+)["']/g, to: 'from "@/utils/$1"' },
    ];

    patterns.forEach(({ from, to }) => {
      const matches = [...content.matchAll(from)];
      if (matches.length > 0) {
        updatedContent = updatedContent.replace(from, to);
        changesMade += matches.length;
      }
    });

    if (changesMade > 0) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
      }
      stats.filesModified++;
      stats.importsUpdated += changesMade;
      log(`Fixed ${changesMade} import(s) in ${path.relative(COMPONENTS_DIR, filePath)}`, 'success');
      return true;
    }

    return false;
  } catch (error) {
    log(`Error processing ${path.basename(filePath)}: ${error.message}`, 'error');
    stats.errors++;
    return false;
  }
}

async function fixAllImports() {
  log('\n🔧 Fixing Component Internal Imports...\n');
  
  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No files will be modified\n', 'warning');
  }

  log('📂 Scanning component files...');
  
  // Find all TypeScript/TSX files in components directory
  const files = await glob('**/*.{ts,tsx}', {
    cwd: COMPONENTS_DIR,
    ignore: [
      '**/*.d.ts',
      '**/*.backup.tsx',
    ],
    absolute: true,
  });

  log(`Found ${files.length} files to scan\n`);

  for (const file of files) {
    stats.filesScanned++;
    fixImportsInFile(file);
  }
}

function printSummary() {
  log('\n' + '='.repeat(60));
  log('📊 Fix Imports Summary');
  log('='.repeat(60));
  log(`📂 Files scanned: ${stats.filesScanned}`);
  log(`✅ Files modified: ${stats.filesModified}`);
  log(`🔄 Imports updated: ${stats.importsUpdated}`);
  log(`❌ Errors: ${stats.errors}`);
  log('='.repeat(60));
  
  if (DRY_RUN) {
    log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.', 'warning');
  } else {
    log('\n✅ Import fix complete!', 'success');
  }
}

// Main execution
(async () => {
  try {
    await fixAllImports();
    printSummary();
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
})();
