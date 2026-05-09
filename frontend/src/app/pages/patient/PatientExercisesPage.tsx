import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Activity, Dumbbell, PlayCircle, Target, Clock, Bone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";

interface PatientExercise {
  id: string; // patient_exercise_id
  prescribed_reps: number;
  prescribed_sets: number;
  exercises: {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    duration_seconds: number;
    target_joints: string[];
  };
}

export default function PatientExercisesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: assignments = [], isLoading } = useQuery<PatientExercise[]>({
    queryKey: ["myExercises"],
    queryFn: async () => {
      const res = await api.get("/api/v1/exercises/my-exercises");
      return res.data;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] shadow-lg shadow-teal-200">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            {t("patient.exercises.title", "My Physical Therapy")}
          </h1>
          <p className="text-gray-500 mt-2 ml-14">
            {t("patient.exercises.subtitle", "Complete your prescribed AR tracking exercises below.")}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : assignments.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
            <Activity className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900 mb-1">{t("patient.exercises.none", "No Exercises Assigned")}</p>
            <p>{t("patient.exercises.none_desc", "Your doctor has not prescribed any physical therapy routines yet.")}</p>
            <Button className="mt-6 bg-[#0EA5E9]" onClick={() => navigate("/patient/doctors")}>
              Consult a Doctor
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {assignments.map((assignment) => {
              const ex = assignment.exercises;
              return (
                <motion.div key={assignment.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-all group">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{ex.name}</h3>
                        <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">
                          {ex.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                        {ex.description || "No description provided."}
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <Target className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600 w-24">Goal:</span>
                          <span className="font-semibold">{assignment.prescribed_sets} sets of {assignment.prescribed_reps} reps</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600 w-24">Duration:</span>
                          <span className="font-semibold">{ex.duration_seconds} sec</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Bone className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600 w-24">Joints:</span>
                          <span className="font-semibold text-[#0D9488]">
                            {ex.target_joints?.length || 0} tracked points
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto">
                      <Button 
                        className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white gap-2 group-hover:shadow-md transition-all"
                        onClick={() => navigate(`/patient/exercises/${assignment.id}/session`)}
                      >
                        <PlayCircle className="w-5 h-5" />
                        {t("patient.exercises.start", "Start AR Session")}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

