import { useRouter } from 'next/router';
import SmartProfilePage from './smart';
import { ProfileProvider } from '@/contexts/ProfileContext'; // Add this import

export default function UserProfilePage() {
  const router = useRouter();
  const { username } = router.query;

  // This is another user's profile page
  return (
    <ProfileProvider>
      <SmartProfilePage username={username as string} />
    </ProfileProvider>
  );
}