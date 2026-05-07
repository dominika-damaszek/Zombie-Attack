import asyncio
import httpx
import websockets
import json
import sys
import os

# Configuration
API = os.getenv("API_URL")
if not API:
    print("--- ZOMBIEWARE BOT SETUP ---")
    use_local = input("Use local server (127.0.0.1:8000)? (y/n): ").lower()
    if use_local == 'y':
        API = "http://127.0.0.1:8000"
    else:
        API = input("Enter backend URL (e.g. https://your-backend.com): ")

if API.endswith('/'):
    API = API[:-1]

WS_BASE = API.replace("http", "ws")
WS_API = f"{WS_BASE}/api/game/ws"
PIN = "1234"

print(f"\n[CONFIG] API: {API}")
print(f"[CONFIG] WS: {WS_API}\n")

# All 54 physical card QR codes, in a fixed order so each bot gets a unique slice.
# With 54 cards and 4 per bot, up to 13 bots get fully unique cards.
# Bots 14+ wrap around; conflicts are handled gracefully (skip to next available card).
ALL_CARD_CODES = [
    'QRC-1M8Z4K7Q', 'QRC-1P9V4T3H', 'QRC-1Q7W9L3F', 'QRC-1R7V4K9H',
    'QRC-1V3M9R7K', 'QRC-1X5T7N8J', 'QRC-2H6P9X4T', 'QRC-2J3K9W7P',
    'QRC-2K5W9R7D', 'QRC-2R7Y6F9K', 'QRC-2W7M5Q3H', 'QRC-2X8V3L7H',
    'QRC-3L1Y6K8P', 'QRC-3N8P4R6K', 'QRC-3P7K8V1D', 'QRC-3T8M2Y6P',
    'QRC-3X9N4B8F', 'QRC-4L9B2Q6Y', 'QRC-4M9K1T5D', 'QRC-4P6X1N9J',
    'QRC-4R8N6L1Y', 'QRC-4T8M1L3P', 'QRC-4X7P3N8V', 'QRC-5H1V8N4P',
    'QRC-5J1T7K2P', 'QRC-5M7Q2T8H', 'QRC-5Q3T4K7D', 'QRC-5Q7L3V9K',
    'QRC-5R7B9M2W', 'QRC-5Y2L7Q9X', 'QRC-6K2W8R5L', 'QRC-6N8Q5P1D',
    'QRC-6N9X2L5B', 'QRC-6V4X2K8J', 'QRC-6Y3P8T1D', 'QRC-7D3L9W2X',
    'QRC-7K2T8L4Y', 'QRC-7N2X6Q5J', 'QRC-7P2N6Y8R', 'QRC-7V3K1M8F',
    'QRC-7X5M2Q8D', 'QRC-8B6T1V4M', 'QRC-8D4R9V6L', 'QRC-8F2K9L1M',
    'QRC-8J4Q1T3M', 'QRC-8R1D5N7W', 'QRC-8T5Q4N1J', 'QRC-8V1P4Y6N',
    'QRC-9B6T2R5Y', 'QRC-9D1M5T7H', 'QRC-9H4X7T2V', 'QRC-9N4F1X7J',
    'QRC-9Q6L2M5W', 'QRC-9W2M4R6H',
]


async def get_game_state(client, group_id):
    try:
        res = await client.get(f"{API}/api/game/{group_id}/state")
        return res.json()
    except Exception:
        return {}


async def scan_initial_cards(client, group_id, player_id, bot_id, username):
    """Scan 4 physical cards during the initial-scan phase.

    Each bot starts from a unique offset in ALL_CARD_CODES so cards don't
    collide.  If a card is already claimed (409), the bot tries the next one
    in the full list until it has scanned 4.
    """
    start_idx = ((bot_id - 1) * 4) % len(ALL_CARD_CODES)
    scanned = 0
    tried = 0

    while scanned < 4 and tried < len(ALL_CARD_CODES):
        card_code = ALL_CARD_CODES[(start_idx + tried) % len(ALL_CARD_CODES)]
        tried += 1
        try:
            r = await client.post(
                f"{API}/api/game/{group_id}/initial_scan",
                json={"player_id": player_id, "card_code": card_code},
            )
            if r.status_code == 200:
                data = r.json()
                scanned = data.get("initial_cards_scanned", scanned + 1)
                print(f"[{username}] Scanned {card_code} ({data.get('card_type','?')}) "
                      f"→ {data.get('initial_cards_scanned', '?')}/4")
            elif r.status_code == 409:
                # Card already owned by another player — skip silently
                pass
            elif r.status_code == 400 and "already scanned 4" in r.text:
                print(f"[{username}] Already has 4 cards, stopping scan.")
                break
            elif r.status_code == 400 and "Not in scan phase" in r.text:
                print(f"[{username}] Not in scan phase, skipping card scan.")
                break
            else:
                print(f"[{username}] Scan {card_code} → {r.status_code}: {r.text[:80]}")
        except Exception as e:
            print(f"[{username}] Scan error: {e}")
        await asyncio.sleep(0.2)

    print(f"[{username}] Initial scan done: {scanned}/4 cards claimed.")


