"""
Demo Data Generator for Netra AI
Generates sample data for hackathon demonstration

Run this script AFTER running the master SQL file to populate the database with demo data.

Usage:
    python scripts/generate_demo_data.py
"""

import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
import random

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Sample data
SAMPLE_USERS = [
    {"id": str(uuid4()), "name": "John Doe", "email": "john@example.com", "role": "patient"},
    {"id": str(uuid4()), "name": "Jane Smith", "email": "jane@example.com", "role": "patient"},
    {"id": str(uuid4()), "name": "Dr. Sarah Johnson", "email": "sarah@example.com", "role": "doctor"},
    {"id": str(uuid4()), "name": "Dr. Michael Chen", "email": "michael@example.com", "role": "doctor"},
    {"id": str(uuid4()), "name": "Admin User", "email": "admin@example.com", "role": "admin"},
]

ACTIONS = ["LOGIN", "VIEW_PROFILE", "UPDATE_PROFILE", "VIEW_SCAN", "CREATE_APPOINTMENT", "VIEW_MEDICATIONS", "EXPORT_DATA"]
RESOURCE_TYPES = ["patient", "appointment", "scan", "medication", "document"]
SERVICES = ["core", "anemia", "diabetic-retinopathy", "cataract", "parkinsons-voice", "mental-health", "emergency-services", "mental-health-chatbot"]


def generate_audit_logs(count=100):
    """Generate sample audit logs"""
    print(f"\n📝 Generating {count} audit logs...")
    
    sql_statements = []
    sql_statements.append("-- Sample Audit Logs")
    sql_statements.append("INSERT INTO audit_logs_enhanced (id, timestamp, user_id, user_role, action, resource_type, resource_id, ip_address, user_agent, status, details, phi_accessed) VALUES")
    
    values = []
    for i in range(count):
        user = random.choice(SAMPLE_USERS)
        action = random.choice(ACTIONS)
        resource_type = random.choice(RESOURCE_TYPES)
        timestamp = datetime.now() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
        phi_accessed = action in ["VIEW_SCAN", "VIEW_PROFILE", "EXPORT_DATA"]
        
        value = f"""(
    '{uuid4()}',
    '{timestamp.isoformat()}',
    '{user["id"]}',
    '{user["role"]}',
    '{action}',
    '{resource_type}',
    '{uuid4()}',
    '192.168.1.{random.randint(1, 255)}',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'SUCCESS',
    '{{"details": "Sample audit log"}}',
    {str(phi_accessed).lower()}
)"""
        values.append(value)
    
    sql_statements.append(",\n".join(values) + ";")
    
    print(f"✅ Generated {count} audit logs")
    return "\n".join(sql_statements)


def generate_health_checks(count=50):
    """Generate sample health check data"""
    print(f"\n🏥 Generating {count} health checks...")
    
    sql_statements = []
    sql_statements.append("\n-- Sample Health Checks")
    sql_statements.append("INSERT INTO service_health (id, service_name, status, latency_ms, status_code, error_message, checked_at) VALUES")
    
    values = []
    for i in range(count):
        service = random.choice(SERVICES)
        status = random.choice(["healthy", "healthy", "healthy", "unhealthy"])  # 75% healthy
        latency = random.randint(50, 500) if status == "healthy" else random.randint(1000, 5000)
        status_code = 200 if status == "healthy" else random.choice([500, 503, 504])
        timestamp = datetime.now() - timedelta(minutes=random.randint(0, 1440))
        error_msg = "NULL" if status == "healthy" else "'Service timeout'"
        
        value = f"""(
    '{uuid4()}',
    '{service}',
    '{status}',
    {latency},
    {status_code},
    {error_msg},
    '{timestamp.isoformat()}'
)"""
        values.append(value)
    
    sql_statements.append(",\n".join(values) + ";")
    
    print(f"✅ Generated {count} health checks")
    return "\n".join(sql_statements)


def generate_sessions(count=20):
    """Generate sample user sessions"""
    print(f"\n🔐 Generating {count} user sessions...")
    
    sql_statements = []
    sql_statements.append("\n-- Sample User Sessions")
    sql_statements.append("INSERT INTO user_sessions_enhanced (session_id, user_id, device_info, ip_address, created_at, last_activity, expires_at, is_active) VALUES")
    
    values = []
    for i in range(count):
        user = random.choice(SAMPLE_USERS)
        created = datetime.now() - timedelta(hours=random.randint(0, 48))
        last_activity = created + timedelta(minutes=random.randint(0, 120))
        expires = created + timedelta(hours=24)
        is_active = random.choice([True, True, True, False])  # 75% active
        
        device_info = {
            "browser": random.choice(["Chrome", "Firefox", "Safari", "Edge"]),
            "os": random.choice(["Windows 10", "macOS", "Linux", "iOS", "Android"]),
            "device": random.choice(["Desktop", "Mobile", "Tablet"])
        }
        
        value = f"""(
    '{uuid4()}',
    '{user["id"]}',
    '{str(device_info).replace("'", '"')}',
    '192.168.1.{random.randint(1, 255)}',
    '{created.isoformat()}',
    '{last_activity.isoformat()}',
    '{expires.isoformat()}',
    {str(is_active).lower()}
)"""
        values.append(value)
    
    sql_statements.append(",\n".join(values) + ";")
    
    print(f"✅ Generated {count} sessions")
    return "\n".join(sql_statements)


