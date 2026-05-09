"""
Tamil Translation Script for Netra AI
Translates English locale files to Tamil using LibreTranslate
"""

import json
import urllib.request
import urllib.parse

TRANSLATE_URL = 'http://localhost:5000/translate'
TARGET_LANG = 'ta'
LANG_NAME = 'Tamil'

def translate_str(text):
    """Translate a single string to Tamil"""
    if not text or not isinstance(text, str):
        return text
    
    if not any(c.isalpha() for c in text):
        return text
    
    data = urllib.parse.urlencode({
        'q': text,
        'source': 'en',
        'target': TARGET_LANG,
        'format': 'text'
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(TRANSLATE_URL, data=data)
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            return res.get('translatedText', text)
    except Exception as e:
        print(f"Translation error: {e}")
        return text

def recursive_translate(d):
    """Recursively translate all strings in dictionary"""
    for k, v in d.items():
        if isinstance(v, dict):
            recursive_translate(v)
        elif isinstance(v, str):
            if any(c.isalpha() for c in v):
                d[k] = translate_str(v)

if __name__ == '__main__':
    print(f"Loading {LANG_NAME} Dictionary...")
    file_path = "frontend/src/locales/ta.json"
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"Translating to {LANG_NAME}...")
    
    # Translate patient and common modules (most frequently used)
    if 'patient' in data:
        print("Translating 'patient' module...")
        recursive_translate(data['patient'])
    
    if 'common' in data:
        print("Translating 'common' module...")
        recursive_translate(data['common'])
    
    print("Saving...")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ {LANG_NAME} translation complete!")
