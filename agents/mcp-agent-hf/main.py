import os
from datetime import datetime, timezone
from typing import Optional, Dict
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastmcp import FastMCP, Context

# Tool imports
from tools.anemia import diagnose_anemia
from tools.cataract import detect_cataract
from tools.dr import screen_diabetic_retinopathy
from tools.mental_health import analyze_mental_health
from tools.parkinsons import screen_parkinsons
from tools.fhir_ops import get_patient_fhir, query_patient_timeline
from tools.comparison import compare_diagnostic_history
from tools.prior_auth import generate_prior_auth
from tools.workflow import orchestrate_screening_workflow

# A2A / Prompt Opinion Utilities
from utils.agent_card import get_agent_card

# Load environment variables first
load_dotenv()

# ── Sentry (optional monitoring) ─────────────────────────────────────────────
# NOTE: sentry_sdk auto-patches httpx which conflicts with supabase-py.
# We defer the import until AFTER the Supabase client is initialised at
# startup, and we explicitly disable the HttpxIntegration so it does not
# monkey-patch the transport layer.
_sentry_initialized = False


def _init_sentry_safe():
    """
    Initialise Sentry without the HttpxIntegration that breaks supabase-py.
    Called lazily after the event-loop is running to avoid patching httpcore
    during module import.
    """
    global _sentry_initialized
    if _sentry_initialized:
        return
    sentry_dsn = os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.logging import LoggingIntegration
        import logging

        sentry_sdk.init(
            dsn=sentry_dsn,
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_RATE", "0.2")),
            environment=os.getenv("ENVIRONMENT", "development"),
            # Explicitly list integrations — omit HttpxIntegration to prevent
            # it from monkey-patching httpcore used by supabase-py.
            default_integrations=False,
            integrations=[
                LoggingIntegration(level=logging.WARNING, event_level=logging.ERROR),
            ],
        )
        _sentry_initialized = True
        print(
            "Sentry initialized (HttpxIntegration disabled for Supabase compatibility)."
        )
    except Exception as e:
        print(f"Sentry init skipped: {e}")


# ── FastMCP server ────────────────────────────────────────────────────────────
mcp = FastMCP(
    name=os.getenv("MCP_SERVER_NAME", "NetraAI Diagnostic Engine"),
    version=os.getenv("MCP_SERVER_VERSION", "1.0.0"),
)

# SHARP-on-MCP: Advertise capability to receive FHIR context
# Required for Prompt Opinion marketplace discovery
if hasattr(mcp, "_server"):
    mcp._server.capabilities.experimental = {
        "ai.promptopinion/fhir-context": {"value": True},
        "fhir_context_required": {"value": True}
    }


# ── FastMCP tool registrations ────────────────────────────────────────────────
@mcp.tool()
async def health_check_tool() -> dict:
    return {"status": "healthy", "server": "NetraAI MCP Server"}


@mcp.tool()
async def diagnose_anemia_tool(
    ctx: Context, image_url: str, patient_id: Optional[str] = None
) -> dict:
    return await diagnose_anemia(ctx=ctx, image_url=image_url, patient_id=patient_id)


@mcp.tool()
async def detect_cataract_tool(
    ctx: Context, image_url: str, patient_id: Optional[str] = None
) -> dict:
    return await detect_cataract(ctx=ctx, image_url=image_url, patient_id=patient_id)


@mcp.tool()
async def screen_dr_tool(
    ctx: Context, image_url: str, patient_id: Optional[str] = None
) -> dict:
    return await screen_diabetic_retinopathy(
        ctx=ctx, image_url=image_url, patient_id=patient_id
    )


@mcp.tool()
async def analyze_mental_health_tool(
    ctx: Context, audio_url: str, patient_id: Optional[str] = None
) -> dict:
    return await analyze_mental_health(
        ctx=ctx, audio_url=audio_url, patient_id=patient_id
    )


@mcp.tool()
async def screen_parkinsons_tool(
    ctx: Context, image_url: str, patient_id: Optional[str] = None
) -> dict:
    return await screen_parkinsons(ctx=ctx, image_url=image_url, patient_id=patient_id)


@mcp.tool()
async def get_patient_fhir_tool(ctx: Context, patient_id: str) -> dict:
    return await get_patient_fhir(ctx, patient_id)


@mcp.tool()
async def query_patient_timeline_tool(
    ctx: Context, patient_id: str, resource_type: str = "Observation"
) -> dict:
    return await query_patient_timeline(ctx, patient_id, resource_type)


@mcp.tool()
async def compare_diagnostic_history_tool(
    ctx: Context, patient_id: str, diagnostic_type: str
) -> dict:
    return await compare_diagnostic_history(ctx, diagnostic_type, patient_id)


@mcp.tool()
async def generate_prior_auth_tool(
    ctx: Context, patient_id: str, service_requested: str, diagnostic_type: str
) -> dict:
    return await generate_prior_auth(
        ctx=ctx,
        service_requested=service_requested,
        diagnostic_type=diagnostic_type,
        patient_id=patient_id,
    )


