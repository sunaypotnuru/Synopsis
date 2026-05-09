import asyncio
from fastmcp import FastMCP, Context


async def main():
    mcp = FastMCP("test")

    @mcp.tool()
    async def my_tool(ctx: Context, a: int):
        pass

    # In some versions it might be sync, in others async
    tool = mcp.get_tool("my_tool")
    if asyncio.iscoroutine(tool):
        tool = await tool

    print(f"Tool: {tool.name}")
    print(f"Parameters: {tool.parameters}")

    # Check if 'ctx' is in parameters
    param_names = [p.name for p in tool.parameters]
    print(f"Param names: {param_names}")


if __name__ == "__main__":
    asyncio.run(main())
