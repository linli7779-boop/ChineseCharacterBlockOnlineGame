# Troubleshooting Vercel Deployment

## Issue: Webpage doesn't show the game

### Step 1: Check Browser Console
1. Open your deployed Vercel URL
2. Press F12 to open Developer Tools
3. Check the Console tab for JavaScript errors
4. Check the Network tab to see if files are loading

### Step 2: Verify Files are Committed
Make sure these files are in your GitHub repository:
- `app.py`
- `vercel.json`
- `requirements.txt`
- `static/index.html`
- `static/game.js`
- `static/style.css`
- `level*.json` files (in root directory)

### Step 3: Check Vercel Deployment Logs
1. Go to your Vercel dashboard
2. Click on your project
3. Go to "Deployments" tab
4. Click on the latest deployment
5. Check the "Build Logs" and "Function Logs" for errors

### Step 4: Verify File Paths
The HTML file should reference:
- `game.js` (not `/static/game.js`)
- `style.css` (not `/static/style.css`)

### Step 5: Test API Endpoints
Try accessing these URLs directly:
- `https://your-app.vercel.app/api/levels/1`
- `https://your-app.vercel.app/api/idioms/1`

These should return JSON data.

### Step 6: Common Issues

**Issue: 404 errors for static files**
- Solution: Ensure `static/` folder is committed to Git
- Check that `vercel.json` routes are correct

**Issue: Blank page**
- Check browser console for JavaScript errors
- Verify `game.js` is loading (check Network tab)
- Check if level data is loading (console should show "Loaded level X")

**Issue: Characters not showing**
- Check browser console for errors
- Verify level JSON files are in root directory
- Check API endpoints are returning data

### Step 7: Manual Testing
1. Clone your repository fresh
2. Run `python app.py` locally
3. Visit `http://localhost:5000`
4. If it works locally but not on Vercel, check:
   - File paths (Vercel might use different working directory)
   - Environment variables
   - Build configuration

## Quick Fix Checklist

- [ ] All files committed to GitHub
- [ ] `static/` folder exists and is committed
- [ ] `level*.json` files are in root directory
- [ ] `requirements.txt` includes Flask
- [ ] `vercel.json` is configured correctly
- [ ] Browser console shows no errors
- [ ] Network tab shows all files loading (200 status)
- [ ] API endpoints return JSON data

## Still Not Working?

1. Check Vercel's deployment logs for specific errors
2. Try redeploying (push a new commit)
3. Verify your Vercel project settings match the configuration
4. Consider using Vercel's CLI for local testing (if npm is available)

