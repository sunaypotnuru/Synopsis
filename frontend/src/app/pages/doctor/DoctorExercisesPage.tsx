import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Activity, Plus, Dumbbell, Target, Clock,
  Edit2, Trash2, CheckCircle, Bone
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";

interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  duration_seconds: number;
  target_joints: string[];
}

interface ExercisePayload {
  name: string;
  description: string;
  difficulty: string;
  duration_seconds: number;
  target_joints: string[];
  category: string;
}

export default function DoctorExercisesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [duration, setDuration] = useState(60);
  const [selectedJoints, setSelectedJoints] = useState<string[]>([]);
  
  const JOINT_OPTIONS = [
    t("doctor.exercises.joint_left_shoulder", "LEFT_SHOULDER"),
    t("doctor.exercises.joint_right_shoulder", "RIGHT_SHOULDER"),
    t("doctor.exercises.joint_left_elbow", "LEFT_ELBOW"),
    t("doctor.exercises.joint_right_elbow", "RIGHT_ELBOW"),
    t("doctor.exercises.joint_left_wrist", "LEFT_WRIST"),
    t("doctor.exercises.joint_right_wrist", "RIGHT_WRIST"),
    t("doctor.exercises.joint_left_hip", "LEFT_HIP"),
    t("doctor.exercises.joint_right_hip", "RIGHT_HIP"),
    t("doctor.exercises.joint_left_knee", "LEFT_KNEE"),
    t("doctor.exercises.joint_right_knee", "RIGHT_KNEE"),
    t("doctor.exercises.joint_left_ankle", "LEFT_ANKLE"),
    t("doctor.exercises.joint_right_ankle", "RIGHT_ANKLE")
  ];

  const { data: exercises = [], isLoading } = useQuery<Exercise[]>({
    queryKey: ["exercises"],
    queryFn: async () => {
      const res = await api.get("/api/v1/exercises");
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ExercisePayload) => {
      if (editingId) {
        return api.put(`/api/v1/exercises/${editingId}`, payload);
      }
      return api.post("/api/v1/exercises", payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Exercise updated" : "Exercise created");
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      closeModal();
    },
    onError: (err) => {
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Failed to save exercise");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/exercises/${id}`),
    onSuccess: () => {
      toast.success("Exercise deleted");
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    }
  });

  const openModal = (ex?: Exercise) => {
    if (ex) {
      setEditingId(ex.id);
      setName(ex.name);
      setDescription(ex.description || "");
      setDifficulty(ex.difficulty || "beginner");
      setDuration(ex.duration_seconds || 60);
      setSelectedJoints(ex.target_joints || []);
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
      setDifficulty("beginner");
      setDuration(60);
      setSelectedJoints([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = () => {
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (selectedJoints.length === 0) {
      toast.error("Please select at least one target joint for AR tracking");
      return;
    }
    saveMutation.mutate({
      name,
      description,
      difficulty,
      duration_seconds: duration,
      target_joints: selectedJoints,
      category: "physical_therapy"
    });
  };

  const toggleJoint = (j: string) => {
    setSelectedJoints(prev => 
      prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-[#0D9488]" />
              AR Therapy Exercises
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage physical therapy routines and assign MediaPipe target joints.</p>
          </div>
          <Button onClick={() => openModal()} className="bg-[#0D9488] hover:bg-[#0F766E] text-white gap-2">
            <Plus className="w-4 h-4" /> Create Exercise
          </Button>
        </div>

        {/* Exercises Grid */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : exercises.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
            <Activity className="w-12 h-12 mb-3 text-gray-300" />
            <p>No exercises defined yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => openModal()}>Create your first exercise</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((ex) => (
              <motion.div key={ex.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="p-6 h-full flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{ex.name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => openModal(ex)} className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(ex.id)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                    {ex.description || "No description provided."}
                  </p>
                  
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Difficulty</span>
                      <span className="capitalize font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{ex.difficulty}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Duration</span>
                      <span className="font-medium text-gray-700">{ex.duration_seconds} sec</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Bone className="w-3.5 h-3.5" /> Tracked Joints</span>
                      <span className="font-medium text-[#0D9488] truncate ml-2 max-w-[120px]">
                        {ex.target_joints?.length || 0} selected
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">{editingId ? "Edit Exercise" : "Create AR Exercise"}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exercise Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] outline-none" placeholder="e.g. Shoulder Raise" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] outline-none" placeholder="Instructions..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] outline-none bg-white">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                    <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] outline-none" min="10" />
                  </div>
                </div>

                {/* Target Joints Selector */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Bone className="w-4 h-4 text-[#0D9488]" />
                    AR Tracked Joints (MediaPipe)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {JOINT_OPTIONS.map(j => {
                      const isSelected = selectedJoints.includes(j);
                      return (
                        <button
                          key={j}
                          onClick={() => toggleJoint(j)}
                          className={`text-xs px-3 py-2 rounded-lg border transition-all text-left flex items-center gap-2 ${
                            isSelected 
                              ? "bg-teal-50 border-teal-200 text-teal-800 font-medium" 
                              : "bg-white border-gray-200 text-gray-600 hover:border-teal-100 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full flex shrink-0 items-center justify-center ${isSelected ? "bg-[#0D9488]" : "border border-gray-300"}`}>
                            {isSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="truncate">{j.replace(/_/g, " ")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#0D9488] hover:bg-[#0F766E] text-white">
                  {saveMutation.isPending ? "Saving..." : "Save Exercise"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}

