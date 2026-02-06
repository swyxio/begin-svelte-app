# Hacker News Clone

A completely faithful Hacker News clone with all social features, built with Next.js, SQLite, and TypeScript.

## Features

### Core Social Features
- **User registration & login** with encrypted sessions
- **Story submission** — URL stories, text posts (Ask HN, Show HN), and job postings
- **Threaded comments** — nested replies with collapse/expand
- **Voting system** — upvote stories and comments, downvote comments (500+ karma)
- **Karma tracking** — updated in real-time based on votes
- **User profiles** — about, email, showdead, noprocrast, delay settings
- **Flag, hide, favorite, vouch** — full social moderation toolkit

### HN Ranking Algorithm
Stories are ranked using the original HN formula:
```
score = (votes - 1)^0.8 / (age_hours + 2)^1.8
```
With penalties for text-only posts and flagged content.

### All Pages
| Page | Description |
|------|-------------|
| `/` | Front page with ranked stories |
| `/newest` | New stories, chronological |
| `/newcomments` | New comments |
| `/ask` | Ask HN stories |
| `/show` | Show HN stories |
| `/jobs` | Job postings |
| `/best` | Best stories by score |
| `/active` | Active discussions |
| `/bestcomments` | Best comments by score |
| `/noobstories` | Stories from new users |
| `/noobcomments` | Comments from new users |
| `/leaders` | Top users by karma |
| `/item?id=X` | Story/comment detail + threaded comments |
| `/user?id=X` | User profile (editable if own) |
| `/submitted?id=X` | User's submissions |
| `/threads?id=X` | User's comments |
| `/favorites?id=X` | User's favorites |
| `/upvoted?id=X` | User's upvoted items (self only) |
| `/hidden` | User's hidden stories (self only) |
| `/from?site=X` | Stories from a domain |
| `/search?q=X` | Search stories and comments |
| `/submit` | Submit a story |
| `/login` | Login / create account |
| `/changepw` | Change password |
| `/reply?id=X` | Reply to a comment |
| `/edit?id=X` | Edit a comment (within 2hr window) |
| `/newsguidelines` | Site guidelines |
| `/newsfaq` | FAQ |
| `/formatdoc` | Formatting options |
| `/lists` | Index of all list pages |

### Visual Faithfulness
- Orange header (#ff6600) with Y logo
- Verdana font, 10pt body, 7pt subtext
- 85% width centered table layout
- Gray upvote triangles, orange when voted
- Exact HN color scheme (#f6f6ef background, #828282 metadata)
- Orange footer separator line

## Tech Stack

- **Next.js 15** — App Router with Server Components
- **SQLite** (better-sqlite3) — zero-config embedded database
- **iron-session** — encrypted cookie-based sessions
- **bcryptjs** — password hashing
- **TypeScript** — type safety throughout
- **Pure CSS** — no frameworks, faithful to HN's minimal styling

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is auto-created on first request in `data/hn.db`.

## Production Build

```bash
npm run build
npm start
```
