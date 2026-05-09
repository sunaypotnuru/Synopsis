import os
import socket
import requests

# Platform Configuration
REQUIRED_PORTS = {
    "Frontend": 3000,
    "Backend": 8000,
    "Anemia ML": 8001,
    "Diabetic ML": 8002,
    "Mental ML": 8003,
    "Parkinson ML": 8004,
    "Cataract ML": 8005,
    "Redis": 6379
}

def check_env_file():
    """Verifies that .env exists in the root."""
    if os.path.exists(".env"):
        print("[PASS] .env file found.")
        return True
    print("[FAIL] .env file missing! Create it from .env.example.")
    return False

def check_port(port: int) -> bool:
    """Checks if a port is open locally."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def verify_services():
    """Checks reachability of all platform services via ports."""
    print("\n--- Verifying Service Ports ---")
    all_ok = True
    for name, port in REQUIRED_PORTS.items():
        if check_port(port):
            print(f"[ONLINE] {name:15} (Port {port})")
        else:
            print(f"[OFFLINE] {name:15} (Port {port})")
            all_ok = False
    return all_ok

def check_backend_health():
    """Calls the backend /health endpoint."""
    print("\n--- Testing Backend API Health ---")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print(f"[PASS] Backend /health returned 200. Data: {response.json()}")
            return True
        else:
            print(f"[FAIL] Backend /health returned {response.status_code}")
    except Exception as e:
        print(f"[FAIL] Could not connect to backend: {e}")
    return False

def main():
    print("==========================================")
    print("   NETRA AI PLATFORM VERIFICATION TOOL    ")
    print("==========================================\n")
    
    env_ok = check_env_file()
    services_ok = verify_services()
    backend_ok = check_backend_health()
    
    print("\n" + "="*42)
    if env_ok and services_ok and backend_ok:
        print(" SUCCESS: Platform is fully functional!")
    else:
        print(" WARNING: Some components are not ready.")
    print("="*42)

if __name__ == "__main__":
    main()
