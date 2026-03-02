# Project Structure

## Folders

- `marketing/`: Public landing and feature pages.
- `auth/`: Authentication flows (login, signup, password reset).
- `app/`: Authenticated in-app experience.
- `assets/css/`: Shared and page-level stylesheets.
- `assets/js/`: Shared frontend scripts and page behavior.

## Routing Conventions

- Canonical public routes are folder-based:
  - `/` (home)
  - `/features/`
  - `/login/`
  - `/signup/`
  - `/forgot-password/`
  - `/update-password/`
  - `/dashboard/`
- Legacy `.html` files under `marketing/`, `auth/`, and `app/` are redirect stubs for backward compatibility.
- Use absolute app routes in JS constants (for example `/dashboard/`) to avoid path-depth issues.

## Asset Conventions

- Root page uses `assets/...`; subfolder pages use `../assets/...` or absolute `/assets/...`.
- Keep page-specific CSS in `assets/css/` with names matching page intent:
  - `marketing.css` shared styles for `/` and `/features/`
  - `auth.css` shared auth styles for login/signup/reset/update
  - `dashboard.css` app dashboard styles

- Keep shared/auth JS in `assets/js/`:
  - `supabase-config.js` shared Supabase client bootstrap
  - `auth.js` shared auth logic for login/signup/reset/update
  - `index.js` marketing page behavior
  - `dashboard.js` app dashboard behavior

## Maintainability Rules

- Prefer extending existing shared files before creating new page-specific files.
- Keep routing strings centralized in JS files (for example, `ROUTES` constants in `auth.js`).
- Keep HTML as structure-only where possible; avoid inline `<script>` and inline `<style>`.
- Do not use inline event attributes (for example `onclick`, `oninput`, `onchange`); bind events in JS files.
- Use `data-*` page flags (for example `data-auth-page`) to enable shared scripts per page.
- Document any new shared file in this document when it is introduced.

## Editing Checklist

- If you add a new page:
  - Update folder placement (`marketing`, `auth`, or `app`).
  - Reuse existing shared CSS/JS where possible.
  - Add only page-specific selectors/logic that cannot be shared.
- If you change auth flow:
  - Touch `assets/js/auth.js` first.
  - Keep redirects consistent with `/dashboard/` and auth folder routes (for example `/login/`).
- If you change marketing layout:
  - Touch `assets/css/marketing.css` first.
  - Keep shared tokens/components near the top and page-specific sections near the bottom.
