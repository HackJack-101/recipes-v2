# Recipes — Product overview

A private, self-hosted cookbook for families, friends or small teams. People save their recipes in shared **kitchens**, cook from them on any device, and share a single recipe with anyone through a link.

Available in **French and English**, on **phone, tablet and desktop**.

## Who it's for

| Role | What they can do |
| --- | --- |
| **Super admin** | Creates user accounts and kitchens, manages every kitchen. |
| **Kitchen owner** | Renames the kitchen, adds or removes members, promotes or demotes owners. |
| **Member** | Reads, adds, edits, imports, shares and exports the kitchen's recipes. |
| **Guest (no account)** | Views a recipe that someone has shared publicly. |

Accounts are created by the admin, so nobody can sign themselves up. One person can belong to several kitchens, and each recipe belongs to exactly one kitchen.

## Core features

**Collect recipes**
- **Manual entry**: title, description, tags, number of guests, prep and cook times, ingredients (quantity, unit, name) and steps.
- **AI import**: paste a web address, a page's HTML source or plain text. An AI agent extracts a structured recipe, suggests tags (reusing the kitchen's existing ones), and opens the result in the editor for review.
- **Photos**: add several per recipe, straight from the phone camera or gallery.

**Find recipes**
- Text search across titles, descriptions and tags.
- A tag filter per kitchen.
- Recipe cards show a cover photo, the total time and the tags.

**Cook**
- **Guest scaler**: choose how many people you're cooking for and every quantity adjusts, shown as kitchen-friendly fractions (½, ¼, ⅔).
- Recipes without a set number of guests get a free multiplier (×0.5, ×2…).
- Ingredients stay next to the steps on large screens, and recipes print cleanly.

**Share and keep**
- **Public link**: a read-only page anyone can open without an account. It can be revoked at any time and is hidden from search engines.
- **Export**: one recipe as Markdown, or a whole kitchen as a ZIP archive with one Markdown file per recipe. Your data is never locked in.

## Product principles

- **Private by default**: invitation only. Nothing is public unless someone explicitly shares it.
- **Mobile-first**: built to be used in the kitchen, with large touch targets and layouts that adapt from phone to desktop.
- **AI assists, people decide**: imported recipes always go through the editor before they're final, and the AI never invents missing information.
- **Self-hosted**: runs on your own server with Docker, and the data stays yours.

## Out of scope today

- Self sign-up, password reset, and deleting users or kitchens from the app.
- Meal planning, shopping lists, nutrition information, ratings and comments.
