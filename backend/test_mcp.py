"""
test_mcp.py
───────────
Phase 3 MCP integration smoke test.

Tests the /mcp endpoint by sending properly-formed MCP Streamable HTTP requests
and printing results. The MCP SDK sends responses as SSE (Server-Sent Events)
when the client includes 'text/event-stream' in the Accept header.

Run with the backend server already running:
    python test_mcp.py
"""

import io
import json
import sys

import requests

# Force UTF-8 output so emoji work on Windows cp1252 terminals
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8000/mcp"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}

PASS = "✅"
FAIL = "❌"
results = []


def _parse_sse(text: str) -> dict:
    """Extract the JSON object from an SSE 'data: ...' line."""
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            return json.loads(line[5:].strip())
    raise ValueError(f"No SSE data line found in:\n{text!r}")


# ── Test 1: initialize ────────────────────────────────────────────────────────
print("\n=== Test 1: MCP initialize ===")
r_init = requests.post(BASE, json={
    "jsonrpc": "2.0", "id": 1, "method": "initialize",
    "params": {
        "protocolVersion": "2025-03-26",
        "capabilities": {},
        "clientInfo": {"name": "test-client", "version": "1.0"},
    },
}, headers=HEADERS, timeout=10)

session_id = r_init.headers.get("mcp-session-id", "")
ct = r_init.headers.get("content-type", "")
raw = r_init.text.strip()

if "event-stream" in ct:
    body = _parse_sse(raw)
else:
    body = r_init.json() if raw else {}

ok = r_init.status_code == 200 and "result" in body and session_id
print(f"  HTTP status:      {r_init.status_code}")
print(f"  Session ID:       {session_id[:16]}..." if session_id else "  Session ID: MISSING")
print(f"  Server name:      {body.get('result',{}).get('serverInfo',{}).get('name','?')}")
print(f"  Protocol version: {body.get('result',{}).get('protocolVersion','?')}")
print(f"  {PASS if ok else FAIL} initialize {'PASSED' if ok else 'FAILED'}")
results.append(("initialize", ok))

# Send notifications/initialized (required by protocol)
requests.post(BASE, json={"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}},
              headers={**HEADERS, "mcp-session-id": session_id}, timeout=5)

# ── Test 2: tools/list ────────────────────────────────────────────────────────
print("\n=== Test 2: tools/list ===")
r2 = requests.post(BASE, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
                   headers={**HEADERS, "mcp-session-id": session_id}, timeout=10)
ct2 = r2.headers.get("content-type", "")
raw2 = r2.text.strip()
body2 = _parse_sse(raw2) if "event-stream" in ct2 else (r2.json() if raw2 else {})

tools = body2.get("result", {}).get("tools", [])
tool_names = [t["name"] for t in tools]
expected = {"get_system_status", "get_agent_capabilities", "get_eldercare_guidance"}
ok2 = r2.status_code == 200 and expected == set(tool_names)
print(f"  HTTP status: {r2.status_code}")
print(f"  Tools found: {tool_names}")
print(f"  {PASS if ok2 else FAIL} tools/list {'PASSED' if ok2 else 'FAILED'}")
results.append(("tools/list", ok2))

# ── Tool call helper ──────────────────────────────────────────────────────────
def call_tool(call_id: int, name: str, arguments: dict) -> tuple[bool, str]:
    r = requests.post(BASE, json={
        "jsonrpc": "2.0", "id": call_id, "method": "tools/call",
        "params": {"name": name, "arguments": arguments},
    }, headers={**HEADERS, "mcp-session-id": session_id}, timeout=10)
    ct = r.headers.get("content-type", "")
    raw = r.text.strip()
    body = _parse_sse(raw) if "event-stream" in ct else (r.json() if raw else {})
    result = body.get("result", {})
    is_error = result.get("isError", False)
    content = result.get("content", [{}])
    text = content[0].get("text", "") if content else ""
    ok = r.status_code == 200 and not is_error and bool(text)
    return ok, text

# ── Test 3: get_system_status ─────────────────────────────────────────────────
print("\n=== Test 3: tools/call get_system_status ===")
ok3, text3 = call_tool(3, "get_system_status", {})
data3 = json.loads(text3) if text3 else {}
print(f"  service: {data3.get('service','?')}")
print(f"  model:   {data3.get('model','?')}")
print(f"  agents:  {data3.get('registered_agents','?')}")
print(f"  {PASS if ok3 else FAIL} get_system_status {'PASSED' if ok3 else 'FAILED'}")
results.append(("get_system_status", ok3))

# ── Test 4: get_agent_capabilities ───────────────────────────────────────────
print("\n=== Test 4: tools/call get_agent_capabilities ===")
ok4, text4 = call_tool(4, "get_agent_capabilities", {})
data4 = json.loads(text4) if text4 else {}
agents = [a["name"] for a in data4.get("agents", [])]
print(f"  agents: {agents}")
print(f"  {PASS if ok4 else FAIL} get_agent_capabilities {'PASSED' if ok4 else 'FAILED'}")
results.append(("get_agent_capabilities", ok4))

# ── Test 5: get_eldercare_guidance (all three topics) ────────────────────────
for call_id, topic in [(5, "health"), (6, "medicine"), (7, "wellbeing")]:
    print(f"\n=== Test {call_id}: get_eldercare_guidance(topic='{topic}') ===")
    ok, text = call_tool(call_id, "get_eldercare_guidance", {"topic": topic})
    has_disclaimer = "IMPORTANT" in text
    print(f"  Length: {len(text)} chars")
    print(f"  Has disclaimer: {has_disclaimer}")
    print(f"  Preview: {text[:100].replace(chr(10),' ')}...")
    ok_full = ok and has_disclaimer
    print(f"  {PASS if ok_full else FAIL} get_eldercare_guidance/{topic} {'PASSED' if ok_full else 'FAILED'}")
    results.append((f"get_eldercare_guidance/{topic}", ok_full))

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "═" * 50)
print("SUMMARY")
print("═" * 50)
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)
for name, ok in results:
    print(f"  {PASS if ok else FAIL}  {name}")
print(f"\n  {passed}/{len(results)} tests passed")
sys.exit(0 if failed == 0 else 1)
