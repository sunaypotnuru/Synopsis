#!/usr/bin/env python3
"""
MCP Server Implementation Verification Script

This script verifies that all 11 MCP tools are:
1. Implemented (files exist)
2. Imported in main.py
3. Registered with @mcp.tool() decorator
4. Added to FastAPI tool_map
5. Have proper error handling
6. Have input validation
7. Have audit logging

Usage:
    python scripts/verify_mcp_implementation.py
"""

import os
import sys
import re
from pathlib import Path
from typing import List, Dict, Tuple

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text: str):
    """Print section header."""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}{text.center(80)}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")

def print_success(text: str):
    """Print success message."""
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text: str):
    """Print error message."""
    print(f"{RED}❌ {text}{RESET}")

def print_warning(text: str):
    """Print warning message."""
    print(f"{YELLOW}⚠️  {text}{RESET}")

def print_info(text: str):
    """Print info message."""
    print(f"{BLUE}ℹ️  {text}{RESET}")


class MCPVerifier:
    """Verify MCP server implementation."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.mcp_dir = project_root / "backend" / "mcp-server"
        self.tools_dir = self.mcp_dir / "tools"
        self.main_py = self.mcp_dir / "main.py"
        
        self.expected_tools = [
            "anemia",
            "cataract",
            "dr",
            "mental_health",
            "parkinsons",
            "fhir_ops",
            "comparison",
            "prior_auth",
            "workflow"
        ]
        
        self.expected_tool_functions = [
            "diagnose_anemia",
            "detect_cataract",
            "screen_diabetic_retinopathy",
            "analyze_mental_health",
            "screen_parkinsons",
            "get_patient_fhir",
            "query_patient_timeline",
            "compare_diagnostic_history",
            "generate_prior_auth",
            "orchestrate_screening_workflow"
        ]
        
        # Tool names as registered (some are shortened)
        self.registered_tool_names = [
            "diagnose_anemia_tool",
            "detect_cataract_tool",
            "screen_dr_tool",  # Note: shortened from screen_diabetic_retinopathy_tool
            "analyze_mental_health_tool",
            "screen_parkinsons_tool",
            "get_patient_fhir_tool",
            "query_patient_timeline_tool",
            "compare_diagnostic_history_tool",
            "generate_prior_auth_tool",
            "orchestrate_screening_workflow_tool",
            "health_check_tool"
        ]
        
        self.results = {
            "files_exist": [],
            "imports": [],
            "registrations": [],
            "tool_map": [],
            "error_handling": [],
            "input_validation": [],
            "audit_logging": []
        }
    
    def verify_all(self) -> bool:
        """Run all verification checks."""
        print_header("MCP SERVER IMPLEMENTATION VERIFICATION")
        
        all_passed = True
        
        # Check 1: Tool files exist
        if not self.verify_tool_files():
            all_passed = False
        
        # Check 2: Imports in main.py
        if not self.verify_imports():
            all_passed = False
        
        # Check 3: Tool registrations
        if not self.verify_registrations():
            all_passed = False
        
        # Check 4: FastAPI tool_map
        if not self.verify_tool_map():
            all_passed = False
        
        # Check 5: Error handling
        if not self.verify_error_handling():
            all_passed = False
        
        # Check 6: Input validation
        if not self.verify_input_validation():
            all_passed = False
        
        # Check 7: Audit logging
        if not self.verify_audit_logging():
            all_passed = False
        
        # Print summary
        self.print_summary(all_passed)
        
        return all_passed
    
    def verify_tool_files(self) -> bool:
        """Verify all tool files exist."""
        print_header("CHECK 1: Tool Files Exist")
        
        all_exist = True
        for tool in self.expected_tools:
            tool_file = self.tools_dir / f"{tool}.py"
            if tool_file.exists():
                print_success(f"Tool file exists: {tool}.py")
                self.results["files_exist"].append(tool)
            else:
                print_error(f"Tool file missing: {tool}.py")
                all_exist = False
        
        print(f"\n{len(self.results['files_exist'])}/{len(self.expected_tools)} tool files exist")
        return all_exist
    
    def verify_imports(self) -> bool:
        """Verify all tools are imported in main.py."""
        print_header("CHECK 2: Imports in main.py")
        
        if not self.main_py.exists():
            print_error("main.py not found!")
            return False
        
        main_content = self.main_py.read_text()
        
        all_imported = True
        for func in self.expected_tool_functions:
            # Check for import statement
            import_pattern = rf"from tools\.\w+ import.*{func}"
            if re.search(import_pattern, main_content):
                print_success(f"Function imported: {func}")
                self.results["imports"].append(func)
            else:
                print_error(f"Function not imported: {func}")
                all_imported = False
        
        print(f"\n{len(self.results['imports'])}/{len(self.expected_tool_functions)} functions imported")
        return all_imported
    
    def verify_registrations(self) -> bool:
        """Verify all tools are registered with @mcp.tool()."""
        print_header("CHECK 3: Tool Registrations")
        
        main_content = self.main_py.read_text()
        
        all_registered = True
        for tool_name in self.registered_tool_names:
            # Check for @mcp.tool() decorator followed by function definition
            pattern = rf"@mcp\.tool\(\)[\s\S]*?async def {tool_name}"
            if re.search(pattern, main_content):
                print_success(f"Tool registered: {tool_name}")
                self.results["registrations"].append(tool_name)
            else:
                print_error(f"Tool not registered: {tool_name}")
                all_registered = False
        
        print(f"\n{len(self.results['registrations'])}/11 tools registered")
        return all_registered
    
    def verify_tool_map(self) -> bool:
        """Verify all tools are in FastAPI tool_map."""
        print_header("CHECK 4: FastAPI tool_map")
        
        main_content = self.main_py.read_text()
        
        # Extract tool_map section
        tool_map_match = re.search(r"tool_map = \{([\s\S]*?)\}", main_content)
        if not tool_map_match:
            print_error("tool_map not found in main.py!")
            return False
        
        tool_map_content = tool_map_match.group(1)
        
        all_in_map = True
        for tool_name in self.registered_tool_names:
            if tool_name in tool_map_content:
                print_success(f"Tool in map: {tool_name}")
                self.results["tool_map"].append(tool_name)
            else:
                print_error(f"Tool not in map: {tool_name}")
                all_in_map = False
        
        print(f"\n{len(self.results['tool_map'])}/11 tools in tool_map")
        return all_in_map
    
    def verify_error_handling(self) -> bool:
        """Verify tools have proper error handling."""
        print_header("CHECK 5: Error Handling")
        
        all_have_error_handling = True
        for tool in self.expected_tools:
            tool_file = self.tools_dir / f"{tool}.py"
            if not tool_file.exists():
                continue
            
            content = tool_file.read_text(encoding='utf-8')
            
            # Check for try/except blocks
            if "try:" in content and "except" in content:
                print_success(f"Error handling found: {tool}.py")
                self.results["error_handling"].append(tool)
            else:
                print_warning(f"No error handling found: {tool}.py")
                all_have_error_handling = False
        
        print(f"\n{len(self.results['error_handling'])}/{len(self.expected_tools)} tools have error handling")
        return all_have_error_handling
    
    def verify_input_validation(self) -> bool:
        """Verify tools have input validation."""
        print_header("CHECK 6: Input Validation")
        
        all_have_validation = True
        for tool in self.expected_tools:
            tool_file = self.tools_dir / f"{tool}.py"
            if not tool_file.exists():
                continue
            
            content = tool_file.read_text(encoding='utf-8')
            
            # Check for input validation (if not, return OperationOutcome)
            if "if not" in content or "OperationOutcome" in content:
                print_success(f"Input validation found: {tool}.py")
                self.results["input_validation"].append(tool)
            else:
                print_warning(f"No input validation found: {tool}.py")
                all_have_validation = False
        
        print(f"\n{len(self.results['input_validation'])}/{len(self.expected_tools)} tools have input validation")
        return all_have_validation
    
    def verify_audit_logging(self) -> bool:
        """Verify tools have audit logging."""
        print_header("CHECK 7: Audit Logging")
        
        all_have_audit = True
        for tool in self.expected_tools:
            tool_file = self.tools_dir / f"{tool}.py"
            if not tool_file.exists():
                continue
            
            content = tool_file.read_text(encoding='utf-8')
            
            # Check for audit_log calls
            if "audit_log" in content:
                print_success(f"Audit logging found: {tool}.py")
                self.results["audit_logging"].append(tool)
            else:
                print_warning(f"No audit logging found: {tool}.py")
                all_have_audit = False
        
        print(f"\n{len(self.results['audit_logging'])}/{len(self.expected_tools)} tools have audit logging")
        return all_have_audit
    
    def print_summary(self, all_passed: bool):
        """Print verification summary."""
        print_header("VERIFICATION SUMMARY")
        
        total_checks = 7
        passed_checks = sum([
            len(self.results["files_exist"]) == len(self.expected_tools),
            len(self.results["imports"]) == len(self.expected_tool_functions),
            len(self.results["registrations"]) == 11,
            len(self.results["tool_map"]) == 11,
            len(self.results["error_handling"]) == len(self.expected_tools),
            len(self.results["input_validation"]) == len(self.expected_tools),
            len(self.results["audit_logging"]) == len(self.expected_tools)
        ])
        
        print(f"Total Checks: {total_checks}")
        print(f"Passed: {passed_checks}")
        print(f"Failed: {total_checks - passed_checks}")
        print(f"Success Rate: {(passed_checks/total_checks)*100:.1f}%\n")
        
        if all_passed:
            print_success("✅ ALL CHECKS PASSED - MCP SERVER READY FOR DEPLOYMENT!")
        else:
            print_error("❌ SOME CHECKS FAILED - REVIEW ERRORS ABOVE")
        
        print()


def main():
    """Main entry point."""
    # Get project root (2 levels up from scripts/tests)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    # Verify we're in the right directory
    if not (project_root / "backend" / "mcp-server").exists():
        print_error("Error: Could not find backend/mcp-server directory!")
        print_info(f"Current directory: {project_root}")
        print_info("Please run this script from the project root directory.")
        sys.exit(1)
    
    # Run verification
    verifier = MCPVerifier(project_root)
    success = verifier.verify_all()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
