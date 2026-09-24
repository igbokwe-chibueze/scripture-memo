"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FellowshipDirectoryContent } from "./fellowship-directory-content";
import { FellowshipJoinRequestContent } from "./fellowship-join-request-content";
import type {
  FellowshipDirectoryData,
  FellowshipJoinRequestItem,
  FellowshipMutationData,
  FellowshipSummary,
} from "../types/fellowship.types";
import type { ActionResult } from "@/types/api";

/** Synthetic directory prerequisites, never IDs from a real account/database. */
function createDirectory(): FellowshipDirectoryData {
  const base: FellowshipSummary = {
    id: "preview-public",
    slug: "preview-public",
    name: "Morning Light",
    description: "Sample fellowship for testing controls.",
    isPublic: true,
    memberCount: 12,
    isMember: false,
    isLeader: false,
    insigniaKey: "word-star",
    requestStatus: null,
    requestId: null,
  };
  return {
    memberships: [],
    discoverableFellowships: [
      base,
      { ...base, id: "preview-private", slug: "preview-private", name: "Quiet Waters", isPublic: false },
      {
        ...base,
        id: "preview-pending",
        slug: "preview-pending",
        name: "Daily Encouragement",
        isPublic: false,
        requestStatus: "PENDING",
        requestId: "preview-cancel-request",
      },
    ],
  };
}

/** Two pending applicants expose competing approve/reject controls immediately. */
function createRequests(): FellowshipJoinRequestItem[] {
  return ["Sample learner one", "Sample learner two"].map((displayName, index) => ({
    id: `preview-applicant-${index}`,
    displayName,
    countryCode: null,
    waypointsCompleted: 3,
    glowPoints: 200,
    source: index === 0 ? "DIRECTORY" : "INVITE",
    status: "PENDING",
    requestedAt: new Date("2026-09-23T12:00:00.000Z"),
    resolvedAt: null,
  }));
}

/**
 * All responses and fixture changes remain in memory. Real components own their
 * transitions, disabled controls, errors, and toasts. No server action is imported.
 * In rejection mode each operation fails once, then succeeds when retried.
 */
function PreviewRun({ rejectFirst }: { rejectFirst: boolean }): React.ReactNode {
  const [data, setData] = useState(createDirectory);
  const [requests, setRequests] = useState(createRequests);
  const attempted = useRef(new Set<string>());

  const shouldSucceed = async (key: string): Promise<boolean> => {
    const first = !attempted.current.has(key);
    attempted.current.add(key);
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    return !(rejectFirst && first);
  };
  const mutate = async (
    fellowshipId: string,
    request: boolean,
  ): Promise<ActionResult<FellowshipMutationData>> => {
    if (!await shouldSucceed(`${request ? "request" : "join"}:${fellowshipId}`)) {
      return { success: false, message: "Test request rejected. Retry to succeed." };
    }
    setData((current) => ({
      ...current,
      discoverableFellowships: current.discoverableFellowships.map((item) =>
        item.id !== fellowshipId ? item : {
          ...item,
          isMember: !request,
          requestStatus: request ? "PENDING" : null,
          requestId: request ? `request:${item.id}` : null,
        },
      ),
    }));
    return {
      success: true,
      message: "Test scenario updated. No real membership changed.",
      data: { slug: "preview-only", outcome: request ? "REQUESTED" : "JOINED", badgeUnlocks: [] },
    };
  };

  return (
    <div
      className="space-y-6"
      // Normal links/search are outside this mutation-control test. Intercept
      // them only inside the preview so synthetic IDs never open real routes.
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest("a")) {
          event.preventDefault();
          event.stopPropagation();
          toast.info("Preview only. No real fellowship will open.");
        }
      }}
      onSubmitCapture={(event) => event.preventDefault()}
    >
      <FellowshipDirectoryContent
        data={data}
        initialSearch=""
        initialInviteCode="PREVIEW-CODE"
        transport={{
          join: ({ fellowshipId }) => mutate(fellowshipId, false),
          request: ({ fellowshipId }) => mutate(fellowshipId, true),
          joinInvite: () => mutate("preview-public", false),
          cancel: async ({ requestId }) => {
            if (!await shouldSucceed(`cancel:${requestId}`)) {
              return { success: false, message: "Test cancellation rejected. Retry to succeed." };
            }
            setData((current) => ({
              ...current,
              discoverableFellowships: current.discoverableFellowships.map((item) =>
                item.requestId === requestId ? { ...item, requestId: null, requestStatus: null } : item,
              ),
            }));
            return { success: true, message: "Sample request cancelled." };
          },
          refresh: () => undefined,
          navigate: () => undefined,
          linkHref: () => "/admin/testing/features#feature-test-previews",
        }}
      />
      <FellowshipJoinRequestContent
        requests={requests}
        transport={{
          refresh: () => undefined,
          resolve: async ({ requestId, decision }) => {
            if (!await shouldSucceed(`${requestId}:${decision}`)) {
              return { success: false, message: "Test decision rejected. Retry to succeed." };
            }
            setRequests((current) => current.map((request) =>
              request.id !== requestId ? request : {
                ...request,
                status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
                resolvedAt: new Date(),
              },
            ));
            return { success: true, message: "Sample leader decision saved." };
          },
        }}
      />
    </div>
  );
}

/** Resets all ready-made join, invite, cancellation, and leader decision fixtures. */
export function FellowshipTestPreview(): React.ReactNode {
  const [run, setRun] = useState(0);
  const [rejectFirst, setRejectFirst] = useState(false);
  return (
    <section id="fellowship-testing" className="space-y-5">
      <h2 className="font-heading text-2xl font-black">Fellowship testing</h2>
      <p className="text-sm text-muted-foreground">
        Sample groups and applicants are ready below. Try join, request, cancel,
        invite-code entry, approve, and reject at 375px. Only the selected action
        should spin; competing controls in its panel should disable.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Visual selection and accessible pressed state use the same mode. */}
        <Button
          variant={rejectFirst ? "outline" : "default"}
          onClick={() => {
            setRejectFirst(false);
            setRun((value) => value + 1);
          }}
          aria-pressed={!rejectFirst}
        >
          Success scenarios
        </Button>
        <Button
          variant={rejectFirst ? "default" : "outline"}
          onClick={() => {
            setRejectFirst(true);
            setRun((value) => value + 1);
          }}
          aria-pressed={rejectFirst}
        >
          Reject once, then retry
        </Button>
        <Button variant="outline" onClick={() => setRun((value) => value + 1)}>
          Reset scenarios
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        No real memberships, requests, rewards, or game progress change.
        Reset restores every sample. In rejection mode, repeat the same action to succeed.
      </p>
      <PreviewRun key={run} rejectFirst={rejectFirst} />
    </section>
  );
}
