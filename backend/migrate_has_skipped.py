import sqlite3

def upgrade():
    conn = sqlite3.connect('zombieware.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute('ALTER TABLE group_players ADD COLUMN has_skipped_trade BOOLEAN DEFAULT 0')
        print("Successfully added has_skipped_trade column to group_players table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column has_skipped_trade already exists.")
        else:
            print(f"Error: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade()
