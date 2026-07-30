# PataNyumba AI Agent

An AI-powered rental property search platform tailored for the Kenyan market. Users describe what they are looking for in plain language and instantly receive matching property listings in a conversational chat interface.

---

## Features

- **AI Chat Interface** — Users describe their rental requirements (location, budget, house type, bedrooms) in natural language and receive matching property listings as conversational responses.
- **AI-Powered Property Matching** — An LLM backend parses user messages, extracts search filters, queries the property database, and returns structured results alongside a friendly reply.
- **Property Cards in Chat** — Matching listings display directly inside the chat as rich cards showing price (KES), location, bedrooms, amenities, and landlord contact information.
- **Favorite Properties** — Users can save listings they like using the heart button on each property card, with favorites persisted in the database.
- **Chat History Persistence** — Conversation history is saved both server-side (per session) and in the browser (localStorage), so users never lose their search progress on page reload.
- **Quick Filters** — Filter chips for city, price range, bedrooms, and property type let users refine searches alongside the chat.
- **Premium Landing Page** — A polished landing page with a hero section, "Start Searching" call-to-action, featured property highlights, and a "How It Works" guide.
- **Four Kenyan Cities** — Property listings across Nairobi, Mombasa, Kisumu, and Nakuru, covering popular neighborhoods.

---

## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | React 19, Tailwind CSS 4, shadcn/ui, Wouter (routing)   |
| Backend      | Express 4, tRPC 11, Zod validation                     |
| Database     | MySQL via Drizzle ORM                                   |
| AI           | Manus LLM (built-in) for filter extraction + responses  |
| File Storage | S3-compatible storage for property images               |
| Testing      | Vitest                                                  |
| Package Mgr  | pnpm                                                    |

---

## Project Structure

```
patanyumba-agent/
├── client/
│   ├── public/                 # Static assets (favicon, robots.txt)
│   └── src/
│       ├── components/         # Reusable UI components
│       │   ├── PropertyCard.tsx   # Property listing card with image + favorite
│       │   ├── AIChatBox.tsx      # Pre-built chat component
│       │   ├── DashboardLayout.tsx
│       │   ├── Map.tsx            # Google Maps integration
│       │   └── ui/                # shadcn/ui components
│       ├── contexts/           # React contexts (ThemeContext)
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # tRPC client binding
│       ├── pages/              # Page-level components
│       │   ├── Home.tsx           # Landing page
│       │   ├── Chat.tsx           # AI chat interface
│       │   └── NotFound.tsx
│       ├── App.tsx             # Routes & layout
│       ├── index.css           # Global styles & design tokens
│       └── main.tsx            # Entry point
├── server/
│   ├── _core/                # Framework plumbing (OAuth, context, tRPC setup)
│   ├── db.ts                 # Database query helpers
│   ├── routers.ts            # tRPC procedures (properties, chat, favorites)
│   ├── seed.mjs              # Database seed script with sample properties
│   └── *.test.ts             # Vitest test files
├── drizzle/
│   ├── schema.ts             # Database schema (5 tables)
│   └── migrations/           # Generated migration SQL files
├── shared/                   # Shared constants & types
├── storage/                  # S3 upload/download helpers
├── package.json
└── todo.md                   # Feature tracking
```

---

## Database Schema

The application uses five database tables:

| Table           | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `users`         | User accounts backed by Manus OAuth            |
| `properties`    | Rental property listings with full details     |
| `conversations` | Chat session history                           |
| `messages`      | Individual messages within conversations       |
| `favorites`     | Properties saved by users                      |

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 22)
- pnpm
- MySQL or TiDB database instance
- Environment variables (auto-injected when deployed via Manus)

### Installation

```bash
# Clone the repository
git clone https://github.com/Korirtech/PATANYUMBA-AGENT.git
cd PATANYUMBA-AGENT

# Install dependencies
pnpm install

# Set up environment variables (if running locally)
cp .env.example .env  # Configure DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
pnpm db:push

# Seed sample data
npx tsx server/seed.mjs
```

### Development

```bash
# Start development server
pnpm dev
# → Visit http://localhost:3000

# Run type checks
pnpm check

# Run tests
pnpm test

# Format code
pnpm format
```

