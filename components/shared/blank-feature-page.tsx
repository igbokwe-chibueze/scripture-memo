import { requireServerSession } from "@/lib/auth/session";

/**
 * Holds an owner-requested blank destination without inventing feature behavior.
 * Authentication is checked independently of Proxy, and the hidden heading
 * gives assistive technology a page identity while leaving the canvas blank.
 */
export async function BlankFeaturePage({
  title,
}: Readonly<{ title: string }>): Promise<React.ReactNode> {
  await requireServerSession();

  return (
    <main className="min-h-[50dvh]" aria-label={title}>
      <h1 className="sr-only">{title}</h1>
    </main>
  );
}
