"""
PERF1: Load Testing Script

Tests MCP server performance with 50 concurrent requests.
"""

import asyncio
import aiohttp
import time
import os
from statistics import mean, median, stdev
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8080")
API_KEY = os.getenv("MCP_API_KEY", "test-api-key")


async def call_tool(session, tool_name, patient_id, request_num):
    """Call a single tool and measure response time"""
    start = time.time()
    try:
        async with session.post(
            f"{BASE_URL}/tools/call",
            json={"name": tool_name, "arguments": {"patient_id": patient_id}},
            headers={"X-API-Key": API_KEY},
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            result = await response.json()
            duration = time.time() - start
            return {
                "request_num": request_num,
                "status": response.status,
                "duration": duration,
                "success": response.status == 200
            }
    except asyncio.TimeoutError:
        duration = time.time() - start
        return {
            "request_num": request_num,
            "status": 408,
            "duration": duration,
            "success": False,
            "error": "Timeout"
        }
    except Exception as e:
        duration = time.time() - start
        return {
            "request_num": request_num,
            "status": 500,
            "duration": duration,
            "success": False,
            "error": str(e)
        }


async def load_test(num_concurrent=50):
    """Run load test with concurrent requests"""
    print(f"🚀 Starting load test with {num_concurrent} concurrent requests...")
    print(f"📍 Target: {BASE_URL}")
    print(f"🔑 API Key: {API_KEY[:10]}...")
    print()
    
    start_time = time.time()
    
    async with aiohttp.ClientSession() as session:
        # Create tasks for concurrent requests
        tasks = [
            call_tool(session, "get_patient_fhir_tool", f"patient-{i % 10}", i)
            for i in range(num_concurrent)
        ]
        
        # Execute all requests concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    total_time = time.time() - start_time
    
    # Filter out exceptions
    valid_results = [r for r in results if isinstance(r, dict)]
    
    # Analyze results
    success_count = sum(1 for r in valid_results if r["success"])
    failed_count = len(valid_results) - success_count
    
    durations = [r["duration"] for r in valid_results]
    successful_durations = [r["duration"] for r in valid_results if r["success"]]
    
    # Print results
    print("=" * 60)
    print("📊 LOAD TEST RESULTS")
    print("=" * 60)
    print()
    print(f"Total Requests:     {num_concurrent}")
    print(f"Successful:         {success_count} ({success_count/num_concurrent*100:.1f}%)")
    print(f"Failed:             {failed_count} ({failed_count/num_concurrent*100:.1f}%)")
    print()
    print(f"Total Time:         {total_time:.2f}s")
    print(f"Requests/Second:    {num_concurrent/total_time:.2f}")
    print()
    
    if durations:
        print("Response Times (all requests):")
        print(f"  Mean:             {mean(durations):.3f}s")
        print(f"  Median:           {median(durations):.3f}s")
        print(f"  Min:              {min(durations):.3f}s")
        print(f"  Max:              {max(durations):.3f}s")
        if len(durations) > 1:
            print(f"  Std Dev:          {stdev(durations):.3f}s")
    
    if successful_durations:
        print()
        print("Response Times (successful only):")
        print(f"  Mean:             {mean(successful_durations):.3f}s")
        print(f"  Median:           {median(successful_durations):.3f}s")
    
    print()
    print("=" * 60)
    
    # Status code breakdown
    status_codes = {}
    for r in valid_results:
        status = r["status"]
        status_codes[status] = status_codes.get(status, 0) + 1
    
    print("Status Code Breakdown:")
    for status, count in sorted(status_codes.items()):
        print(f"  {status}: {count} requests")
    
    print("=" * 60)
    
    # Check if test passed
    success_rate = success_count / num_concurrent
    avg_response_time = mean(successful_durations) if successful_durations else float('inf')
    
    print()
    if success_rate >= 0.95 and avg_response_time < 5.0:
        print("✅ LOAD TEST PASSED")
        print(f"   - Success rate: {success_rate*100:.1f}% (>= 95%)")
        print(f"   - Avg response: {avg_response_time:.2f}s (< 5s)")
        return True
    else:
        print("❌ LOAD TEST FAILED")
        if success_rate < 0.95:
            print(f"   - Success rate: {success_rate*100:.1f}% (< 95%)")
        if avg_response_time >= 5.0:
            print(f"   - Avg response: {avg_response_time:.2f}s (>= 5s)")
        return False


async def main():
    """Main entry point"""
    # Run load test
    passed = await load_test(50)
    
    # Exit with appropriate code
    exit(0 if passed else 1)


if __name__ == "__main__":
    asyncio.run(main())
