"""
End-to-end test for the Scoreboard & Point Distribution system.

Usage:
  1. Start the backend:  py -m uvicorn main:app --host 127.0.0.1 --port 8000
  2. Run this script:     py scripts/test_scoreboard.py

What it does:
  - Registers 4 test players and a teacher.
  - Creates a session + group, joins all players.
  - Starts a module_2 game (zombies enabled).
  - Simulates 3 rounds of scanning/trading with infection.
  - Checks scores after each round.
  - Calls /recap at the end and prints the podium.
"""

import httpx
import asyncio
import json
import sys

API = "http://127.0.0.1:8000"
PIN = "0000"

# ── Helpers ────────────────────────────────────────────────────────────────────
async def register_and_login(client: httpx.AsyncClient, username: str) -> str:
    """Register (ignore if exists) and login. Return access_token."""
    await client.post(f"{API}/auth/register", json={"username": username, "pin": PIN})
    resp = await client.post(f"{API}/auth/login", json={"username": username, "pin": PIN})
    resp.raise_for_status()
    return resp.json()["access_token"]


async def join_group(client: httpx.AsyncClient, token: str, join_code: str) -> dict:
    resp = await client.post(f"{API}/player/join?token={token}", json={"join_code": join_code})
    resp.raise_for_status()
    return resp.json()


async def scan(client: httpx.AsyncClient, group_id: str, player_id: str, card_code: str) -> dict:
    resp = await client.post(
        f"{API}/api/game/{group_id}/scan",
        json={"player_id": player_id, "card_code": card_code},
    )
    resp.raise_for_status()
    return resp.json()


async def get_state(client: httpx.AsyncClient, group_id: str) -> dict:
    resp = await client.get(f"{API}/api/game/{group_id}/state")
    resp.raise_for_status()
    return resp.json()


async def finish_round(client: httpx.AsyncClient, group_id: str) -> dict:
    resp = await client.post(f"{API}/api/game/{group_id}/finish_round")
    resp.raise_for_status()
    return resp.json()


async def next_round(client: httpx.AsyncClient, group_id: str) -> dict:
    resp = await client.post(f"{API}/api/game/{group_id}/next_round")
    resp.raise_for_status()
    return resp.json()


async def get_recap(client: httpx.AsyncClient, group_id: str) -> dict:
    resp = await client.get(f"{API}/api/game/{group_id}/recap")
    resp.raise_for_status()
    return resp.json()


def print_scores(state: dict, label: str):
    """Pretty-print player scores from a game state response."""
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    for p in state["players"]:
        role = "🧟 ZOMBIE" if p["is_infected"] else "🧑 Survivor"
        init = " (initial)" if p.get("is_initial_zombie") else ""
        print(f"  {p['username']:20s}  {role}{init:10s}  Score: {p.get('score', '?')}")
    print()


def print_podium(recap: dict):
    """Pretty-print the final podium from recap."""
    medals = ["🥇", "🥈", "🥉"]
    print(f"\n{'='*60}")
    print(f"  FINAL PODIUM")
    print(f"{'='*60}")
    for entry in recap.get("podium", []):
        rank = entry["rank"]
        medal = medals[rank - 1] if rank <= 3 else "  "
        print(f"  {medal} #{rank}  {entry['username']:15s}  {entry['score']} pts  ({entry['role']})")
    print(f"\n  Full scoreboard:")
    for entry in recap.get("scoreboard", []):
        print(f"    #{entry['rank']}  {entry['username']:15s}  {entry['score']} pts")
    print(f"\n  Infection rate: {recap['infection_rate']}%")
    print(f"  Rounds played: {recap['rounds_played']}")
    print()


