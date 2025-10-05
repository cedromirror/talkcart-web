import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext'; // Add this import

// Dynamically import the profile page to reduce initial bundle size
const SmartProfilePage = dynamic(() => import('./smart'), {
  loading: () => <div>Loading profile...</div>,
  ssr: false
});

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isLoading, user, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // This is the user's own profile page
  return (
    <ProfileProvider>
      <SmartProfilePage />
    </ProfileProvider>
  );
}