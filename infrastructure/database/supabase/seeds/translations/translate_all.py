"""
Unified Translation Script for Netra AI
Translates English locale files to multiple languages using LibreTranslate
"""

import json
import urllib.request
import urllib.parse
import sys
from pathlib import Path

# LibreTranslate server URL
TRANSLATE_URL = 'http://localhost:5000/translate'

# Supported languages
LANGUAGES = {
    'hi': 'Hindi',
    'mr': 'Marathi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'bn': 'Bengali',
    'gu': 'Gujarati',
    'ml': 'Malayalam',
    'pa': 'Punjabi',
    'ur': 'Urdu'
}

# Path to locale files
LOCALE_DIR = Path(__file__).parent.parent.parent / "frontend" / "src" / "locales"

def translate_text(text, target_lang):
    """Translate a single text string to target language"""
    if not text or not isinstance(text, str):
        return text
    
    # Skip if text has no alphabetic characters
    if not any(c.isalpha() for c in text):
        return text
    
    data = urllib.parse.urlencode({
        'q': text,
        'source': 'en',
        'target': target_lang,
        'format': 'text'
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(TRANSLATE_URL, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode('utf-8'))
            return res.get('translatedText', text)
    except Exception as e:
        print(f"  ⚠️  Translation error: {str(e)[:50]}")
        return text

def recursive_translate(data, target_lang, path=""):
    """Recursively translate all strings in a nested dictionary"""
    translated_count = 0
    
    for key, value in data.items():
        current_path = f"{path}.{key}" if path else key
        
        if isinstance(value, dict):
            count = recursive_translate(value, target_lang, current_path)
            translated_count += count
        elif isinstance(value, str):
            if any(c.isalpha() for c in value):
                print(f"  Translating: {current_path}")
                data[key] = translate_text(value, target_lang)
                translated_count += 1
    
    return translated_count

def translate_language(lang_code, sections=None):
    """Translate English locale to target language"""
    lang_name = LANGUAGES.get(lang_code, lang_code.upper())
    
    print(f"\n{'='*60}")
    print(f"🌍 Translating to {lang_name} ({lang_code})")
    print(f"{'='*60}")
    
    # Load English source file
    en_file = LOCALE_DIR / "en.json"
    target_file = LOCALE_DIR / f"{lang_code}.json"
    
    if not en_file.exists():
        print(f"❌ Error: English source file not found at {en_file}")
        return False
    
    print(f"📖 Loading English source: {en_file}")
    with open(en_file, "r", encoding="utf-8") as f:
        en_data = json.load(f)
    
    # Load existing target file if it exists
    if target_file.exists():
        print(f"📖 Loading existing {lang_name} file: {target_file}")
        with open(target_file, "r", encoding="utf-8") as f:
            target_data = json.load(f)
    else:
        print(f"📝 Creating new {lang_name} file")
        target_data = {}
    
    # Determine which sections to translate
    if sections:
        sections_to_translate = sections
    else:
        sections_to_translate = en_data.keys()
    
    print(f"📋 Sections to translate: {', '.join(sections_to_translate)}")
    
    total_translated = 0
    
    # Translate each section
    for section in sections_to_translate:
        if section not in en_data:
            print(f"⚠️  Section '{section}' not found in English source")
            continue
        
        print(f"\n🔄 Translating section: {section}")
        
        # Copy structure from English if not exists
        if section not in target_data:
            target_data[section] = {}
        
        # Deep copy the structure and translate
        section_data = json.loads(json.dumps(en_data[section]))
        count = recursive_translate(section_data, lang_code, section)
        target_data[section] = section_data
        
        total_translated += count
        print(f"✅ Translated {count} strings in '{section}'")
    
    # Save translated file
    print(f"\n💾 Saving to: {target_file}")
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(target_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Successfully translated {total_translated} strings to {lang_name}")
    return True

def translate_all_languages(sections=None):
    """Translate to all supported languages"""
    print("\n" + "="*60)
    print("🌐 NETRA AI - MULTI-LANGUAGE TRANSLATION")
    print("="*60)
    print(f"📍 Locale directory: {LOCALE_DIR}")
    print(f"🔗 Translation server: {TRANSLATE_URL}")
    print(f"🌍 Languages: {len(LANGUAGES)}")
    
    success_count = 0
    failed_languages = []
    
    for lang_code, lang_name in LANGUAGES.items():
        try:
            if translate_language(lang_code, sections):
                success_count += 1
        except Exception as e:
            print(f"❌ Failed to translate {lang_name}: {str(e)}")
            failed_languages.append(lang_name)
    
    # Summary
    print("\n" + "="*60)
    print("📊 TRANSLATION SUMMARY")
    print("="*60)
    print(f"✅ Successfully translated: {success_count}/{len(LANGUAGES)} languages")
    
    if failed_languages:
        print(f"❌ Failed languages: {', '.join(failed_languages)}")
    else:
        print("🎉 All languages translated successfully!")
    
    print("="*60 + "\n")

def main():
    """Main function with command-line interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Translate Netra AI locale files to multiple languages'
    )
    parser.add_argument(
        '--lang',
        type=str,
        help=f'Specific language to translate (options: {", ".join(LANGUAGES.keys())})'
    )
    parser.add_argument(
        '--sections',
        type=str,
        nargs='+',
        help='Specific sections to translate (e.g., patient common)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Translate all languages'
    )
    
    args = parser.parse_args()
    
    # Check if LibreTranslate is running
    try:
        urllib.request.urlopen(TRANSLATE_URL.replace('/translate', '/languages'), timeout=5)
    except Exception:
        print("❌ Error: LibreTranslate server is not running!")
        print(f"   Please start LibreTranslate at {TRANSLATE_URL}")
        print("   Run: docker-compose up libretranslate")
        sys.exit(1)
    
    if args.all:
        translate_all_languages(args.sections)
    elif args.lang:
        if args.lang not in LANGUAGES:
            print(f"❌ Error: Unsupported language '{args.lang}'")
            print(f"   Supported languages: {', '.join(LANGUAGES.keys())}")
            sys.exit(1)
        translate_language(args.lang, args.sections)
    else:
        # Interactive mode
        print("\n🌐 Netra AI Translation Tool")
        print("="*60)
        print("\nAvailable languages:")
        for i, (code, name) in enumerate(LANGUAGES.items(), 1):
            print(f"  {i}. {name} ({code})")
        print(f"  {len(LANGUAGES) + 1}. All languages")
        
        choice = input(f"\nSelect language (1-{len(LANGUAGES) + 1}): ").strip()
        
        try:
            choice_num = int(choice)
            if choice_num == len(LANGUAGES) + 1:
                translate_all_languages()
            elif 1 <= choice_num <= len(LANGUAGES):
                lang_code = list(LANGUAGES.keys())[choice_num - 1]
                translate_language(lang_code)
            else:
                print("❌ Invalid choice")
                sys.exit(1)
        except ValueError:
            print("❌ Invalid input")
            sys.exit(1)

if __name__ == '__main__':
    main()
