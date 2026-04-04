import { colors } from './tokens';

/**
 * Step Indicator / Wizard Steps
 *
 * Shows progress through a multi-step flow.
 *
 * States:
 * - Done + not active: green filled circle + white checkmark
 * - Done + active (went back): green dashed circle + green checkmark
 * - Current (not done): green dashed circle + step number
 * - Future: gray circle + gray number
 *
 * Connectors between steps: green if both sides done, gray otherwise.
 */
export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
}: {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
}) {
  const completed = new Set(completedSteps ?? Array.from({ length: currentStep }, (_, i) => i));

  return (
    <div className="flex items-center gap-2">
      {steps.map((_, i) => {
        const isDone = completed.has(i);
        const isCurrent = i === currentStep;
        const isActive = isCurrent;
        const isFuture = i > currentStep && !isDone;

        // Connector before this step (not before first)
        const connector = i > 0 && (
          <div
            className="h-0.5 flex-1"
            style={{
              backgroundColor: completed.has(i - 1) && (isDone || isCurrent)
                ? colors.green
                : colors.skeleton,
            }}
          />
        );

        let circleStyle: React.CSSProperties;
        let content: React.ReactNode;

        if (isDone && !isActive) {
          // Done + not active: green filled + checkmark
          circleStyle = { backgroundColor: colors.green };
          content = (
            <svg className="w-4 h-4" style={{ color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          );
        } else if (isDone && isActive) {
          // Done + active (went back): green dashed + green checkmark
          circleStyle = { border: `2px dashed ${colors.green}` };
          content = (
            <svg className="w-4 h-4" style={{ color: colors.green }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          );
        } else if (isCurrent) {
          // Current (not done): green dashed + number
          circleStyle = { border: `2px dashed ${colors.green}`, color: colors.green };
          content = <span className="text-sm font-medium">{i + 1}</span>;
        } else {
          // Future: gray
          circleStyle = { backgroundColor: colors.skeleton, color: colors.textFaint };
          content = <span className="text-sm">{i + 1}</span>;
        }

        return (
          <React.Fragment key={i}>
            {connector}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={circleStyle}
              title={steps[i] || `Step ${i + 1}`}
            >
              {content}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Need React import for Fragment
import React from 'react';
