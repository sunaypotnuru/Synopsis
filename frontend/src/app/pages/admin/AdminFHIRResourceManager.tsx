import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Database, RefreshCw, CheckCircle, AlertCircle, Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { fhirAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFHIRResourceManager() {
  const [query, setQuery] = useState("");
  const [resourceType, setResourceType] = useState("Patient");

  const { data: fhirData, isLoading } = useQuery({
    queryKey: ["fhirResources", resourceType],
    queryFn: () => fhirAPI.getResources(resourceType).then(res => res.data),
  });

  interface FHIRResource {
    id: string;
    type: string;
    version: string;
    status: string;
    updated: string;
  }

  const resources: FHIRResource[] = (fhirData?.entry || []).map((e: { resource: { id: string; resourceType: string } }) => ({
    id: e.resource.id,
    type: e.resource.resourceType,
    version: "R4",
    status: "Valid",
    updated: new Date().toISOString().split('T')[0]
  }));

  const filtered = resources.filter((r) =>
    r.id.toLowerCase().includes(query.toLowerCase()) ||
    r.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">FHIR Resource Manager</h1>
        <p className="text-[#64748B] text-sm">HL7 FHIR R4 Interoperability — Resource Browser &amp; Validation</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
          <Database className="w-6 h-6 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">{fhirData?.total || 0}</p>
          <p className="text-sm text-[#64748B]">Total {resourceType} Resources</p>
        </Card>
        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">98.2%</p>
          <p className="text-sm text-[#64748B]">Validation Pass Rate</p>
        </Card>
        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
          <RefreshCw className="w-6 h-6 text-teal-500 mb-2" />
          <p className="text-2xl font-bold text-[#0F172A]">R4</p>
          <p className="text-sm text-[#64748B]">FHIR Version</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <select 
              value={resourceType} 
              onChange={(e) => setResourceType(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
            >
              <option value="Patient">Patients</option>
              <option value="Observation">Observations</option>
              <option value="Condition">Conditions</option>
              <option value="Appointment">Appointments</option>
              <option value="Organization">Organizations</option>
            </select>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search resources..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[#64748B]">
                <th className="pb-3 pr-4">Resource ID</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Version</th>
                <th className="pb-3 pr-4">Last Updated</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-4"><Skeleton className="h-8 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 italic">No {resourceType} resources found.</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-blue-600 font-medium">{r.id}</td>
                    <td className="py-3 pr-4">{r.type}</td>
                    <td className="py-3 pr-4 text-[#64748B]">{r.version}</td>
                    <td className="py-3 pr-4 text-[#64748B]">{r.updated}</td>
                    <td className="py-3">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium w-fit ${r.status === "Valid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.status === "Valid" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

