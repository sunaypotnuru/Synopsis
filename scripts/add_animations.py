#!/usr/bin/env python3
"""
Batch Animation Addition Script for Netra AI Frontend

This script adds animation wrappers to pages missing them.
It's designed to be safe and reversible.

Usage: python scripts/add_animations.py [--dry-run] [--category patient|doctor|admin]
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import List, Tuple, Dict

# Pages that need animations (from frontend analysis)
PAGES_NEEDING_ANIMATIONS = {
    'patient': [
        'ProfilePage', 'MedicalHistoryPage', 'AppointmentsPage',
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
    'doctor': [
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
    'admin': [
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
}

ANIMATION_IMPORT = 'import { motion } from "motion/react";'
STAGGER_IMPORT = 'import { StaggerContainer } from "@/animations/components/StaggerContainer";'
FADEIN_IMPORT = 'import { FadeIn } from "@/animations/components/FadeIn";'


def find_page_file(page_name: str, base_dir: Path) -> Path | None:
    """Find the page file in various possible locations."""
    possible_paths = [
        base_dir / f"{page_name}.tsx",
        base_dir / "patient" / f"{page_name}.tsx",
        base_dir / "doctor" / f"{page_name}.tsx",
        base_dir / "admin" / f"{page_name}.tsx",
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    return None


def has_animations(content: str) -> bool:
    """Check if file already has animation imports."""
    return any(keyword in content for keyword in [
        'motion/react',
        'AnimatedPageTransition',
        'PageTransition',
        'StaggerContainer',
        'FadeIn',
        'motion.div'
    ])


def add_animation_imports(content: str) -> str:
    """Add animation imports after existing imports."""
    # Check if already has motion import
    if 'motion/react' in content:
        return content
    
    # Find last import statement
    import_pattern = r'import\s+.*?from\s+["\'].*?["\'];?\n'
    imports = list(re.finditer(import_pattern, content))
    
    if not imports:
        # No imports, add at beginning
        return f'{ANIMATION_IMPORT}\n{STAGGER_IMPORT}\n{FADEIN_IMPORT}\n\n{content}'
    
    # Add after last import
    last_import = imports[-1]
    insert_pos = last_import.end()
    
    new_imports = f'\n{ANIMATION_IMPORT}\n{STAGGER_IMPORT}\n{FADEIN_IMPORT}\n'
    
    return content[:insert_pos] + new_imports + content[insert_pos:]


def wrap_with_motion(content: str, page_name: str) -> Tuple[str, bool]:
    """Wrap the main return JSX with motion.div."""
    # Find the default export function
    function_pattern = r'export\s+default\s+function\s+' + re.escape(page_name) + r'\s*\([^)]*\)\s*\{'
    match = re.search(function_pattern, content)
    
    if not match:
        return content, False
    
    # Find the return statement
    func_start = match.end()
    return_pattern = r'return\s*\('
    return_match = re.search(return_pattern, content[func_start:])
    
    if not return_match:
        return content, False
    
    return_pos = func_start + return_match.end()
    
    # Find matching closing parenthesis
    paren_count = 1
    i = return_pos
    while i < len(content) and paren_count > 0:
        if content[i] == '(':
            paren_count += 1
        elif content[i] == ')':
            paren_count -= 1
        i += 1
    
    if paren_count != 0:
        return content, False
    
    # Extract JSX content
    jsx_start = return_pos
    jsx_end = i - 1
    jsx_content = content[jsx_start:jsx_end].strip()
    
    # Check if already wrapped
    if jsx_content.startswith('<motion.div') or jsx_content.startswith('<FadeIn'):
        return content, False
    
    # Wrap with motion.div
    wrapped = f'''
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {jsx_content}
    </motion.div>
  '''
    
    new_content = content[:jsx_start] + wrapped + content[jsx_end:]
    return new_content, True


def process_page(page_name: str, base_dir: Path, dry_run: bool = False) -> Dict:
    """Process a single page file."""
    result = {
        'page': page_name,
        'success': False,
        'reason': '',
        'path': None
    }
    
    # Find the file
    file_path = find_page_file(page_name, base_dir)
    if not file_path:
        result['reason'] = 'not_found'
        return result
    
    result['path'] = str(file_path)
    
    try:
        # Read content
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already has animations
        if has_animations(content):
            result['success'] = True
            result['reason'] = 'already_has'
            return result
        
        # Add imports
        content = add_animation_imports(content)
        
        # Wrap with motion
        content, wrapped = wrap_with_motion(content, page_name)
        
        if not wrapped:
            result['reason'] = 'wrap_failed'
            return result
        
        # Write back (if not dry run)
        if not dry_run:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        result['success'] = True
        result['reason'] = 'added' if not dry_run else 'would_add'
        return result
        
    except Exception as e:
        result['reason'] = f'error: {str(e)}'
        return result


def main():
    parser = argparse.ArgumentParser(description='Add animations to frontend pages')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--category', choices=['patient', 'doctor', 'admin', 'all'], default='all',
                       help='Which category of pages to process')
    args = parser.parse_args()
    
    # Find frontend directory
    script_dir = Path(__file__).parent
    frontend_dir = script_dir.parent / 'frontend' / 'src' / 'app' / 'pages'
    
    if not frontend_dir.exists():
        print(f"ERROR: Frontend directory not found: {frontend_dir}")
        sys.exit(1)
    
    print('Starting batch animation addition...')
    if args.dry_run:
        print('DRY RUN MODE - No files will be modified\n')
    
    # Determine which categories to process
    categories = [args.category] if args.category != 'all' else list(PAGES_NEEDING_ANIMATIONS.keys())
    
    stats = {
        'total': 0,
        'added': 0,
        'already_has': 0,
        'not_found': 0,
        'errors': 0
    }
    
    # Process pages
    for category in categories:
        pages = PAGES_NEEDING_ANIMATIONS[category]
        print(f'\nProcessing {category} pages ({len(pages)} pages)...')
        
        for page_name in pages:
            stats['total'] += 1
            result = process_page(page_name, frontend_dir, args.dry_run)
            
            # Update stats
            if result['success']:
                if result['reason'] in ['added', 'would_add']:
                    stats['added'] += 1
                    print(f"  [OK] {page_name}: Animations {'would be ' if args.dry_run else ''}added")
                elif result['reason'] == 'already_has':
                    stats['already_has'] += 1
                    print(f"  [INFO] {page_name}: Already has animations")
            else:
                if result['reason'] == 'not_found':
                    stats['not_found'] += 1
                    print(f"  [NOT FOUND] {page_name}: File not found")
                else:
                    stats['errors'] += 1
                    print(f"  [ERROR] {page_name}: {result['reason']}")
    
    # Print summary
    print('\n' + '=' * 60)
    print('SUMMARY')
    print('=' * 60)
    print(f"Total pages processed: {stats['total']}")
    print(f"[OK] Animations {'would be ' if args.dry_run else ''}added: {stats['added']}")
    print(f"[INFO] Already had animations: {stats['already_has']}")
    print(f"[NOT FOUND] Not found: {stats['not_found']}")
    print(f"[ERROR] Errors: {stats['errors']}")
    print('=' * 60)
    
    if args.dry_run and stats['added'] > 0:
        print('\nTip: Run without --dry-run to apply changes')
    elif stats['added'] > 0:
        print('\nAnimation addition complete!')
        print('Tip: Review the changes and test the pages')


if __name__ == '__main__':
    main()
