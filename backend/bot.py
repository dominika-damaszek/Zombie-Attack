import asyncio
import httpx
import websockets
import json
import sys

# ALWAYS use 127.0.0.1 on Windows to prevent Python WebSockets from resolving ::1 and getting 404s
API = "http://127.0.0.1:8000"
WS_API = "ws://127.0.0.1:8000/api/game/ws"
PIN = "1234"

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
        try:
            async with websockets.connect(uri) as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("type") == "MATCHMAKING_COMPLETE":
                        print(f"[{username}] MATCHMAKING recebido!")
                        await asyncio.sleep(1) # wait for backend to commit updates
                        
                        new_g = (await client.get(f"{API}/player/{player_id}/group")).json()
                        await asyncio.sleep(1)
                        
                        await client.post(f"{API}/api/game/{new_g['group_id']}/ready", json={"player_id": player_id})
                        print(f"[{username}] READY!")
                        break
        except Exception as e:
            # WebSocket could close on matchmaking redirect, just ignore it gracefully.
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
