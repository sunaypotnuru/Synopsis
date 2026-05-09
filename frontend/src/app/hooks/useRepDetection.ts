import { useState, useEffect, useRef } from 'react';

type RepState = 'down' | 'up' | 'transition';
type ExerciseType = 'bicep_curls' | 'squats' | 'shoulder_raises' | 'lunges' | 'knee_bends' | 'arm_raises';

interface RepDetectionConfig {
  minAngle: number;  // Minimum angle for "up" position
  maxAngle: number;  // Maximum angle for "down" position
  transitionBuffer: number;  // Buffer to prevent false positives
}

// Exercise-specific configurations based on research
const EXERCISE_CONFIGS: Record<ExerciseType, RepDetectionConfig> = {
  bicep_curls: {
    minAngle: 30,   // Fully flexed (contracted)
    maxAngle: 160,  // Fully extended
    transitionBuffer: 10
  },
  squats: {
    minAngle: 80,   // Deep squat position
    maxAngle: 160,  // Standing position
    transitionBuffer: 15
  },
  shoulder_raises: {
    minAngle: 80,   // Arms raised
    maxAngle: 30,   // Arms down
    transitionBuffer: 10
  },
  lunges: {
    minAngle: 80,   // Lunge position
    maxAngle: 160,  // Standing position
    transitionBuffer: 15
  },
  knee_bends: {
    minAngle: 90,   // Bent position
    maxAngle: 170,  // Straight position
    transitionBuffer: 10
  },
  arm_raises: {
    minAngle: 90,   // Raised position
    maxAngle: 20,   // Down position
    transitionBuffer: 10
  }
};

export const useRepDetection = (
  exerciseType: ExerciseType,
  currentAngles: Record<string, number> | null
) => {
  const [repCount, setRepCount] = useState(0);
  const [repState, setRepState] = useState<RepState>('down');
  const lastStateRef = useRef<RepState>('down');
  const lastAngleRef = useRef<number>(0);

  useEffect(() => {
    if (!currentAngles) return;

    const config = EXERCISE_CONFIGS[exerciseType];
    let targetAngle = 0;

    // Calculate target angle based on exercise type
    switch (exerciseType) {
      case 'bicep_curls':
        // Average of both elbows
        targetAngle = (currentAngles.leftElbow + currentAngles.rightElbow) / 2;
        break;

      case 'squats':
        // Average of both knees
        targetAngle = (currentAngles.leftKnee + currentAngles.rightKnee) / 2;
        break;

      case 'shoulder_raises':
        // Average of both shoulders
        targetAngle = (currentAngles.leftShoulder + currentAngles.rightShoulder) / 2;
        break;

      case 'lunges':
        // Use the front leg (minimum knee angle)
        targetAngle = Math.min(currentAngles.leftKnee, currentAngles.rightKnee);
        break;

      case 'knee_bends':
        // Average of both knees
        targetAngle = (currentAngles.leftKnee + currentAngles.rightKnee) / 2;
        break;

      case 'arm_raises':
        // Average of both shoulders
        targetAngle = (currentAngles.leftShoulder + currentAngles.rightShoulder) / 2;
        break;

      default:
        targetAngle = 0;
    }

    // State machine for rep detection with hysteresis
    let newState: RepState = repState;

    if (repState === 'down') {
      // Transition from down to up
      if (targetAngle <= config.minAngle + config.transitionBuffer) {
        newState = 'up';
      }
    } else if (repState === 'up') {
      // Transition from up to down (completes a rep)
      if (targetAngle >= config.maxAngle - config.transitionBuffer) {
        newState = 'down';
        
        // Only count rep if we had a significant state change
        const angleDifference = Math.abs(targetAngle - lastAngleRef.current);
        if (angleDifference > config.transitionBuffer * 2) {
          setRepCount(c => c + 1);
        }
      }
    }

    // Update state if changed
    if (newState !== repState) {
      setRepState(newState);
      lastStateRef.current = newState;
    }

    lastAngleRef.current = targetAngle;
  }, [currentAngles, exerciseType, repState]);

  const reset = () => {
    setRepCount(0);
    setRepState('down');
    lastAngleRef.current = 0;
  };

  return { repCount, repState, reset };
};
