# 🌐 Netra AI Translation System - Complete Guide

This directory contains all translation scripts and tools for the Netra AI multi-language system.

## 📁 Directory Structure

```
database/seeds/translations/
├── README.md                    # This file (complete guide)
├── translate_all.py            # Unified translation script (RECOMMENDED)
├── translate_hindi.py          # Hindi translation
├── translate_marathi.py        # Marathi translation
├── translate_telugu.py         # Telugu translation
├── translate_tamil.py          # Tamil translation
├── translate_kannada.py        # Kannada translation
├── run_all_translations.ps1     # Windows PowerShell script
├── run_all_translations.sh      # Linux/Mac shell script
└── setup_and_verify.py         # Verification script
```

## ⚡ QUICK START (3 Steps)

### 1. Start LibreTranslate
```powershell
docker-compose up -d libretranslate
```
Wait 30-60 seconds for language models to load.

### 2. Verify Setup
```powershell
python database/seeds/translations/setup_and_verify.py
```

### 3. Translate All Languages
```powershell
python database/seeds/translations/translate_all.py --all
```

---

## 🔍 WHAT HAPPENS WHEN YOU RUN THE TRANSLATION?

1. **Loads English Source File**: Reads `frontend/src/locales/en.json`.
2. **Translates Each String**: Sends HTTP request to LibreTranslate at `http://localhost:5000/translate`.
3. **Preserves Structure**: Only translates values, keeping JSON keys identical to English.
4. **Saves Translated File**: Writes to `frontend/src/locales/{lang}.json`.
