<p align="center">
  <img src="public/arya-avatar.png" alt="MitrrAi Logo" width="80" height="80" style="border-radius: 20px;" />
</p>

<h1 align="center">MitrrAi</h1>
<p align="center"><strong>Your all-in-one campus companion — built by SVNIT students, for SVNIT students.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Capacitor-Mobile-119EFF?logo=capacitor" alt="Capacitor" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

## 🚀 What is MitrrAi?

MitrrAi is a feature-rich campus social platform exclusively for **SVNIT Surat** students. It combines AI companionship, anonymous interactions, real-time social features, and study tools into a single app — available on **Web**, **Android**, and **iOS**.

---

## ✨ Features

### 🤖 Arya AI — Your 24/7 Campus Bestie
- Conversational AI companion powered by **Grok (via OpenAI SDK)**
- Chat and voice call support
- Customizable name and avatar
- Conversation history with multi-session support
- Private and secure — chats are never shared
- Instagram presence [@arya.mitrrai](https://instagram.com/arya.mitrrai)

### 📰 Campus Feed
- Post activities categorized by **Study, Sports, Hangout, Food, Creative, Fitness, Talk, and SOS**
- Sub-categories for granular tagging (e.g., DSA, Cricket, Yoga)
- **Location-aware** with auto-detection (Library, Canteen, Hostel, Ground, Dept)
- Distance-based filtering (Nearby 200m, 500m, Campus-wide)
- Reactions system ("I'm in", Reply, Connect) on posts
- **Anonymous posting** toggle
- Freshness grouping: Fresh → Active → Older, with SOS posts pinned to top

### 👻 Anonymous Chat
- Get matched with random SVNIT students for anonymous 1-on-1 conversations
- **5 room types:** Placement Talk 🔥, College Gossip, Dil Ki Baat, No Filter, 3 AM Thoughts (11 PM–4 AM only)
- Live stats (active chatters, queue count, room types)
- Fun auto-generated aliases
- Mutual identity reveal option
- Report & block system with ban enforcement
- **Monetization:** UPI payment plans (Weekly/Monthly/Semester), coupon codes, free trial, open access periods

### 🟣 Circles & Study Rooms
- **Circles** — Discord-style communities (e.g., DSA Circle, Physics Circle)
- Join/leave circles, search and discover new ones
- Department stats showing how many from your branch are in each circle
- **Study Rooms** — live collaborative sessions within circles
- Create rooms with topic, description, and max member limits
- Real-time room status (● Live, Recent Activity)

### 🔍 Study Buddy Matching
- Smart matching algorithm scoring students by branch, year, subjects, schedule, and study style
- Match cards with **percentage scores** and "Why it works" explanations
- Shared circles highlighted between matches
- Actions: Connect (friend request), Ping (DM), View Profile
- Department overview: total students and currently active in your branch

### 📡 Campus Radar
- **Go Live** — broadcast what you're doing and where (DSA, Chai, Cricket, etc.)
- Location-based heatmap showing where the action is on campus
- SOS broadcasts for urgent study help
- Real-time feed powered by **Supabase Realtime** (Postgres changes)
- Anonymous broadcast option with identity reveal on match
- Auto-expiring broadcasts (2-hour TTL)

### 💬 Direct Chat & Friends
- 1-on-1 real-time messaging with matched study buddies and friends
- Friend request system (send, accept, decline)
- Typing indicators and read receipts

### 🎭 Doubts & Confessions
- Anonymous campus feed for doubts, confessions, spotted, hot takes, and advice
- Post-type filtering (Doubts, Confessions, Spotted, Hot Takes, Advice)
- Upvote system and threaded anonymous replies
- Accepted answers for resolved doubts

### 🏆 Gamification
- XP points, badges, and streaks to reward engagement
- Leveling system for active participation

### 🔔 Notifications
- **Push notifications** via Firebase Cloud Messaging (FCM) for mobile
- **Web Push** via the Web Push API for browser
- In-app notification center
- Email notifications via **Nodemailer**

### 👤 Profile & Onboarding
- AI-powered onboarding flow that learns subjects, schedule, and goals
- Profile pages with avatar (zoom-to-fullscreen), bio, department, and year
- Edit profile with photo upload
- User availability and status tracking

### 👑 Pro Subscription
- Unlock unlimited matches, AI study plans, priority matching, and ad-free experience
- UPI-based payment with QR code generation and transaction verification

### 🛡️ Admin Panel
- Analytics dashboard
- Payment verification and moderation tools
- User management

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Frontend** | React 18, TailwindCSS 3 |
| **Backend/DB** | Supabase (PostgreSQL + Realtime + Auth) |
| **AI** | OpenAI SDK (Grok model) |
| **Mobile** | Capacitor 8 (Android + iOS) |
| **Push** | Firebase Admin (FCM) + Web Push API |
| **Email** | Nodemailer |
| **Icons** | Lucide React |
| **Image Processing** | Sharp |
| **Testing** | Vitest + Testing Library |
| **Linting** | ESLint + Next.js config |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page
│   ├── home/               # Campus Feed
│   ├── arya/               # Arya AI (profile, chat, call)
│   ├── anon/               # Anonymous Chat (lobby, rooms)
│   ├── circles/            # Circles (communities)
│   ├── rooms/              # Study Rooms
│   ├── matches/            # Study Buddy Matching
│   ├── radar/              # Campus Radar (live broadcast)
│   ├── chat/               # Direct Messaging
│   ├── doubts/             # Doubts & Confessions
│   ├── friends/            # Friends list & requests
│   ├── notifications/      # Notification center
│   ├── me/                 # Profile & settings
│   ├── onboarding/         # AI onboarding flow
│   ├── subscription/       # Pro plans & payment
│   ├── admin/              # Admin panel
│   ├── analytics/          # Campus analytics
│   ├── dashboard/          # Dashboard
│   ├── materials/          # Study materials
│   ├── ratings/            # Ratings
│   ├── feedback/           # Feedback
│   ├── login/              # Authentication
│   ├── call/               # Voice/video calls
│   ├── privacy/            # Privacy policy
│   ├── terms/              # Terms of service
│   └── api/                # 39 API route groups
│       ├── arya/           # Arya AI conversations
│       ├── anon/           # Anonymous chat matching
│       ├── feed/           # Campus feed CRUD
│       ├── match/          # Study buddy algorithm
│       ├── circles/        # Circle operations
│       ├── rooms/          # Study room management
│       ├── chat/           # Messaging
│       ├── doubts/         # Doubts & confessions
│       ├── radar/          # Radar pings
│       ├── friends/        # Friend requests
│       ├── notifications/  # Notifications
│       ├── gamification/   # XP, badges, streaks
│       ├── subscription/   # Payments & plans
│       ├── students/       # Student profiles
│       ├── auth/           # Authentication
│       ├── fcm/            # Firebase push tokens
│       ├── push/           # Web push
│       └── ...             # 20+ more API groups
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Core utilities
│   ├── auth.tsx            # Auth context (Supabase)
│   ├── supabase.ts         # Supabase client (service role)
│   ├── supabase-browser.ts # Supabase client (browser)
│   ├── store/              # Data operations (20+ modules)
│   ├── types.ts            # TypeScript type definitions
│   ├── constants.ts        # Shared constants
│   ├── env.ts              # Environment variable validation
│   ├── anon-aliases.ts     # Anonymous chat alias generator
│   ├── onboarding.ts       # Onboarding question config
│   └── rate-limit.ts       # In-memory rate limiter
└── middleware.ts           # Next.js middleware (auth + routing)
```

---

## 🛠 Getting Started

### Prerequisites

- **Node.js** 20.x
- **npm** (or yarn/pnpm)
- **Supabase** project with database and auth configured
- API keys for Grok/OpenAI, Firebase, and Web Push (see `.env.local.example`)

### Installation

```bash
# Clone the repo
git clone https://github.com/Razz0711/MITRRAI.git
cd MITRRAI

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase, AI, Firebase, and push notification keys
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build

```bash
npm run build
npm start
```

### Mobile (Capacitor)

```bash
# Sync web assets to native projects
npm run cap:sync

# Open in Android Studio
npm run cap:android

# Open in Xcode
npm run cap:ios
```

### Testing

```bash
npm test           # Watch mode
npm run test:run   # Run once
```

---

## 🌐 Deployment

The app is deployed on **Vercel**:
- Production: [mitrrai-study.vercel.app](https://mitrrai-study.vercel.app)

---

## 🔒 Environment Variables

The app requires the following environment variables (see `.env.local`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GROK_API_KEY` | Grok/OpenAI API key for Arya AI |
| `FIREBASE_*` | Firebase Admin SDK credentials for FCM |
| `NEXT_PUBLIC_VAPID_KEY` | VAPID public key for web push |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `SMTP_*` | Email SMTP settings for Nodemailer |

---

## 📄 License

This project is private and built exclusively for **SVNIT Surat** students.

---

<p align="center">
  Built with 💜 at <strong>SVNIT Surat</strong> — &copy; 2026 MitrrAi
</p>
