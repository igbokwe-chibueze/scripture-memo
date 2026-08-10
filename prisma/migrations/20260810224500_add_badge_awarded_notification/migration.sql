-- Add a stable event type for badge grants made outside the recipient's
-- active gameplay flow. Storing event meaning instead of translated prose lets
-- the notification render in whichever language the learner currently uses.
ALTER TYPE "UserNotificationType" ADD VALUE 'BADGE_AWARDED';
