from fastmcp import FastMCP
mcp = FastMCP("test")
print(f"Has _server: {hasattr(mcp, '_server')}")
if hasattr(mcp, "_server"):
    print(f"Server capabilities: {mcp._server.capabilities}")
