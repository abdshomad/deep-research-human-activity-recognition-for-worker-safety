import sqlite3
import os
import time

DEFAULT_DB_PATH = "violations.db"

def get_db_connection(db_path=DEFAULT_DB_PATH):
    """
    Establish connection to the SQLite database.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=DEFAULT_DB_PATH):
    """
    Initialize database and create violations table if not exists.
    """
    # Ensure parent directory exists if path is nested
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            worker_id INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            reasons TEXT NOT NULL,
            image_path TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            action_taken TEXT DEFAULT 'none',
            notes TEXT DEFAULT ''
        )
    """)
    conn.commit()
    conn.close()

def create_violation(worker_id: int, risk_level: str, reasons: str, image_path: str, db_path=DEFAULT_DB_PATH) -> int:
    """
    Create a new violation record in the database.
    Returns the newly created violation ID.
    """
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO violations (timestamp, worker_id, risk_level, reasons, image_path, status, action_taken, notes)
        VALUES (?, ?, ?, ?, ?, 'draft', 'none', '')
        """,
        (timestamp_str, worker_id, risk_level, reasons, image_path)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id

def get_violation(violation_id: int, db_path=DEFAULT_DB_PATH):
    """
    Fetch a single violation record by ID.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM violations WHERE id = ?", (violation_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_all_violations(db_path=DEFAULT_DB_PATH):
    """
    Fetch all violation records sorted by timestamp descending.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM violations ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_violation(violation_id: int, status: str, action_taken: str, notes: str = "", db_path=DEFAULT_DB_PATH) -> int:
    """
    Update status, action taken, and notes for a violation.
    Returns the number of rows modified.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE violations
        SET status = ?, action_taken = ?, notes = ?
        WHERE id = ?
        """,
        (status, action_taken, notes, violation_id)
    )
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected

# Initialize database on startup
if not os.environ.get("TESTING"):
    init_db()
