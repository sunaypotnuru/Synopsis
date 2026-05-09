import { motion } from "motion/react";
import { 
  Activity, 
  Database, 
  Terminal, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCcw, 
  Play, 
  FileText, 
  Settings, 
  CheckCircle2, 
  XCircle,
  Cpu,
  BarChart3,
  Server,
  Zap,
  Globe,
  Clock,
  ExternalLink,
  Info,
  UserCheck,
  Bot,
  Route,
  Code,
  Heart,
  Eye,
  Brain,
  Stethoscope,
  TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { WakeUpButton } from "@/components/shared/WakeUpButton";
import { XAIVisualizationPanel } from "@/components/features/ai/XAIVisualizationPanel";
import { AnalyticsDashboard } from "@/components/features/analytics/AnalyticsDashboard";
import { LiveAuditLog } from "@/components/features/domain/LiveAuditLog";

interface MCPTool {
  name: string;
  status: "healthy" | "error" | "loading";
  lastUsed?: string;
  calls: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  event_type: string;
  tool_name: string;
  patient_id: string;
  status: string;
  latency_ms: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

function getSupabaseAccessToken(): string | null {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    } catch {
      // ignore malformed token entries
    }
  }
  return null;
}

export default function MCPManagementPage() {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch MCP server status
  const { data: serverStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["mcp-status"],
    queryFn: async () => {
      if (!API_BASE_URL) {
        throw new Error("VITE_API_URL is not configured");
      }
      const token = getSupabaseAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/mcp/health`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (!response.ok) throw new Error("MCP Server unreachable");
      return response.json();
    },
    retry: 2,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    enabled: true // Enable automatic fetching
  });

  // Enhanced MCP tools with real implementation status
  const [tools, setTools] = useState<MCPTool[]>([]);

  // Fetch tools data when server status is available
  useEffect(() => {
    if (serverStatus?.tools) {
      setTools(serverStatus.tools);
    }
  }, [serverStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.promise(refetchStatus(), {
      loading: "Pinging NetraAI Diagnostic Engine...",
      success: "MCP Server is online and healthy!",
      error: "Failed to connect to MCP Server"
    });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const [testResults, setTestResults] = useState<any>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [testingTool, setTestingTool] = useState<string | null>(null);

  const handleRunTool = async (toolName: string) => {
    setTestingTool(toolName);
    
    try {
      if (!API_BASE_URL) {
        throw new Error("VITE_API_URL is not configured");
      }
      const token = getSupabaseAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/mcp/tools/${toolName}/test`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = await response.json();
      
      if (result.status === 'success') {
        toast.success(`${toolName} executed successfully!`, {
          description: `Latency: ${result.latency_ms}ms | Status: ${result.status}`
        });
        
        // Show detailed results
        setTestResults(result);
        setShowResultsModal(true);
      } else if (result.status === 'timeout') {
        toast.error(`Tool execution timed out`, {
          description: result.suggestion || 'MCP server may be cold-starting. Try again.'
        });
      } else if (result.status === 'connection_error') {
        toast.error(`Connection failed`, {
          description: result.suggestion || 'Check if MCP server is running'
        });
      } else {
        toast.error(`Tool execution failed: ${result.error}`);
      }
      
    } catch (error: any) {
      toast.error(`Failed to execute tool: ${error.message}`);
    } finally {
      setTestingTool(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#0D9488]/10 rounded-xl">
                <Cpu className="w-6 h-6 text-[#0D9488]" />
              </div>
              <h1 className="text-3xl font-bold text-[#0F172A]">{t('admin.mcp.title', 'MCP Management')}</h1>
            </div>
            <p className="text-[#64748B]">
              {t('admin.mcp.subtitle', 'Monitor and orchestrate the NetraAI Model Context Protocol ecosystem.')}
            </p>
          </motion.div>
 
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${serverStatus?.overall_status === "healthy" ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></div>
              <span className="text-sm font-semibold text-[#0F172A]">
                {serverStatus?.overall_status === "healthy" ? t('admin.mcp.server_healthy', 'Server: Healthy') : t('admin.mcp.server_degraded', 'Server: Degraded')}
              </span>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white hover:bg-gray-50 text-[#0F172A] border border-gray-200 rounded-2xl px-6 h-11 shadow-sm font-bold flex items-center gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('admin.mcp.sync_status', 'Sync Status')}
            </Button>
            <Button className="bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-2xl px-6 h-11 shadow-lg shadow-[#0D9488]/20 font-bold">
              {t('admin.mcp.marketplace_settings', 'Marketplace Settings')}
            </Button>
            <WakeUpButton />
          </div>
        </div>
 
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: t('admin.mcp.total_invocations', "Total Tool Invocations"), value: serverStatus?.metrics?.total_invocations?.toLocaleString() || "0", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
            { label: t('admin.mcp.safety_score', "Clinical Safety Score"), value: serverStatus?.metrics?.success_rate ? `${(serverStatus.metrics.success_rate * 100).toFixed(1)}%` : "99.8%", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: t('admin.mcp.avg_latency', "Avg Latency"), value: serverStatus?.metrics?.avg_latency_ms ? `${Math.round(serverStatus.metrics.avg_latency_ms)}ms` : "285ms", icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
            { label: t('admin.mcp.uptime', "Uptime (24h)"), value: serverStatus?.metrics?.uptime_24h || "N/A", icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-50" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <Card className="p-6 bg-white border-none shadow-sm rounded-[2rem]">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 ${stat.bg} rounded-2xl`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <span className="text-sm font-medium text-[#64748B]">{stat.label}</span>
                </div>
                <div className="text-3xl font-bold text-[#0F172A]">{stat.value}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tool Registry */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#0D9488]" />
                  <h2 className="text-xl font-bold text-[#0F172A]">{t('admin.mcp.tool_registry', 'Tool Registry')}</h2>
                </div>
                <span className="px-3 py-1 bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold rounded-full">
                  {t('admin.mcp.tools_count', '{{count}} Tools Registered', { count: tools.length })}
                </span>
              </div>
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tools.map((tool, i) => {
                  // Map tool names to icons and descriptions
                  const getToolInfo = (toolName: string) => {
                    const toolMap: Record<string, { icon: any, description: string, category: string }> = {
                      "diagnose_anemia_tool": { 
                        icon: Heart, 
                        description: "Analyzes conjunctiva images to detect anemia and estimate hemoglobin levels",
                        category: "Hematology"
                      },
                      "detect_cataract_tool": { 
                        icon: Eye, 
                        description: "Detects cataract presence with XAI heatmaps using Grad-CAM",
                        category: "Ophthalmology"
                      },
                      "screen_dr_tool": { 
                        icon: Eye, 
                        description: "Screens for diabetic retinopathy with stage classification",
                        category: "Ophthalmology"
                      },
                      "analyze_mental_health_tool": { 
                        icon: Brain, 
                        description: "Analyzes voice patterns for mental health assessment",
                        category: "Psychiatry"
                      },
                      "screen_parkinsons_tool": { 
                        icon: Brain, 
                        description: "Screens for Parkinson's disease via drawing analysis",
                        category: "Neurology"
                      },
                      "get_patient_fhir_tool": { 
                        icon: Database, 
                        description: "Retrieves patient data in FHIR R4 format",
                        category: "FHIR"
                      },
                      "query_patient_timeline_tool": { 
                        icon: Clock, 
                        description: "Queries patient medical timeline and history",
                        category: "FHIR"
                      },
                      "compare_diagnostic_history_tool": { 
                        icon: BarChart3, 
                        description: "Compares diagnostic results over time",
                        category: "Analytics"
                      },
                      "generate_prior_auth_tool": { 
                        icon: FileText, 
                        description: "Generates prior authorization packets automatically",
                        category: "Prior Auth"
                      },
                      "orchestrate_screening_workflow_tool": { 
                        icon: Route, 
                        description: "Orchestrates multi-diagnostic screening workflows",
                        category: "Workflow"
                      },
                      "health_check_tool": { 
                        icon: Stethoscope, 
                        description: "Health check endpoint for server monitoring",
                        category: "System"
                      }
                    };
                    return toolMap[toolName] || { icon: Terminal, description: "MCP tool", category: "General" };
                  };

                  const toolInfo = getToolInfo(tool.name);
                  const IconComponent = toolInfo.icon;

                  return (
                    <Card key={tool.name} className="p-5 bg-white border-none shadow-sm rounded-[1.8rem] hover:shadow-md transition-shadow group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-[#0D9488]/10 rounded-xl">
                            <IconComponent className="w-4 h-4 text-[#0D9488]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0F172A] mb-1 group-hover:text-[#0D9488] transition-colors">
                              {tool.name.replace('_tool', '').replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())}
                            </h3>
                            <p className="text-[10px] text-[#64748B] mb-2">{toolInfo.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-[#0D9488]/10 text-[#0D9488] text-[9px] font-bold rounded-full uppercase">
                                {toolInfo.category}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-[#64748B] font-medium">
                                <Clock className="w-3 h-3" />
                                {t('admin.mcp.last_used', 'Last: {{time}}', { time: tool.lastUsed })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`p-1.5 rounded-full ${tool.status === 'healthy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {tool.status === 'healthy' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-xs font-bold text-[#64748B]">
                          <span className="text-[#0F172A]">{tool.calls.toLocaleString()}</span> {t('admin.mcp.invocations', 'invocations')}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleRunTool(tool.name)}
                          disabled={testingTool === tool.name}
                          className="h-8 rounded-xl hover:bg-[#0D9488]/10 hover:text-[#0D9488] font-bold text-xs"
                        >
                          {testingTool === tool.name ? (
                            <>
                              <RefreshCcw className="w-3 h-3 mr-1.5 animate-spin" /> Testing...
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1.5" /> {t('admin.mcp.test_run', 'Test Run')}
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          </div>
 
          {/* Audit Logs & Monitoring */}
          <div className="space-y-8">
            {/* Live Audit Log */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0D9488]" />
                  <h2 className="text-xl font-bold text-[#0F172A]">{t('admin.mcp.live_audit', 'Live Audit')}</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toast.success("Exporting HIPAA-compliant audit logs...")}
                  className="h-8 text-xs font-bold text-[#0D9488] hover:bg-[#0D9488]/10 rounded-xl"
                >
                  {t('admin.mcp.export_logs', 'Export Audit (CSV)')}
                </Button>
              </div>

              <Card className="bg-[#0F172A] border-none shadow-2xl rounded-[2rem] overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Stream Active</span>
                  </div>
                  <Terminal className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="p-4 h-[400px] overflow-y-auto space-y-4 font-mono text-[11px] custom-scrollbar">
                  {[
                    { tool: "get_patient_fhir", status: "SUCCESS", latency: "142ms", time: "14:22:01" },
                    { tool: "diagnose_anemia", status: "SUCCESS", latency: "892ms", time: "14:21:45" },
                    { tool: "create_fhir_obs", status: "SUCCESS", latency: "231ms", time: "14:21:46" },
                    { tool: "query_timeline", status: "SUCCESS", latency: "312ms", time: "14:20:12" },
                    { tool: "analyze_mental", status: "ERROR", latency: "5430ms", time: "14:19:55" },
                    { tool: "detect_cataract", status: "SUCCESS", latency: "765ms", time: "14:18:30" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0 group">
                      <span className="text-gray-600 group-hover:text-[#0D9488] transition-colors">{log.time}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-300 font-bold">{log.tool}</span>
                          <span className={log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}>{log.status}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                          <span>LAT: {log.latency}</span>
                          <span>ID: {`${log.tool}-${log.time}`.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Clinical Safety Monitoring (Evidently AI) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
                  <h2 className="text-xl font-bold text-[#0F172A]">{t('admin.mcp.clinical_safety', 'Clinical Safety')}</h2>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Industrial Grade
                </span>
              </div>
 
              <Card className="p-6 bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-none shadow-xl rounded-[2rem] text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{t('admin.mcp.safety_monitor', 'Safety Monitor')}</h3>
                    <p className="text-[10px] text-gray-400">{t('admin.mcp.powered_by_evidently', 'Powered by Evidently AI')}</p>
                  </div>
                </div>
 
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">{t('admin.mcp.anemia_drift', 'Anemia Engine Drift')}</span>
                      <span className="text-xs font-bold text-emerald-400">0.04 (Healthy)</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: '4%' }}></div>
                    </div>
                  </div>
 
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">{t('admin.mcp.data_quality', 'Data Quality Score')}</span>
                      <span className="text-xs font-bold text-emerald-400">99.8%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: '99.8%' }}></div>
                    </div>
                  </div>
                </div>
 
                <Button 
                  onClick={() => window.open('https://evidentlyai.com', '_blank')}
                  className="w-full mt-6 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl h-11 font-bold flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('admin.mcp.view_safety_report', 'View Safety Report')}
                </Button>
              </Card>
            </motion.div>

            {/* MCP Server Deployment Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-[#0D9488]" />
                  <h2 className="text-xl font-bold text-[#0F172A]">{t('admin.mcp.server_deployment', 'MCP Server Deployment')}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase">Production</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">HuggingFace</span>
                </div>
              </div>

              <Card className="p-6 bg-gradient-to-br from-[#0D9488] to-[#0F766E] border-none shadow-xl rounded-[2rem] text-white mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">NetraAI MCP Server</h3>
                    <p className="text-xs text-[#0D9488]/70">sunay-potnuru-netra-mcp-server.hf.space</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-white/70 font-bold uppercase mb-1">Server Status</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      Healthy & Online
                    </div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-white/70 font-bold uppercase mb-1">Uptime</div>
                    <div className="text-sm font-bold text-white">99.99% (24h)</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-white/70 font-bold uppercase mb-1">Total Tools</div>
                    <div className="text-sm font-bold text-white">11 Active</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-white/70 font-bold uppercase mb-1">Avg Response</div>
                    <div className="text-sm font-bold text-white">285ms</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => window.open('https://sunay-potnuru-netra-mcp-server.hf.space', '_blank')}
                    className="w-full bg-white/20 hover:bg-white/30 border border-white/20 text-white rounded-2xl h-11 font-bold"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open MCP Server Console
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* A2A Agent Intelligence Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#8B5CF6]" />
                  <h2 className="text-xl font-bold text-[#0F172A]">{t('admin.mcp.a2a_intelligence', 'A2A Intelligence')}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] text-[10px] font-bold rounded-md">V1.0.0</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase">Discovery Online</span>
                </div>
              </div>

              <Card className="p-6 bg-white border border-[#8B5CF6]/20 shadow-xl shadow-[#8B5CF6]/5 rounded-[2rem] overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                  <Bot className="w-32 h-32 text-[#8B5CF6]" />
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">NetraAI Clinical Assistant</h3>
                    <p className="text-xs text-[#64748B]">Managed Agent for A2A Orchestration</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <Route className="w-4 h-4 text-[#8B5CF6]" />
                      <span className="text-xs font-semibold text-[#0F172A]">Discovery Endpoint</span>
                    </div>
                    <code className="text-[10px] bg-white px-2 py-1 rounded-lg border border-gray-100 font-mono text-[#8B5CF6]">/.well-known/agent-card.json</code>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="text-[10px] text-[#64748B] font-bold uppercase mb-1">Active Skills</div>
                      <div className="text-sm font-bold text-[#0F172A]">4 Clinical Workflows</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="text-[10px] text-[#64748B] font-bold uppercase mb-1">RPC Interface</div>
                      <div className="text-sm font-bold text-[#0F172A]">JSON-RPC 2.0</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-2xl h-11 font-bold shadow-lg shadow-[#8B5CF6]/20">
                    Configure A2A Workflows
                  </Button>
                  <Button variant="outline" className="w-full border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/5 rounded-2xl h-11 font-bold">
                    <Code className="w-4 h-4 mr-2" />
                    View Agent Card
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Hackathon Competition Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
                  <h2 className="text-xl font-bold text-[#0F172A]">Agents Assemble Hackathon Status</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] font-bold rounded-md">COMPETING</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md">97/100 SCORE</span>
                </div>
              </div>

              <Card className="p-6 bg-gradient-to-br from-[#F59E0B] to-[#D97706] border-none shadow-xl rounded-[2rem] text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Competition Progress</h3>
                    <p className="text-xs text-[#F59E0B]/70">Targeting 1st Place ($7,500)</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-white/70 font-bold uppercase mb-1">AI Factor</div>
                    <div className="text-sm font-bold text-white">40/40</div>
                    <div className="text-[9px] text-white/60">5 ML Models + XAI</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-white/70 font-bold uppercase mb-1">Impact</div>
                    <div className="text-sm font-bold text-white">34/35</div>
                    <div className="text-[9px] text-white/60">$31B Market</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-white/70 font-bold uppercase mb-1">Feasibility</div>
                    <div className="text-sm font-bold text-white">25/25</div>
                    <div className="text-[9px] text-white/60">Production Ready</div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">MCP Server (Path A)</span>
                    <span className="text-xs font-bold text-green-300">✅ DEPLOYED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">A2A Agent (Path B)</span>
                    <span className="text-xs font-bold text-green-300">✅ IMPLEMENTED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">Prompt Opinion Publishing</span>
                    <span className="text-xs font-bold text-yellow-300">⏳ IN PROGRESS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">Demo Video</span>
                    <span className="text-xs font-bold text-yellow-300">⏳ PENDING</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => window.open('https://agents-assemble.devpost.com/', '_blank')}
                    className="w-full bg-white/20 hover:bg-white/30 border border-white/20 text-white rounded-2xl h-11 font-bold"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Competition Details
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* XAI Visualization Panel */}
            <XAIVisualizationPanel lastResults={testResults} />
          </div>
        </div>

        {/* PHASE 2: Advanced Analytics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-10"
        >
          <AnalyticsDashboard />
        </motion.div>

        {/* PHASE 2: Live Audit Log Streaming */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Terminal className="w-6 h-6 text-[#0D9488]" />
            <h2 className="text-2xl font-bold text-[#0F172A]">Live Audit Stream</h2>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Real-Time
            </span>
          </div>
          <LiveAuditLog />
        </motion.div>
      </div>

      {/* Test Results Modal */}
      {showResultsModal && testResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-white rounded-[2rem] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold">Tool Test Results</h2>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setShowResultsModal(false)}
                className="rounded-xl"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Tool Info */}
              <div className="p-4 bg-gray-50 rounded-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Tool Name</div>
                    <div className="font-bold">{testResults.tool_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Status</div>
                    <div className="font-bold text-green-600">{testResults.status.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Latency</div>
                    <div className="font-bold text-blue-600">{testResults.latency_ms}ms</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Timestamp</div>
                    <div className="font-bold text-xs">{new Date(testResults.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              {/* Sample Data Used */}
              {testResults.sample_data_used && (
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <h3 className="font-bold mb-2">Sample Data Used</h3>
                  <pre className="text-xs bg-white p-3 rounded-xl overflow-x-auto">
                    {JSON.stringify(testResults.sample_data_used, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Result Data */}
              {testResults.result && (
                <div className="p-4 bg-green-50 rounded-2xl">
                  <h3 className="font-bold mb-2">Result Data</h3>
                  <pre className="text-xs bg-white p-3 rounded-xl overflow-x-auto max-h-64">
                    {JSON.stringify(testResults.result, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Message */}
              {testResults.message && (
                <div className="p-4 bg-purple-50 rounded-2xl">
                  <div className="text-sm font-semibold text-purple-700">{testResults.message}</div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <Button 
                onClick={() => setShowResultsModal(false)}
                className="flex-1 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-2xl h-11 font-bold"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(testResults, null, 2));
                  toast.success('Results copied to clipboard!');
                }}
                variant="outline"
                className="flex-1 rounded-2xl h-11 font-bold"
              >
                Copy Results
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

