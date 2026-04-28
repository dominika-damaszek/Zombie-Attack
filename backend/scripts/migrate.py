import sqlite3

try:
    conn = sqlite3.connect('zombieware.db')
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE sessions ADD COLUMN game_mode VARCHAR DEFAULT 'normal'")
        print("Added game_mode to sessions")
    except Exception as e:
        print("Sessions table:", e)
        
    try:
        c.execute("ALTER TABLE groups ADD COLUMN game_mode VARCHAR DEFAULT 'normal'")
        print("Added game_mode to groups")
    except Exception as e:
        print("Groups table:", e)
        
    conn.commit()
    conn.close()
    print("Migration complete")
except Exception as e:
    print("Error connecting:", e)
