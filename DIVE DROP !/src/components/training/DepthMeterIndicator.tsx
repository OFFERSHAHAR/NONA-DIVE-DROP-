/**
 * DepthMeterIndicator Component
 * Visual indicator showing user's current depth level and progression
 */

'use client';

import { TrainingDepthLevel, UserTrainingProgress } from '@/types/training';

interface DepthMeterIndicatorProps {
  progress: UserTrainingProgress;
  nextLevel?: TrainingDepthLevel;
  compact?: boolean;
}

export function DepthMeterIndicator({
  progress,
  nextLevel,
  compact = false,
}: DepthMeterIndicatorProps) {
  const depthLevels: Array<{
    level: TrainingDepthLevel;
    name: string;
    minDepth: number;
    maxDepth: number;
    color: string;
    description: string;
  }> = [
    {
      level: 'beginner',
      name: 'Beginner',
      minDepth: 0,
      maxDepth: 10,
      color: 'bg-blue-500',
      description: 'First steps',
    },
    {
      level: 'intermediate',
      name: 'Intermediate',
      minDepth: 10,
      maxDepth: 25,
      color: 'bg-purple-500',
      description: 'Building skills',
    },
    {
      level: 'advanced',
      name: 'Advanced',
      minDepth: 25,
      maxDepth: 40,
      color: 'bg-orange-500',
      description: 'Expert level',
    },
    {
      level: 'expert',
      name: 'Expert',
      minDepth: 40,
      maxDepth: 100,
      color: 'bg-red-500',
      description: 'Master diver',
    },
  ];

  const currentLevelInfo = depthLevels.find((l) => l.level === progress.current_level) ||
    depthLevels[0];
  const nextLevelInfo = nextLevel
    ? depthLevels.find((l) => l.level === nextLevel)
    : undefined;

  const getProgressPercentage = () => {
    const currentMin = currentLevelInfo.minDepth;
    const currentMax = currentLevelInfo.maxDepth;
    const depth = progress.depth_achieved_meters;

    if (depth < currentMin) return 0;
    if (depth > currentMax) return 100;

    return ((depth - currentMin) / (currentMax - currentMin)) * 100;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${currentLevelInfo.color}`} />
        <span className="text-sm font-semibold text-gray-900">
          {currentLevelInfo.name}
        </span>
        <span className="text-xs text-gray-600">
          {progress.depth_achieved_meters}m
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Level */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">
              Current Level: {currentLevelInfo.name}
            </h3>
            <p className="text-sm text-gray-600">
              {currentLevelInfo.description}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${currentLevelInfo.color}`}>
            {progress.depth_achieved_meters}m
          </div>
        </div>

        {/* Depth Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{currentLevelInfo.minDepth}m</span>
            <span>{currentLevelInfo.maxDepth}m</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${currentLevelInfo.color}`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Level Indicators */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">Progression Path</h4>
        <div className="grid grid-cols-4 gap-2">
          {depthLevels.map((level) => (
            <div
              key={level.level}
              className={`p-3 rounded-lg text-center text-xs transition-all ${
                level.level === progress.current_level
                  ? `${level.color} text-white`
                  : level.level === nextLevel
                    ? `${level.color} text-white opacity-60 border-2 border-gray-300`
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              <div className="font-semibold">{level.name}</div>
              <div className="text-xs opacity-75">
                {level.minDepth}-{level.maxDepth}m
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Level Info */}
      {nextLevelInfo && nextLevel !== progress.current_level && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Next Goal: </span>
            Reach {nextLevelInfo.name} level
            ({nextLevelInfo.minDepth}-{nextLevelInfo.maxDepth}m)
          </p>
          <p className="text-xs text-blue-700 mt-1">
            You need {Math.max(0, nextLevelInfo.minDepth - progress.depth_achieved_meters)}m
            more to progress.
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-600">Trainings Completed</p>
          <p className="text-lg font-semibold text-gray-900">
            {progress.total_trainings_completed}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total Hours</p>
          <p className="text-lg font-semibold text-gray-900">
            {progress.total_training_hours}h
          </p>
        </div>
      </div>

      {/* Medical Status */}
      <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            progress.medical_clearance_valid ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <p className="text-sm text-gray-700">
          Medical clearance:{' '}
          <span className="font-semibold">
            {progress.medical_clearance_valid ? 'Valid' : 'Expired'}
          </span>
        </p>
      </div>
    </div>
  );
}
