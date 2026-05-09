import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { GitBranch, CheckCircle, Clock, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { complianceAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Requirement {
  id: string;
  title: string;
  description: string;
  safety_class?: string;
}

export default function AdminIEC62304Traceability() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["iecCoverageStats"],
    queryFn: () => complianceAPI.getIECCoverageStats().then(res => res.data),
  });

  const { data: requirements, isLoading: reqsLoading } = useQuery({
    queryKey: ["iecRequirements"],
    queryFn: () => complianceAPI.getIECRequirements().then(res => res.data),
  });

  if (statsLoading || reqsLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  const phases = [
    { phase: "1 - Concept", status: "Complete", items: 12, done: 12 },
    { phase: "2 - Design", status: "Complete", items: 18, done: 18 },
    { phase: "3 - Implementation", status: "Complete", items: 45, done: 45 },
    { phase: "4 - Verification", status: "In Progress", items: 30, done: 24 },
    { phase: "5 - Release", status: "Pending", items: 10, done: 0 },
    { phase: "6 - Post-Production", status: "Pending", items: 9, done: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">IEC 62304 Traceability</h1>
        <p className="text-[#64748B] text-sm">Medical Device Software Lifecycle Compliance &amp; Requirement Traceability Matrix</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">{stats?.fully_traced_requirements ?? 0}</p>
          <p className="text-sm text-[#64748B]">Requirements Verified</p>
        </Card>
        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
          <Clock className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">{(stats?.total_requirements || 0) - (stats?.fully_traced_requirements || 0)}</p>
          <p className="text-sm text-[#64748B]">In Progress</p>
        </Card>
        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
          <FileText className="w-6 h-6 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">{stats?.total_requirements ?? 0}</p>
          <p className="text-sm text-[#64748B]">Total Requirements</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-[#0F172A]">Software Development Lifecycle Phases</h2>
          </div>
          <div className="space-y-3">
            {phases.map((p, i) => (
              <motion.div key={p.phase} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-xl border border-gray-100/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.status === "Complete" ? "bg-green-500" : p.status === "In Progress" ? "bg-amber-500" : "bg-gray-300"}`} />
                  <span className="font-semibold text-sm text-[#0F172A]">Phase {p.phase}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-[11px] font-medium text-[#64748B] uppercase tracking-tight">{p.done}/{p.items} items</div>
                  <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(p.done / p.items) * 100}%` }} transition={{ duration: 1, delay: i * 0.1 }} className="h-1.5 rounded-full bg-teal-500" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.status === "Complete" ? "bg-green-100 text-green-700" : p.status === "In Progress" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-[#0F172A]">Latest Requirements</h2>
          </div>
          <div className="space-y-4">
            {(requirements || []).length > 0 ? (requirements || []).slice(0, 8).map((req: Requirement) => (
              <div key={req.id} className="pb-3 border-b border-gray-50 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-mono text-blue-600 font-bold">{req.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{req.safety_class || 'B'}</span>
                </div>
                <p className="text-sm font-medium text-[#0F172A] line-clamp-1">{req.title}</p>
                <p className="text-xs text-[#64748B] line-clamp-2 mt-1">{req.description}</p>
              </div>
            )) : (
              <p className="text-sm text-gray-400 italic">No requirements tracked in database yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

