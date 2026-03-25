import { useState } from 'react';
import { getProfile } from '../services/progressStore';
import OnboardingFlow from '../components/Onboarding/OnboardingFlow';
import Dashboard from '../components/Dashboard/Dashboard';

export default function Home() {
  const [profile] = useState(() => getProfile());

  if (!profile) {
    return <OnboardingFlow />;
  }

  return <Dashboard />;
}
