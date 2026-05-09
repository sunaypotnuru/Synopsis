#!/usr/bin/env node

/**
 * Batch Animation Addition Script
 * 
 * This script automatically adds animation imports and wrappers to pages
 * that are missing them, based on the frontend analysis report.
 * 
 * Usage: node scripts/add-animations-batch.js
 */

const fs = require('fs');
const path = require('path');

// Pages that need animations (from frontend.md analysis)
const PAGES_NEEDING_ANIMATIONS = {
  patient: [
    'SettingsPage', 'ProfilePage', 'MedicalHistoryPage', 'AppointmentsPage',
    'DoctorsPage', 'DoctorDetailPage', 'AnemiaDetectionPage', 'CataractScanPage',
    'DiabeticRetinopathyScanPage', 'MentalHealthPage', 'ParkinsonsVoicePage',
    'LabAnalyzerPage', 'HealthRiskAssessmentPage', 'MedicationsListPage',
    'MedicationDetailsPage', 'MedicationLogPage', 'MedicationSchedulePage',
    'MedicationRemindersPage', 'HealthGoalsDashboard', 'CreateHealthGoalPage',
    'HealthGoalDetailsPage', 'LogGoalProgressPage', 'FamilyMembersPage',
    'AddEditFamilyMemberPage', 'VitalsHistoryPage', 'LabResultsHistoryPage',
    'ChronicDiseaseTracker', 'PatientExercisesPage', 'ARSessionPage',
    'PROSubmissionPage', 'NearbyHospitalsPage', 'InsuranceVerificationPage',
    'FollowUpPage', 'IntakeFormPage', 'HealthTimelinePage', 'PrescriptionTemplatesPage'
  ],
  doctor: [
    'DoctorDashboardPage', 'DoctorPatientsPage', 'PatientDetailsPage',
    'PatientMedicalHistory', 'DoctorAppointmentsPage', 'DoctorScansPage',
    'DoctorScanDetailPage', 'DoctorPrescriptionBuilder', 'DoctorFollowUpTemplates',
    'DoctorPROBuilder', 'PROAnalyticsPage', 'DoctorExercisesPage', 'AlertsPage',
    'PatientTimelineView', 'DoctorAnalyticsDashboard', 'DoctorPatientAnalytics',
    'DoctorRevenueAnalytics', 'DoctorEarningsSummary', 'DoctorTransactionHistory',
    'DoctorRatingsPage', 'DoctorRevenuePage', 'DoctorProfileSettings',
    'DoctorAvailabilitySettings', 'DoctorNotificationSettings', 'AvailabilityPage',
    'NoteTemplatesList', 'CreateEditNoteTemplate'
  ],
  admin: [
    'AdminDashboardPage', 'AdminPatientsPage', 'AdminPatientDetailPage',
    'AdminDoctorsPage', 'AdminAppointmentsPage', 'AdminAppointmentDetailPage',
    'AdminScansPage', 'AdminUsersPage', 'AdminUserDetailPage',
    'AdminComplianceDashboard', 'AdminFDAApmMonitoring', 'AdminIEC62304Traceability',
    'AdminSOC2Evidence', 'AdminFHIRResourceManager', 'AdminComplaintManagement',
    'DoctorVerificationPage', 'SecurityPage', 'ConfigurationPage',
    'AdminAnalyticsPage', 'AdminAuditLogsPage', 'AdminReportsPage',
    'AdminSettingsPage', 'AdminTeamPage', 'SystemHealthPage', 'EpidemicRadarPage',
    'AdminNewsletterPage', 'AdminBlogsPage', 'ContactMessagesPage', 'ReviewsPage',
    'PaymentManagementPage', 'PaymentDetailPage', 'RefundManagementPage',
    'MCPManagementPage'
  ]
};

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'src', 'app', 'pages');

/**
 * Check if a file already has animation imports
 */
function hasAnimations(content) {
  return content.includes('motion') || 
         content.includes('AnimatedPageTransition') ||
         content.includes('PageTransition') ||
         content.includes('StaggerContainer') ||
         content.includes('FadeIn');
}

/**
 * Add animation imports to a file
 */
