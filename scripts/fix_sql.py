import re

def fix_sql_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace ✅ with A
    content = content.replace('✅', 'A')

    # 2. Fix patterns
    replacements = {
        r'\bAAS \$\$': 'AS $$',
        r'\bINTERV L\b': 'INTERVAL',
        r'\bCRE TE\b': 'CREATE',
        r'\bREPL CE\b': 'REPLACE',
        r'\bDECL RE\b': 'DECLARE',
        r'\bEXTR CT\b': 'EXTRACT',
        r'\bYE R\b': 'YEAR',
        r' GE\(': ' AGE(',
        r'\bLE ST\b': 'LEAST',
        r'\bCO LESCE\b': 'COALESCE',
        r'\bR ISE\b': 'RAISE',
        r'\b NLY\b': ' ONLY',
        r'\b LL\b': ' ALL',
        r'\b NY\b': ' ANY',
        r'\bAGENDER\b': 'GENDER',
        r'\bagender\b': 'gender',
        r'\b TR IGGER\b': ' TRIGGER',
        r'\bFUNCT ION\b': 'FUNCTION',
        r'\bDEF INER\b': 'DEFINER',
        r'\bPLPGSQL\b': 'PLPGSQL',
        r'\bRETUR NAROUND\b': 'ROUND',
        r'\bM N GEMENT\b': 'MANAGEMENT',
        r'\bCOMPL INT\b': 'COMPLAINT',
        r'\bSSIGNMENT\b': 'ASSIGNMENT',
        r'\b TTACHMENTS\b': ' ATTACHMENTS',
        r'\bDMINS\b': 'ADMINS',
        r'\bdmins\b': 'admins',
        r'\bDM IN\b': 'ADMIN',
        r'\bdm in\b': 'admin',
        r'\b N\b': ' AN',
        r'\b ND\b': ' AND',
        r'\b S\b': ' AS',
        r'\b T\b': ' AT',
        r'\b DD\b': ' ADD',
        r'\b LTER\b': ' ALTER',
        r'\b LWAYS\b': ' ALWAYS',
        r'\b PP\b': ' APP',
        r'\b RR Y\b': ' ARRAY',
    }

    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content)

    # Specific fixes
    content = content.replace(' lice Williams', 'Alice Williams')
    content = content.replace("' -'", "'A-'")
    content = content.replace(" Asia/Kolkata", "Asia/Kolkata")
    content = content.replace(" pple", "Apple")
    content = content.replace(" HL7 genetic variant", "HL7 genetic variant") # wait, this was fine

    # Cleanup multiple spaces created by replacements
    content = content.replace('  ', ' ')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    fix_sql_file(r'c:\Netra Ai\Netra-Ai\database\schema\MASTER_DATABASE_SCHEMA.sql')
    print("SQL file fixed.")
