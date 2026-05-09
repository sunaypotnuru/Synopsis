#!/bin/bash

# SHARP-on-MCP Compliance Test Script
# Tests all SHARP-on-MCP requirements for Agents Assemble Hackathon

set -e

echo "🧪 SHARP-on-MCP Compliance Test Suite"
echo "======================================"
echo ""

# Configuration
BASE_URL="${MCP_SERVER_URL:-http://localhost:8080}"
API_KEY="${MCP_API_KEY:-test-api-key-12345}"
FHIR_SERVER="https://hapi.fhir.org/baseR4"
PATIENT_ID="example"

echo "📋 Test Configuration:"
echo "  Base URL: $BASE_URL"
echo "  FHIR Server: $FHIR_SERVER"
echo "  Patient ID: $PATIENT_ID"
echo ""

# Test 1: Agent Card Discovery
echo "Test 1: Agent Card Discovery"
echo "----------------------------"
response=$(curl -s "$BASE_URL/.well-known/agent-card.json")
if echo "$response" | jq -e '.name' > /dev/null 2>&1; then
    echo "✅ Agent card accessible at /.well-known/agent-card.json"
    echo "   Name: $(echo "$response" | jq -r '.name')"
    echo "   Version: $(echo "$response" | jq -r '.version')"
else
    echo "❌ Agent card not accessible or invalid JSON"
    exit 1
fi
echo ""

# Test 2: Skills Array
echo "Test 2: Skills Array with Keywords"
echo "-----------------------------------"
skills_count=$(echo "$response" | jq '.skills | length')
if [ "$skills_count" -ge 5 ]; then
    echo "✅ Agent card has $skills_count skills"
    echo "$response" | jq -r '.skills[] | "   - \(.name): \(.keywords | join(", "))"'
else
    echo "❌ Agent card has insufficient skills (found: $skills_count, expected: ≥5)"
    exit 1
fi
echo ""

# Test 3: FHIR Capabilities
echo "Test 3: FHIR Capabilities Declaration"
echo "--------------------------------------"
supports_fhir=$(echo "$response" | jq -r '.capabilities.supportsFHIRContext')
supports_sharp=$(echo "$response" | jq -r '.capabilities.supportsSHARP')
if [ "$supports_fhir" = "true" ] && [ "$supports_sharp" = "true" ]; then
    echo "✅ FHIR context support declared"
    echo "   supportsFHIRContext: $supports_fhir"
    echo "   supportsSHARP: $supports_sharp"
else
    echo "❌ FHIR capabilities not properly declared"
    exit 1
fi
echo ""

# Test 4: FHIR Scopes
echo "Test 4: FHIR Scopes Declaration"
echo "--------------------------------"
scopes_count=$(echo "$response" | jq '.capabilities.fhirScopes | length')
if [ "$scopes_count" -ge 3 ]; then
    echo "✅ FHIR scopes declared ($scopes_count scopes)"
    echo "$response" | jq -r '.capabilities.fhirScopes[] | "   - \(.)"'
else
    echo "❌ Insufficient FHIR scopes (found: $scopes_count, expected: ≥3)"
    exit 1
fi
echo ""

# Test 5: Experimental Capabilities
echo "Test 5: Experimental SHARP Capability"
echo "--------------------------------------"
sharp_capability=$(echo "$response" | jq -r '.capabilities.experimental."ai.promptopinion/fhir-context".value')
if [ "$sharp_capability" = "true" ]; then
    echo "✅ SHARP-on-MCP capability advertised"
    echo "   ai.promptopinion/fhir-context: $sharp_capability"
else
    echo "⚠️  SHARP capability not in experimental section (may need POFastMCP)"
fi
echo ""