function addAnimationImports(content) {
  // Check if motion is already imported
  if (content.includes("from 'motion/react'") || content.includes('from "motion/react"')) {
    return content;
  }

  // Find the last import statement
  const importRegex = /import\s+.*?from\s+['"].*?['"];?\n/g;
  const imports = content.match(importRegex) || [];
  
  if (imports.length === 0) {
    // No imports found, add at the beginning
    return `import { motion } from 'motion/react';\nimport { StaggerContainer } from '@/animations/components/StaggerContainer';\nimport { FadeIn } from '@/animations/components/FadeIn';\n\n${content}`;
  }

  // Add after the last import
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;

  const animationImports = `import { motion } from 'motion/react';\nimport { StaggerContainer } from '@/animations/components/StaggerContainer';\nimport { FadeIn } from '@/animations/components/FadeIn';\n`;

  return content.slice(0, insertPosition) + animationImports + content.slice(insertPosition);
}

/**
 * Wrap the return statement with motion.div
 */
function wrapWithMotion(content) {
  // Find the main return statement
  const returnRegex = /return\s*\(/;
  const match = content.match(returnRegex);
  
  if (!match) {
    console.log('  ⚠️  Could not find return statement');
    return content;
  }

  const returnIndex = content.indexOf(match[0]);
  
  // Find the opening parenthesis after return
  let parenCount = 0;
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = returnIndex; i < content.length; i++) {
    if (content[i] === '(') {
      if (startIndex === -1) startIndex = i + 1;
      parenCount++;
    } else if (content[i] === ')') {
      parenCount--;
      if (parenCount === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (startIndex === -1 || endIndex === -1) {
    console.log('  ⚠️  Could not find return statement boundaries');
    return content;
  }

  // Get the JSX content
  const jsxContent = content.slice(startIndex, endIndex).trim();
  
  // Check if already wrapped
  if (jsxContent.startsWith('<motion.div') || jsxContent.startsWith('<FadeIn')) {
    console.log('  ℹ️  Already wrapped with motion');
    return content;
  }

  // Wrap with motion.div
  const wrappedContent = `
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      ${jsxContent}
    </motion.div>
  `;

  return content.slice(0, startIndex) + wrappedContent + content.slice(endIndex);
}

/**
 * Process a single page file
 */
function processPage(pageName, category) {
  const possiblePaths = [
    path.join(FRONTEND_DIR, `${pageName}.tsx`),
    path.join(FRONTEND_DIR, category, `${pageName}.tsx`),
    path.join(FRONTEND_DIR, 'patient', `${pageName}.tsx`),
    path.join(FRONTEND_DIR, 'doctor', `${pageName}.tsx`),
    path.join(FRONTEND_DIR, 'admin', `${pageName}.tsx`)
  ];

  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log(`❌ ${pageName}: File not found`);
    return { success: false, reason: 'not_found' };
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already has animations
    if (hasAnimations(content)) {
      console.log(`✅ ${pageName}: Already has animations`);
      return { success: true, reason: 'already_has' };
    }

    // Add animation imports
    content = addAnimationImports(content);

    // Wrap with motion
    content = wrapWithMotion(content);

    // Write back to file
    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`✅ ${pageName}: Animations added`);
    return { success: true, reason: 'added' };

  } catch (error) {
    console.log(`❌ ${pageName}: Error - ${error.message}`);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🎨 Starting batch animation addition...\n');

  const stats = {
    total: 0,
    added: 0,
    alreadyHas: 0,
    notFound: 0,
    errors: 0
  };

  // Process all pages
  for (const [category, pages] of Object.entries(PAGES_NEEDING_ANIMATIONS)) {
    console.log(`\n📁 Processing ${category} pages...`);
    
    for (const pageName of pages) {
      stats.total++;
      const result = processPage(pageName, category);
      
      if (result.success) {
        if (result.reason === 'added') stats.added++;
        else if (result.reason === 'already_has') stats.alreadyHas++;
      } else {
        if (result.reason === 'not_found') stats.notFound++;
        else stats.errors++;
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total pages processed: ${stats.total}`);
  console.log(`✅ Animations added: ${stats.added}`);
  console.log(`ℹ️  Already had animations: ${stats.alreadyHas}`);
  console.log(`❌ Not found: ${stats.notFound}`);
  console.log(`⚠️  Errors: ${stats.errors}`);
  console.log('='.repeat(50));

  if (stats.added > 0) {
    console.log('\n✨ Animation addition complete!');
    console.log('💡 Tip: Review the changes and test the pages to ensure animations work correctly.');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processPage, addAnimationImports, wrapWithMotion };
