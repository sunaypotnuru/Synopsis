"""
NetraAI Full Health Check Script
Checks all 6 HF Spaces + MCP internal tool health
"""
import urllib.request
import urllib.error
import json
import os
import time

from dotenv import load_dotenv

load_dotenv() # Load variables from .env file

# ─────────────────────────────────────────────
# Service definitions
# ─────────────────────────────────────────────
ML_SERVICES = {
    "Netra Anemia":       "https://sunay-potnuru-netra-anemia.hf.space",
    "Netra Cataract":     "https://sunay-potnuru-netra-cataract.hf.space",
    "Netra DR":           "https://sunay-potnuru-netra-dr.hf.space",
    "Netra Mental":       "https://sunay-potnuru-netra-mental.hf.space",
    "Netra Parkinson's":  "https://sunay-potnuru-netra-parkinsons-screening.hf.space",
    "Netra MCP Server":   "https://sunay-potnuru-netra-mcp-server.hf.space",
}

MCP_BASE = "https://sunay-potnuru-netra-mcp-server.hf.space"
MCP_API_KEY = os.getenv("MCP_API_KEY", "")


TIMEOUT = 30  # HF Spaces can be slow to wake up

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def get(url, headers=None, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}

def post(url, payload, headers=None, timeout=TIMEOUT):
    data = json.dumps(payload).encode()
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, json.loads(body) if body else {}
    except Exception as ex:
        return 0, {"error": str(ex)}

def status_icon(code):
    if code == 200:  return "✅"
    if code == 401:  return "🔑"
    if code == 500:  return "💥"
    if code == 503:  return "⏳"
    if code == 0:    return "❌"
    return "⚠️"

# ─────────────────────────────────────────────
# 1. ML Service Health Checks
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("  NETRA AI — FULL HEALTH CHECK")
print("="*60)
print(f"\n{'Service':<25} {'Status':>6}  {'Response'}")
print("-"*60)

results = {}
for name, base_url in ML_SERVICES.items():
    code, body = get(f"{base_url}/health")
    icon = status_icon(code)
    svc_status = body.get("status", body.get("error", "no body"))
    model_loaded = body.get("model_loaded", "N/A")
    print(f"{icon} {name:<23} [{code}]  status={svc_status}  model_loaded={model_loaded}")
    results[name] = code

# ─────────────────────────────────────────────
# 2. MCP Agent Card (A2A Discovery)
# ─────────────────────────────────────────────
print("\n" + "-"*60)
print("  MCP AGENT CARD (A2A Discovery)")
print("-"*60)
code, body = get(f"{MCP_BASE}/.well-known/agent-card.json")
icon = status_icon(code)
agent_name = body.get("name", body.get("error", "N/A"))
print(f"{icon} Agent Card      [{code}]  name={agent_name}")

# ─────────────────────────────────────────────
# 3. MCP Tool: health_check_tool (API Key test)
# ─────────────────────────────────────────────
print("\n" + "-"*60)
print("  MCP TOOL CALL — health_check_tool")
print("-"*60)
if MCP_API_KEY:
    headers = {"X-API-Key": MCP_API_KEY}
    code, body = post(
        f"{MCP_BASE}/tools/call",
        {"name": "health_check_tool", "arguments": {}},
        headers=headers
    )
    icon = status_icon(code)
    print(f"{icon} health_check_tool [{code}]  response={body}")
else:
    print("⚠️  MCP_API_KEY not set — skipping tool call test")
    print("   Set env var: MCP_API_KEY=your_key and rerun")

# ─────────────────────────────────────────────
# 3b. MCP Tool: diagnose_anemia_tool (E2E Connectivity)
# ─────────────────────────────────────────────
print("\n" + "-"*60)
print("  MCP E2E CONNECTIVITY — diagnose_anemia_tool")
print("-"*60)
if MCP_API_KEY:
    headers = {"X-API-Key": MCP_API_KEY}
    # Using a dummy URL to test connectivity - ML service should return an error, but the connection should succeed
    code, body = post(
        f"{MCP_BASE}/tools/call",
        {
            "name": "diagnose_anemia_tool", 
            "arguments": {
                "image_url": "https://example.com/dummy.jpg",
                "patient_id": "test-patient"
            }
        },
        headers=headers
    )
    icon = status_icon(code)
    # We expect a 200 OK from MCP, and a structured OperationOutcome inside indicating an image error
    is_success = code == 200 and "resourceType" in body
    print(f"{'✅' if is_success else '❌'} diagnose_anemia_tool [{code}]  response={str(body)[:150]}...")
    if is_success:
        print("   ↳ SUCCESS: MCP successfully routed the request to the Anemia ML service!")
else:
    print("⚠️  MCP_API_KEY not set — skipping E2E test")

# ─────────────────────────────────────────────
# 4. Summary
# ─────────────────────────────────────────────
print("\n" + "="*60)
passing = sum(1 for c in results.values() if c == 200)
total = len(results)
print(f"  SUMMARY: {passing}/{total} ML services healthy")
if passing == total:
    print("  🎉 All systems operational!")
else:
    failing = [n for n, c in results.items() if c != 200]
    print(f"  ⚠️  Failing: {', '.join(failing)}")
print("="*60 + "\n")
