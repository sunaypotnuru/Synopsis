import subprocess
import os
import sys

# Set environment variable to force UTF-8 for child processes
os.environ["PYTHONIOENCODING"] = "utf-8"

def run_translations():
    print("========================================")
    print("Netra AI - Multi-Language Translation")
    print("========================================")
    
    en_file = "frontend/src/locales/en.json"
    if not os.path.exists(en_file):
        print(f"ERROR: English source file not found at {en_file}")
        sys.exit(1)

    scripts = [
        "database/seeds/translations/translate_hindi.py",
        "database/seeds/translations/translate_marathi.py",
        "database/seeds/translations/translate_telugu.py",
        "database/seeds/translations/translate_tamil.py",
        "database/seeds/translations/translate_kannada.py"
    ]

    success_count = 0
    for script in scripts:
        lang = script.split("_")[-1].replace(".py", "").upper()
        print(f"Translating to {lang}...")
        try:
            # Run script from project root
            result = subprocess.run([sys.executable, script], capture_output=True, text=True, encoding="utf-8")
            if result.returncode == 0:
                print(f"SUCCESS: {lang} complete")
                success_count += 1
            else:
                print(f"WARNING: {lang} failed")
                print(result.stdout)
                print(result.stderr)
        except Exception as e:
            print(f"ERROR: Failed to run {script}: {str(e)}")

    print("========================================")
    print(f"Completed: {success_count} / {len(scripts)} translations")

if __name__ == "__main__":
    run_translations()
