# ♻️ Campus Exchange — Tech Titans

> A campus marketplace where students list, discover and exchange pre-owned books, calculators, lab supplies and more.

🔗 **Live link:** https://YOUR-STABLE-DOMAIN.vercel.app
🎥 **Demo video (3–5 min):** https://youtu.be/YOUR-VIDEO-ID

## Problem
Every semester, students buy new books, calculators and lab supplies while seniors' identical items sit unused. This wastes money and resources, and there is no simple campus-focused place to pass items on.

## Solution
Campus Exchange lets students list items to sell, donate or swap. Others can search, filter and sort listings, send inquiries or exchange requests, and owners can track every item as Available, Reserved or Completed. It supports campus sustainability by giving items a second life.

## Features
- Create listings with photo upload, description, category, condition, price and listing type (Sell / Donate / Exchange)
- Search, category filter and sort (newest, price low to high, price high to low)
- Send inquiries or exchange requests; owners Accept or Decline them
- Track item status: Available, Reserved, Completed
- Shared real-time-style database: every student sees the same listings (auto-refresh)
- Received and Sent request tabs for each user
- Delete listings (and edit, payment mode and student profile if added)
- Responsive design for phones and laptops

## Tech Stack
HTML, CSS, JavaScript (no framework), Supabase (PostgreSQL database), Vercel (hosting)

## Why this stack
- **Plain HTML/CSS/JS:** loads instantly on any device, no build step, easy for any student to read and run
- **Supabase (PostgreSQL):** a real shared database with no server to maintain, so all students see the same listings and requests
- **Vercel:** free public URL with automatic deploys from every GitHub commit

## Setup / Usage
**Use online:** open the live link above.

**Run locally:** clone the repo and open `index.html` in a browser (needs internet for the database).

**Use your own database:** create a free Supabase project, run `schema.sql` in the SQL Editor, then put your Project URL and publishable key at the top of `script.js`.

**Quick test (1 minute):** add a listing, then open the site in an incognito window (a second student), send an inquiry, go back to the first window and accept it from Requests → Received. The item turns Reserved.

## Team
- Member 1 name
- Member 2 name
- Member 3 name

## Notes
This is a hackathon demo. There is no password login, and "my listings" is tied to the browser. Database rules are open for demo purposes. Photos are compressed and stored with the listing.
