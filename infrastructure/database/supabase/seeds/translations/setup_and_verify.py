"""
Setup and Verification Script for Translation System
Verifies that all components are properly configured and working
"""

import json
import urllib.request
import urllib.parse
import sys
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

# Configuration
LIBRETRANSLATE_URL = 'http://localhost:5000'
PROJECT_ROOT = Path(__file__).parent.parent.parent
LOCALE_DIR = PROJECT_ROOT / "frontend" / "src" / "locales"
REQUIRED_LANGUAGES = ['en', 'hi', 'mr', 'ta', 'te', 'kn']
EXPECTED_LIBRETRANSLATE_LANGUAGES = ['en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'ur']

def check_libretranslate_service():
    """Check if LibreTranslate service is running"""
    print_header("1. Checking LibreTranslate Service")
    
    try:
        response = urllib.request.urlopen(f"{LIBRETRANSLATE_URL}/languages", timeout=5)
        if response.status == 200:
            data = json.loads(response.read().decode('utf-8'))
            available_langs = [lang['code'] for lang in data]
            
            print_success(f"LibreTranslate is running at {LIBRETRANSLATE_URL}")
            print_info(f"Available languages: {len(available_langs)}")
            
            # Check if all expected languages are loaded
            missing_langs = [lang for lang in EXPECTED_LIBRETRANSLATE_LANGUAGES if lang not in available_langs]
            
            if missing_langs:
                print_warning(f"Missing languages: {', '.join(missing_langs)}")
                print_info("Run: docker-compose up -d --force-recreate libretranslate")
                return False
            else:
                print_success(f"All expected languages are loaded: {', '.join(EXPECTED_LIBRETRANSLATE_LANGUAGES)}")
                return True
    except Exception as e:
        print_error(f"LibreTranslate is not running: {str(e)}")
        print_info("Start it with: docker-compose up -d libretranslate")
        return False

def check_locale_files():
    """Check if all locale files exist"""
    print_header("2. Checking Locale Files")
    
    if not LOCALE_DIR.exists():
        print_error(f"Locale directory not found: {LOCALE_DIR}")
        return False
    
    print_success(f"Locale directory found: {LOCALE_DIR}")
    
    all_exist = True
    for lang in REQUIRED_LANGUAGES:
        file_path = LOCALE_DIR / f"{lang}.json"
        if file_path.exists():
            # Check if file is valid JSON
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    keys_count = count_keys(data)
                    print_success(f"{lang}.json exists ({keys_count} translation keys)")
            except json.JSONDecodeError:
                print_error(f"{lang}.json is not valid JSON")
                all_exist = False
        else:
            print_error(f"{lang}.json not found")
            all_exist = False
    
    return all_exist

def count_keys(obj, count=0):
    """Recursively count keys in nested dictionary"""
    for key, value in obj.items():
        if isinstance(value, dict):
            count = count_keys(value, count)
        else:
            count += 1
    return count

def check_translation_scripts():
    """Check if all translation scripts exist"""
    print_header("3. Checking Translation Scripts")
    
    scripts_dir = PROJECT_ROOT / "scripts" / "translations"
    required_scripts = [
        'translate_all.py',
        'translate_hindi.py',
        'translate_marathi.py',
        'translate_telugu.py',
        'translate_tamil.py',
        'run_all_translations.bat',
        'run_all_translations.sh',
        'README.md'
    ]
    
    all_exist = True
    for script in required_scripts:
        script_path = scripts_dir / script
        if script_path.exists():
            print_success(f"{script} exists")
        else:
            print_error(f"{script} not found")
            all_exist = False
    
    return all_exist

def check_docker_compose():
    """Check if docker-compose.yml has correct LibreTranslate configuration"""
    print_header("4. Checking Docker Compose Configuration")
    
    docker_compose_path = PROJECT_ROOT / "docker-compose.yml"
    
    if not docker_compose_path.exists():
        print_error("docker-compose.yml not found")
        return False
    
    with open(docker_compose_path, 'r') as f:
        content = f.read()
    
    # Check if LibreTranslate service exists
    if 'libretranslate:' in content:
        print_success("LibreTranslate service found in docker-compose.yml")
        
        # Check if all Indian languages are in the load-only list
        if all(lang in content for lang in ['hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'ur']):
            print_success("All Indian languages are configured in LibreTranslate")
            return True
        else:
            print_warning("Some Indian languages may be missing from LibreTranslate configuration")
            print_info("Expected languages: en,hi,mr,ta,te,bn,gu,kn,ml,pa,ur")
            return False
    else:
        print_error("LibreTranslate service not found in docker-compose.yml")
        return False

def check_backend_translation_service():
    """Check if backend translation service is properly configured"""
    print_header("5. Checking Backend Translation Service")
    
    translation_service_path = PROJECT_ROOT / "services" / "core" / "app" / "services" / "translation.py"
    
    if not translation_service_path.exists():
        print_error("Backend translation service not found")
        return False
    
    with open(translation_service_path, 'r') as f:
        content = f.read()
    
    # Check if all Indian languages are in SUPPORTED_LANGUAGES
    indian_langs = ['hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'ur']
    missing_langs = [lang for lang in indian_langs if f'"{lang}": "{lang}"' not in content]
    
    if missing_langs:
        print_warning(f"Missing languages in backend: {', '.join(missing_langs)}")
        return False
    else:
        print_success("All Indian languages are configured in backend")
        return True

def check_frontend_i18n():
    """Check if frontend i18n is properly configured"""
    print_header("6. Checking Frontend i18n Configuration")
    
    i18n_path = PROJECT_ROOT / "apps" / "web" / "src" / "lib" / "i18n.ts"
    
    if not i18n_path.exists():
        print_error("Frontend i18n configuration not found")
        return False
    
    with open(i18n_path, 'r') as f:
        content = f.read()
    
    # Check if all required languages are imported
    required_imports = ['en', 'hi', 'mr', 'ta', 'te', 'kn']
    missing_imports = [lang for lang in required_imports if f"import {lang} from '../locales/{lang}.json'" not in content]
    
    if missing_imports:
        print_warning(f"Missing imports in i18n: {', '.join(missing_imports)}")
        return False
    else:
        print_success("All required languages are imported in i18n")
        return True

def test_translation():
    """Test actual translation functionality"""
    print_header("7. Testing Translation Functionality")
    
    test_text = "Hello, how are you?"
    test_lang = "hi"
    
    try:
        data = urllib.parse.urlencode({
            'q': test_text,
            'source': 'en',
            'target': test_lang,
            'format': 'text'
        }).encode('utf-8')
        
        req = urllib.request.Request(f"{LIBRETRANSLATE_URL}/translate", data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            translated = result.get('translatedText', '')
            
            if translated and translated != test_text:
                print_success("Translation test passed")
                print_info(f"English: {test_text}")
                print_info(f"Hindi: {translated}")
                return True
            else:
                print_error("Translation returned empty or same text")
                return False
    except Exception as e:
        print_error(f"Translation test failed: {str(e)}")
        return False

def generate_report(results):
    """Generate final report"""
    print_header("VERIFICATION REPORT")
    
    total_checks = len(results)
    passed_checks = sum(results.values())
    
    print(f"Total Checks: {total_checks}")
    print(f"Passed: {Colors.GREEN}{passed_checks}{Colors.END}")
    print(f"Failed: {Colors.RED}{total_checks - passed_checks}{Colors.END}")
    print(f"Success Rate: {(passed_checks/total_checks*100):.1f}%\n")
    
    if passed_checks == total_checks:
        print_success("All checks passed! Translation system is fully configured.")
        print_info("\nYou can now run:")
        print_info("  python scripts/translations/translate_all.py --all")
        return True
    else:
        print_error("Some checks failed. Please fix the issues above.")
        print_info("\nCommon fixes:")
        print_info("  1. Start LibreTranslate: docker-compose up -d libretranslate")
        print_info("  2. Recreate with new config: docker-compose up -d --force-recreate libretranslate")
        print_info("  3. Check locale files exist: ls frontend/src/locales/")
        return False

def main():
    """Main verification function"""
    print(f"\n{Colors.BOLD}Netra AI - Translation System Verification{Colors.END}")
    print(f"Project Root: {PROJECT_ROOT}\n")
    
    results = {
        'LibreTranslate Service': check_libretranslate_service(),
        'Locale Files': check_locale_files(),
        'Translation Scripts': check_translation_scripts(),
        'Docker Compose': check_docker_compose(),
        'Backend Service': check_backend_translation_service(),
        'Frontend i18n': check_frontend_i18n(),
        'Translation Test': False  # Will be set by test
    }
    
    # Only test translation if LibreTranslate is running
    if results['LibreTranslate Service']:
        results['Translation Test'] = test_translation()
    else:
        print_header("7. Testing Translation Functionality")
        print_warning("Skipped (LibreTranslate not running)")
    
    success = generate_report(results)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
