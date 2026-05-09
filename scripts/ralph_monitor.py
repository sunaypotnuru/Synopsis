import httpx
import asyncio
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [RALPH-MONITOR] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SERVICES = {
    "Core Service": "http://localhost:8000/health",
    "Anemia Service": "http://localhost:8001/health",
    "DR Service": "http://localhost:8002/health",
    "Mental Health Service": "http://localhost:8003/health",
    "Parkinson's Service": "http://localhost:8004/health",
    "Cataract Service": "http://localhost:8005/health",
    "Chatbot Service": "http://localhost:8006/health",
    "Emergency Service": "http://localhost:8007/health"
}

async def check_health(name, url):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                logger.info(f"✅ {name:25} - ONLINE (Port {url.split(':')[-1].split('/')[0]})")
                return True
            else:
                logger.error(f"❌ {name:25} - ERROR {resp.status_code}")
                return False
    except Exception as e:
        logger.error(f"⚠️  {name:25} - UNREACHABLE (Cold)")
        return False

async def main():
    print("\n" + "="*60)
    print("🤖 NETRA AI - RALPH MICROSERVICE MONITOR")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    tasks = [check_health(name, url) for name, url in SERVICES.items()]
    results = await asyncio.gather(*tasks)
    
    online_count = sum(results)
    print("\n" + "="*60)
    print(f"SUMMARY: {online_count}/{len(SERVICES)} Services Online")
    
    if online_count == len(SERVICES):
        print("🎉 STATUS: ALL SYSTEMS OPERATIONAL")
    elif online_count == 0:
        print("🚨 STATUS: TOTAL SYSTEM BLACKOUT")
    else:
        print("⚠️  STATUS: PARTIAL SYSTEM DEGRADATION")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logger.error(f"Monitor crashed: {e}")
        sys.exit(1)
