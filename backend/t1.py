from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app, raise_server_exceptions=False)
r = c.get("/api/health")
print("health:", r.status_code, r.json())
r = c.get("/api/provider")
print("provider:", r.status_code, r.json())
r = c.post("/api/chat", json={"message": "   ", "conversation_id": "abc"})
print("empty:", r.status_code, r.json())
r = c.post("/api/chat", json={"message": "x" * 6000})
print("too long:", r.status_code, r.json())
r = c.post("/api/chat", json={"message": "What is BIS?"})
print("no key:", r.status_code, r.json())
r = c.get("/api/nope")
print("404:", r.status_code, r.json())
