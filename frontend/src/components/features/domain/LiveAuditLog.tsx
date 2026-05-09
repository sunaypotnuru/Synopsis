import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Download, Filter, Pause, Play, Wifi, WifiOff, FileText, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { getRequiredApiBaseUrl, getSupabaseAccessToken } from "@/services/authSession";

interface AuditLog {
  id: string;
  timestamp: string;
  tool_name: string;
  status: string;
  patient_id: string;
  latency_ms: number;
  event_type: string;
  details?: {
    user_id?: string;
    ip_address?: string;
    category?: string;
  };
}

export function LiveAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pausedLogsRef = useRef<AuditLog[]>([]);

  const connectWebSocket = () => {
    try {
      // Get WebSocket URL (replace http with ws)
      const apiUrl = getRequiredApiBaseUrl();
      const token = getSupabaseAccessToken();
      const baseWsUrl = apiUrl.replace(/^http/, 'ws') + '/api/v1/admin/mcp/ws/audit-logs';
      const wsUrl = token ? `${baseWsUrl}?token=${encodeURIComponent(token)}` : baseWsUrl;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        toast.success('Connected to live audit stream');
        
        // Send ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
        
        ws.addEventListener('close', () => {
          clearInterval(pingInterval);
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const logEntry = JSON.parse(event.data);
          
          // Ignore pong messages
          if (logEntry.type === 'pong') return;
          
          if (!isPaused) {
            setLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100
          } else {
            pausedLogsRef.current.push(logEntry);
          }
        } catch (error) {
          console.error('Error parsing log entry:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        toast.error('Disconnected from audit stream');
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('WebSocket connection error');
      };
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      toast.error('Failed to connect to audit stream');
    }
  };

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const handlePauseResume = () => {
    if (isPaused) {
      // Resume: add paused logs to main logs
      setLogs(prev => [...pausedLogsRef.current, ...prev].slice(0, 100));
      pausedLogsRef.current = [];
      setIsPaused(false);
      toast.success('Audit stream resumed');
    } else {
      // Pause
      setIsPaused(true);
      toast.info('Audit stream paused');
    }
  };

  const handleExportLogs = async (format: 'csv' | 'pdf' | 'excel' = 'csv') => {
    try {
      let endpoint = '';
      let extension = '';
      
      if (format === 'csv') {
        endpoint = `${getRequiredApiBaseUrl()}/api/v1/admin/mcp/export/audit-logs?format=csv`;
        extension = 'csv';
      } else if (format === 'pdf') {
        endpoint = `${getRequiredApiBaseUrl()}/api/v1/admin/mcp/export/audit-logs-pdf`;
        extension = 'pdf';
      } else if (format === 'excel') {
        endpoint = `${getRequiredApiBaseUrl()}/api/v1/admin/mcp/export/audit-logs-excel`;
        extension = 'xlsx';
      }
      
      const token = getSupabaseAccessToken();
      const response = await fetch(endpoint, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.${extension}`;
      a.click();
      
      toast.success(`Audit logs exported as ${format.toUpperCase()}!`);
    } catch (error) {
      toast.error('Failed to export audit logs');
    }
  };

  const filteredLogs = filter 
    ? logs.filter(log => 
        log.tool_name.toLowerCase().includes(filter.toLowerCase()) ||
        log.status.toLowerCase().includes(filter.toLowerCase()) ||
        log.patient_id.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="bg-[#0F172A] border-none shadow-2xl rounded-[2rem] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              {isConnected ? 'Stream Active' : 'Disconnected'}
            </span>
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handlePauseResume}
              className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/10"
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </>
              )}
            </Button>
            
            {/* Export dropdown menu */}
            <div className="relative">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      handleExportLogs('csv');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                  >
                    <FileText className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => {
                      handleExportLogs('pdf');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      handleExportLogs('excel');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Excel
                  </button>
                </div>
              )}
            </div>
            
            <Terminal className="w-3.5 h-3.5 text-gray-500" />
          </div>
        </div>
        
        {/* Filter */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Filter by tool, status, or patient ID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0D9488] transition-colors"
            />
          </div>
        </div>
        
        {/* Logs */}
        <div className="p-4 h-[500px] overflow-y-auto space-y-3 font-mono text-[11px] custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredLogs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-gray-500"
              >
                <Terminal className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">
                  {isConnected ? 'Waiting for audit logs...' : 'Connecting to audit stream...'}
                </p>
              </motion.div>
            ) : (
              filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-[#0D9488]/30 transition-all group"
                >
                  <span className="text-gray-600 group-hover:text-[#0D9488] transition-colors min-w-[60px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 font-bold truncate">
                        {log.tool_name.replace('_tool', '').replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        log.status === 'SUCCESS' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-gray-500 text-[10px]">
                      <span>LAT: {Math.round(log.latency_ms)}ms</span>
                      <span>PID: {log.patient_id}</span>
                      {log.details?.category && (
                        <span className="px-2 py-0.5 bg-[#0D9488]/20 text-[#0D9488] rounded-full">
                          {log.details.category}
                        </span>
                      )}
                    </div>
                    
                    {log.details?.user_id && (
                      <div className="mt-1 text-[10px] text-gray-600">
                        User: {log.details.user_id} | IP: {log.details.ip_address}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer Stats */}
        <div className="p-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
          <div>
            Showing {filteredLogs.length} of {logs.length} logs
            {isPaused && pausedLogsRef.current.length > 0 && (
              <span className="ml-2 text-amber-500">
                ({pausedLogsRef.current.length} paused)
              </span>
            )}
          </div>
          <div>
            {isConnected ? 'Real-time streaming' : 'Reconnecting...'}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
