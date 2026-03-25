import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Landing from './pages/Landing';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import Dashboard from './components/Dashboard/Dashboard';
import Catalog from './pages/Catalog';
import LearningPathDetail from './pages/LearningPathDetail';
import ModuleView from './pages/ModuleView';
import Marketplace from './pages/Marketplace';
import Settings from './pages/Settings';
import AnalyticsPage from './components/Analytics/AnalyticsPage';
import ChallengeRoom from './components/Multiplayer/ChallengeRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen pages (no sidebar) */}
        <Route index element={<Landing />} />
        <Route path="onboarding" element={<OnboardingFlow />} />

        {/* App shell with sidebar */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="paths/:pathId" element={<LearningPathDetail />} />
          <Route path="paths/:pathId/modules/:moduleId" element={<ModuleView />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="challenge" element={<ChallengeRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
