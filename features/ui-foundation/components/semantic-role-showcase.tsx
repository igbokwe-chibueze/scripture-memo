import { Button } from "@/components/ui/button";

/**
 * Shows the shared meaning of the application's semantic color roles.
 *
 * This preview deliberately uses only the same token classes available to
 * product components. Administrators can switch the app theme and compare the
 * role pairs against both light and dark surfaces without changing player
 * data. The labels remain visible so color is never the only state cue.
 */
const SEMANTIC_ROLES = [
  {
    name: "Primary action",
    meaning: "Continue, submit, buy, and selected navigation",
    solid: "bg-primary text-primary-foreground",
    subtle: "bg-secondary text-secondary-foreground border-selection-border",
  },
  {
    name: "Reward",
    meaning: "Glow Points, currency, and earned achievements",
    solid: "bg-reward text-reward-foreground",
    subtle: "bg-reward-subtle text-reward-text border-reward-border",
  },
  {
    name: "Success",
    meaning: "Correct answers and successful outcomes",
    solid: "bg-success text-success-foreground",
    subtle: "bg-success-subtle text-success-text border-success-border",
  },
  {
    name: "Error",
    meaning: "Incorrect answers and recoverable failures",
    solid: "bg-error text-error-foreground",
    subtle: "bg-error-subtle text-error-text border-error-border",
  },
  {
    name: "Warning",
    meaning: "Caution that does not change the underlying action",
    solid: "bg-warning text-warning-foreground",
    subtle: "bg-warning-subtle text-warning-text border-warning-border",
  },
  {
    name: "Information",
    meaning: "Hints, help, and informative status",
    solid: "bg-info text-info-foreground",
    subtle: "bg-info-subtle text-info-text border-info-border",
  },
  {
    name: "Selection",
    meaning: "An item or tab the player has selected",
    solid: "bg-selection text-selection-foreground",
    subtle: "bg-selection-subtle text-selection-text border-selection-border",
  },
  {
    name: "Decoration",
    meaning: "Restrained accents and streak flames",
    solid: "bg-decoration text-decoration-foreground",
    subtle:
      "bg-decoration-subtle text-decoration-text border-decoration-border",
  },
] as const;

/** Renders semantic token pairs on the actual themed app surfaces. */
export function SemanticRoleShowcase(): React.ReactNode {
  return (
    <section
      id="semantic-color-roles"
      className="scroll-mt-24 space-y-5 rounded-card border border-border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby="semantic-color-roles-title"
    >
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
          Shared theme tokens
        </p>
        <h2
          id="semantic-color-roles-title"
          className="mt-1 font-heading text-2xl font-bold"
        >
          Color roles and meaning
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Interface color comes from shared roles. Each color keeps the same
          meaning on every route, in both themes.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SEMANTIC_ROLES.map((role) => (
          <article
            key={role.name}
            className="space-y-3 rounded-tile border border-border bg-background p-3"
          >
            <div>
              <h3 className="font-bold">{role.name}</h3>
              <p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">
                {role.meaning}
              </p>
            </div>
            <div className="grid gap-2">
              <div
                className={`flex min-h-11 items-center justify-center rounded-control px-3 text-sm font-bold ${role.solid}`}
              >
                Solid role
              </div>
              <div
                className={`flex min-h-11 items-center justify-center rounded-control border px-3 text-sm font-bold ${role.subtle}`}
              >
                Subtle role
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-tile border border-border bg-muted p-3">
        <span className="mr-auto text-sm font-bold text-muted-foreground">
          Main actions stay primary; reward colors stay attached to rewards.
        </span>
        <Button type="button">Continue</Button>
        <span className="inline-flex min-h-10 items-center rounded-control bg-reward-subtle px-3 font-bold text-reward-text">
          +120 Glow
        </span>
      </div>
    </section>
  );
}
