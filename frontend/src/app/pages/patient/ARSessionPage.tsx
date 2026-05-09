import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camera } from "@mediapipe/camera_utils";
import { Pose, POSE_CONNECTIONS, Results } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Clock, Save, ArrowLeft, Play, Square, Loader2, Camera as CameraIcon, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useRepDetection } from "../../hooks/useRepDetection";

interface ExerciseAssignment {
  id: string;
  prescribed_reps?: number;
  prescribed_sets?: number;
  exercises?: {
    type?: string;
    name?: string;
    description?: string;
    target_reps?: number;
    duration_minutes?: number;
    duration_seconds?: number;
    target_joints?: string[];
    target_pose?: Record<string, number>;
  };
}

type PlayState = 'idle' | 'initializing' | 'running' | 'completed';

export default function ARSessionPage() {
  const { t } = useTranslation();
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const poseRef = useRef<Pose | null>(null);

  const [state, setState] = useState<PlayState>('idle');
  const [sets] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [accuracy, setAccuracy] = useState(100);
  const [currentAngles, setCurrentAngles] = useState<Record<string, number> | null>(null);
  const [jointAccuracy, setJointAccuracy] = useState<Record<string, number>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Assignment details
  const { data: assignments = [] } = useQuery<ExerciseAssignment[]>({
    queryKey: ["myExercises"],
    queryFn: async () => {
      const res = await api.get("/api/v1/exercises/my-exercises");
      return res.data;
    }
  });

  const assignment = (assignments || []).find((a: ExerciseAssignment) => a.id === assignmentId);
  const exercise = assignment?.exercises;

  // Use the rep detection hook
  const { repCount, repState, reset: resetReps } = useRepDetection(
    (exercise?.type === 'shoulder_press' ? 'shoulder_raises' : exercise?.type || 'bicep_curls') as 'bicep_curls' | 'squats' | 'shoulder_raises',
    currentAngles
  );

  const saveMutation = useMutation({
    mutationFn: (payload: {
      patient_exercise_id: string;
      reps_completed: number;
      sets_completed: number;
      duration_seconds: number;
      accuracy_percent: number;
      pain_level: number;
      notes: string;
      joint_data: Record<string, number>;
    }) => api.post("/api/v1/exercises/sessions", payload),
    onSuccess: () => {
      toast.success("Session saved successfully!");
      navigate("/patient/exercises");
    },
    onError: () => toast.error("Failed to save session.")
  });

  // Helper function to calculate angle between three points
  const calculateAngle = useCallback((a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }, []);

  // Calculate all joint angles from landmarks
  const calculateJointAngles = useCallback((landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>) => {
    return {
      leftElbow: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
      rightElbow: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
      leftKnee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
      rightKnee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
      leftShoulder: calculateAngle(landmarks[13], landmarks[11], landmarks[23]),
      rightShoulder: calculateAngle(landmarks[14], landmarks[12], landmarks[24]),
      leftHip: calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
      rightHip: calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
    };
  }, [calculateAngle]);

  // Compare current angles with target pose
  const compareWithTarget = useCallback((current: Record<string, number>, target: Record<string, number>, tolerance: number = 15) => {
    if (!target) return { overall: 100, joints: {} };
    
    const scores: Record<string, number> = {};
    Object.keys(target).forEach(joint => {
      if (current[joint] !== undefined) {
        const diff = Math.abs(current[joint] - target[joint]);
        scores[joint] = diff <= tolerance ? 100 : Math.max(0, 100 - (diff - tolerance) * 2);
      }
    });
    
    const overall = Object.values(scores).length > 0
      ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
      : 100;
    
    return { overall, joints: scores };
  }, []);

  // MediaPipe pose detection callback
  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw Video
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw Pose
    if (results.poseLandmarks) {
      // Calculate joint angles
      const angles = calculateJointAngles(results.poseLandmarks);
      setCurrentAngles(angles);

      // Compare with target pose if available
      if (exercise?.target_pose) {
        const accuracyScores = compareWithTarget(angles, exercise.target_pose);
        setAccuracy(accuracyScores.overall);
        setJointAccuracy(accuracyScores.joints);
      }

      // Draw connections with color based on accuracy
      const connectionColor = accuracy > 85 ? "#10B981" : accuracy > 60 ? "#F59E0B" : "#EF4444";
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: connectionColor, lineWidth: 4
      });
      
      // Draw landmarks
      drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: "#0EA5E9", lineWidth: 2, radius: 5
      });

      // Draw joint accuracy indicators
      if (exercise?.target_joints && jointAccuracy) {
        const jointLandmarks: Record<string, number> = {
          leftElbow: 13,
          rightElbow: 14,
          leftKnee: 25,
          rightKnee: 26,
          leftShoulder: 11,
          rightShoulder: 12,
        };

        exercise.target_joints.forEach((joint: string) => {
          const landmarkIndex = jointLandmarks[joint];
          if (landmarkIndex && results.poseLandmarks[landmarkIndex]) {
            const landmark = results.poseLandmarks[landmarkIndex];
            const x = landmark.x * canvasRef.current!.width;
            const y = landmark.y * canvasRef.current!.height;
            const score = jointAccuracy[joint] || 0;
            
            // Draw accuracy circle
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 15, 0, 2 * Math.PI);
            canvasCtx.fillStyle = score > 85 ? "#10B98180" : score > 60 ? "#F59E0B80" : "#EF444480";
            canvasCtx.fill();
            canvasCtx.strokeStyle = score > 85 ? "#10B981" : score > 60 ? "#F59E0B" : "#EF4444";
            canvasCtx.lineWidth = 3;
            canvasCtx.stroke();
          }
        });
      }
    }
    canvasCtx.restore();
  }, [exercise, accuracy, jointAccuracy, calculateJointAngles, compareWithTarget]);

  const initCamera = useCallback(() => {
    if (!videoRef.current) return;

    setState('initializing');

    const pose = new Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    pose.onResults(onResults);
    poseRef.current = pose;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await pose.send({ image: videoRef.current });
        }
      },
      width: 1280,
      height: 720
    });
    camera.start().then(() => {
      setState('running');
      if (exercise?.duration_seconds) setTimeLeft(exercise.duration_seconds);
      resetReps(); // Reset rep counter when starting
    });
    cameraRef.current = camera;

  }, [onResults, exercise, resetReps]);

  const stopCamera = useCallback(() => {
    setState('completed');
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    if (poseRef.current) {
      poseRef.current.close();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Timer effect
  useEffect(() => {
    if (state === 'running' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            stopCamera();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, timeLeft, stopCamera]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (poseRef.current) poseRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!assignment || !exercise) {
    return <div className="p-12 text-center text-gray-500">{t('patient.a_r_session_page.loading_or_invalid_assignment', "Loading or invalid assignment...")}</div>;
  }

  const handleFinish = () => {
    saveMutation.mutate({
      patient_exercise_id: assignment?.id || '',
      reps_completed: repCount,
      sets_completed: sets,
      duration_seconds: (exercise?.duration_seconds || 0) - timeLeft,
      accuracy_percent: Math.round(accuracy),
      pain_level: 0, // In real flow, pop up a modal asking for pain 1-10
      notes: "Completed via AR Session with enhanced pose tracking",
      joint_data: currentAngles || {} // Store final joint angles
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* Sidebar HUD */}
      <div className="w-full md:w-80 bg-gray-900 border-r border-gray-800 flex flex-col p-6 text-white shrink-0 z-10">
        <button onClick={() => { stopCamera(); navigate(-1); }} className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />{t('patient.a_r_session_page.back_to_dashboard_1', "Back to Dashboard")}</button>

        <h1 className="text-2xl font-bold mb-2">{exercise.name}</h1>
        <p className="text-gray-400 text-sm mb-8">{exercise.description}</p>

        <div className="flex-1 space-y-6">
          {/* Timer */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm flex items-center"><Clock className="w-4 h-4 mr-1"/>{t('patient.a_r_session_page.time_left_2', "Time Left")}</span>
              <span className="text-2xl font-mono text-white">00:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
            <Progress value={(timeLeft / (exercise.duration_seconds ?? 1)) * 100} className="h-1 bg-gray-700 indicator-white" />
          </div>

          {/* Reps/Sets */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
              <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">{t('patient.a_r_session_page.reps_3', "Reps")}</span>
              <span className="text-3xl font-bold text-[#0D9488]">{repCount}</span>
              <span className="text-gray-500 text-sm"> / {assignment.prescribed_reps}</span>
              {repState === 'up' && (
                <div className="mt-2 text-xs text-green-400 font-semibold animate-pulse">
                  ↑ {t('patient.a_r_session_page.up_position', "UP")}
                </div>
              )}
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
              <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">{t('patient.a_r_session_page.sets_4', "Sets")}</span>
              <span className="text-3xl font-bold text-blue-400">{sets}</span>
              <span className="text-gray-500 text-sm"> / {assignment.prescribed_sets}</span>
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm flex items-center"><Activity className="w-4 h-4 mr-1"/>{t('patient.a_r_session_page.form_accuracy_5', "Form Accuracy")}</span>
              <span className={`text-xl font-bold ${accuracy > 85 ? 'text-green-400' : accuracy > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {Math.round(accuracy)}%
              </span>
            </div>
            <Progress value={accuracy} className="h-2 bg-gray-700" />
            <p className="text-xs text-gray-500 mt-2 text-center">Tracking {exercise.target_joints?.length || 0} joints</p>
          </div>
        </div>

        {/* Controls */}
        <div className="pt-6 mt-6 border-t border-gray-800 space-y-3">
          {state === 'idle' && (
            <Button onClick={initCamera} className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white py-6 text-lg">
              <Play className="w-5 h-5 mr-2" />{t('patient.a_r_session_page.start_session_6', "Start Session")}</Button>
          )}
          {state === 'initializing' && (
            <Button disabled className="w-full bg-gray-800 text-white py-6 text-lg">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('patient.a_r_session_page.loading_ai_model_7', "Loading AI Model...")}</Button>
          )}
          {state === 'running' && (
            <Button onClick={stopCamera} className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg">
              <Square className="w-5 h-5 mr-2 fill-current" />{t('patient.a_r_session_page.stop_session_8', "Stop Session")}</Button>
          )}
          {state === 'completed' && (
            <Button onClick={handleFinish} disabled={saveMutation.isPending} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 text-lg">
              <Save className="w-5 h-5 mr-2" /> {saveMutation.isPending ? "Saving..." : "Save Progress"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Camera Feed */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {state === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gray-900/80 backdrop-blur-sm">
            <div className="w-24 h-24 rounded-full bg-teal-500/20 flex items-center justify-center mb-6">
              <CameraIcon className="w-10 h-10 text-teal-400" />
            </div>
            <h2 className="text-white text-2xl font-semibold mb-2">{t('patient.a_r_session_page.camera_required_9', "Camera Required")}</h2>
            <p className="text-gray-400 text-center max-w-sm">{t('patient.a_r_session_page.please_position_your_device_10', "Please position your device so your full body is visible in the frame before starting.")}</p>
          </div>
        )}

        <video ref={videoRef} className="hidden" playsInline />
        <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full object-contain" />
        
        {/* Success Overlay */}
        <AnimatePresence>
          {state === 'completed' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md"
            >
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 text-center max-w-sm w-full mx-4 shadow-2xl">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">{t('patient.a_r_session_page.session_complete_11', "Session Complete!")}</h3>
                <p className="text-gray-400 mb-6">Great job working on your {exercise.name}.</p>
                <div className="flex justify-between text-sm text-gray-300 mb-6 bg-gray-800 rounded-lg p-3">
                  <div className="text-center">
                    <span className="block text-xl font-bold text-white">{repCount}</span>{t('patient.a_r_session_page.reps_12', "Reps")}</div>
                  <div className="text-center">
                    <span className="block text-xl font-bold text-white">{Math.round(accuracy)}%</span>{t('patient.a_r_session_page.accuracy_13', "Accuracy")}</div>
                </div>
                <Button onClick={handleFinish} className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white">{t('patient.a_r_session_page.save_return_14', "Save & Return")}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