# Test 6: Supported Interfaces
echo "Test 6: Supported Interfaces"
echo "----------------------------"
interfaces_count=$(echo "$response" | jq '.supportedInterfaces | length')
if [ "$interfaces_count" -ge 3 ]; then
    echo "✅ Multiple interfaces supported ($interfaces_count)"
    echo "$response" | jq -r '.supportedInterfaces[] | "   - \(.type): \(.url)"'
else
    echo "❌ Insufficient interfaces (found: $interfaces_count, expected: ≥3)"
    exit 1
fi
echo ""

# Test 7: Health Check
echo "Test 7: Health Check Endpoint"
echo "------------------------------"
health_response=$(curl -s "$BASE_URL/health")
if echo "$health_response" | jq -e '.status' > /dev/null 2>&1; then
    status=$(echo "$health_response" | jq -r '.status')
    echo "✅ Health check endpoint working"
    echo "   Status: $status"
else
    echo "❌ Health check endpoint failed"
    exit 1
fi
echo ""

# Test 8: SHARP Context Extraction (Chat Completions)
echo "Test 8: SHARP Context in Chat Completions"
echo "------------------------------------------"
chat_response=$(curl -s -X POST "$BASE_URL/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -H "X-FHIR-Server-URL: $FHIR_SERVER" \
    -H "X-Patient-ID: $PATIENT_ID" \
    -d '{
        "messages": [
            {"role": "user", "content": "Check for fatigue"}
        ]
    }')

if echo "$chat_response" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
    echo "✅ Chat completions endpoint accepts SHARP headers"
    content=$(echo "$chat_response" | jq -r '.choices[0].message.content' | head -n 3)
    echo "   Response preview:"
    echo "$content" | sed 's/^/   /'
else
    echo "❌ Chat completions endpoint failed"
    echo "   Response: $chat_response"
    exit 1
fi
echo ""

# Test 9: SHARP Context Extraction (JSON-RPC)
echo "Test 9: SHARP Context in JSON-RPC"
echo "----------------------------------"
rpc_response=$(curl -s -X POST "$BASE_URL/rpc" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -H "X-FHIR-Server-URL: $FHIR_SERVER" \
    -H "X-Patient-ID: $PATIENT_ID" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "agent.interact",
        "params": {
            "message": "Screen for vision problems",
            "metadata": {
                "https://app.promptopinion.ai/schemas/a2a/v1/fhir-context": {
                    "fhirUrl": "'"$FHIR_SERVER"'",
                    "patientId": "'"$PATIENT_ID"'"
                }
            }
        }
    }')

if echo "$rpc_response" | jq -e '.result.message' > /dev/null 2>&1; then
    echo "✅ JSON-RPC endpoint accepts SHARP context"
    fhir_used=$(echo "$rpc_response" | jq -r '.result.metadata.fhir_context_used')
    echo "   FHIR context used: $fhir_used"
    message=$(echo "$rpc_response" | jq -r '.result.message' | head -n 3)
    echo "   Response preview:"
    echo "$message" | sed 's/^/   /'
else
    echo "❌ JSON-RPC endpoint failed"
    echo "   Response: $rpc_response"
    exit 1
fi
echo ""

# Test 10: Alternative Agent Card Endpoint
echo "Test 10: Alternative Agent Card Endpoint"
echo "-----------------------------------------"
v1_card=$(curl -s "$BASE_URL/v1/card")
if echo "$v1_card" | jq -e '.name' > /dev/null 2>&1; then
    echo "✅ Agent card also accessible at /v1/card"
else
    echo "⚠️  /v1/card endpoint not working (optional)"
fi
echo ""

# Summary
echo "======================================"
echo "🎉 SHARP-on-MCP Compliance Test Complete!"
echo "======================================"
echo ""
echo "✅ All critical tests passed"
echo ""
echo "Next Steps:"
echo "1. Test with Docker: cd docker && docker-compose up mcp-server"
echo "2. Deploy to Render for public URL"
echo "3. Register on Prompt Opinion marketplace"
echo "4. Create demo video"
echo "5. Submit to Devpost"
echo ""
