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
    use_local = input("Usar servidor local (127.0.0.1:8000)? (s/n): ").lower()
    if use_local == 's':
        API = "http://127.0.0.1:8000"
    else:
        API = input("Digite a URL do backend (ex: https://zombie-attack-backend.onrender.com): ")

if API.endswith('/'):
    API = API[:-1]

# Derive WS_API from API URL
WS_BASE = API.replace("http", "ws")
WS_API = f"{WS_BASE}/api/game/ws"
PIN = "1234"

print(f"\n[CONFIG] API: {API}")
print(f"[CONFIG] WS: {WS_API}\n")

async def bot_flow(bot_id, join_code):
    # Stagger bot creation slightly to prevent SQLite database locking
    await asyncio.sleep(bot_id * 0.5)
    
    username = f"bot_{bot_id}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.post(f"{API}/auth/register", json={"username": username, "pin": PIN})
        except: pass
        
        login = await client.post(f"{API}/auth/login", json={"username": username, "pin": PIN})
        if login.status_code != 200:
            print(f"[{username}] Erro de login:", login.text)
            return
            
        token = login.json().get("access_token")
        
        join = await client.post(f"{API}/player/join?token={token}", json={"join_code": join_code})
        if join.status_code != 200:
            print(f"[{username}] Falhou ao entrar:", join.text)
            return
            
        data = join.json()
        group_id = data["group_id"]
        player_id = data["player_id"]
        
        print(f"[{username}] No Lobby. Aguardando a professora dar Matchmaking...")
        
        uri = f"{WS_API}/{group_id}/{player_id}"
        current_group = group_id
        try:
            async with websockets.connect(uri) as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("type") == "MATCHMAKING_COMPLETE":
                        print(f"[{username}] MATCHMAKING recebido!")
                        await asyncio.sleep(1) # wait for backend to commit updates
                        
                        new_g = (await client.get(f"{API}/player/{player_id}/group")).json()
                        current_group = new_g['group_id']
                        await asyncio.sleep(1)
                        
                        await client.post(f"{API}/api/game/{current_group}/ready", json={"player_id": player_id})
                        print(f"[{username}] READY para o jogo!")
                        break
        except Exception as e:
            pass
            
        # Connect to the new game group websocket
        uri = f"{WS_API}/{current_group}/{player_id}"
        try:
            async with websockets.connect(uri) as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    msg_type = data.get("type")
                    
                    if msg_type == "GAME_STARTED" or msg_type == "SLIDE_ADVANCED":
                        await asyncio.sleep(2)
                        await client.post(f"{API}/api/game/{current_group}/slide_ready", json={"player_id": player_id})
                        print(f"[{username}] Leu o slide.")
                    
                    elif msg_type == "ROUND_STARTED":
                        await asyncio.sleep(5)
                        await client.post(f"{API}/api/game/{current_group}/trade_done", json={"player_id": player_id})
                        print(f"[{username}] Troca finalizada.")
                        
                    elif msg_type == "ROUND_ENDED":
                        await asyncio.sleep(3)
                        await client.post(f"{API}/api/game/{current_group}/next_round")
                        print(f"[{username}] Pronto pro próximo round.")
                        
                    elif msg_type == "GAME_ENDED":
                        print(f"[{username}] Fim de jogo!")
                        break
        except Exception as e:
            pass
            
async def main():
    if len(sys.argv) < 2:
        join_code = input("Digite o JOIN CODE da sala da professora (ex: ABCD): ")
    else:
        join_code = sys.argv[1]
        
    print(f"Iniciando 18 jogadores bot para a sala {join_code}...")
    tasks = [bot_flow(i, join_code.strip()) for i in range(1, 19)]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
