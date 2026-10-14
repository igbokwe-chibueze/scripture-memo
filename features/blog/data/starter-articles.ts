import { saveBlogArticleSchema, type SaveBlogArticleInput } from "../schemas/save-blog-article.schema";

/**
 * Owner-requested initial editorial content, checked against implemented rules.
 * This is static bootstrap material, not a runtime database or a second source
 * of truth. The one-time installer never overwrites articles edited in the CMS.
 * Keep guides current through the editor whenever their underlying rules change.
 */
export const STARTER_ARTICLES: SaveBlogArticleInput[] = [
  {
    title: "Your waypoint journey: Glimmer, Glow, and Radiance",
    slug: "waypoints-glimmer-glow-radiance",
    excerpt: "Understand the three-day challenge, when each day unlocks, and how to continue your Scripture journey.",
    category: "GUIDE",
    content: `## One waypoint, one verse, three challenges

A waypoint is one step along your Scripture Memo journey. Each waypoint assigns a verse and a Journey Stage. You complete three challenge days for that waypoint: Glimmer, Glow, and Radiance.

Each challenge day contains five modes in order: Drag & Drop, Puzzle, Swap, Cue, and Fill. Complete all five to finish that day.

## Glimmer: a gentle beginning

Glimmer is available when the waypoint unlocks. It hides roughly 20–35% of the verse words, giving you a gentle introduction.

## Glow: growing recall

Glow hides roughly 40–60% of the words. It unlocks 12 elapsed hours after you complete Glimmer, rather than at midnight or when a calendar date changes.

## Radiance: full remembrance

Radiance hides roughly 70–100% of the words. It unlocks 12 elapsed hours after you complete Glow.

Completing Radiance finishes the waypoint and unlocks the next currently published waypoint. You do not need to complete the whole curriculum at once.

## Understanding the card states

- **Ready:** the day can be started.
- **Cooldown:** the previous day is complete, but the waiting period has not ended. The countdown shows the remaining time.
- **Locked:** the preceding challenge still needs to be completed.
- **Completed:** the day is finished; eligible completed modes can be practiced again.

The server decides when a day is playable. Refreshing, changing your device clock, or leaving the screen does not shorten a cooldown.

For the difference between challenge days and Journey Stages, read [Journey Stages and hints](/blog/journey-stages-timers-and-hints).`,
  },
  {
    title: "Beacon Levels, XP, and your progress bar",
    slug: "beacon-levels-xp-progress-bar",
    excerpt: "What Beacon XP measures, how levels increase, and what the Beacon progress bar is telling you.",
    category: "GUIDE",
    content: `## Your permanent learning level

Beacon Level represents your lifetime progress through eligible Scripture Memo challenges. You start at Level 1 and advance by earning Beacon XP. Your level and lifetime XP do not reset each week.

## How Beacon XP is earned

- Completing an eligible game mode earns 10 XP.
- Completing Glimmer adds a 25 XP day bonus.
- Completing Glow adds a 40 XP day bonus.
- Completing Radiance adds a 60 XP day bonus.
- Completing the whole waypoint adds another 100 XP.

With five modes on each of three days, a full waypoint earns 375 XP. Failed attempts, admin tests, completed-mode practice, replays, and Vault review do not earn Beacon XP.

## What the bar measures

The Beacon bar shows progress from the start of your current level to the next level. The number beside it is your total lifetime XP, not just XP earned inside the current level.

Level 1 starts at 0 XP. Level 2 starts at 250 XP, Level 3 at 750 XP, Level 4 at 1,500 XP, and Level 5 at 2,500 XP. Each level requires more XP than the previous one.

For example, at Level 2 with 470 lifetime XP, you have earned 220 of the 500 XP needed within that level. Your bar represents 44%, and you need 280 more XP to reach Level 3.

The five small mode segments above the Beacon bar track a different thing: your progress through the current day's five game modes.

## Lifetime progress and weekly competition

Eligible XP also contributes to Weekly Beacon XP. The weekly total resets every Monday at 00:00 UTC for league competition. Lifetime XP and Beacon Level remain intact.

Beacon XP cannot be spent. [Glow Points](/blog/glow-points-and-rewards) are the game's spendable currency.`,
  },
  {
    title: "Glow Points and rewards explained",
    slug: "glow-points-and-rewards",
    excerpt: "Learn how Glow Points differ from Beacon XP and Crowns, and why completed-day rewards stay unchanged.",
    category: "GUIDE",
    content: `## The currency you can spend

Glow Points are Scripture Memo's only spendable currency. They are earned through eligible progression and badges and are used in the Oil Shop.

The golden diamond in your top bar represents your Glow Points balance. The blue star represents lifetime Beacon XP, which cannot be spent.

## Challenge-day rewards

The platform's base reward determines challenge-day rewards. Glimmer uses the base amount, Glow uses 1.5 times that amount, and Radiance uses twice that amount.

For a base reward of 100 Glow Points, these are 100, 150, and 200. Administrators can change the base amount for future completions, so check your day card for the current reward rather than relying on this example.

Completed-day cards retain the reward originally recorded for that completion. A later platform change does not rewrite what you already earned.

## Practice and rewards

Completed-mode practice helps you revisit what you learned. It does not award another challenge-completion reward or additional Beacon XP. Admin testing and failed attempts do not create normal learning rewards.

## Three different measures

- **Glow Points:** spendable game currency.
- **Beacon XP and Beacon Level:** permanent learning progression, with a separate weekly competition total.
- **Crowns:** permanent prestige from eligible Saint league finishes. They cannot be spent.

The Home Daily Challenge card is currently a placeholder. Its displayed reward is illustrative and does not grant Glow Points.`,
  },
  {
    title: "Journey Stages, timers, and hints",
    slug: "journey-stages-timers-and-hints",
    excerpt: "Learn, Recall, Strengthen, and Master control hint availability and time limits independently of your challenge day.",
    category: "GUIDE",
    content: `## Journey Stage and challenge day are different

A Journey Stage belongs to the waypoint: Learn, Recall, Strengthen, or Master. The challenge days within that waypoint are always Glimmer, Glow, and Radiance.

The same verse can appear again at a later waypoint with a different Journey Stage. This is intentional: you revisit Scripture with different levels of support.

## The four stages

- **Learn:** hints are available, with no mode time limit.
- **Recall:** hints are available, with five minutes per mode attempt.
- **Strengthen:** hints are unavailable, with three minutes per mode attempt.
- **Master:** hints are unavailable, with two minutes per mode attempt.

Having hints in your balance does not make them usable in Strengthen or Master. The waypoint's stage determines eligibility.

## How timed attempts work

Each mode attempt gets a fresh deadline when the server starts it. The timer is not shared across the whole five-mode day.

Pausing, switching tabs, refreshing, or changing your device clock does not pause or extend the deadline. The on-screen timer displays the server's timing rule.

If time expires, only that attempt fails. You can retry the same mode. Previously completed modes, day progress, Glow Points, and rewards remain safe.

## Cue is a mode; hints are a separate feature

Cue gives first-letter cues for missing words as part of its normal challenge. It is the fourth game mode. The Hint System is a separate assistance feature; these names are not interchangeable.`,
  },
  {
    title: "A guide to the five game modes",
    slug: "five-scripture-memory-game-modes",
    excerpt: "A practical introduction to Drag & Drop, Puzzle, Swap, Cue, and Fill, including touch controls.",
    category: "GUIDE",
    content: `## The order stays the same

Every challenge day progresses through Drag & Drop, Puzzle, Swap, Cue, and Fill. Each mode gives you a different way to reconstruct the assigned verse.

## 1. Drag & Drop

Place words into the correct positions. On touch devices, you can select a word and tap a blank to place it. Tap a placed word to return it to the bank.

## 2. Puzzle

Arrange the verse's pieces. Touch selection and placement are available alongside dragging, so you do not need a mouse.

## 3. Swap

Select an available word, then select another to swap them. The selection treatment shows which word you have picked; it does not mean the answer has been marked correct.

## 4. Cue

Type each complete missing word using its first-letter cue. A cue is part of this mode, not the separate Hint System.

## 5. Fill

Type the complete missing words without the first-letter help provided by Cue.

## Progress and retries

The mode indicator tells you where you are within the current day's five challenges. Answer evaluation and completion happen on the server. If an attempt is incorrect or expires, your previously completed progress remains safe.

Some Journey Stages have time limits or disallow hints. Read [Journey Stages, timers, and hints](/blog/journey-stages-timers-and-hints) for those rules.`,
  },
  {
    title: "When Study opens, and how to practice again",
    slug: "study-access-and-completed-mode-practice",
    excerpt: "Why Study can be locked during a challenge, when it reopens, and how completed-mode practice works.",
    category: "GUIDE",
    content: `## Study before you begin

When a waypoint has unlocked but you have not started its challenge, Study is available. The waypoint screen also lets you expand the verse before starting.

## Why Study locks

Once the waypoint is in progress, Study closes while you work through the three-day challenge, including cooldown periods. This keeps the memory challenge separate from its study material.

The message “Study reopens after Radiance” means that completing the waypoint restores access. It does not mean waiting for an additional timer after Radiance.

## What happens when a verse appears again

A later active waypoint for the same verse can temporarily lock Study again, even if you completed an earlier occurrence. A future waypoint that remains locked does not by itself revoke your existing access.

## Practice a completed mode

A completed day can offer Practice again. Its menu lists the modes confirmed as completed in that day's saved session. Choose a mode to revisit it.

Practice does not unlock the next day early or award the challenge's rewards again. It also does not award Beacon XP. The server checks that the mode really belongs to a completed session you may access.

To understand the day unlock schedule, read [Your waypoint journey](/blog/waypoints-glimmer-glow-radiance).`,
  },
  {
    title: "Weekly leagues and lifetime Crowns",
    slug: "weekly-leagues-and-crowns",
    excerpt: "How Weekly Beacon XP, league promotion, and Saint Crowns fit together without resetting your lifetime level.",
    category: "GUIDE",
    content: `## A new competition week

Weekly leagues use eligible Beacon XP earned during a global week beginning Monday at 00:00 UTC. Your lifetime Beacon XP and Beacon Level are permanent and do not reset with that weekly score.

## The league journey

The leagues, in order, are Traveler, Disciple, Messenger, Watchman, Teacher, Shepherd, Elder, Scribe, and Saint.

Players compete in cohorts of up to 30. When at least 10 players competed, the top seven promote and the bottom five demote. Traveler is the lowest tier and Saint is the highest.

My League shows your weekly cohort. Country and Fellowship rankings recognize Weekly Beacon XP, while All Time uses permanent Beacon Level and XP.

## Crowns in Saint

Saint does not promote to another tier. In an eligible finalized Saint weekly result, first place earns five Crowns, second earns three, third earns two, and ranks four through ten earn one each.

Crowns are permanent prestige. You cannot spend them in the Oil Shop, and they do not replace Glow Points.

Failed attempts, practice, replays, admin tests, and Vault review do not generate competition XP.`,
  },
  {
    title: "Welcome to the Scripture Memo Journal",
    slug: "welcome-to-the-scripture-memo-journal",
    excerpt: "A searchable home for game guides, product announcements, and stories about building Scripture Memo.",
    category: "NEWS",
    content: `## A place to find answers

The Scripture Memo Journal brings game explanations and product updates into one public, searchable library. You can read articles without signing in.

Start with Game Guides when you want to understand a feature: Beacon Levels, rewards, cooldowns, Journey Stages, Study, and the five game modes.

News & Announcements is for product updates. Behind the Scenes explains the design and engineering decisions that shape the experience.

## Finding what you need

Use the search box to look for a topic, or select a category. Article pages show when they were published and last updated.

Guides describe the implemented game. If a rule changes, its guide should be revised so this library stays useful as a reference.

## Begin exploring

If you are new, start with [Your waypoint journey](/blog/waypoints-glimmer-glow-radiance). If you wondered what the blue star and progress bar mean, read [Beacon Levels and XP](/blog/beacon-levels-xp-progress-bar).`,
  },
  {
    title: "Designing Scripture Memo around Meemo and clarity",
    slug: "designing-with-meemo-and-clarity",
    excerpt: "The visual principles behind our mobile-first layouts, tactile controls, themes, and new icon collection.",
    category: "BEHIND_SCENES",
    content: `## A calm game experience

Scripture Memo combines a playful game world with the calm purpose of learning Scripture. Mobile layouts prioritize the next meaningful action, clear progress, and controls that are comfortable to tap.

## Meet Meemo

Our mascot's public name is Meemo. Her illustrations support moments such as welcoming learners, presenting challenges, and offering encouragement.

The Home and waypoint details screens use approved Meemo illustrations together with a colorful, glossy dimensional icon collection. That new icon style is the direction for future icon work.

## Controls with a sense of touch

Buttons share a visible lower bevel and a pressed response. Navigation buttons also show immediate loading feedback so a tap feels acknowledged while the next screen opens.

## Light, dark, and brand themes

Shared surfaces and feedback use the app's theme system. The colorful Home shortcut tiles keep their individual hues, while surrounding surfaces respond to theme changes.

Selection and correct answers are different visual states. A highlighted word means it is selected; evaluated success gets its own feedback.

The aim is consistency: familiar controls and clear states should help you focus on the verse rather than learning a new interface on every screen.`,
  },
].map((article) => saveBlogArticleSchema.parse({
  ...article,
  status: "PUBLISHED",
  byline: "Scripture Memo",
}));
