import type { UserRole } from "@/lib/generated/prisma/enums";

/** Small aggregate payload rendered by the administrator landing page. */
export type AdminDashboardStats = {
  totalUsers: number;
  totalVerses: number;
  assignedWaypoints: number;
  totalBadges: number;
  recentlyActiveUsers: number;
};

/** Safe, bounded account summary used by Super Admin user management. */
export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  suspendedAt: Date | null;
  suspendReason: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  displayName: string | null;
  totalGlowPoints: number;
  totalWaypointsCompleted: number;
};

/** One page of accounts plus the total needed for explicit pagination. */
export type AdminUserPage = {
  items: AdminUserListItem[];
  total: number;
};
