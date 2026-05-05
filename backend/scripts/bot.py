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


async def get_game_state(client, group_id):
    try:
        res = await client.get(f"{API}/api/game/{group_id}/state")
        return res.json()
    except Exception:
        return {}


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
                # Check current state immediately after connecting — the game
                # may have already started if all bots pressed ready simultaneously.
                state = await get_game_state(client, current_group)
                current_state = state.get("game_state", "lobby")

                if current_state == "module_instructions":
                    # Game already started; press slide_ready for the current slide
                    await asyncio.sleep(1)
                    r = await client.post(
                        f"{API}/api/game/{current_group}/slide_ready",
                        json={"player_id": player_id}
                    )
                    print(f"[{username}] Caught up: pressed slide_ready (slide {state.get('instruction_slide', 0)}) → {r.status_code}")
                elif current_state == "round_active":
                    await asyncio.sleep(3)
                    r = await client.post(
                        f"{API}/api/game/{current_group}/trade_done",
                        json={"player_id": player_id}
                    )
                    print(f"[{username}] Caught up: marked trade done → {r.status_code}")

                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=600)
                    data = json.loads(msg)
                    msg_type = data.get("type")

                    if msg_type == "GAME_STARTED":
                        # Game just started — acknowledge the first instruction slide
                        await asyncio.sleep(2)
                        r = await client.post(
                            f"{API}/api/game/{current_group}/slide_ready",
                            json={"player_id": player_id}
                        )
                        print(f"[{username}] GAME_STARTED → slide_ready → {r.status_code}")

                    elif msg_type == "SLIDE_ADVANCED":
                        # Each new slide needs a ready confirmation
                        await asyncio.sleep(2)
                        r = await client.post(
                            f"{API}/api/game/{current_group}/slide_ready",
                            json={"player_id": player_id}
                        )
                        print(f"[{username}] SLIDE_ADVANCED (slide {data.get('slide')}) → slide_ready → {r.status_code}")

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
