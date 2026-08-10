import Image from "next/image";

import { type LunaPose } from "@/components/shared/luna-mascot";
import { cn } from "@/lib/utils";

/**
 * Registers the parallel Concept Luna artwork without altering production Luna.
 * Production screens must not import this registry until the owner approves the
 * specific comparison placement.
 */
export const CONCEPT_LUNA_POSES = {
  avatar: {
    src: "/images/mascot/luna-concept/luna-concept-head-avatar.png",
    width: 1254,
    height: 1254,
  },
  bust: {
    src: "/images/mascot/luna-concept/luna-concept-bust.png",
    width: 1254,
    height: 1254,
  },
  guide: {
    src: "/images/mascot/luna-concept/luna-concept-guide.png",
    width: 1024,
    height: 1536,
  },
  celebrate: {
    src: "/images/mascot/luna-concept/luna-concept-celebrate.png",
    width: 1024,
    height: 1536,
  },
  encourage: {
    src: "/images/mascot/luna-concept/luna-concept-encourage.png",
    width: 1024,
    height: 1536,
  },
  loading: {
    src: "/images/mascot/luna-concept/luna-concept-loading.png",
    width: 1024,
    height: 1536,
  },
  retry: {
    src: "/images/mascot/luna-concept/luna-concept-retry.png",
    width: 1024,
    height: 1536,
  },
  reward: {
    src: "/images/mascot/luna-concept/luna-concept-reward.png",
    width: 1024,
    height: 1536,
  },
  worried: {
    src: "/images/mascot/luna-concept/luna-concept-worried.png",
    width: 1024,
    height: 1536,
  },
  disappointed: {
    src: "/images/mascot/luna-concept/luna-concept-disappointed.png",
    width: 1024,
    height: 1536,
  },
  angry: {
    src: "/images/mascot/luna-concept/luna-concept-angry.png",
    width: 1254,
    height: 1254,
  },
  notificationWorried: {
    src: "/images/mascot/luna-concept/luna-concept-notification-worried.png",
    width: 1254,
    height: 1254,
  },
  notificationDisappointed: {
    src: "/images/mascot/luna-concept/luna-concept-notification-disappointed.png",
    width: 1254,
    height: 1254,
  },
  notificationAngry: {
    src: "/images/mascot/luna-concept/luna-concept-notification-angry.png",
    width: 1254,
    height: 1254,
  },
  silhouette: {
    src: "/images/mascot/luna-concept/luna-concept-silhouette.png",
    width: 1254,
    height: 1254,
  },
} as const satisfies Record<
  LunaPose,
  { src: string; width: number; height: number }
>;

type ConceptLunaAccessibilityProps =
  | { decorative: true; alt?: never }
  | { decorative?: false; alt: string };

type ConceptLunaMascotProps = ConceptLunaAccessibilityProps & {
  pose: LunaPose;
  className?: string;
  sizes?: string;
};

/**
 * Renders the experimental Concept Luna set for controlled visual comparisons.
 * Keeping this separate from `LunaMascot` prevents an experiment from silently
 * replacing an already approved production asset.
 */
export function ConceptLunaMascot({
  pose,
  className,
  sizes = "(max-width: 640px) 50vw, 320px",
  decorative,
  alt,
}: ConceptLunaMascotProps): React.ReactNode {
  const asset = CONCEPT_LUNA_POSES[pose];

  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      sizes={sizes}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={cn("h-auto max-w-full object-contain select-none", className)}
    />
  );
}
