import os
import re

schema_file = 'c:\\Netra Ai\\Netra-Ai\\infrastructure\\database\\supabase\\schema\\MASTER_DATABASE_SCHEMA.sql'
with open(schema_file, 'r', encoding='utf-8') as f:
    schema_content = f.read()

# Extract all CREATE TABLE IF NOT EXISTS public.table_name
defined_tables = set(re.findall(r'CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)', schema_content))
# Also catch without IF NOT EXISTS just in case
defined_tables.update(re.findall(r'CREATE TABLE public\.([a-zA-Z0-9_]+)', schema_content))

# Look for .table('name') or .table("name") or .from('name') or .from("name")
table_refs = set()

def scan_dir(directory, exts, regexes):
    for root, _, files in os.walk(directory):
        for file in files:
            if any(file.endswith(ext) for ext in exts):
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                        content = f.read()
                        for regex in regexes:
                            matches = re.findall(regex, content)
                            table_refs.update(matches)
                except Exception:
                    pass

# Scan backend (.py)
scan_dir('c:\\Netra Ai\\Netra-Ai\\backend', ['.py'], [r'\.table\([\'"]([a-zA-Z0-9_]+)[\'"]\)'])

# Scan frontend (.ts, .tsx)
scan_dir('c:\\Netra Ai\\Netra-Ai\\frontend', ['.ts', '.tsx'], [r'\.from\([\'"]([a-zA-Z0-9_]+)[\'"]\)'])

missing_tables = table_refs - defined_tables
# Ignore some common non-public or auth tables
ignore = {'auth.users', 'users', 'profiles'} # Assuming users/profiles might be handled differently, we'll see

print('Extracted', len(table_refs), 'table references from code.')
print('Found', len(defined_tables), 'tables defined in schema.')

if missing_tables:
    print('MISSING TABLES REFERENCED IN CODE:')
    for t in sorted(missing_tables):
        print(f' - {t}')
else:
    print('No missing tables found! All referenced tables exist in schema.')
