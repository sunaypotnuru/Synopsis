import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, Clock, Globe, AlertTriangle, Download, RefreshCcw, FileText, FileSpreadsheet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useState } from "react";
import { getRequiredApiBaseUrl, getSupabaseAccessToken } from "@/services/authSession";

const COLORS = ['#0D9488', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function AnalyticsDashboard() {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const apiBaseUrl = getRequiredApiBaseUrl();
  
  // Fetch usage trends
  const { data: usageTrends, refetch: refetchUsage } = useQuery({
    queryKey: ["mcp-usage-trends"],
    queryFn: async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/mcp/analytics/usage-trends?timeframe=24h`,
        {
          headers: {
            ...(getSupabaseAccessToken() ? { Authorization: `Bearer ${getSupabaseAccessToken()}` } : {}),
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch usage trends");
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch success rates
  const { data: successRates, refetch: refetchSuccess } = useQuery({
    queryKey: ["mcp-success-rates"],
    queryFn: async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/mcp/analytics/success-rates`,
        {
          headers: {
            ...(getSupabaseAccessToken() ? { Authorization: `Bearer ${getSupabaseAccessToken()}` } : {}),
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch success rates");
      return response.json();
    },
    refetchInterval: 60000
  });

  // Fetch latency distribution
  const { data: latencyDist } = useQuery({
    queryKey: ["mcp-latency-distribution"],
    queryFn: async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/mcp/analytics/latency-distribution`,
        {
          headers: {
            ...(getSupabaseAccessToken() ? { Authorization: `Bearer ${getSupabaseAccessToken()}` } : {}),
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch latency distribution");
      return response.json();
    },
    refetchInterval: 60000
  });

  // Fetch geographic distribution
  const { data: geoDist } = useQuery({
    queryKey: ["mcp-geographic-distribution"],
    queryFn: async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/mcp/analytics/geographic-distribution`,
        {
          headers: {
            ...(getSupabaseAccessToken() ? { Authorization: `Bearer ${getSupabaseAccessToken()}` } : {}),
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch geographic distribution");
      return response.json();
    },
    refetchInterval: 60000
  });

  // Fetch error breakdown
  const { data: errorBreakdown } = useQuery({
    queryKey: ["mcp-error-breakdown"],
    queryFn: async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/mcp/analytics/error-breakdown`,
        {
          headers: {
            ...(getSupabaseAccessToken() ? { Authorization: `Bearer ${getSupabaseAccessToken()}` } : {}),
          }
        }
      );
      if (!response.ok) throw new Error("Failed to fetch error breakdown");
      return response.json();
    },
    refetchInterval: 60000
  });

  const handleRefreshAll = () => {
    toast.promise(
      Promise.all([refetchUsage(), refetchSuccess()]),
      {
        loading: "Refreshing analytics data...",
        success: "Analytics data refreshed!",
        error: "Failed to refresh analytics"
      }
    );
  };

  const handleExportReport = async (format: 'json' | 'pdf' | 'excel' = 'json') => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/mcp/export/analytics-report?format=${format}`,
        {
          headers: {
            ...(getSupabaseAccessToken() ? { Authorization: `Bearer ${getSupabaseAccessToken()}` } : {}),
          }
        }
      );
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'excel' ? 'xlsx' : format;
      a.download = `mcp-analytics-${Date.now()}.${extension}`;
      a.click();
      
      toast.success(`Analytics report exported as ${format.toUpperCase()}!`);
    } catch (error) {
      toast.error("Failed to export analytics report");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-8 pb-12"
    >
      {/* Header with Glassmorphism */}
      <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0D9488]/20 rounded-2xl border border-[#0D9488]/30">
            <BarChart3 className="w-8 h-8 text-[#0D9488]" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Clinical Engine Analytics</h2>
            <p className="text-sm text-gray-500 font-medium">Real-time performance metrics & diagnostic throughput</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            className="h-12 px-6 rounded-2xl border-gray-200 hover:bg-gray-50 font-bold transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCcw className="w-5 h-5 mr-2" />
            Synchronize
          </Button>
          
          <div className="relative">
            <Button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-12 px-8 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-2xl font-bold shadow-[0_10px_30px_rgba(13,148,136,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5 mr-2" />
              Generate Report
            </Button>
            
            {showExportMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-50 overflow-hidden"
              >
                <button
                  onClick={() => { handleExportReport('json'); setShowExportMenu(false); }}
                  className="w-full px-6 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors"
                >
                  <FileText className="w-5 h-5 text-blue-500" />
                  JSON Dataset
                </button>
                <button
                  onClick={() => { handleExportReport('pdf'); setShowExportMenu(false); }}
                  className="w-full px-6 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors"
                >
                  <FileText className="w-5 h-5 text-red-500" />
                  Clinical PDF
                </button>
                <button
                  onClick={() => { handleExportReport('excel'); setShowExportMenu(false); }}
                  className="w-full px-6 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors"
                >
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  Structured XLSX
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
          {[
            { label: "Total Invocations", value: usageTrends?.total_invocations, sub: "Last 24 hours", color: "#0D9488", icon: TrendingUp },
            { label: "Clinical P95", value: `${latencyDist?.percentiles?.p95 || 0}ms`, sub: "Processing latency", color: "#8B5CF6", icon: Clock },
            { label: "System Health", value: `${((successRates?.overall_success_rate || 0) * 100).toFixed(1)}%`, sub: "Uptime success", color: "#10B981", icon: BarChart3 },
            { label: "Peak Load", value: usageTrends?.peak_invocations, sub: "Concurrent requests", color: "#3B82F6", icon: Globe },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-6 rounded-[2.5rem] bg-white border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-full -mr-8 -mt-8" style={{ backgroundColor: stat.color }} />
              <div className="flex flex-col gap-1 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-2 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                   </div>
                   <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">{stat.label}</span>
                </div>
                <div className="text-3xl font-black text-gray-900 tracking-tighter">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value || "0"}
                </div>
                <div className="text-xs text-gray-400 font-bold">{stat.sub}</div>
              </div>
            </motion.div>
          ))}
      </div>

      {/* Primary Usage Chart */}
      <Card className="p-8 bg-white rounded-[3rem] border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-[#0D9488]" />
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Diagnostic Throughput Trends</h3>
          </div>
          <div className="flex gap-2">
             {['24h', '7d', '30d'].map(t => (
               <button key={t} className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${t === '24h' ? 'bg-[#0D9488] text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                 {t.toUpperCase()}
               </button>
             ))}
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={usageTrends?.data || []}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" stroke="#CBD5E1" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} />
            <YAxis stroke="#CBD5E1" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(10px)',
                border: 'none', 
                borderRadius: '20px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                padding: '15px'
              }}
              itemStyle={{ fontWeight: 800, fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="total_invocations" stroke="#0D9488" strokeWidth={5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} name="Total Requests" />
            <Line type="monotone" dataKey="anemia" stroke="#EF4444" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Anemia" />
            <Line type="monotone" dataKey="cataract" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Cataract" />
            <Line type="monotone" dataKey="dr" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Retinopathy" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-3 gap-8">
        {/* Success Rates Card */}
        <Card className="p-8 bg-white rounded-[3rem] border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-5 h-5 text-[#10B981]" />
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Clinical Reliability</h3>
          </div>
          
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={successRates?.tools?.slice(0, 5) || []}>
              <XAxis dataKey="category" stroke="#CBD5E1" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="success_rate" fill="#10B981" radius={[10, 10, 10, 10]} barSize={25} />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
             <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Avg Success</div>
                <div className="text-xl font-black text-gray-900">{((successRates?.overall_success_rate || 0) * 100).toFixed(1)}%</div>
             </div>
             <div className="h-10 w-px bg-gray-200" />
             <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total Hits</div>
                <div className="text-xl font-black text-gray-900">{successRates?.total_successful?.toLocaleString() || "0"}</div>
             </div>
          </div>
        </Card>

        {/* Latency Card */}
        <Card className="p-8 bg-white rounded-[3rem] border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 mb-8">
            <Clock className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Response Profiles</h3>
          </div>
          
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={latencyDist?.buckets || []}>
              <XAxis dataKey="range" stroke="#CBD5E1" fontSize={9} fontWeight={700} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '15px', border: 'none' }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[10, 10, 10, 10]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { l: "P50", v: latencyDist?.percentiles?.p50, c: "blue" },
                { l: "P95", v: latencyDist?.percentiles?.p95, c: "purple" },
                { l: "P99", v: latencyDist?.percentiles?.p99, c: "amber" }
              ].map((p, i) => (
                <div key={i} className={`p-3 bg-${p.c}-50 rounded-xl border border-${p.c}-100 text-center`}>
                   <div className={`text-[9px] font-black text-${p.c}-700 uppercase`}>{p.l}</div>
                   <div className={`text-sm font-black text-${p.c}-900`}>{p.v || 0}ms</div>
                </div>
              ))}
          </div>
        </Card>

        {/* Geo Distribution */}
        <Card className="p-8 bg-white rounded-[3rem] border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 mb-8">
            <Globe className="w-5 h-5 text-[#8B5CF6]" />
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Global Reach</h3>
          </div>
          
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={geoDist?.regions || []}
                dataKey="requests"
                nameKey="region"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={8}
              >
                {(geoDist?.regions || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="mt-6 flex justify-center gap-4">
             {(geoDist?.regions || []).slice(0, 3).map((r: any, i: number) => (
               <div key={i} className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-[10px] font-black text-gray-400">{r.region}</span>
               </div>
             ))}
          </div>
        </Card>
      </div>

      {/* Error Logic Card */}
      <Card className="p-10 bg-white rounded-[4rem] border-gray-100 shadow-[0_30px_90px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Diagnostic Error Taxonomy</h3>
                <p className="text-sm text-gray-400 font-medium italic">Identification and severity mapping of system anomalies</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-amber-50 rounded-2xl border border-amber-100">
               <span className="text-sm font-black text-amber-700">Aggregate Error Rate: </span>
               <span className="text-2xl font-black text-amber-600">{((errorBreakdown?.error_rate || 0) * 100).toFixed(2)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {(errorBreakdown?.error_types || []).map((error: any, index: number) => (
              <motion.div 
                key={index} 
                whileHover={{ scale: 1.02 }}
                className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black text-gray-900 tracking-tight">{error.type}</span>
                    <span className={`w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      error.severity === 'high' ? 'bg-red-500 text-white shadow-[0_5px_15px_rgba(239,68,68,0.3)]' :
                      error.severity === 'medium' ? 'bg-amber-500 text-white shadow-[0_5px_15px_rgba(245,158,11,0.3)]' :
                      'bg-blue-500 text-white'
                    }`}>
                      {error.severity} Risk
                    </span>
                  </div>
                  <div className="text-2xl font-black text-gray-300">#{index + 1}</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-gray-500">
                    <span>Incidents</span>
                    <span>{error.count}</span>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden border border-gray-100 p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        error.severity === 'high' ? 'bg-red-500' :
                        error.severity === 'medium' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${error.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold italic text-right">{error.percentage}% of anomaly volume</div>
                </div>
              </motion.div>
            ))}
          </div>
      </Card>
    </motion.div>
  );
}
