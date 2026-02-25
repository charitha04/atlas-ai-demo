# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # Production build to dist/
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

## Tech Stack

- **Framework**: React 19 with Vite 7
- **Styling**: TailwindCSS 3 with custom theme (primary color: `#1A9375`)
- **Icons**: lucide-react
- **Animations**: Motion (framer-motion successor)
- **Maps**: react-leaflet
- **Utilities**: clsx + tailwind-merge for class composition

## Architecture Overview

### Entry Points
- `src/main.jsx` - React root render
- `src/App.jsx` - Main app shell with sidebar navigation and page routing

### Pages (`src/pages/`)
- `Search.jsx` - AI-powered customer search with recommendation cards
- `Dashboard.jsx` - KPI widgets, schematic map, activity feed
- `Customers.jsx` - Customer listing with filters
- `Campaigns.jsx` - Campaign management

### Component Organization (`src/components/`)
- `ui/` - Reusable UI primitives (Card, KPIWidget, ScoreBadge, GridBackground)
- `search/` - Search-specific components (RecommendationCard, CampaignEditor, OfferCard, etc.)
- `maps/` - Map components (SchematicMap, SingleCustomerMap)

### Services (`src/services/`)
- `aiSearchService.js` - Mock AI recommendation service that simulates campaign recommendations based on query keywords (defector, service due, recall, etc.)

### Data Layer (`src/data/`)
- `mockData.js` - Generates randomized customer and campaign data with realistic patterns. Exports `INITIAL_CUSTOMERS`, `INITIAL_CAMPAIGNS`, `ACTIVITY_FEED`.

### Utilities (`src/lib/`)
- `utils.js` - Contains `cn()` function for merging Tailwind classes

## Key Patterns

### State Management
App uses React's built-in useState - no external state library. Customer and campaign data flows down from `App.jsx` as props.

### Customer Statuses
The app recognizes these customer statuses: `Service Due`, `Active Defector`, `Open Recall`, `Loyal`, `Service declined`

### Customer Segments
Three segments: `High Value`, `Standard`, `At Risk`

### AI Search Keywords
The mock AI service (`aiSearchService.js`) responds to these query patterns:
- "defector" / "win back" → Win-Back Campaign
- "service due" → Service Campaign  
- "recall" → Recall Campaign
- Modifiers: "high value", "at-risk", "urgent"

### Styling Conventions
- Use `cn()` from `lib/utils.js` for conditional class merging
- Primary color scale available as `primary-50` through `primary-900`
- Font family: "Instrument Sans" (configured in tailwind.config.js)