def generate_export_requests(count=10):
    """Generate sample data export requests"""
    print(f"\n📤 Generating {count} export requests...")
    
    sql_statements = []
    sql_statements.append("\n-- Sample Data Export Requests")
    sql_statements.append("INSERT INTO data_export_requests (id, patient_id, format, status, requested_at, completed_at, file_size, download_url, expires_at) VALUES")
    
    values = []
    for i in range(count):
        patient = random.choice([u for u in SAMPLE_USERS if u["role"] == "patient"])
        format_type = random.choice(["json", "csv", "fhir"])
        status = random.choice(["completed", "completed", "pending"])
        requested = datetime.now() - timedelta(days=random.randint(0, 7))
        completed = requested + timedelta(hours=random.randint(1, 24)) if status == "completed" else "NULL"
        file_size = f"'{random.randint(1, 10)} MB'" if status == "completed" else "NULL"
        download_url = f"'/api/v1/patients/{patient['id']}/export/download'" if status == "completed" else "NULL"
        expires = (requested + timedelta(days=7)).isoformat() if status == "completed" else "NULL"
        
        value = f"""(
    '{uuid4()}',
    '{patient["id"]}',
    '{format_type}',
    '{status}',
    '{requested.isoformat()}',
    {f"'{completed.isoformat()}'" if completed != "NULL" else "NULL"},
    {file_size},
    {download_url},
    {f"'{expires}'" if expires != "NULL" else "NULL"}
)"""
        values.append(value)
    
    sql_statements.append(",\n".join(values) + ";")
    
    print(f"✅ Generated {count} export requests")
    return "\n".join(sql_statements)


def generate_backup_logs(count=15):
    """Generate sample backup logs"""
    print(f"\n💾 Generating {count} backup logs...")
    
    sql_statements = []
    sql_statements.append("\n-- Sample Backup Logs")
    sql_statements.append("INSERT INTO backup_logs (id, backup_type, status, started_at, completed_at, file_size, location, error_message) VALUES")
    
    values = []
    for i in range(count):
        backup_type = random.choice(["full", "incremental"])
        status = random.choice(["completed", "completed", "completed", "failed"])
        started = datetime.now() - timedelta(days=i)
        completed = started + timedelta(hours=random.randint(1, 3)) if status == "completed" else "NULL"
        file_size = f"'{random.randint(100, 1000)} MB'" if status == "completed" else "NULL"
        location = f"'s3://netra-backups/backup_{started.strftime('%Y%m%d')}.sql.gpg'" if status == "completed" else "NULL"
        error_msg = "NULL" if status == "completed" else "'Backup timeout'"
        
        value = f"""(
    '{uuid4()}',
    '{backup_type}',
    '{status}',
    '{started.isoformat()}',
    {f"'{completed.isoformat()}'" if completed != "NULL" else "NULL"},
    {file_size},
    {location},
    {error_msg}
)"""
        values.append(value)
    
    sql_statements.append(",\n".join(values) + ";")
    
    print(f"✅ Generated {count} backup logs")
    return "\n".join(sql_statements)


def main():
    """Generate all demo data"""
    print("=" * 60)
    print("🎯 Netra AI - Demo Data Generator")
    print("=" * 60)
    
    # Generate all data
    all_sql = []
    all_sql.append("-- Demo Data for Netra AI Hackathon")
    all_sql.append(f"-- Generated: {datetime.now().isoformat()}")
    all_sql.append("-- Run this AFTER running MASTER_DATABASE_SCHEMA.sql\n")
    
    all_sql.append(generate_audit_logs(100))
    all_sql.append(generate_health_checks(50))
    all_sql.append(generate_sessions(20))
    all_sql.append(generate_export_requests(10))
    all_sql.append(generate_backup_logs(15))
    
    # Write to file
    output_file = "infrastructure/database/DEMO_DATA.sql"
    with open(output_file, "w") as f:
        f.write("\n\n".join(all_sql))
    
    print("\n" + "=" * 60)
    print("✅ Demo data generated successfully!")
    print(f"📁 Output file: {output_file}")
    print("\n📝 To load demo data, run:")
    print(f"   psql $DATABASE_URL -f {output_file}")
    print("=" * 60)


if __name__ == "__main__":
    main()