# ── Main test ──────────────────────────────────────────────────────────────────
async def main():
    async with httpx.AsyncClient(timeout=30) as c:
        # 1. Register users
        print(">> Registering users...")
        teacher_token = await register_and_login(c, "test_teacher_score")
        tokens = {}
        for name in ["alice_score", "bob_score", "carol_score", "dave_score"]:
            tokens[name] = await register_and_login(c, name)
        print(f"  OK Registered teacher + 4 players")

        # 2. Create session + get lobby join code
        print(">> Creating session...")
        resp = await c.post(f"{API}/session?token={teacher_token}", json={"game_mode": "module_2"})
        resp.raise_for_status()
        session_data = resp.json()
        session_id = session_data["id"]
        lobby = next(g for g in session_data["groups"] if g["group_number"] == 0)
        join_code = lobby["join_code"]
        group_id = lobby["id"]
        print(f"  OK Session {session_id[:8]}... | Join code: {join_code}")

        # 3. Join all players
        print(">> Joining players to lobby...")
        player_ids = {}
        for name, tok in tokens.items():
            data = await join_group(c, tok, join_code)
            player_ids[name] = data["player_id"]
            print(f"  OK {name} joined as player {data['player_id'][:8]}...")

        # 4. Start the game (module_2 = zombies enabled)
        print(">> Starting game (module_2)...")
        resp = await c.post(
            f"{API}/api/game/{group_id}/start",
            json={"game_mode": "module_2"},
        )
        resp.raise_for_status()
        start_data = resp.json()
        print(f"  OK Game started: {start_data.get('message', '')}")

        # 4b. Skip through instruction slides to reach round 1
        #     The game starts in "module_instructions" with current_round=0.
        #     We need all players to call slide_ready repeatedly until
        #     the state becomes "round_active" and current_round=1.
        print(">> Skipping instruction slides...")
        for attempt in range(20):  # safety limit
            state = await get_state(c, group_id)
            if state["game_state"] == "round_active":
                print(f"  OK Reached round_active, current_round={state['current_round']}")
                break
            # All players mark ready for this slide
            for name, pid in player_ids.items():
                try:
                    await c.post(
                        f"{API}/api/game/{group_id}/slide_ready",
                        json={"player_id": pid},
                    )
                except:
                    pass
        else:
            print("  WARN: Could not advance past instruction slides!")
            return

        # 5. Check initial state - who is the zombie?
        state = await get_state(c, group_id)
        zombie_player = None
        survivor_players = []
        for p in state["players"]:
            if p["is_initial_zombie"]:
                zombie_player = p
                print(f"  ZOMBIE Initial zombie: {p['username']}")
            else:
                survivor_players.append(p)

        if not zombie_player:
            print("  WARN No zombie found! Check start_game logic.")
            return

        # ── ROUND 1: Zombie infects one survivor via card trade ───────────────
        print(f"\n>> ROUND 1 (current_round should be 1)")

        # First, zombie scans a card to own it (creates contaminated item)
        zombie_card = "QRC-8F2K9L1M"  # remedio
        r = await scan(c, group_id, zombie_player["id"], zombie_card)
        print(f"  Zombie scanned {zombie_card}: infected={r.get('infected')}")

        # Survivors each scan their own cards
        survivor_cards = ["QRC-4X7P3N8V", "QRC-9B6T2R5Y", "QRC-1M8Z4K7Q"]
        for i, sp in enumerate(survivor_players):
            r = await scan(c, group_id, sp["id"], survivor_cards[i])
            print(f"  {sp['username']} scanned {survivor_cards[i]}")

        # Now the first survivor scans the zombie's card (trade -> infection)
        victim = survivor_players[0]
        r = await scan(c, group_id, victim["id"], zombie_card)
        print(f"  {victim['username']} scanned zombie's card -> newly_infected={r.get('newly_infected')}")

        # End round 1
        result = await finish_round(c, group_id)
        scores = result.get("scores", [])
        print(f"  Round 1 scores:")
        for s in scores:
            print(f"    {s['username']:15s}  delta={s['delta']}  total={s['score']}  zombie={s['is_zombie']}")

        state = await get_state(c, group_id)
        print_scores(state, "AFTER ROUND 1")

        # Validate: zombie should have gotten +2 for infecting (initial zombie)
        zombie_score = next((s for s in scores if s["player_id"] == zombie_player["id"]), None)
        if zombie_score:
            print(f"  CHECK zombie delta={zombie_score['delta']} (expected 2)")
            assert zombie_score["delta"] == 2, f"Expected zombie delta=2, got {zombie_score['delta']}"
        
        # Validate: victim should have delta=0 (just got infected)
        victim_score = next((s for s in scores if s["player_id"] == victim["id"]), None)
        if victim_score:
            print(f"  CHECK victim delta={victim_score['delta']} (expected 0)")
            assert victim_score["delta"] == 0, f"Expected victim delta=0, got {victim_score['delta']}"

        # ── ROUND 2: No new infections, check survivor points ─────────────────
        print("\n>> Advancing to round 2...")
        await next_round(c, group_id)

        print(">> ROUND 2: No trades, just end the round")
        result = await finish_round(c, group_id)
        scores = result.get("scores", [])
        print(f"  Round 2 scores:")
        for s in scores:
            print(f"    {s['username']:15s}  delta={s['delta']}  total={s['score']}  zombie={s['is_zombie']}")

        # Validate: zombie should NOT get more infection points (no new infections)
        zombie_score_r2 = next((s for s in scores if s["player_id"] == zombie_player["id"]), None)
        if zombie_score_r2:
            print(f"  CHECK zombie delta={zombie_score_r2['delta']} (expected 0, no new infections)")
            assert zombie_score_r2["delta"] == 0, f"Expected zombie delta=0 in round 2, got {zombie_score_r2['delta']}"

        # Validate: surviving survivors get +1
        for sp in survivor_players[1:]:  # skip victim (infected)
            sp_score = next((s for s in scores if s["player_id"] == sp["id"]), None)
            if sp_score:
                print(f"  CHECK {sp_score['username']} delta={sp_score['delta']} (expected 1)")
                assert sp_score["delta"] == 1, f"Expected survivor delta=1, got {sp_score['delta']}"

        state = await get_state(c, group_id)
        print_scores(state, "AFTER ROUND 2")

        # ── ROUND 3 (Final): Survivors get bonus ──────────────────────────────
        print("\n>> Advancing to round 3 (final)...")
        await next_round(c, group_id)

        print(">> ROUND 3: Final round - survivors get +2 bonus")
        result = await finish_round(c, group_id)
        scores = result.get("scores", [])
        print(f"  Round 3 scores:")
        for s in scores:
            print(f"    {s['username']:15s}  delta={s['delta']}  total={s['score']}  zombie={s['is_zombie']}")

        # Validate: survivors get +1 (survive) but NOT +2 (final round bonus is checked at is_final_round)
        # is_final is true when current_round >= 3 — should be true now
        for sp in survivor_players[1:]:
            sp_score = next((s for s in scores if s["player_id"] == sp["id"]), None)
            if sp_score and not sp_score["is_zombie"]:
                print(f"  CHECK {sp_score['username']} delta={sp_score['delta']} (expected 3: 1+2 final)")
                assert sp_score["delta"] == 3, f"Expected survivor delta=3 in final round, got {sp_score['delta']}"

        state = await get_state(c, group_id)
        print_scores(state, "AFTER ROUND 3 (FINAL)")

        # ── End game and get recap ────────────────────────────────────────────
        print("\n>> Advancing past round 3 -> end_game")
        await next_round(c, group_id)

        print(">> Fetching recap...")
        recap = await get_recap(c, group_id)
        print_podium(recap)

        # Final summary
        print("=" * 60)
        print("  ALL ASSERTIONS PASSED!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
