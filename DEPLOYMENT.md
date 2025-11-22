# Vercel Deployment Guide

## Deployment Steps

1. **Connect GitHub Repository to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in and click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the Python/Flask setup

2. **Configuration:**
   - The `vercel.json` file is already configured
   - The `requirements.txt` file lists all dependencies
   - No build command needed (Vercel handles it automatically)

3. **Important Files:**
   - `app.py` - Main Flask application
   - `vercel.json` - Vercel configuration
   - `requirements.txt` - Python dependencies
   - `static/` - Static files (HTML, CSS, JS)
   - `level*.json` - Level data files (must be in root directory)

4. **Troubleshooting:**

   If the game doesn't show:
   - Check the browser console (F12) for errors
   - Verify that all files are committed to GitHub
   - Check Vercel deployment logs for errors
   - Ensure `level*.json` files are in the root directory
   - Verify that `static/` folder contains `index.html`, `game.js`, and `style.css`

5. **Testing Locally:**
   ```bash
   python app.py
   ```
   Then visit `http://localhost:5000`

## Common Issues

1. **Static files not loading:**
   - Ensure `static/` folder is committed to Git
   - Check that file paths in HTML are correct (relative paths)

2. **API endpoints not working:**
   - Verify `level*.json` files are in root directory
   - Check Vercel function logs for errors

3. **Game not showing:**
   - Open browser console (F12) to see JavaScript errors
   - Check network tab to see if files are loading
   - Verify all dependencies are in `requirements.txt`

