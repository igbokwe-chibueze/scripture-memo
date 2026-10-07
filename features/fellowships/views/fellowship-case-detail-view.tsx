import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ClipboardListIcon, ShieldCheckIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { getFellowshipCaseDetailAction } from "@/features/fellowships/actions/get-fellowship-case-detail.action";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Fellowship case history | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Formats event dates consistently so case reviews can compare UTC timestamps. */
function formatTimestamp(value: Date): string {
  return value.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

/** Shows an administrator the immutable action timeline for one Fellowship case. */
export async function FellowshipCaseDetailView({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}): Promise<React.ReactNode> {
  await getAdminSession();
  const { caseNumber } = await params;
  if (caseNumber.length > 32 || !/^FEL-\d{6,}$/.test(caseNumber)) notFound();

  const result = await getFellowshipCaseDetailAction(caseNumber);
  if (!result.success || !result.data) notFound();
  const governanceCase = result.data;

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
              Administrator · {governanceCase.kind.toLowerCase()}
            </span>
          }
          title={governanceCase.caseNumber}
          description={`${governanceCase.fellowshipName} · ${governanceCase.currentStatus.toLowerCase()}`}
          action={
            <NavigationButton
              href="/admin/fellowship-cases"
              pendingLabel="Returning to cases"
              variant="outline"
            >
              <ArrowLeftIcon aria-hidden="true" />
              All cases
            </NavigationButton>
          }
        />

        <section className="grid gap-4 rounded-3xl border bg-card p-5 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Opened
            </h2>
            <p className="mt-1 font-bold">{formatTimestamp(governanceCase.openedAt)} UTC</p>
            <p className="text-sm text-muted-foreground">By {governanceCase.openedByName}</p>
          </div>
          {governanceCase.participants.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Participants
              </h2>
              <p className="mt-1 font-bold">{governanceCase.participants.join(" → ")}</p>
            </div>
          )}
          {governanceCase.reason && (
            <div className="sm:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Recorded reason
              </h2>
              <p className="mt-1 whitespace-pre-wrap">{governanceCase.reason}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="fellowship-case-timeline" className="space-y-4">
          <div>
            <h2 id="fellowship-case-timeline" className="font-heading text-2xl font-bold">
              Case history
            </h2>
            <p className="text-sm text-muted-foreground">
              Every recorded action is shown in chronological order.
            </p>
          </div>
          {governanceCase.events.length === 0 ? (
            <div className="rounded-3xl border bg-card p-6 text-center">
              <ClipboardListIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 font-bold">No recorded events</p>
            </div>
          ) : (
            <ol className="space-y-3">
              {governanceCase.events.map((event) => (
                <li key={event.id} className="relative rounded-3xl border bg-card p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <h3 className="font-bold">{event.action}</h3>
                    <time className="shrink-0 text-sm text-muted-foreground" dateTime={event.createdAt.toISOString()}>
                      {formatTimestamp(event.createdAt)} UTC
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">By {event.actorName}</p>
                  {event.summary && (
                    <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-muted/40 p-3 text-sm leading-6">
                      {event.summary}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </ResponsiveContainer>
    </main>
  );
}
