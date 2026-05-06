import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import database
from sqlalchemy import text

db = database.SessionLocal()
r = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='game' AND table_name='group_players' ORDER BY ordinal_position"))
cols = [row[0] for row in r]
print("group_players columns:", cols)
print("has infected_by_id:", "infected_by_id" in cols)
print("has infected_in_round:", "infected_in_round" in cols)
print("has score:", "score" in cols)
db.close()
