import React from 'react';

interface ProgressStep {
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {step.status === 'completed' && (
              <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {step.status === 'active' && (
              <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center relative">
                <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {step.status === 'pending' && (
              <div className="w-6 h-6 rounded-full bg-white/5 border border-white/20" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              step.status === 'active' ? 'text-white' :
              step.status === 'completed' ? 'text-green-400' :
              'text-white/40'
            }`}>
              {step.label}
            </p>
            {step.description && step.status === 'active' && (
              <p className="text-xs text-white/50 mt-0.5">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface ProgressTrackerProps {
  currentStepIndex: number;
  stepLabels: string[];
  stepDescriptions?: string[];
  estimatedTimeSeconds?: number;
  className?: string;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStepIndex,
  stepLabels,
  stepDescriptions = [],
  estimatedTimeSeconds,
  className = '',
}) => {
  const steps: ProgressStep[] = stepLabels.map((label, index) => ({
    label,
    description: stepDescriptions[index],
    status: index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'active' : 'pending',
  }));

  const progressPercentage = ((currentStepIndex + 1) / stepLabels.length) * 100;

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/30 p-4 ${className}`}>
      {/* Progress bar with spinner */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-semibold text-white">
              진행 중... ({currentStepIndex + 1}/{stepLabels.length})
            </p>
          </div>
          {estimatedTimeSeconds && (
            <p className="text-xs text-white/50">
              예상 시간: 약 {estimatedTimeSeconds}초
            </p>
          )}
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <ProgressIndicator steps={steps} />

      {/* Encouragement message */}
      {currentStepIndex < stepLabels.length - 1 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/50 text-center">
            💡 고품질 콘텐츠를 위해 AI가 열심히 작업하고 있습니다. 잠시만 기다려 주세요!
          </p>
        </div>
      )}
    </div>
  );
};
