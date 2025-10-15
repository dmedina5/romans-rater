# Deployment Guide

## Deploying to GitHub Pages

Roman's Rater is designed to be hosted as a static website on GitHub Pages with zero configuration.

### Step 1: Push to GitHub

```bash
cd romans-rater
git init
git add .
git commit -m "Initial commit: Roman's Rater 4.21"
git remote add origin https://github.com/dmedina5/romans-rater.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to repository Settings
2. Navigate to Pages section
3. Select Source: **main** branch, **/ (root)** folder
4. Click Save

Site will be live at: **https://dmedina5.github.io/romans-rater**

### Verification

- Visit the URL
- Test PDF upload
- Check console for errors
- Verify all features work

## Troubleshooting

**404 Error:** Ensure `index.html` is in root directory
**Resources Not Loading:** Check all paths are relative (no leading `/`)
**CSP Errors:** Verify Content-Security-Policy meta tag is present

---

For detailed deployment options (Netlify, Vercel, self-hosted), see full documentation.
