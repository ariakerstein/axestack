import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import '../app/globals.css';
import './preview-theme.css';
import { DarkModeToggle } from './PreviewLayout';

// Foundation & Components
import PreviewIndex from './pages/Index';
import PreviewColors from './pages/Colors';
import PreviewTypography from './pages/Typography';
import PreviewSpacing from './pages/Spacing';
import PreviewButtons from './pages/Buttons';
import PreviewCards from './pages/Cards';
import PreviewForms from './pages/Forms';
import PreviewNavigation from './pages/Navigation';
import PreviewFeedback from './pages/Feedback';
import PreviewBadges from './pages/Badges';

// Communication
import PreviewVoiceTone from './pages/VoiceTone';
import PreviewJTBDProfiles from './pages/JTBDProfiles';
import PreviewInfluence from './pages/Influence';
import PreviewObjections from './pages/Objections';
import PreviewCopyPatterns from './pages/CopyPatterns';

// Patterns
import PreviewConversionFlows from './pages/ConversionFlows';
import PreviewMobileFirst from './pages/MobileFirst';
import PreviewPageLayouts from './pages/PageLayouts';
import PreviewOnboarding from './pages/Onboarding';

// Metrics
import PreviewAARRR from './pages/AARRR';
import PreviewQualitativeFeedback from './pages/QualitativeFeedback';
import PreviewValueDelivery from './pages/ValueDelivery';

function PreviewShell() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--p-bg)' }}>
      <Outlet />
      <div className="max-w-4xl mx-auto px-8">
        <DarkModeToggle />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<PreviewShell />}>
          {/* Index */}
          <Route path="/" element={<PreviewIndex />} />

          {/* Foundation */}
          <Route path="/colors" element={<PreviewColors />} />
          <Route path="/typography" element={<PreviewTypography />} />
          <Route path="/spacing" element={<PreviewSpacing />} />

          {/* Components */}
          <Route path="/buttons" element={<PreviewButtons />} />
          <Route path="/cards" element={<PreviewCards />} />
          <Route path="/forms" element={<PreviewForms />} />
          <Route path="/navigation" element={<PreviewNavigation />} />
          <Route path="/feedback" element={<PreviewFeedback />} />
          <Route path="/badges" element={<PreviewBadges />} />

          {/* Communication */}
          <Route path="/voice-tone" element={<PreviewVoiceTone />} />
          <Route path="/jtbd-profiles" element={<PreviewJTBDProfiles />} />
          <Route path="/influence" element={<PreviewInfluence />} />
          <Route path="/objections" element={<PreviewObjections />} />
          <Route path="/copy-patterns" element={<PreviewCopyPatterns />} />

          {/* Patterns */}
          <Route path="/conversion-flows" element={<PreviewConversionFlows />} />
          <Route path="/mobile-first" element={<PreviewMobileFirst />} />
          <Route path="/page-layouts" element={<PreviewPageLayouts />} />
          <Route path="/onboarding" element={<PreviewOnboarding />} />

          {/* Metrics */}
          <Route path="/aarrr" element={<PreviewAARRR />} />
          <Route path="/qualitative-feedback" element={<PreviewQualitativeFeedback />} />
          <Route path="/value-delivery" element={<PreviewValueDelivery />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