### Production

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

---

## API Endpoints

The application uses tRPC for type-safe API communication. All endpoints are under `/api/trpc`:

| Endpoint                    | Type       | Description                                    |
| --------------------------- | ---------- | ---------------------------------------------- |
| `properties.featured`       | Query      | Returns featured property listings             |
| `properties.search`         | Query      | Search properties with filters                 |
| `properties.filters`        | Query      | Returns available cities and property types    |
| `chat.sendMessage`          | Mutation   | Send a message to the AI agent                 |
| `chat.getHistory`           | Query      | Retrieve conversation history                  |
| `chat.create`               | Mutation   | Create a new conversation                      |
| `favorites.toggle`          | Mutation   | Toggle a property as favorite                  |
| `favorites.list`            | Query      | List all favorited properties                  |
| `favorites.check`           | Query      | Check if a property is favorited               |
| `auth.me`                   | Query      | Get current user info                          |
| `auth.logout`               | Mutation   | Clear session and logout                       |

---

## Environment Variables

| Variable                   | Description                                   |
| -------------------------- | --------------------------------------------- |
| `DATABASE_URL`             | MySQL/TiDB connection string                  |
| `JWT_SECRET`               | Session cookie signing secret                 |
| `VITE_APP_TITLE`           | Application title                             |
| `VITE_APP_LOGO`            | Application logo URL                          |
| `VITE_APP_ID`              | Manus OAuth application ID                    |
| `OAUTH_SERVER_URL`         | Manus OAuth backend base URL                  |
| `VITE_OAUTH_PORTAL_URL`    | Manus login portal URL                        |
| `OWNER_OPEN_ID`            | Project owner's open ID                       |
| `OWNER_NAME`               | Project owner's name                          |
| `BUILT_IN_FORGE_API_URL`   | Manus built-in APIs URL (server-side)         |
| `BUILT_IN_FORGE_API_KEY`   | Manus built-in APIs bearer token (server)     |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus built-in APIs key (frontend)         |
| `VITE_FRONTEND_FORGE_API_URL` | Manus built-in APIs URL (frontend)         |
| `VITE_ANALYTICS_ENDPOINT`  | Analytics tracking endpoint                   |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website identifier                 |

---

## Testing

The project includes comprehensive Vitest tests covering the API layer:

```bash
pnpm test
```

| Test Suite               | Coverage                                          |
| ------------------------ | ------------------------------------------------- |
| `auth.logout.test.ts`    | Session cookie clearing on logout                 |
| `properties.test.ts`     | Property search, filters, featured listings, favorites, image URLs |

---

## Screenshots

### Landing Page

The landing page features a hero section with "Find Your Perfect Rental Home in Kenya" headline, a "Start Searching" CTA, stats overview, "How It Works" guide, featured property listings with images, available cities section, and a footer CTA.

### Chat Interface

The AI chat interface displays quick filter chips for city, price range, bedrooms, and property type. Users can describe their needs in natural language and receive matching property cards with images, pricing in KES, landlord contacts, and a favorite (heart) button.

---

## Property Types

All listings use the exact following property type labels:

| Type        | Description                              |
| ----------- | ---------------------------------------- |
| `bedsitter` | Single-room studio (no separate bedroom) |
| `1BR`       | One-bedroom unit                         |
| `2BR`       | Two-bedroom unit                         |
| `3BR`       | Three-bedroom unit                       |
| `apartment` | Multi-unit apartment building            |
| `maisonette`| Two-story house with separate entrance   |

---

## Cities Covered

| City      | Neighborhoods Included                                                    |
| --------- | ------------------------------------------------------------------------- |
| Nairobi   | Kilimani, Westlands, Karen, Lavington, Donholm, Langata, South B, Rongai  |
| Mombasa   | Nyali, Tudor, Mtwapa, Bamburi, Changamwe, Shanzu                          |
| Kisumu    | Milimani, Obunga, Kisumu West, Nyalenda, Dunga                            |
| Nakuru    | Lanet, Milimani, Njoro, Section 58, London                                |

---

## License

MIT

---

## Built by Korirtech

PataNyumba AI Agent — AI-powered property search for Kenya.