@mcp.tool()
async def orchestrate_screening_workflow_tool(
    ctx: Context,
    chief_complaint: str,
    patient_id: Optional[str] = None,
    input_data: Optional[Dict] = None,
) -> dict:
    return await orchestrate_screening_workflow(
        ctx=ctx,
        chief_complaint=chief_complaint,
        patient_id=patient_id,
        input_data=input_data or {},
    )


# ── FastAPI bridge app ────────────────────────────────────────────────────────
def create_app():
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    import re
    import uuid
    from collections import defaultdict
    from datetime import timedelta

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Initialise Sentry safely
        _init_sentry_safe()
        yield

    fastapi_app = FastAPI(
        title="NetraAI MCP Bridge", version="2.0.0", lifespan=lifespan
    )

    # ── Immediate Health Check ──
    @fastapi_app.get("/health")
    async def health():
        """Standard health check endpoint for Render/Uptime Monitoring"""
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "netra-ai-mcp-server",
            "region": os.getenv("RENDER_REGION", "unknown"),
        }

    # ── A2A Discovery Endpoints ──
    @fastapi_app.get("/.well-known/agent-card.json")
    @fastapi_app.get("/v1/card")
    async def agent_card():
        """A2A v1.0 compliant agent card for discovery"""
        return get_agent_card()

    # ── A2A Interaction Endpoints ──
    @fastapi_app.post("/v1/chat/completions")
    async def chat_completions(request: Request):
        """OpenAI-compatible chat completions interface for A2A with SHARP context support"""
        body = await request.json()
        messages = body.get("messages", [])
        
        if not messages:
            return JSONResponse({"error": "No messages provided"}, status_code=400)
        
        last_message = messages[-1].get("content", "")
        
        # 💎 EXTRACT SHARP CONTEXT from headers
        fhir_server = request.headers.get("X-FHIR-Server-URL")
        fhir_token = request.headers.get("X-FHIR-Access-Token")
        patient_id = request.headers.get("X-Patient-ID")
        
        # Use orchestrator to handle the request with FHIR context
        result = await orchestrate_screening_workflow(
            ctx=None, 
            chief_complaint=last_message,
            patient_id=patient_id,
            fhir_server=fhir_server,
            fhir_token=fhir_token
        )
        
        # Format as OpenAI response with clinical summary
        clinical_summary = result.get("clinical_summary", str(result))
        
        return {
            "id": f"chatcmpl-{uuid.uuid4()}",
            "object": "chat.completion",
            "created": int(datetime.now().timestamp()),
            "model": "netra-ai-agent",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": clinical_summary
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(last_message.split()),
                "completion_tokens": len(clinical_summary.split()),
                "total_tokens": len(last_message.split()) + len(clinical_summary.split())
            }
        }

    @fastapi_app.post("/rpc")
    async def json_rpc(request: Request):
        """Standard JSON-RPC 2.0 endpoint for A2A interoperability with SHARP context extraction"""
        body = await request.json()
        method = body.get("method")
        params = body.get("params", {})
        request_id = body.get("id")
        
        # 💎 EXTRACT SHARP CONTEXT from A2A metadata
        metadata = params.get("metadata", {})
        fhir_context_uri = "https://app.promptopinion.ai/schemas/a2a/v1/fhir-context"
        fhir_context = metadata.get(fhir_context_uri, {})
        
        # Extract FHIR credentials from metadata or headers
        fhir_server = fhir_context.get("fhirUrl") or request.headers.get("X-FHIR-Server-URL")
        fhir_token = fhir_context.get("fhirToken") or request.headers.get("X-FHIR-Access-Token")
        patient_id = fhir_context.get("patientId") or request.headers.get("X-Patient-ID")
        
        if method == "agent.interact":
            message = params.get("message", "")
            
            # Pass FHIR context to orchestrator
            result = await orchestrate_screening_workflow(
                ctx=None,
                chief_complaint=message,
                patient_id=patient_id,
                fhir_server=fhir_server,
                fhir_token=fhir_token
            )
            
            # Use clinical summary for human-readable response
            clinical_summary = result.get("clinical_summary", str(result))
            
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "message": clinical_summary,
                    "metadata": {
                        "source": "NetraAI",
                        "patient_id": patient_id,
                        "fhir_context_used": bool(fhir_server),
                        "workflow": result.get("workflow", "Unknown"),
                        "timestamp": result.get("timestamp")
                    }
                }
            }
            
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32601, "message": "Method not found"}
        }

    # S2: CORS Middleware
    allowed_origins = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in allowed_origins],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["X-API-Key", "Content-Type", "Authorization"],
    )

    allowed_hosts = [
        host.strip()
        for host in os.getenv(
            "ALLOWED_HOSTS", "localhost,127.0.0.1,*.onrender.com"
        ).split(",")
        if host.strip()
    ]
    if allowed_hosts:
        fastapi_app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

    # S3: Rate Limiting (in-memory, 30 req/min per IP)
    rate_limit_store = defaultdict(list)
    RATE_LIMIT = int(os.getenv("MCP_RATE_LIMIT", "30"))
    RATE_WINDOW = 60  # seconds

    @fastapi_app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        # Exempt /health endpoint
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = datetime.now()

        # Clean old entries
        rate_limit_store[client_ip] = [
            ts
            for ts in rate_limit_store[client_ip]
            if now - ts < timedelta(seconds=RATE_WINDOW)
        ]

        # Check limit
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT:
            return JSONResponse(
                {"error": "Rate limit exceeded", "retry_after": RATE_WINDOW},
                status_code=429,
            )

        # Record request
        rate_limit_store[client_ip].append(now)
        return await call_next(request)

    # S6: Security Headers + O4: Request ID
    @fastapi_app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["X-Request-ID"] = str(uuid.uuid4())
        return response

    # S7: Input Validation
    PATIENT_ID_PATTERN = re.compile(r"^[a-zA-Z0-9\-\_]{1,64}$")

    def validate_patient_id(patient_id: str) -> bool:
        """Validate patient_id: alphanumeric + hyphens only, max 64 chars"""
        if not patient_id or not PATIENT_ID_PATTERN.match(patient_id):
            raise ValueError(f"Invalid patient_id format: {patient_id}")
        return True

    @fastapi_app.post("/tools/call")
    async def call_tool(request: Request):
        body = await request.json()
        name = body.get("name")
        arguments = body.get("arguments", {})

        # Verify API Key (S1: No hardcoded fallback)
        api_key = request.headers.get("X-API-Key")
        mcp_api_key = os.getenv("MCP_API_KEY")
        if not mcp_api_key:
            return JSONResponse(
                {"error": "Server misconfigured: MCP_API_KEY not set"}, status_code=500
            )
        if api_key != mcp_api_key:
            return JSONResponse({"error": "Unauthorized"}, status_code=401)

        # Extract SHARP context from headers (Agents Assemble Hackathon requirement)
        sharp_patient_id = request.headers.get("X-Patient-ID")
        sharp_fhir_url = request.headers.get("X-FHIR-Server-URL")
        sharp_fhir_token = request.headers.get("X-FHIR-Access-Token")

        if sharp_patient_id and not arguments.get("patient_id"):
            arguments["patient_id"] = sharp_patient_id

        # Inject context for tools that might need FHIR connectivity
        if sharp_fhir_url:
            arguments["fhir_server"] = sharp_fhir_url
        if sharp_fhir_token:
            arguments["fhir_token"] = sharp_fhir_token

        try:
            arguments.pop("ctx", None)  # never pass ctx from external callers

            # S7: Validate patient_id if present
            if "patient_id" in arguments and arguments["patient_id"]:
                try:
                    validate_patient_id(arguments["patient_id"])
                except ValueError as ve:
                    return JSONResponse({"error": str(ve)}, status_code=400)

            tool_map = {
                "diagnose_anemia_tool": lambda: diagnose_anemia(ctx=None, **arguments),
                "detect_cataract_tool": lambda: detect_cataract(ctx=None, **arguments),
                "screen_dr_tool": lambda: screen_diabetic_retinopathy(
                    ctx=None, **arguments
                ),
                "analyze_mental_health_tool": lambda: analyze_mental_health(
                    ctx=None, **arguments
                ),
                "screen_parkinsons_tool": lambda: screen_parkinsons(
                    ctx=None, **arguments
                ),
                "get_patient_fhir_tool": lambda: get_patient_fhir(
                    ctx=None, **arguments
                ),
                "query_patient_timeline_tool": lambda: query_patient_timeline(
                    ctx=None, **arguments
                ),
                "compare_diagnostic_history_tool": lambda: compare_diagnostic_history(
                    ctx=None, **arguments
                ),
                "generate_prior_auth_tool": lambda: generate_prior_auth(
                    ctx=None, **arguments
                ),
                "orchestrate_screening_workflow_tool": lambda: orchestrate_screening_workflow(
                    ctx=None, **arguments
                ),
                "health_check_tool": lambda: {"status": "healthy"},
            }

            if name in tool_map:
                result = tool_map[name]()
                import inspect

                if inspect.isawaitable(result):
                    result = await result
                return result
            else:
                return await mcp.call_tool(name, arguments)

        except Exception:
            # S4+S5: Sanitized error responses (no stack traces)
            import logging

            logger = logging.getLogger(__name__)
            logger.exception(f"Tool {name} failed")
            return JSONResponse(
                {"error": "Internal server error", "tool": name}, status_code=500
            )

    # Mount FastMCP ASGI sub-app
    try:
        mcp_asgi = mcp.http_app()
        fastapi_app.mount("/mcp", mcp_asgi)
    except Exception as e:
        print(f"Could not mount FastMCP ASGI: {e}")

    return fastapi_app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
