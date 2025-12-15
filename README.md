# Outreach

An intelligent cold email automation platform for internship seekers.

Outreach streamlines the internship search process by automatically finding relevant companies and reaching out to founders and key personnel on behalf of users.

## Demo

Watch the demo: [Outreach Demo Video](https://youtu.be/3kL3nEbxLi0)

> Status: Work in Progress

## Backend Architecture Diagram

![Backend Architecture](./backend.png)

## Agents Architecture

![Agents Architecture](./agents.png)

## How It Works

Users interact through a chat interface where they provide their resume and work preferences. The system finds 10 relevant companies and their founder emails, drafts custom short cold emails using proven formats, and sends 5 emails daily on behalf of the user.

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd applyo
   ```

2. Set up the backend:
   ```bash
   cd worker
   npm install
   npm run dev
   ```

3. Set up the frontend (in a new terminal):
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```

4. Access the application at [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Cloudflare Workers, SQLite, Better Auth
- **AI:** Intelligent agents for company discovery and email generation

