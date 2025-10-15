# GitHub Pages Deployment Guide

## Quick Start

Follow these steps to deploy Roman's Rater website to GitHub Pages:

### 1. Push to GitHub

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit: Roman's Rater 4.21"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/yourusername/romans-rater.git
git push -u origin master
```

### 2. Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings**
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select:
   - **Branch**: `master` (or `main`)
   - **Folder**: `/docs`
5. Click **Save**

### 3. Wait for Deployment

GitHub will build and deploy your site. This usually takes 1-2 minutes.

Your site will be available at:
```
https://yourusername.github.io/romans-rater/
```

## Customization

### Update Repository URLs

Replace `yourusername` with your actual GitHub username in:

1. **docs/index.html**
   - Line ~20: Navigation GitHub link
   - Line ~50: Hero download button
   - Line ~280: Footer GitHub link

2. **docs/_config.yml**
   - Line 10: `url` and `baseurl`

Search and replace:
```bash
# In docs/ directory
find . -type f -name "*.html" -exec sed -i 's/yourusername/YOUR_USERNAME/g' {} +
```

### Custom Domain (Optional)

If you have a custom domain:

1. Create `docs/CNAME` file:
```bash
echo "yourdomain.com" > docs/CNAME
```

2. Configure DNS:
   - Add A records pointing to GitHub's IP addresses
   - Or add CNAME record pointing to `yourusername.github.io`

3. Enable **Enforce HTTPS** in GitHub Pages settings

## File Structure

```
docs/
├── index.html          # Main homepage
├── styles.css          # All CSS styles
├── script.js           # Interactive JavaScript
├── _config.yml         # Jekyll configuration
├── CNAME               # Custom domain (optional)
└── DEPLOYMENT.md       # This file
```

## Testing Locally

To test before deploying:

### Option 1: Simple HTTP Server

```bash
cd docs
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Option 2: Jekyll (if installed)

```bash
cd docs
jekyll serve
# Visit http://localhost:4000
```

### Option 3: Live Server (VS Code)

1. Install "Live Server" extension in VS Code
2. Right-click `docs/index.html`
3. Select "Open with Live Server"

## Troubleshooting

### Site Not Loading

1. **Check GitHub Pages status**
   - Go to repo Settings → Pages
   - Verify "Your site is published at..." message

2. **Check branch and folder**
   - Ensure correct branch selected
   - Ensure `/docs` folder selected

3. **Check for errors**
   - Go to Actions tab in GitHub
   - Look for failed builds

### 404 Errors

1. **Relative paths**: Make sure all links are relative or absolute
2. **Case sensitivity**: GitHub Pages is case-sensitive
3. **Index file**: Ensure `index.html` exists in `/docs`

### CSS/JS Not Loading

1. **Check file paths** in index.html:
   ```html
   <link rel="stylesheet" href="styles.css">
   <script src="script.js"></script>
   ```

2. **Clear browser cache**: Ctrl+Shift+R (hard refresh)

3. **Check console**: F12 → Console for errors

### Icons Not Showing

Font Awesome is loaded from CDN. If icons don't show:

1. Check internet connection
2. Verify CDN link in `<head>`:
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
   ```

## Updates and Maintenance

### Updating Content

1. Edit files in `docs/` directory
2. Commit and push:
   ```bash
   git add docs/
   git commit -m "Update website content"
   git push
   ```

3. GitHub Pages will auto-rebuild (1-2 minutes)

### Version Updates

When releasing new versions:

1. Update version in `index.html`:
   - Hero section
   - Footer section

2. Update edition in `_config.yml`

3. Add release notes

## SEO and Analytics

### Google Search Console

1. Verify ownership via GitHub Pages
2. Submit sitemap: `https://yourusername.github.io/romans-rater/sitemap.xml`

### Google Analytics (Optional)

1. Get tracking ID from analytics.google.com
2. Uncomment in `_config.yml`:
   ```yaml
   google_analytics: UA-XXXXXXXX-X
   ```

3. Add tracking code to `index.html` `<head>`:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXXX-X"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'UA-XXXXXXXX-X');
   </script>
   ```

## Performance Optimization

### Image Optimization

If adding images:
1. Use WebP format when possible
2. Compress images (TinyPNG, ImageOptim)
3. Use responsive images with `srcset`

### Caching

GitHub Pages automatically handles caching. To force refresh:
- Users: Ctrl+Shift+R
- Update version query string: `styles.css?v=2`

### CDN

GitHub Pages uses a CDN automatically. No additional setup needed.

## Security

### HTTPS

- GitHub Pages provides free HTTPS
- Enable in Settings → Pages → Enforce HTTPS

### Content Security Policy

Add to `<head>` in index.html:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self' https://cdnjs.cloudflare.com;
               script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
               style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;">
```

## Monitoring

### Check Site Status

```bash
# Test if site is up
curl -I https://yourusername.github.io/romans-rater/

# Expected: HTTP/2 200
```

### Build History

- GitHub repo → Actions tab
- See all deployments and builds

## Support

### Resources

- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Jekyll Docs](https://jekyllrb.com/docs/)
- [Font Awesome Icons](https://fontawesome.com/icons)

### Common Issues

1. **Builds failing**: Check Actions tab for errors
2. **Changes not showing**: Wait 2 minutes, then hard refresh
3. **Custom domain not working**: Check DNS propagation (24-48hrs)

## Backup

Regular backups are automatic via Git history. To create explicit backup:

```bash
git tag -a v4.21.0 -m "Release 4.21.0"
git push origin v4.21.0
```

## Next Steps

After deployment:

1. ✅ Test all links and navigation
2. ✅ Verify mobile responsiveness
3. ✅ Check cross-browser compatibility
4. ✅ Submit to search engines
5. ✅ Share on social media
6. ✅ Monitor analytics

---

**Your site is now live!** 🎉

Visit: `https://yourusername.github.io/romans-rater/`
