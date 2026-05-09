import psycopg2
import sys
import os

try:
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        dbname=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        port=os.getenv("DB_PORT", "5432"),
    )
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 10);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high'));
    CREATE INDEX IF NOT EXISTS idx_appointments_risk ON appointments(risk_score DESC, scheduled_at ASC);
    """)
    print("Migration successful")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
