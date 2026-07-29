import { getCurrentUser } from '@/lib/auth/user';
import { getUserStats } from '@/lib/user-store';
import { isActiveFanClubMember } from '@/lib/fan-club';

export interface UserEntitlements {
  userId: string | null;
  level: number;
  fanClub: boolean;
  isAuthenticated: boolean;
}

export async function getUserEntitlements(): Promise<UserEntitlements> {
  const user = await getCurrentUser();
  const isAuthenticated = !!user;
  const userId = user?.id || null;

  let level = 0;
  let fanClub = false;

  if (userId) {
    const userStats = await getUserStats(userId);
    level = userStats.level;
    fanClub = await isActiveFanClubMember(userId);
  }

  return {
    userId,
    level,
    fanClub,
    isAuthenticated,
  };
}
