#!/bin/bash
# Shell script to run all translation scripts for Netra AI
# Linux/Mac version

echo "========================================"
echo "Netra AI - Multi-Language Translation"
echo "========================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "apps/web/src/locales/en.json" ]; then
    echo "ERROR: Please run this script from the Netra-Ai project root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "Checking LibreTranslate server..."
if ! curl -s http://localhost:5000/languages > /dev/null 2>&1; then
    echo "ERROR: LibreTranslate server is not running!"
    echo "Please start it with: docker-compose up libretranslate"
    exit 1
fi
echo "✓ LibreTranslate server is running!"
echo ""

echo "========================================"
echo "Starting translations..."
echo "========================================"
echo ""

# Counter for successful translations
SUCCESS_COUNT=0
TOTAL_COUNT=4

# Hindi
echo "[1/4] Translating to Hindi..."
if python3 scripts/translations/translate_hindi.py; then
    echo "✓ SUCCESS: Hindi translation complete"
    ((SUCCESS_COUNT++))
else
    echo "✗ WARNING: Hindi translation failed"
fi
echo ""

# Marathi
echo "[2/4] Translating to Marathi..."
if python3 scripts/translations/translate_marathi.py; then
    echo "✓ SUCCESS: Marathi translation complete"
    ((SUCCESS_COUNT++))
else
    echo "✗ WARNING: Marathi translation failed"
fi
echo ""

# Telugu
echo "[3/4] Translating to Telugu..."
if python3 scripts/translations/translate_telugu.py; then
    echo "✓ SUCCESS: Telugu translation complete"
    ((SUCCESS_COUNT++))
else
    echo "✗ WARNING: Telugu translation failed"
fi
echo ""

# Tamil
echo "[4/4] Translating to Tamil..."
if python3 scripts/translations/translate_tamil.py; then
    echo "✓ SUCCESS: Tamil translation complete"
    ((SUCCESS_COUNT++))
else
    echo "✗ WARNING: Tamil translation failed"
fi
echo ""

echo "========================================"
echo "Translation Summary"
echo "========================================"
echo "Completed: $SUCCESS_COUNT/$TOTAL_COUNT translations"
echo ""
echo "Translated files location:"
echo "  apps/web/src/locales/"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo "🎉 All translations completed successfully!"
    exit 0
else
    echo "⚠️  Some translations failed. Check the output above."
    exit 1
fi
