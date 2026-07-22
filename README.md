# SR Planner

A daily work planner for SR Accounting, built for Stephan (primary) and Chanel (simple To Do / Doing / Done).

V1 is a single static HTML file — no backend, no build step. Data is stored in the browser's `localStorage`.

## Layout

- **Left**: Stephan's Top Priorities (auto: high-priority tasks) and Phone Slips (quick-capture notes); Chanel's To Do / Doing / Done board.
- **Centre**: Weekly Planner, Monday-Friday, 08:00-17:00.
- **Right**: Parking Lot — all of Stephan's unscheduled tasks.

## Workflow

Create Task → Parking Lot → Schedule (day + time) → Weekly Planner → Log Work → Continue Tomorrow? →
- **Yes**: back to Parking Lot, with Remaining Hours carried over (no duplicate task).
- **No** (or Remaining reaches 0): task is marked Completed and disappears.

## Running it

Just open `index.html` in a browser — no install needed. Hosted live via GitHub Pages from this repo's `main` branch.

## Roadmap

V1 is intentionally minimal (see the handover doc for full scope/out-of-scope). Planned next: a proper React + TypeScript + Vite rebuild once the workflow is validated day-to-day, plus history/reporting.
