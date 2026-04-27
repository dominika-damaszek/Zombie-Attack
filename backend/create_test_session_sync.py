import httpx
import json

API = "http://localhost:8000"

def test():
    client = httpx.Client()
    try:
        client.post(f"{API}/auth/register", json={"username": "teacher_bot_404_2", "pin": "1234"})
    except: pass
    
    login = client.post(f"{API}/auth/login", json={"username": "teacher_bot_404_2", "pin": "1234"})
    token = login.json().get("access_token")
    
    # create session
    res = client.post(f"{API}/session?token={token}", json={"game_mode": "normal"})
    data = res.json()
    print("SESSION RESPONSE:", data)
    
    # Get Lobby join code!
    groups = data.get("groups", [])
    if groups:
        print("Lobby code:", groups[0].get("join_code"))
    else:
        print("No groups found in session!")
    
if __name__ == "__main__":
    test()
