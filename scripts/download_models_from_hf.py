#!/usr/bin/env python3
"""
Download ML Models from Hugging Face
=====================================
Downloads model files from Hugging Face Spaces to local project directories.
Does NOT modify or remove anything from Hugging Face - only downloads copies.

Usage:
    python scripts/download_models_from_hf.py
"""

from huggingface_hub import hf_hub_download, list_repo_files
from pathlib import Path
import os

# Your Hugging Face username
HF_USERNAME = "sunay-potnuru"

# Model repositories and their local destinations
MODELS = {
    "netra-anemia": {
        "repo_id": f"{HF_USERNAME}/netra-anemia",
        "local_dir": "backend/anemia/models",
        "files": ["best_model.pt", "model.pt", "*.pt", "*.pkl", "*.h5"]  # Will try to find these
    },
    "netra-dr": {
        "repo_id": f"{HF_USERNAME}/netra-dr",
        "local_dir": "backend/diabetic-retinopathy/models",
        "files": ["*.pt", "*.h5", "*.pkl", "model.pt", "dr_model.pt"]
    },
    "netra-cataract": {
        "repo_id": f"{HF_USERNAME}/netra-cataract",
        "local_dir": "backend/cataract/models",
        "files": ["*.pt", "*.h5", "*.pkl", "model.pt", "cataract_model.pt"]
    },
    "netra-mental": {
        "repo_id": f"{HF_USERNAME}/netra-mental",
        "local_dir": "backend/mental-health/models",
        "files": ["*.pt", "*.h5", "*.pkl", "model.pt", "mental_health_model.pt"]
    }
}

def download_model_files(repo_id: str, local_dir: str, file_patterns: list):
    """Download model files from HuggingFace Space."""
    print(f"\n📦 Downloading from: {repo_id}")
    print(f"📁 Destination: {local_dir}")
    
    # Create local directory
    local_path = Path(local_dir)
    local_path.mkdir(parents=True, exist_ok=True)
    
    try:
        # List all files in the repository
        print("🔍 Scanning repository for model files...")
        all_files = list_repo_files(repo_id, repo_type="space")
        
        # Filter for model files
        model_files = [
            f for f in all_files 
            if any(f.endswith(ext) for ext in ['.pt', '.pth', '.h5', '.pkl', '.onnx', '.joblib'])
        ]
        
        if not model_files:
            print(f"⚠️  No model files found in {repo_id}")
            return False
        
        print(f"✅ Found {len(model_files)} model file(s):")
        for f in model_files:
            print(f"   - {f}")
        
        # Download each model file
        downloaded = 0
        for model_file in model_files:
            try:
                print(f"\n⬇️  Downloading: {model_file}")
                downloaded_path = hf_hub_download(
                    repo_id=repo_id,
                    filename=model_file,
                    repo_type="space",
                    local_dir=local_dir,
                    local_dir_use_symlinks=False  # Copy actual files, not symlinks
                )
                print(f"✅ Downloaded to: {downloaded_path}")
                downloaded += 1
            except Exception as e:
                print(f"❌ Failed to download {model_file}: {e}")
        
        if downloaded > 0:
            print(f"\n✅ Successfully downloaded {downloaded}/{len(model_files)} files")
            return True
        else:
            print(f"\n❌ Failed to download any files from {repo_id}")
            return False
            
    except Exception as e:
        print(f"❌ Error accessing {repo_id}: {e}")
        print(f"   Make sure the repository exists and is accessible")
        return False

def main():
    """Main function to download all models."""
    print("=" * 70)
    print("🚀 Downloading ML Models from Hugging Face")
    print("=" * 70)
    print("\n⚠️  NOTE: This only DOWNLOADS models to your local project.")
    print("   Nothing on Hugging Face will be modified or removed.\n")
    
    success_count = 0
    total_count = len(MODELS)
    
    for model_name, config in MODELS.items():
        print("\n" + "=" * 70)
        if download_model_files(
            repo_id=config["repo_id"],
            local_dir=config["local_dir"],
            file_patterns=config["files"]
        ):
            success_count += 1
    
    print("\n" + "=" * 70)
    print(f"📊 Summary: {success_count}/{total_count} repositories processed successfully")
    print("=" * 70)
    
    if success_count > 0:
        print("\n✅ Models downloaded successfully!")
        print("\n📋 Next Steps:")
        print("   1. Verify models are in place:")
        print("      ls backend/*/models/")
        print()
        print("   2. Rebuild Docker containers:")
        print("      cd docker")
        print("      docker-compose build")
        print()
        print("   3. Restart services:")
        print("      docker-compose up -d")
        print()
        print("   4. Check logs:")
        print("      docker-compose logs -f")
    else:
        print("\n⚠️  No models were downloaded.")
        print("   Please check:")
        print("   - Repository names are correct")
        print("   - Repositories are public or you're authenticated")
        print("   - Model files exist in the repositories")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()
