import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../services/progressStore';
import OnboardingFlow from '../components/Onboarding/OnboardingFlow';
import Dashboard from '../components/Dashboard/Dashboard';

export default function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getProfile());

  if (!profile) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setProfile(getProfile());
        }}
        onSkip={() => {
          setProfile(getProfile());
          navigate('/catalog');
        }}
      />
    );
  }

  return <Dashboard />;
}
