# Website Prototype 2

A connection toolkit for students and educators, with five sample page types and an independent live survey system.

- Hosted website: https://connection-toolkit-prototype-2.labsocialdecisions.chatgpt.site
- Public pages: `public/index.html`, `blog.html`, `article.html`, `activities.html`, and `activity.html`.
- Downloadable HTML and PNG/JPG files: `../../downloads/website-prototype-2/`.

The hosted website uses Vinext, D1, and ChatGPT organizer sign-in. Live surveys support anonymous rating responses, participant links and QR codes, open/close collection, frozen selected aggregate presentations, CSV exports, and deletion. The hosted site is private; visitors need site access.

Install dependencies with pnpm. Run `pnpm dev` to preview. Local D1 must be initialized using `drizzle/0000_curious_toxin.sql` before creating sessions. Each prototype uses its own database. The source retains the matching Sites project ID in `.openai/hosting.json`.

For a server-free clickable version, download and unzip `Website Prototype 2 - Clickable.zip`, then open `Clickable Website/index.html` in its extracted folder. This version opens the hosted survey for cross-device collection.

Original Stanford documents were references only and are not included. Names and contact information are placeholders.
