# Getting Started with PolyNote

Welcome! This guide will help you set up and start using PolyNote in just a few minutes.

## What You'll Need

Before starting, make sure you have:

- **Computer**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Internet**: For initial setup and optional cloud AI features
- **Notes**: Existing notes in Obsidian, Notion, or other supported apps (optional)

## Installation

### Step 1: Download PolyNote

Visit our [releases page](https://github.com/polynote/polynote/releases) and download the installer for your operating system:

- **Windows**: Download `polynote-windows-x64.exe`
- **macOS**: Download `polynote-macos-universal.dmg`
- **Linux**: Download `polynote-linux-x64.AppImage` (or `.deb`/`.rpm`)

### Step 2: Install

**Windows:**
1. Double-click the downloaded `.exe` file
2. Follow the installation wizard
3. Launch PolyNote from the Start Menu

**macOS:**
1. Open the downloaded `.dmg` file
2. Drag PolyNote to your Applications folder
3. Launch PolyNote from Applications

**Linux (AppImage):**
1. Make the file executable: `chmod +x polynote-linux-x64.AppImage`
2. Run it: `./polynote-linux-x64.AppImage`

**Linux (DEB):**
```bash
sudo dpkg -i polynote-linux-x64.deb
```

## First Launch

When you first open PolyNote, you'll see a welcome screen. Follow these steps:

### 1. Choose Your Language

Select your preferred language:
- English
- తెలుగు (Telugu)
- हिंदी (Hindi)

You can change this later in Settings.

### 2. Connect Your First App

PolyNote works by connecting to your existing note-taking apps. We recommend starting with Obsidian as it's the easiest to set up.

#### Option A: Connect Obsidian (Recommended for Beginners)

1. Click "Connect Obsidian"
2. Browse to your Obsidian vault folder (usually in Documents)
3. Click "Select Folder"
4. PolyNote will automatically detect and import your notes

**Where is my Obsidian vault?**
- Windows: `C:\Users\YourName\Documents\Obsidian`
- macOS: `/Users/YourName/Documents/Obsidian`
- Linux: `~/Documents/Obsidian`

#### Option B: Connect Notion

1. Click "Connect Notion"
2. Click "Authorize with Notion"
3. Log in to your Notion account
4. Grant PolyNote access to your workspace
5. Select which databases to sync

#### Option C: Connect Joplin

1. Make sure Joplin is running
2. In Joplin, go to Tools → Options → Web Clipper
3. Enable the Web Clipper service
4. Copy the Authorization token
5. In PolyNote, click "Connect Joplin"
6. Paste the token and click "Connect"

### 3. Set Up Sync (Optional)

If you connected multiple apps, you can set up automatic syncing:

1. Go to Settings → Sync
2. Enable "Auto-sync"
3. Choose sync frequency (e.g., every 5 minutes)
4. Select which folders to sync between apps

## Basic Usage

### Viewing Your Notes

After setup, you'll see all your notes in the main dashboard:

- **All Notes**: View notes from all connected apps
- **Search**: Find notes quickly by title or content
- **Filter**: Sort by app, date, or tags
- **Graph View**: See connections between notes

### Editing Notes

1. Click on any note to open it
2. Edit the content in the editor
3. Changes are saved automatically
4. Synced to connected apps within 60 seconds

### Using AI Features

PolyNote includes powerful AI features that run on your computer:

#### Summarize a Note

1. Open a note
2. Click the "AI" button in the toolbar
3. Select "Summarize"
4. Wait 15-30 seconds for the summary

#### Translate a Note

1. Open a note
2. Click "AI" → "Translate"
3. Choose target language (English, Telugu, or Hindi)
4. The translated version appears in a new note

#### Rewrite Content

1. Select text in a note
2. Right-click → "AI" → "Rewrite"
3. Choose style (professional, casual, brief, detailed)
4. The rewritten text replaces the selection

### Search and Navigation

**Quick Search:**
- Press `Ctrl+F` (Windows/Linux) or `Cmd+F` (macOS)
- Type your search query
- Results appear instantly with highlighted matches

**Advanced Search:**
- Click the search icon in the sidebar
- Use filters for tags, dates, apps
- Search supports:
  - Exact phrases: `"machine learning"`
  - Exclude words: `-exclude`
  - Tags: `#important`

**Graph View:**
- Click "Graph" in the sidebar
- See visual connections between notes
- Click nodes to open notes
- Drag nodes to reorganize

## Troubleshooting

### Notes Not Syncing?

1. Check that the source app is not open
2. Verify internet connection (for cloud apps)
3. Check sync settings are enabled
4. Look for sync errors in Settings → Sync → History

### AI Features Not Working?

1. First time may take longer to download models
2. Check AI settings: Settings → AI
3. Ensure you have at least 4GB free RAM
4. Try restarting PolyNote

### Can't Connect to App?

**Obsidian:**
- Verify the vault folder path is correct
- Check folder has read/write permissions

**Notion:**
- Re-authorize: Settings → Connections → Notion → Reconnect
- Check internet connection

**Joplin:**
- Ensure Joplin is running
- Verify Web Clipper is enabled
- Check authorization token is correct

## Next Steps

Now that you're set up, explore these features:

- **Automation Rules**: Create automatic workflows (Settings → Rules)
- **Encrypted Sharing**: Share notes securely
- **Themes**: Customize the look (Settings → Appearance)
- **Keyboard Shortcuts**: Learn shortcuts (Help → Shortcuts)

## Getting Help

- **Documentation**: Browse our [full documentation](./README.md)
- **Community**: Join discussions on GitHub
- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/polynote/issues)

---

**Made with ❤️ in India**