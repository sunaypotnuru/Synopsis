import httpx
import asyncio
import os
from datetime import datetime


async def keep_alive():
    """Keep Render instance warm (free tier)."""
    # Use the environment variable or default to the production URL
    server_url = os.getenv("SERVER_URL", "https://netra-ai-mcp.onrender.com")

    print(f"🔥 Heartbeat started for {server_url}")

    while True:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Ping the health endpoint
                response = await client.get(f"{server_url}/health")
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"✅ [{timestamp}] Heartbeat: {response.status_code}")
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"❌ [{timestamp}] Heartbeat failed: {e}")

        # Ping every 10 minutes (Render sleeps after 15 min inactivity)
        await asyncio.sleep(600)


if __name__ == "__main__":
    try:
        asyncio.run(keep_alive())
    except KeyboardInterrupt:
        print("🛑 Heartbeat stopped by user")
