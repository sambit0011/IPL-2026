# IPL 2026 Fantasy Leaderboard Dashboard 🏆

A sleek, mobile-first web dashboard to display fantasy rankings and points, synced via Google Sheets.

## 🚀 How to Launch on GitHub

1.  **Create a New Repository**: Go to [GitHub](https://github.com) and create a repository named `ipl-fantasy-leaderboard`.
2.  **Upload Files**: Upload the following files to the main branch:
    - `index.html`
    - `style.css`
    - `app.js`
    - `assets/ipl_logo.png` (Make sure the folder structure is maintained)
3.  **Enable GitHub Pages**:
    - Go to your repository **Settings**.
    - Click **Pages** in the left sidebar.
    - Under **Build and deployment**, set Source to **Deploy from a branch**.
    - Select the `main` branch and `/ (root)` folder. Click **Save**.
4.  **Live Link**: Your dashboard will be live at `https://USERNAME.github.io/ipl-fantasy-leaderboard/` within a few minutes.

## 📊 How to Sync with Your Google Sheet

1.  **Open your Google Sheet**: In Google Drive, open the sheet containing your fantasy leaderboard data.
2.  **Publish to the Web**:
    - Go to **File** > **Share** > **Publish to the web**.
    - Link tab: Select the specific sheet (e.g., "Sheet1") and format **Comma-separated values (.csv)**.
    - Click **Publish**.
3.  **Get your Sheet ID**:
    - Look at the URL of your sheet: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit`.
    - Copy that unique ID (the long string of characters).
4.  **Update `app.js`**:
    - Replace `SHEET_ID` in the `CONFIG` section of `app.js` with your copied ID.
    - Replace `SHEET_NAME` if your tab name is different.

## ✨ Features
- **Modern UI**: Royal blue & gold theme, glassmorphism, smooth animations.
- **Search**: Live filter by player name or team.
- **Mobile First**: Optimized for smartphones.
- **Real-time Sync**: Automatically refreshes data every 60 seconds.

*Built for IPL 2026 enthusiasts.*
