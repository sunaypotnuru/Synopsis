import { motion } from "motion/react";
import { MessageSquare, Clock, CheckCircle, AlertCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { complianceAPI } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
const severityColors: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-green-100 text-green-700",
};
const statusColors: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Under Review": "bg-amber-100 text-amber-700",
  Resolved: "bg-green-100 text-green-700",
};

export default function AdminComplaintManagement() {
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => complianceAPI.getComplaints().then(res => res.data),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => complianceAPI.resolveComplaint(id),
    onSuccess: () => {
      toast.success("Complaint marked as resolved.");
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["soc2Stats"] }); // refresh dashboard stats potentially
    },
    onError: () => toast.error("Failed to resolve complaint.")
  });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;
  }

  interface Complaint {
    id: string;
    subject: string;
    category: string;
    status: string;
    severity?: string;
    created_at: string;
    reporter?: {
      full_name?: string;
      email?: string;
    };
    [key: string]: unknown;
  }

  const filtered = (complaints as Complaint[]).filter((c) =>
    c.subject.toLowerCase().includes(query.toLowerCase()) ||
    c.id.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const counts = {
    open: (complaints as Complaint[]).filter((c) => c.status === "Open").length,
    inProgress: (complaints as Complaint[]).filter((c) => c.status === "In Progress" || c.status === "Under Review").length,
    resolved: (complaints as Complaint[]).filter((c) => c.status === "Resolved").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Complaint Management</h1>
        <p className="text-[#64748B] text-sm">Track and resolve patient/doctor complaints in compliance with FDA MDR requirements</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border border-gray-100">
          <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">{counts.open}</p>
          <p className="text-sm text-[#64748B]">Open Complaints</p>
        </Card>
        <Card className="p-5 bg-white border border-gray-100">
          <Clock className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">{counts.inProgress}</p>
          <p className="text-sm text-[#64748B]">In Progress / Under Review</p>
        </Card>
        <Card className="p-5 bg-white border border-gray-100">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">{counts.resolved}</p>
          <p className="text-sm text-[#64748B]">Resolved</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-[#0F172A]">All Complaints</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search complaints..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[#64748B]">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider">Ticket ID</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider">Reporter</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider">Subject</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider">Category</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider">Severity</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="border-b border-gray-50 hover:bg-gray-50 group">
                  <td className="py-4 pr-4">
                    <div className="text-xs font-mono text-[#0F172A]">{c.id.split("-")[0]}...</div>
                    <div className="text-[10px] text-[#64748B]">{new Date(c.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-sm font-medium text-[#0F172A]">{c.reporter?.full_name || "System Submitter"}</div>
                    <div className="text-xs text-[#64748B]">{c.reporter?.email || "internal@netraai.com"}</div>
                  </td>
                  <td className="py-4 pr-4 max-w-xs">
                    <div className="text-sm text-[#0F172A] truncate">{c.subject}</div>
                  </td>
                  <td className="py-4 pr-4 text-sm text-[#64748B]">{c.category}</td>
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${c.severity ? severityColors[c.severity] || "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700"}`}>
                      {c.severity || "Unknown"}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${statusColors[c.status] || "bg-gray-100 text-gray-700"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    {c.status !== "Resolved" && (
                      <button 
                        onClick={() => resolveMutation.mutate(c.id)}
                        disabled={resolveMutation.isPending}
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>

          </table>
        </div>
      </Card>
    </div>
  );
}

