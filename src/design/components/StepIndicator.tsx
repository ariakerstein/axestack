import React from 'react';

// Terracotta accent color
const ACCENT = '#C66B4A';
const ACCENT_LIGHT = '#C66B4A20';
const GRAY = '#e2e8f0';
const GRAY_TEXT = '#94a3b8';

/**
 * Step Indicator / Wizard Steps
 *
 * Shows progress through a multi-step flow with labels.
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
    <div className="flex items-center justify-center w-full">
      {steps.map((stepName, i) => {
        const isDone = completed.has(i);
        const isCurrent = i === currentStep;
        const isActive = isCurrent;

        // Connector before this step (not before first)
        const connector = i > 0 && (
          <div
            className="h-0.5 w-8 sm:w-12 mx-1"
            style={{
              backgroundColor: completed.has(i - 1) && (isDone || isCurrent)
                ? ACCENT
                : GRAY,
            }}
          />
        );

        let circleStyle: React.CSSProperties;
        let content: React.ReactNode;
        let labelColor: string;

        if (isDone && !isActive) {
          // Done + not active: accent filled + checkmark
          circleStyle = { backgroundColor: ACCENT };
          labelColor = ACCENT;
          content = (
            <svg className="w-4 h-4" style={{ color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          );
        } else if (isDone && isActive) {
          // Done + active (went back): accent dashed + checkmark
          circleStyle = { border: `2px dashed ${ACCENT}`, backgroundColor: ACCENT_LIGHT };
          labelColor = ACCENT;
          content = (
            <svg className="w-4 h-4" style={{ color: ACCENT }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          );
        } else if (isCurrent) {
          // Current: accent solid border + number
          circleStyle = { border: `2px solid ${ACCENT}`, backgroundColor: ACCENT_LIGHT, color: ACCENT };
          labelColor = ACCENT;
          content = <span className="text-sm font-bold">{i + 1}</span>;
        } else {
          // Future: gray
          circleStyle = { backgroundColor: GRAY, color: GRAY_TEXT };
          labelColor = GRAY_TEXT;
          content = <span className="text-sm">{i + 1}</span>;
        }

        return (
          <React.Fragment key={i}>
            {connector}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={circleStyle}
              >
                {content}
              </div>
              <span
                className="text-xs mt-1 font-medium hidden sm:block"
                style={{ color: labelColor }}
              >
                {stepName}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
