import sqlite3

try:
    conn = sqlite3.connect('zombieware.db')
    c = conn.cursor()
    c.execute("ALTER TABLE group_players ADD COLUMN is_ready BOOLEAN DEFAULT 0")
    conn.commit()
    conn.close()
    print("Migration complete: added is_ready")
except Exception as e:
    print("Migration error:", e)