async def bot_flow(bot_id, join_code):
    await asyncio.sleep(bot_id * 0.3)

    username = f"bot_{bot_id}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Register / Login
        try:
            await client.post(f"{API}/auth/register", json={"username": username, "pin": PIN})
        except Exception:
            pass

        login = await client.post(f"{API}/auth/login", json={"username": username, "pin": PIN})
        if login.status_code != 200:
            print(f"[{username}] Login error: {login.text}")
            return

        token = login.json().get("access_token")

        join = await client.post(f"{API}/player/join?token={token}", json={"join_code": join_code})
        if join.status_code != 200:
            print(f"[{username}] Failed to join: {join.text}")
            return

        data = join.json()
        lobby_group_id = data["group_id"]
        player_id = data["player_id"]

        print(f"[{username}] In lobby. Waiting for matchmaking...")

        # ── Phase 1: Wait for MATCHMAKING_COMPLETE in lobby ──────────────────
        current_group = lobby_group_id
        uri = f"{WS_API}/{lobby_group_id}/{player_id}"
        try:
            async with websockets.connect(uri) as ws:
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=300)
                    data = json.loads(msg)
                    if data.get("type") == "MATCHMAKING_COMPLETE":
                        print(f"[{username}] Matchmaking complete!")
                        await asyncio.sleep(1)

                        # Get assigned group
                        new_g = (await client.get(f"{API}/player/{player_id}/group")).json()
                        current_group = new_g["group_id"]
                        await asyncio.sleep(0.5)

                        # Press the Ready button in the waiting room
                        r = await client.post(
                            f"{API}/api/game/{current_group}/ready",
                            json={"player_id": player_id}
                        )
                        print(f"[{username}] Pressed Ready! (waiting room) → {r.status_code}")
                        break
        except Exception as e:
            print(f"[{username}] Lobby WS error: {e}")
            return

        # ── Phase 2: Connect to assigned group WS ────────────────────────────
        uri = f"{WS_API}/{current_group}/{player_id}"
        try:
            async with websockets.connect(uri) as ws:
                # Check current state immediately — game may have already started
                state = await get_game_state(client, current_group)
                current_state = state.get("game_state", "lobby")

                if current_state == "module_instructions":
                    # Try scanning cards first if not yet done
                    me = next((p for p in state.get("players", []) if p["id"] == player_id), None)
                    if me and me.get("initial_cards_scanned", 0) < 4:
                        await asyncio.sleep(1)
                        await scan_initial_cards(client, current_group, player_id, bot_id, username)
                        await asyncio.sleep(0.5)
                    # Then press slide_ready for the current slide
                    r = await client.post(
                        f"{API}/api/game/{current_group}/slide_ready",
                        json={"player_id": player_id}
                    )
                    print(f"[{username}] Caught up: slide_ready (slide {state.get('instruction_slide', 0)}) → {r.status_code}")

                elif current_state == "round_active":
                    await asyncio.sleep(3)
                    r = await client.post(
                        f"{API}/api/game/{current_group}/trade_done",
                        json={"player_id": player_id}
                    )
                    print(f"[{username}] Caught up: trade_done → {r.status_code}")

                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=600)
                    data = json.loads(msg)
                    msg_type = data.get("type")

                    if msg_type == "GAME_STARTED":
                        # Scan 4 cards, then acknowledge the first instruction slide
                        await asyncio.sleep(1.5)
                        await scan_initial_cards(client, current_group, player_id, bot_id, username)
                        await asyncio.sleep(0.5)
                        r = await client.post(
                            f"{API}/api/game/{current_group}/slide_ready",
                            json={"player_id": player_id}
                        )
                        print(f"[{username}] GAME_STARTED → scanned + slide_ready → {r.status_code}")

                    elif msg_type == "SLIDE_ADVANCED":
                        slide = data.get("slide", 0)
                        await asyncio.sleep(1.5)
                        # Check if we still need to scan cards (scan slide in the middle)
                        state = await get_game_state(client, current_group)
                        me = next((p for p in state.get("players", []) if p["id"] == player_id), None)
                        if me and me.get("initial_cards_scanned", 0) < 4:
                            await scan_initial_cards(client, current_group, player_id, bot_id, username)
                            await asyncio.sleep(0.5)
                        r = await client.post(
                            f"{API}/api/game/{current_group}/slide_ready",
                            json={"player_id": player_id}
                        )
                        print(f"[{username}] SLIDE_ADVANCED (slide {slide}) → slide_ready → {r.status_code}")

                    elif msg_type == "ROUND_STARTED":
                        await asyncio.sleep(5)
                        r = await client.post(
                            f"{API}/api/game/{current_group}/trade_done",
                            json={"player_id": player_id}
                        )
                        print(f"[{username}] ROUND_STARTED → trade_done → {r.status_code}")

                    elif msg_type == "ROUND_ENDED":
                        await asyncio.sleep(3)
                        r = await client.post(
                            f"{API}/api/game/{current_group}/next_round"
                        )
                        print(f"[{username}] ROUND_ENDED → next_round → {r.status_code}")

                    elif msg_type == "GAME_ENDED":
                        print(f"[{username}] Game ended!")
                        break

                    elif msg_type == "SESSION_TERMINATED":
                        print(f"[{username}] Session terminated by teacher.")
                        break

        except asyncio.TimeoutError:
            print(f"[{username}] Timed out waiting for game events.")
        except Exception as e:
            print(f"[{username}] Game WS error: {e}")


async def main():
    if len(sys.argv) < 2:
        join_code = input("Enter the lobby JOIN CODE (e.g. ABCD12): ")
    else:
        join_code = sys.argv[1]

    num_bots = 18
    if len(sys.argv) >= 3:
        try:
            num_bots = int(sys.argv[2])
        except ValueError:
            pass

    print(f"Starting {num_bots} bot players for room {join_code.strip()}...")
    tasks = [bot_flow(i, join_code.strip()) for i in range(1, num_bots + 1)]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
