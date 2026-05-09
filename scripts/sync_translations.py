import json
import httpx
import asyncio
import os
import time
import re
from dotenv import load_dotenv

load_dotenv()

# Paths to locale files
LOCALE_DIR = r"c:\Netra Ai\Netra-Ai\frontend\src\locales"
EN_FILE = os.path.join(LOCALE_DIR, "en.json")
HI_FILE = os.path.join(LOCALE_DIR, "hi.json")
KN_FILE = os.path.join(LOCALE_DIR, "kn.json")
MR_FILE = os.path.join(LOCALE_DIR, "mr.json")

LIBRETRANSLATE_URL = "http://localhost:5000/translate"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"

# Words that are usually the same in all languages
EXCEPTIONS = {"AI", "ID", "PDF", "CSV", "SOS", "SOC 2", "FDA", "IEC 62304", "HIPAA", "Vite", "React", "Supabase", "LibreTranslate"}

def is_english(text):
    """Check if text is mostly English/Latin characters."""
    if not text: return False
    clean = re.sub(r'[^a-zA-Z]', '', text)
    if not clean: return False
    return len(clean) / len(text) > 0.5

async def translate_with_ollama(client, text, target_lang):
    """Translate text using local Ollama (DeepSeek)."""
    try:
        lang_map = {"hi": "Hindi", "kn": "Kannada", "mr": "Marathi"}
        target_lang_full = lang_map.get(target_lang, target_lang)
        prompt = f"Translate the following English text to {target_lang_full}. Return ONLY the translated text, no explanation or conversational filler.\n\nText: {text}"
        
        resp = await client.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }, timeout=180)
        
        if resp.status_code == 200:
            result = resp.json().get("response", "").strip()
            # DeepSeek-R1 might include <think> tags
            result = re.sub(r'<think>.*?</think>', '', result, flags=re.DOTALL).strip()
            return result
        return None
    except Exception as e:
        import traceback
        print(f"Ollama error: {repr(e)}")
        # traceback.print_exc()
        return None

async def translate_json(client, source_data, target_data, target_lang, lang_file):
    """Recursively translate missing or English-fallback keys in target_data from source_data."""
    updated = False
    
    total_keys = 0
    def count_keys(d):
        nonlocal total_keys
        for v in d.values():
            if isinstance(v, dict): count_keys(v)
            else: total_keys += 1
    count_keys(source_data)
    
    current_key = 0
    
    def save():
        with open(lang_file, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2)

    async def walk(src, tgt):
        nonlocal updated, current_key
        for key, value in src.items():
            if not isinstance(value, dict):
                current_key += 1
                if current_key % 50 == 0:
                    print(f"Progress [{target_lang}]: {current_key}/{total_keys}")
            
            needs_translation = False
            
            if key not in tgt:
                needs_translation = True
            elif isinstance(value, str) and tgt.get(key) == value:
                if value not in EXCEPTIONS and len(value) > 2 and is_english(tgt[key]):
                    needs_translation = True
            
            if needs_translation:
                if isinstance(value, dict):
                    if key not in tgt: tgt[key] = {}
                    await walk(value, tgt[key])
                    updated = True
                else:
                    try:
                        print(f"[{current_key}/{total_keys}] Translating '{key}' ('{value[:30]}...') to {target_lang}")
                    except UnicodeEncodeError:
                        print(f"[{current_key}/{total_keys}] Translating key '{key}' to {target_lang}")
                    
                    translated = None
                    # Try LibreTranslate first for supported langs (hi)
                    if target_lang == "hi":
                        await asyncio.sleep(1.0) 
                        try:
                            resp = await client.post(LIBRETRANSLATE_URL, json={
                                "q": value,
                                "source": "en",
                                "target": target_lang,
                                "format": "text"
                            }, timeout=30)
                            if resp.status_code == 200:
                                translated = resp.json()["translatedText"]
                        except: pass
                    
                    # Fallback to Ollama for kn/mr or if LT fails
                    if not translated or translated == value:
                        translated = await translate_with_ollama(client, value, target_lang)
                    
                    if translated and translated != value:
                        tgt[key] = translated
                        updated = True
                        save() 
                    else:
                        tgt[key] = value 
            elif isinstance(value, dict):
                if not isinstance(tgt.get(key), dict):
                    tgt[key] = {}
                await walk(value, tgt[key])
    
    await walk(source_data, target_data)
    return updated

async def main():
    async with httpx.AsyncClient() as client:
        with open(EN_FILE, 'r', encoding='utf-8') as f:
            en_data = json.load(f)
            
        # Only process kn and mr (hi is already good enough/complete)
        for lang_file, lang_code in [(KN_FILE, "kn"), (MR_FILE, "mr")]:
            print(f"\nProcessing {lang_code}...")
            if os.path.exists(lang_file):
                with open(lang_file, 'r', encoding='utf-8') as f:
                    try:
                        target_data = json.load(f)
                    except:
                        target_data = {}
            else:
                target_data = {}
                
            await translate_json(client, en_data, target_data, lang_code, lang_file)
            print(f"Completed {lang_code}")

if __name__ == "__main__":
    asyncio.run(main())
