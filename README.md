# Rabbit Hole Radar 🐇

A personal curiosity field journal for collecting questions, following interesting ideas, and turning a few rabbit holes into real projects.

**Live app:** once GitHub Pages is enabled, it will be available at https://cristylepgarrard.github.io/RabbitHoleRadar/

## What's in the app?

- Dashboard stats for active explorations, saved ideas, completed projects, and learning hours
- Create and edit ideas with category, curiosity level, priority, and status
- Exploration workspace with progress, notes, tasks, learning hours, favorites, and useful links
- Search, category/status filters, favorites-only view, and sorting
- A Surprise Me button for fresh project ideas
- Responsive layout, accessible labels, empty states, and delete confirmations

## Tech

This version uses plain HTML, CSS, and JavaScript modules. There is no framework, build step, package install, or API key required.

- `index.html` — page structure and metadata
- `style.css` — responsive styling and visual design
- `app.js` — UI rendering and interactions
- `data.js` — sample data, data model, and persistence adapter
- `favicon.svg` — browser icon

## Data and saving

Right now, ideas are saved in the current browser using `localStorage`. That means the data survives refreshes in that browser, but it does **not** sync between browsers or devices, and clearing browser storage can remove it.

The data layer is intentionally separate in `data.js`. When we're ready to connect Google Sheets, we can add a Google Apps Script web app and replace the `dataStore` adapter with API-backed `load` and `save` methods. The interface should not need a full rewrite.

Because GitHub Pages serves public static files, never put passwords, private keys, or other secrets in this repository. The spreadsheet endpoint and its access rules need to be designed deliberately before enabling shared writes.

## Run locally

From the repository folder, start a small static server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Use a local server rather than opening `index.html` directly, because the app loads JavaScript modules.

## GitHub Pages

This repository includes a GitHub Actions workflow to publish the repository root. In GitHub, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source if it isn't already selected. Pushes to `main` will trigger deployment.

The app uses relative asset paths such as `./style.css` and `./favicon.svg`, so it works at the project-site URL under `/RabbitHoleRadar/`.

## Next step: Google Sheets

1. Create a spreadsheet with a documented column/schema for ideas, plus tasks and links.
2. Add a Google Apps Script web app to read and write that schema.
3. Configure the endpoint and choose how the app is authorized to read/write.
4. Switch the adapter in `data.js` and test errors, duplicates, and concurrent edits.

Until that is done, local browser storage is the active persistence method.