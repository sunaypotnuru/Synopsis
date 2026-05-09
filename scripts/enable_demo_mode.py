#!/usr/bin/env python3
"""
Enable Demo Mode for ML Services
=================================
Modifies ML service startup code to make model loading optional.
Services will run in DEMO MODE and return mock predictions when models are missing.

Usage:
    python scripts/enable_demo_mode.py
"""

import re
from pathlib import Path

def modify_service(service_path: str) -> bool:
    """Modify a service's main.py to support demo mode."""
    path = Path(service_path)
    
    if not path.exists():
        print(f"⚠️  Skipping {service_path} - file not found")
        return False
    
    print(f"📝 Processing {service_path}...")
    content = path.read_text(encoding='utf-8')
    original_content = content
    
    # Pattern 1: Replace RuntimeError with warning + return
    content = re.sub(
        r'raise RuntimeError\(f["\'].*?model.*?not found.*?["\']\)',
        'logger.warning(f"Model not found at {model_path} - running in DEMO MODE"); return',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # Pattern 2: Replace generic RuntimeError
    content = re.sub(
        r'raise RuntimeError\(["\']Model file not found.*?["\']\)',
        'logger.warning("Model file not found - running in DEMO MODE"); return',
        content,
        flags=re.IGNORECASE
    )
    
    # Check if we made changes
    if content != original_content:
        # Backup original
        backup_path = path.with_suffix('.py.backup')
        backup_path.write_text(original_content, encoding='utf-8')
        
        # Write modified content
        path.write_text(content, encoding='utf-8')
        print(f"✅ Modified {service_path}")
        print(f"   Backup saved to {backup_path}")
        return True
    else:
        print(f"ℹ️  No changes needed for {service_path}")
        return False

def main():
    """Main function to enable demo mode for all ML services."""
    print("=" * 70)
    print("🚀 Enabling Demo Mode for ML Services")
    print("=" * 70)
    print()
    
    services = [
        "backend/anemia/app/main.py",
        "backend/diabetic-retinopathy/app/main.py",
        "backend/cataract/app/main.py",
        "backend/mental-health/app/main.py",
    ]
    
    modified_count = 0
    
    for service_path in services:
        if modify_service(service_path):
            modified_count += 1
        print()
    
    print("=" * 70)
    if modified_count > 0:
        print(f"✅ Successfully modified {modified_count} service(s)!")
        print()
        print("📋 Next Steps:")
        print("   1. Rebuild Docker containers:")
        print("      cd docker")
        print("      docker-compose build")
        print()
        print("   2. Restart services:")
        print("      docker-compose up -d")
        print()
        print("   3. Check logs:")
        print("      docker-compose logs -f")
        print()
        print("⚠️  Services will run in DEMO MODE and return mock predictions")
        print("   until actual model files are provided.")
    else:
        print("ℹ️  No services were modified.")
        print("   Either they're already in demo mode or files weren't found.")
    print("=" * 70)

if __name__ == "__main__":
    main()
