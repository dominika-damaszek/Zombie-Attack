import httpx
import asyncio

async def test():
    API = "http://localhost:8000"
    # register a test teacher
    await httpx.post(f"{API}/auth/register", json={"username": "teacher_bot_404", "pin": "1234"})
    login = await httpx.post(f"{API}/auth/login", json={"username": "teacher_bot_404", "pin": "1234"})
    token = login.json().get("access_token")
    
    # create session
    res = await httpx.post(f"{API}/session?token={token}", json={"game_mode": "normal"})
    data = res.json()
    print("SESSION RESPONSE:", data)
    
if __name__ == "__main__":
    asyncio.run(test())
