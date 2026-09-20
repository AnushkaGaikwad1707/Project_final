import sqlite3
from pathlib import Path


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

# backend/operational/operational_db.py
# parent.parent.parent = sih26170/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Operational database
DATABASE_PATH = PROJECT_ROOT / "backend" / "operational.db"

# SQL schema supplied in the FINAL-01 package
SCHEMA_PATH = Path(__file__).resolve().parent / "Operational_DB_Schema.sql"


# ---------------------------------------------------------
# Database Connection
# ---------------------------------------------------------

def get_connection():
    """
    Create a connection to the operational SQLite database.
    """

    connection = sqlite3.connect(DATABASE_PATH)

    # Enable foreign-key constraints
    connection.execute("PRAGMA foreign_keys = ON;")

    # Return rows that can be accessed by column name
    connection.row_factory = sqlite3.Row

    return connection


# ---------------------------------------------------------
# Initialize Database
# ---------------------------------------------------------

def initialize_database():
    """
    Create the operational database and its tables
    using the supplied SQL schema.
    """

    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(
            f"Database schema not found: {SCHEMA_PATH}"
        )

    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

    connection = get_connection()

    try:
        connection.executescript(schema_sql)
        connection.commit()

    finally:
        connection.close()


# ---------------------------------------------------------
# Test Connection
# ---------------------------------------------------------

if __name__ == "__main__":
    initialize_database()

    print("Operational database initialized successfully.")
    print(f"Database: {DATABASE_PATH}")