import { useRouter } from 'next/router';
import SmartProfilePage from './smart';

export default function UserProfilePage() {
  const router = useRouter();
  const { username } = router.query;

  // This is another user's profile page
  return <SmartProfilePage username={username as string} />;
}