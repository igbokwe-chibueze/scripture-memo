/** Desktop profile shortcuts use bundled artwork and require no additional data reads. */
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ChevronRightIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";

/** All destinations belong to the signed-in viewer, including on another player's profile. */
export async function ProfileQuickLinks(): Promise<React.ReactNode> {
  const [t, navigation] = await Promise.all([
    getTranslations("PlayerSocial"),
    getTranslations("Navigation"),
  ]);
  const links = [
    { href: "/friends", label: navigation("friends"), image: "friends.png" },
    {
      href: "/fellowships",
      label: navigation("fellowships"),
      image: "fellowship.png",
    },
    { href: "/vault/badges", label: t("quickBadges"), image: "badges.png" },
    { href: "/stats", label: t("quickAllStats"), image: "stats.png" },
  ];

  return (
    <nav
      aria-labelledby="profile-quick-links"
      className="space-y-4 rounded-card border border-border bg-card p-4"
    >
      <h2 id="profile-quick-links" className="font-heading text-xl font-bold">
        {t("quickLinks")}
      </h2>
      <ul className="grid gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <NavigationButton
              href={link.href}
              pendingLabel={navigation("opening")}
              variant="outline"
              prefetch={false}
              className="min-h-12 w-full justify-start gap-3 px-3 py-2"
            >
              <Image
                src={`/images/game-ui/${link.image}`}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 object-contain"
              />
              <span className="min-w-0 flex-1 whitespace-normal text-left">
                {link.label}
              </span>
              <ChevronRightIcon aria-hidden="true" className="size-4" />
            </NavigationButton>
          </li>
        ))}
      </ul>
    </nav>
  );
}
