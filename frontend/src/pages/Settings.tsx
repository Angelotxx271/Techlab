import { useEffect, useState } from 'react';
import { getFullProfile, updateVisibility, syncProfileToServer, type FullProfile } from '../services/api';
import { useUser } from '../contexts/UserContext';
import BadgeGrid from '../components/Badges/BadgeGrid';
import SkillRadar from '../components/Analytics/SkillRadar';

export default function Settings() {
  const { isLoggedIn } = useUser();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [currentPosition, setCurrentPosition] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    getFullProfile().then((p) => {
      setProfile(p);
      setBio(p.bio);
      setIsPublic(p.isPublic);
      setDisplayName(p.displayName);
      setCurrentPosition(p.currentPosition);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isLoggedIn]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateVisibility(isPublic, bio);
      await syncProfileToServer({ current_position: currentPosition });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  if (!isLoggedIn) return <p className="py-12 text-center text-lc-muted">Sign in to access settings.</p>;
  if (loading) return <p className="py-12 text-center text-lc-muted">Loading profile...</p>;
  if (!profile) return <p className="py-12 text-center text-lc-red">Failed to load profile.</p>;

  const categoryScores: Record<string, number> = (profile.profile as Record<string, unknown>)?.categoryScores as Record<string, number> ?? {};

  return (
    <section className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-lc-text">Settings</h1>
        <p className="mt-1 text-lc-muted">Manage your profile and preferences.</p>
      </div>

      {/* Profile info */}
      <div className="rounded-lg border border-lc-border bg-lc-surface p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lc-accent/15 text-xl font-bold text-lc-accent">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-lg font-bold text-lc-text">{displayName}</p>
            <p className="text-xs text-lc-muted">@{profile.username}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-center">
          <div className="rounded-lg bg-lc-surface2/50 p-3">
            <p className="text-lg font-bold text-lc-accent">{profile.totalXp}</p>
            <p className="text-[10px] text-lc-muted">Total XP</p>
          </div>
          <div className="rounded-lg bg-lc-surface2/50 p-3">
            <p className="text-lg font-bold text-lc-text">{profile.exercisesCompleted}</p>
            <p className="text-[10px] text-lc-muted">Exercises</p>
          </div>
          <div className="rounded-lg bg-lc-surface2/50 p-3">
            <p className="text-lg font-bold text-lc-green">{profile.streak.current}d</p>
            <p className="text-[10px] text-lc-muted">Streak</p>
          </div>
        </div>
      </div>

      {/* Edit fields */}
      <div className="rounded-lg border border-lc-border bg-lc-surface p-6 space-y-4">
        <h3 className="text-sm font-semibold text-lc-text">Edit Profile</h3>

        <div>
          <label className="block text-xs text-lc-muted mb-1">Current Position</label>
          <input
            value={currentPosition}
            onChange={(e) => setCurrentPosition(e.target.value)}
            className="w-full rounded border border-lc-border bg-lc-code px-3 py-2 text-sm text-lc-text focus:border-lc-accent/50 focus:outline-none"
            placeholder="e.g. Junior Developer"
          />
        </div>

        <div>
          <label className="block text-xs text-lc-muted mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded border border-lc-border bg-lc-code px-3 py-2 text-sm text-lc-text resize-none focus:border-lc-accent/50 focus:outline-none"
            placeholder="Tell others about yourself..."
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-lc-green' : 'bg-lc-surface2'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-lc-text">Public profile (visible in marketplace)</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-lc-accent px-5 py-2 text-sm font-bold text-lc-bg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-xs text-lc-green">Saved!</span>}
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-lg border border-lc-border bg-lc-surface p-6">
        <BadgeGrid />
      </div>

      {/* Skill radar preview */}
      {Object.keys(categoryScores).length > 0 && (
        <div className="rounded-lg border border-lc-border bg-lc-surface p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-lc-text mb-4 self-start">Skill Distribution</h3>
          <SkillRadar scores={categoryScores} />
        </div>
      )}

      {/* Account info */}
      <div className="rounded-lg border border-lc-border bg-lc-surface p-6 space-y-2">
        <h3 className="text-sm font-semibold text-lc-text">Account</h3>
        <p className="text-xs text-lc-muted">Member since: {new Date(profile.createdAt).toLocaleDateString()}</p>
        <p className="text-xs text-lc-muted">Username: {profile.username}</p>
      </div>
    </section>
  );
}
