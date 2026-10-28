/** Public presentation only: never expose account IDs, email or activity times. */
export type ReadingPlanParticipants = {
  total: number;
  avatars: {
    publicId: string;
    displayName: string;
    avatarKey: string;
    avatarFrameKey: string;
  }[];
};
