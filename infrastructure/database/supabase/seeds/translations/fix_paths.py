import os
import glob

directory = r'c:\Netra Ai\Netra-Ai\database\seeds\translations'
files = glob.glob(os.path.join(directory, '*.py'))

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('frontend/src/locales', 'frontend/src/locales')
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
