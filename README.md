# DIBS – WebViewer App

## Files
- `index.html` — markup + references to style.css / script.js
- `style.css` — all styling
- `script.js` — all app logic (rendering, Thunkable bridge)

## Deploy to GitHub Pages

1. Create a new GitHub repo (or use an existing one).
2. Put these three files in the **root** of the repo (or in a `/docs` folder — see step 4).
3. Push:
   ```
   git init
   git add index.html style.css script.js
   git commit -m "DIBS webviewer app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
4. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pick `main` and `/ (root)` (or `/docs` if you used that folder), Save.
5. After a minute or two, your app is live at:
   ```
   https://<your-username>.github.io/<your-repo>/
   ```
6. In Thunkable, set your WebViewer's **URL** property to that link instead of pasting raw HTML. Every time you `git push` an update, the live URL updates automatically — no more re-pasting HTML into Thunkable by hand.

## Note on relative paths
`index.html` links to `style.css` and `script.js` with plain relative paths (`href="style.css"`, `src="script.js"`), which works correctly both at the repo root and inside a `/docs` subfolder — no changes needed either way.
