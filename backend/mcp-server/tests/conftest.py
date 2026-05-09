import os
import sys

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
MCP_SERVER_DIR = os.path.dirname(TESTS_DIR)

if MCP_SERVER_DIR not in sys.path:
    sys.path.insert(0, MCP_SERVER_DIR)
