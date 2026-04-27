import httpx
import websockets
import asyncio
import json

API = "http://localhost:8000"
WS_API = "ws://localhost:8000/api/game/ws"
PIN = "1234"

async def test_bot(join_code):
    username = "test_bot_1"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(f"{API}/auth/register", json={"username": username, "pin": PIN})
        except: pass
        login = await client.post(f"{API}/auth/login", json={"username": username, "pin": PIN})
        token = login.json().get("access_token")
        
        join = await client.post(f"{API}/player/join?token={token}", json={"join_code": join_code})
        data = join.json()
        group_id = data["group_id"]
        player_id = data["player_id"]
        
        uri = f"{WS_API}/{group_id}/{player_id}"
        print("URI:", uri)
        
        try:
            async with websockets.connect(uri) as ws:
                print("CONNECTED!")
                await ws.send("hello")
        except Exception as e:
            print("ERROR", type(e), e)

if __name__ == "__main__":
    asyncio.run(test_bot("QPNJN6"))
