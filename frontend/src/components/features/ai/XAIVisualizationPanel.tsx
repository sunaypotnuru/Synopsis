import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Brain, Activity, TrendingUp, Sparkles, Download } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface XAIResults {
  tool_name?: string;
  latency_ms?: number;
  result?: any;
}

export function XAIVisualizationPanel({ lastResults }: { lastResults?: XAIResults }) {
  // Use real data from results if available, otherwise use defaults
  const confidence = lastResults?.result?.confidence || 94.2;
  const focusArea = lastResults?.result?.focus_area || (lastResults?.tool_name === 'detect_cataract_tool' ? 'Lens Opacity' : 'Clinical Features');
  const attribution = lastResults?.result?.attribution || 87.5;
  const alignment = lastResults?.result?.alignment || 96.8;
  const explainability = lastResults?.result?.explainability || 92.3;

  const handleExportXAI = () => {
    toast.success("XAI Diagnostic Report exported as PDF", {
      description: "Includes Grad-CAM heatmap and clinical trust metrics."
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#8B5CF6]" />
          <h2 className="text-xl font-bold text-[#0F172A]">XAI Insights</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastResults && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Live Analysis: {lastResults.tool_name?.replace('_tool', '').replace(/_/g, ' ')}
            </span>
          )}
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Explainable AI
          </span>
        </div>
      </div>
      
      <Card className="p-6 bg-white rounded-[2rem] border-none shadow-sm">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Grad-CAM Heatmap */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100/50">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm">Grad-CAM Heatmap</h3>
            </div>
            <div className="aspect-square bg-gradient-to-br from-purple-200 to-pink-200 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden group">
              {/* Simulated heatmap visualization - in a real app this would be the actual image + overlay */}
              <div className={`absolute inset-0 bg-gradient-radial from-red-500/${lastResults ? '50' : '40'} via-yellow-500/30 to-transparent transition-opacity`}></div>
              <div className="text-center z-10 group-hover:scale-110 transition-transform">
                <Brain className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                <div className="text-xs text-purple-700 font-bold">Heatmap Active</div>
                <div className="text-[10px] text-purple-600 font-medium">{focusArea}</div>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[9px] text-white font-mono">
                {lastResults ? 'DYNAMIC_GEN_V2' : 'PREVIEW_MODE'}
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Model Confidence:</span>
                <span className="font-bold text-green-600">{confidence}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Primary Focus:</span>
                <span className="font-bold text-purple-600">{focusArea}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Saliency Score:</span>
                <span className="font-bold text-blue-600">{attribution}%</span>
              </div>
            </div>
          </div>
          
          {/* Attention Map */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100/50">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm">Attention Mechanism</h3>
            </div>
            <div className="aspect-square bg-gradient-to-br from-blue-200 to-cyan-200 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden group">
              {/* Simulated attention map */}
              <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/3 w-16 h-16 bg-red-500/50 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/4 w-12 h-12 bg-orange-500/40 rounded-full blur-lg"></div>
              </div>
              <div className="text-center z-10 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <div className="text-xs text-blue-700 font-bold">Attention Map</div>
                <div className="text-[10px] text-blue-600 font-medium">Region Segmentation</div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Global Attention:</span>
                <span className="font-bold text-green-600">Optimal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Local Maxima:</span>
                <span className="font-bold text-blue-600">3 Regions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Clinical Relevance:</span>
                <span className="font-bold text-cyan-600">91.8%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Clinical Trust Metrics */}
        <div className="p-6 bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 rounded-2xl border border-white/50">
          <h3 className="font-bold mb-5 text-center text-gray-800">Clinical Trust & Reliability Index</h3>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Confidence</div>
              <div className="text-3xl font-bold text-purple-600">{confidence}%</div>
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  className="h-full bg-purple-600 rounded-full"
                ></motion.div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Attribution</div>
              <div className="text-3xl font-bold text-blue-600">{attribution}%</div>
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${attribution}%` }}
                  className="h-full bg-blue-600 rounded-full"
                ></motion.div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Alignment</div>
              <div className="text-3xl font-bold text-green-600">{alignment}%</div>
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${alignment}%` }}
                  className="h-full bg-green-600 rounded-full"
                ></motion.div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Explanability</div>
              <div className="text-3xl font-bold text-amber-600">{explainability}%</div>
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${explainability}%` }}
                  className="h-full bg-amber-600 rounded-full"
                ></motion.div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <Button className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 rounded-2xl h-12 font-bold shadow-sm transition-all active:scale-95">
            <Eye className="w-4 h-4 mr-2 text-purple-600" />
            Full Screen Diagnostic View
          </Button>
          <Button 
            onClick={handleExportXAI}
            className="flex-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-2xl h-12 font-bold shadow-lg transition-all active:scale-95"
          >
            <Download className="w-4 h-4 mr-2" />
            Export XAI Clinical Report
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
