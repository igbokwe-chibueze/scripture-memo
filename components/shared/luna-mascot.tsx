import Image from "next/image";
import { cn } from "@/lib/utils";

/** Every approved Luna asset is registered here to prevent arbitrary file use. */
export const LUNA_POSES = {
  avatar: { src: "/images/mascot/luna/luna-avatar.png", width: 1254, height: 1254 },
  bust: { src: "/images/mascot/luna/luna-bust.png", width: 1254, height: 1254 },
  guide: { src: "/images/mascot/luna/luna-guide.png", width: 1024, height: 1536 },
  celebrate: { src: "/images/mascot/luna/luna-celebrate.png", width: 1024, height: 1536 },
  encourage: { src: "/images/mascot/luna/luna-encourage.png", width: 1024, height: 1536 },
  loading: { src: "/images/mascot/luna/luna-loading.png", width: 1024, height: 1536 },
  retry: { src: "/images/mascot/luna/luna-retry.png", width: 1024, height: 1536 },
  reward: { src: "/images/mascot/luna/luna-reward.png", width: 1024, height: 1536 },
  worried: { src: "/images/mascot/luna/luna-worried.png", width: 1024, height: 1536 },
  disappointed: { src: "/images/mascot/luna/luna-disappointed.png", width: 1024, height: 1536 },
  angry: { src: "/images/mascot/luna/luna-angry.png", width: 1024, height: 1536 },
  notificationWorried: {
    src: "/images/mascot/luna/luna-notification-worried.png",
    width: 1254,
    height: 1254,
  },
  notificationDisappointed: {
    src: "/images/mascot/luna/luna-notification-disappointed.png",
    width: 1254,
    height: 1254,
  },
  notificationAngry: {
    src: "/images/mascot/luna/luna-notification-angry.png",
    width: 1254,
    height: 1254,
  },
  silhouette: {
    src: "/images/mascot/luna/luna-silhouette.png",
    width: 1254,
    height: 1254,
  },
} as const;

export type LunaPose = keyof typeof LUNA_POSES;

type LunaAccessibilityProps =
  | {
      /** Decorative mascots duplicate nearby copy and therefore use empty alt text. */
      decorative: true;
      alt?: never;
    }
  | {
      /** Meaningful mascots require replacement text describing their purpose. */
      decorative?: false;
      alt: string;
    };

export type LunaMascotProps = LunaAccessibilityProps & {
  /** Selects one approved pose from the central mascot registry. */
  pose: LunaPose;
  /** Sizes the responsive image container without distorting Luna. */
  className?: string;
  /** Helps Next.js choose an appropriately sized optimized image candidate. */
  sizes?: string;
  /** Reserves eager loading for above-the-fold mascot placements. */
  priority?: boolean;
};

/**
 * Renders Luna consistently across features without exposing raw asset paths.
 *
 * The discriminated accessibility contract prevents a meaningful mascot from
 * silently shipping without alternative text. Intrinsic dimensions reserve the
 * correct aspect ratio, while `object-contain` protects every approved crop.
 */
export function LunaMascot({
  pose,
  className,
  sizes = "(max-width: 640px) 50vw, 320px",
  priority = false,
  decorative,
  alt,
}: LunaMascotProps): React.ReactNode {
  const asset = LUNA_POSES[pose];

  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      sizes={sizes}
      priority={priority}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={cn("h-auto max-w-full object-contain select-none", className)}
    />
  );
}
