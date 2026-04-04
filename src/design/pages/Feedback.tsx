import { Link } from 'react-router-dom';
import { useState } from 'react';
import { StepIndicator, ProgressBar, EmptyState, SectionHeading } from '../components';

export default function PreviewFeedback() {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className="p-8 transition-colors duration-[50ms]"
      style={isDragging ? { backgroundColor: 'var(--p-green-light)' } : undefined}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
    >
      {/* Full-page drop zone overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ backgroundColor: 'var(--p-green-light)', opacity: 0.95, border: '4px dashed var(--p-green)' }}>
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <p className="text-xl font-semibold" style={{ color: 'var(--p-green-text)' }}>Drop your file anywhere</p>
            <p className="text-base mt-1" style={{ color: 'var(--p-green)' }}>PDF, images, or medical records</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Feedback & Status</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>No orange toasts or alerts. Green progress. Skeletons over spinners. Try dragging a file onto this page.</p>

        {/* Toasts */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Toasts</SectionHeading>
          <div className="space-y-3 max-w-sm">
            <div className="rounded-xl shadow-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--p-green)' }}>
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-sm" style={{ color: 'var(--p-text)' }}>Record uploaded. Analyzing now.</span>
            </div>
            <div className="rounded-xl shadow-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--p-red)' }}>
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <span className="text-sm" style={{ color: 'var(--p-text)' }}>Upload failed. Try a smaller file.</span>
            </div>
            <div className="rounded-xl shadow-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded-full" style={{ backgroundColor: 'var(--p-blue)' }}>
                <span className="text-white text-xs font-bold leading-none">i</span>
              </div>
              <span className="text-sm" style={{ color: 'var(--p-text)' }}>New results available for review.</span>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Info blue = #2563EB (blue-600). Same blue everywhere.</p>
        </div>

        {/* Alerts */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Alerts (Inline)</SectionHeading>
          <div className="space-y-3">
            <div className="rounded-xl p-4 border-l-4 flex items-start gap-3" style={{ backgroundColor: 'var(--p-red-light)', borderLeftColor: 'var(--p-red)' }}>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--p-text)' }}>3 tests missing</p>
                <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>Your plan may be missing BRCA, HER2, and Oncotype DX testing.</p>
              </div>
            </div>
            <div className="rounded-xl p-4 border-l-4 flex items-start gap-3" style={{ backgroundColor: 'var(--p-blue-light)', borderLeftColor: 'var(--p-blue)' }}>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--p-text)' }}>Profile incomplete</p>
                <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>Add your stage for more accurate recommendations.</p>
              </div>
            </div>
            <div className="rounded-xl p-4 border-l-4 flex items-start gap-3" style={{ backgroundColor: 'var(--p-green-light)', borderLeftColor: 'var(--p-green)' }}>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--p-text)' }}>All tests complete</p>
                <p className="text-sm" style={{ color: 'var(--p-text-body)' }}>Your care plan includes all NCCN-recommended tests.</p>
              </div>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>No amber/yellow variant. Info blue #2563EB, Error red #DC2626, Success green #16A34A.</p>
        </div>

        {/* Skeleton Loading */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Skeleton Loading</SectionHeading>
          <div className="space-y-3">
            <div className="rounded h-6 w-48 animate-pulse" style={{ backgroundColor: 'var(--p-skeleton)' }} />
            <div className="rounded h-4 w-full animate-pulse" style={{ backgroundColor: 'var(--p-skeleton)' }} />
            <div className="rounded h-4 w-3/4 animate-pulse" style={{ backgroundColor: 'var(--p-skeleton)' }} />
            <div className="rounded-2xl h-32 w-full animate-pulse mt-4" style={{ backgroundColor: 'var(--p-skeleton)' }} />
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Match the shape of content being loaded. Skeletons over spinners.</p>
        </div>

        {/* Progress */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Progress</SectionHeading>
          <div className="space-y-4">
            <div>
              <ProgressBar value={0.6} label="Profile completion: 60%" />
              <p className="text-xs mt-1" style={{ color: 'var(--p-text-faint)' }}>Progress = green. Progress is positive, not a CTA.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--p-text)' }}>Wizard Steps</p>
              <StepIndicator
                steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']}
                currentStep={1}
                completedSteps={[0]}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--p-text-faint)' }}>Done = green filled + check. Current = green outline. Future = slate.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--p-text)' }}>Wizard Steps (went back to step 1)</p>
              <StepIndicator
                steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']}
                currentStep={0}
                completedSteps={[0, 1]}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--p-text-faint)' }}>Active + done = green outline + check (step 1). Done + not active = green filled (step 2).</p>
            </div>
          </div>
        </div>

        {/* File Upload Drop Zone */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">File Upload</SectionHeading>
          <div
            className="rounded-2xl p-8 text-center transition-colors duration-[50ms]"
            style={{ border: '2px dashed var(--p-border-strong)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--p-green-focus)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--p-border-strong)'; }}
          >
            <svg className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--p-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--p-text)' }}>Drop files here or click to upload</p>
            <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>PDF, images, or medical records (max 25MB)</p>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Full-page drop zone: the entire page becomes a drop target when dragging files (try it!). Hover on this zone = green border.</p>
        </div>

        {/* Empty State */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Empty State</SectionHeading>
          <EmptyState
            title="No records yet"
            description="Upload your first record to find gaps in your care."
            ctaLabel="Upload Record"
          />
          <p className="text-xs mt-2" style={{ color: 'var(--p-text-faint)' }}>Empty states ALWAYS have a CTA. Never a dead end.</p>
        </div>
      </div>
    </div>
  );
}
