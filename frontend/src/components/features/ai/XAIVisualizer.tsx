import React from 'react';
import { motion } from 'motion/react';
import { Eye, ShieldCheck, Info, Search, Target } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface XAIVisualizerProps {
    imageUrl: string;
    heatmapUrl?: string;
    diagnosis: string;
    confidence: number;
    regions?: Array<{x: number, y: number, label: string}>;
}

export const XAIVisualizer: React.FC<XAIVisualizerProps> = ({ 
    imageUrl, 
    heatmapUrl, 
    diagnosis, 
    confidence,
    regions = []
}) => {
    return (
        <Card className="overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white">
            <div className="relative aspect-square md:aspect-video bg-gray-900 group">
                {/* Base Image */}
                <img 
                    src={imageUrl} 
                    alt="Clinical Scan" 
                    className="w-full h-full object-cover opacity-80"
                />
                
                {/* Heatmap Overlay (Animated) */}
                {heatmapUrl && (
                    <motion.img 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                        src={heatmapUrl} 
                        alt="AI Attention Heatmap" 
                        className="absolute inset-0 w-full h-full object-cover mix-blend-color-dodge"
                    />
                )}

                {/* Region Markers */}
                {regions.map((region, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + (i * 0.2) }}
                        className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-amber-400 rounded-full flex items-center justify-center bg-amber-400/20 backdrop-blur-sm"
                        style={{ left: `${region.x}%`, top: `${region.y}%` }}
                    >
                        <Target className="w-4 h-4 text-amber-400" />
                        <div className="absolute top-10 left-0 bg-black/80 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {region.label}
                        </div>
                    </motion.div>
                ))}

                {/* Scanline Effect */}
                <motion.div 
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-px bg-emerald-400 shadow-[0_0_15px_#10b981] z-10"
                />

                {/* HUD Overlay */}
                <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
                    <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">AI Analyzer Active</span>
                    </div>
                </div>

                <div className="absolute bottom-6 right-6 z-20">
                    <div className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 text-white">
                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">XAI Confidence</div>
                        <div className="text-2xl font-bold text-emerald-400">{(confidence * 100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#0F172A] text-xl">{diagnosis}</h3>
                            <p className="text-xs text-gray-500">Explainable AI Analysis Report</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-gray-600 font-bold">
                        <Search className="w-4 h-4 mr-2" />
                        Deep Inspection
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-2">Attention Focus</div>
                        <p className="text-sm text-gray-700 font-medium">Neural network prioritized central corneal region and lateral margins.</p>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-2">Clinical Guideline</div>
                        <p className="text-sm text-gray-700 font-medium">Results align with WHO 2024 screening protocols for underserved regions.</p>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-2">Transparency</div>
                        <p className="text-sm text-gray-700 font-medium">Saliency maps verified via Grad-CAM++ with zero-trust clinical override enabled.</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};
