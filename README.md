# Bullet-MVP

**A mobile-first bullet journal and habit tracker for individuals and teams.**

---

## What is Bullet-MVP?

Bullet-MVP is a personal operating system for daily organization. It's built around the core idea of a **digital bullet journal** — fast, minimal, and designed to reduce friction between thinking and doing.

The app lets you:
- **Log daily entries** with bullet-style notation (tasks, notes, ideas)
- **Track habits** over a 52-week contribution graph (GitHub-style)
- **Move tasks** between days with swipe gestures
- **Receive reminders** via WhatsApp through Twilio integration

---

## Why Does It Exist?

Most productivity apps are either:
1. **Too complex** — feature overload that slows you down
2. **Too simple** — nice UI but no real capability

Bullet-MVP exists to fill the gap: a fast, keyboard-friendly, mobile-first journal that actually helps you build routines without getting in your way.

It's built for people who:
- Hate switching between apps to capture a thought
- Want a system that's as fast as writing in a physical notebook
- Need accountability through habit tracking without gamification fluff

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | SQLite via Prisma ORM |
| SMS/WhatsApp | Twilio |
| Scheduling | node-cron |
| Deployment | Docker + Docker Compose |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (optional, for containerized deployment)

### Local Setup

```bash
# Clone the repo
git clone https://github.com/zaballin/bullet-mvp.git
cd bullet-mvp

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to local SQLite
npm run db:push

# Run the dev server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Docker Setup

```bash
# Build and run
docker-compose up --build

# App will be available at http://localhost:3001
```

---

## Core Concepts

### Bullet Notation

Entries follow a simple prefix-based notation:

| Prefix | Meaning | Example |
|---|---|---|
| `.` | Task | `. Buy groceries` |
| `.!` | Urgent task | `.! Call doctor` |
| `/` | Note | `/ Review Q2 budget` |
| `!` | Idea | `! Morning routine could be 30 min earlier` |

Tasks can be completed by swiping right. They can be moved to tomorrow by swiping left.

### Habit Tracking

The Habits tab shows a 52-week contribution grid — each cell represents one day, colored by how many tasks you completed. It's modeled after GitHub's contribution graph and serves as a lightweight accountability tool.

### WhatsApp Reminders

When enabled, the system sends daily habit reminders via WhatsApp using Twilio. Reminders are controlled via cron jobs in `src/lib/cron.ts`.

---

## Project Structure

```
bullet-mvp/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/
│   │   │   ├── habits/         # GET, POST habits
│   │   │   ├── entries/         # GET, POST journal entries
│   │   │   ├── capture/         # Quick capture endpoint
│   │   │   ├── reminders/       # WhatsApp reminder trigger
│   │   │   └── whatsapp/        # Twilio webhook handler
│   │   ├── page.tsx            # Main journal view
│   │   └── layout.tsx           # App layout with bottom nav
│   ├── components/
│   │   ├── TodayView.tsx        # Daily entries view with swipe
│   │   ├── HabitsView.tsx       # 52-week habit grid
│   │   ├── JournalView.tsx      # Historical journal entries
│   │   └── BottomNav.tsx       # Mobile bottom navigation
│   └── lib/
│       ├── db.ts               # Prisma client + helpers
│       └── cron.ts             # Scheduled job definitions
├── prisma/
│   └── schema.prisma           # Database schema
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Database Schema

The schema is in `prisma/schema.prisma`. Core models:

- **Entry** — a single journal line with type, content, date, and completion status
- **Habit** — tracked habits with completion history
- **Reminder** — scheduled notification records

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# Twilio (WhatsApp integration)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+1xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## Known Limitations

- **SQLite for local dev only** — production should use PostgreSQL
- **Tomorrow navigation** — future dates are intentionally blocked to keep focus on today
- **WhatsApp reminders** — require a Twilio account with WhatsApp sandbox configured

---

## What's Next (Roadmap)

- [ ] Migrate from SQLite to PostgreSQL for production
- [ ] Add user authentication (currently single-user)
- [ ] Support calendar view alongside day view
- [ ] Add tags/labels to entries
- [ ] Export data to PDF or Markdown

---

## License

MIT — use it, fork it, make it yours.