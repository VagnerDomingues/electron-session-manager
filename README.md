# Electron Session Manager

A powerful Electron desktop client specifically designed for web applications that benefit from session isolation. Perfect for managing multiple accounts of the same service (WhatsApp Personal + Business, etc.) with complete context separation. Each session maintains its own cookies, storage, and authentication state.

<!-- ![Build Status](https://github.com/VagnerDomingues/electron-session-manager/workflows/Build%20Electron%20App/badge.svg) -->

## 🚀 Why Electron Session Manager Exists

This project was born from two main motivations:

### 🎯 Learning Electron & Blockchain Integration
I've always wanted to dive deep into Electron and explore its capabilities, particularly for integrating **blockchain wallets into native applications**. Electron Session Manager also serves as a boilerplate foundation for understanding Electron's architecture and as a stepping stone toward more advanced projects involving Web3 and cryptocurrency wallet integrations.

### 💻 Solving a macOS PWA Limitations
The immediate trigger for this project came from my transition to **macOS**, which is happening slowly. I was frustrated with how browser-installed PWAs behave differently from native applications:

- **The Problem**: When you install PWAs through the browser (using "Add to Dock" or similar features), they completely **close** when you click the 'X' button
- **Native App Behavior**: Real macOS applications minimize to the background and stay in the dock when you close their window
- **My Specific Need**: I rely heavily on **Asana** and **WhatsApp Web**, and I don't like to use the distributed **WhatsApp** native desktop app for a few reasons. So throughout my workday, constantly having to reopen them because i was trying to minimize it was breaking my workflow

Electron Session Manager gives web applications the same **minimize-to-background behavior** as native macOS apps, solving my productivity issue while providing a solid foundation for future Electron development.

- **A hiden Bonus Feature**: The context isolation that Electron provides also enables you to have **multiple instances of WhatsApp** running simultaneously in different contexts. This means you can have one dedicated application for WhatsApp Business while keeping your personal WhatsApp Web in another instance all this within the same app. If you manage support for multiple companies that is for you - this is a really cool feature that was unintended at first but when i saw this was possible to achieve i decided to give create a full session manager menu inside an Electron boilerplate which you can switch between sessions save the state of them and choose one to be the default to launch first when you open the app.


## Features

- 🖥️ Convert any web application to a native desktop app
- 🔒 Browsing with context isolation
- 🔔 Native notifications support
- 🌍 Cross-platform: Windows, macOS, and Linux
- ✨ Custom user agent support for compatibility
- 🚀 GitHub Actions CI/CD for automated builds
- 📦 Multiple build targets (installers, portable, etc.)
- 🌓 System Theme Detection that automatically adapts to your OS dark/light theme preference
- 🍎 **True native macOS behavior** - apps minimize instead of closing
- 📱 **Multiple app instances** - Run separate instances of the same web app with different contexts/accounts connected
- 🧠 **Advanced Session Management** - Create, rename, and manage multiple isolated sessions with persistent data
- 🛡️ **Title Protection** - Maintains clean window titles that are used in OSs notification's header
- 🛠️ **Development Testing Tool** - Use session management with localhost for multiplayer game testing and multi-user scenarios
- ⌨️ **Hotkey Controls** - F1 to toggle session menu, other shortcuts for quick actions

## 📋 Available Configurations

### build script
Creates the default development app

| App | Configuration File | URL | Features |
|-----|-------------------|-----|----------|
| 🛠️ **Default** | Custom `.env` | `localhost:5173` | Development multi-session testing tool |

### build:examples script
Creates 5 pre-configured examples ready to use:

| App | Configuration File | URL | Features |
|-----|-------------------|-----|----------|
| 💬 **WhatsApp Web** | `configs/whatsappweb.env` | `https://web.whatsapp.com` | Chrome user agent, multiple instances |
| 🎮 **Discord** | `configs/discord.env` | `https://discord.com/app` | Gaming communication platform |
| 📝 **Notion** | `configs/notion.env` | `https://www.notion.so` | Workspace and notes |
| 📱 **Asana** | `configs/asana.env` | `https://app.asana.com` | Project management |
| 🤖 **ChatGPT** | `configs/chatgpt.env` | `https://chat.openai.com` | AI assistant |

### 📱 Rewrite examples configurations for Other PWAs or your own web page

You can easily adapt this for:

- **Telegram**: `https://web.telegram.org`
- **Gmail**: `https://mail.google.com`
- **Notion**: `https://www.notion.so`
- **Figma**: `https://www.figma.com`
- **And any other website or PWA with one limitation\***

\* as long as the login form don't redirect to an external page it won't open system default browser and it will work flawless.

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Quick Start

1. **Clone this repository:**
   ```bash
   git clone https://github.com/VagnerDomingues/electron-session-manager
   cd electron-session-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Choose your base configuration:**
   
   **Option A: Use a pre-configured example app**
   ```bash
   # Move package.json and .env.example from configs/ to /root and edit as needed:

   # For WhatsApp Web
   copy configs\whatsappweb.env .env   
   copy configs\whatsappweb.package.json .package.json    
   ```

   **Option B: Create your own web app**
   ```bash
   # Copy the generic template and customize it:
   copy .env.example .env
   ```
   
   Then edit `.env` to set your `APP_NAME`, `APP_URL`, and other settings.


4. **Run the app:**
   ```bash
   npm start
   ```

5. **Build for distribution:**
   ```bash
   npm run build:win    # For Windows
   npm run build:mac    # For macOS
   ```

## Configuration

This project uses environment variables for comprehensive configuration. Choose the appropriate starting template:

### Application Settings
- `APP_NAME`: The display name of your application
- `APP_VERSION`: Application version
- `APP_DESCRIPTION`: Application description
- `APP_ID`: Unique application identifier (reverse domain notation)
- `APP_AUTHOR`: Author name
- `APP_LICENSE`: License type

### Build Configuration
- `FORCE_CODE_SIGNING`: Enable/disable code signing (true/false)
- `SKIP_CODE_SIGNING`: Skip code signing entirely (true/false)
- `BUILD_OUTPUT_DIR`: Output directory for builds (default: dist)

### Windows Settings
- `WIN_ICON`: Path to Windows icon file (.ico)
- `WIN_TARGET`: Build target (dir, nsis, portable, etc.)
- `WIN_CERTIFICATE_FILE`: Path to Windows code signing certificate
- `WIN_CERTIFICATE_PASSWORD`: Certificate password
- `WIN_CERTIFICATE_SUBJECT_NAME`: Certificate subject name

### macOS Settings  
- `MAC_ICON`: Path to macOS icon file (.png or .icns)
- `MAC_TARGET`: Build target (dir, dmg, etc.)
- `MAC_CERTIFICATE_NAME`: macOS signing certificate name
- `MAC_NOTARIZE`: Enable notarization (true/false)
- `MAC_NOTARIZE_APPLE_ID`: Apple ID for notarization
- `MAC_NOTARIZE_APPLE_ID_PASSWORD`: App-specific password
- `MAC_NOTARIZE_TEAM_ID`: Apple Developer Team ID

### Web Application Configuration
- `APP_URL`: Target website URL (e.g., https://example.com, https://web.whatsapp.com)
- `USER_AGENT`: Custom user agent string for compatibility

### Session Management Configuration
- `ENABLE_MULTIPLE_SESSION_IDS`: Enable advanced session management (true/false)

### Window Settings
- `WINDOW_WIDTH`: Default window width
- `WINDOW_HEIGHT`: Default window height
- `WINDOW_MIN_WIDTH`: Minimum window width
- `WINDOW_MIN_HEIGHT`: Minimum window height

## 🧠 Advanced Session Management

When `ENABLE_MULTIPLE_SESSION_IDS=true` is set in your `.env` file, the app unlocks powerful session management capabilities that allow you to manage multiple isolated sessions with persistent data.

### Key Features

**🔒 Complete Context Isolation**: Each session maintains its own:
- Cookies and authentication
- localStorage and sessionStorage
- Cache and browsing data
- User preferences and settings

**🎯 Perfect for Multiple Accounts**: 
- WhatsApp: Multiple Personal or Business accounts
- Asana: Multiple Personal or Team accounts
- Discord: Multiple alt accounts
- Notion: Different workspaces
- ChatGPT: Separated conversation contexts

### How to Use

1. **Enable the feature** in your `.env` file:
   ```env
   ENABLE_MULTIPLE_SESSION_IDS=true
   ```

2. **Use the 'Session' menu to open** to:
   - **Rename Current**: Change the name of your current session
   - **Set as Default**: Make this session open automatically when launching the app
   - **Start New Session**: Create a new isolated session with incremental ID
   - **Delete Current**: Remove the current session (except default session-1)
   - **Delete All Sessions**: Remove all sessions except the default
   - **Open Saved Session**: Switch to an existing session from the list

### 🛠️ Development & Testing Use Cases

**Perfect for Local Development Testing:**

When developing web applications, especially multiplayer games or multi-user systems, this session manager becomes an invaluable testing tool:

#### Multiuser Development
- **Set APP_URL to `localhost:5173`** (or your development server URL)
- **Create multiple sessions** login with different users accounts
- **Each session maintains separate**:
  - User authentication tokens
  - Local storage data
  - Login state
  - Browser's 'stay connected'

#### Multi-User Application Testing
- **Easily kill a session** - clear everything, from cache to local storage.
- **Simulate concurrent users** - without the need of multiple tabs, different browsers or icognito mode
- **Maintain isolated user contexts** - keep accounts connected for further tests
- **Perfect for Dapp development** - Remember to install your wallet extension in this solution and rebuild after

#### Example Development Workflow
```env
# Your .env file for development
APP_NAME=My Game Dev
APP_URL=http://localhost:5173
ENABLE_MULTIPLE_SESSION_IDS=true
```

1. Start your development server on your separated solution
2. Launch this Electron wrapper pointing to your localhost:port
3. Create sessions for Player 1, Player 2, Admin, etc.
4. Test multiplayer interactions, user roles, and state management
5. Each session maintains its own authentication and state

### Data Persistence

Each session's data is stored in isolated directories:
```
userData/sessions/
├── session-1/          # Default session (cannot be deleted)
├── session-2/          # Second session 
├── session-3/          # Third session
└── sessions.json       # Session configuration file
```

## Usage

### Development

To run the app in development mode:

```bash
npm start
```

### Building

### Single App Build
**uses the default root .env and package.json config:**

Build your currently configured app for the current platform:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build:win     # Windows
npm run build:mac     # macOS  
npm run build:linux   # Linux
```

Build with specific installers:
```bash
npm run build:win:nsis      # Windows NSIS installer
npm run build:win:portable  # Windows portable
npm run build:mac:dmg       # macOS DMG
```

Build for all platforms at once:
```bash
npm run build:all
```

### Build All Examples at Once
**run through all preconfigured .env and package.json from config folder**

Electron Session Manager includes a script to automatically build **all** example PWAs in one command:


#### Build All Examples for Windows
```bash
npm run build:examples:win
```

#### Build All Examples for macOS
```bash
npm run build:examples:mac
```

#### Build All Examples for Linux
```bash
npm run build:examples:linux
```

#### Build All Examples for All Platforms
```bash
npm run build:examples:all
```

This will:
1. 💾 Backup your current `.env` file to `temp.env`
2. 🔄 Loop through each example configuration:
   - Asana
   - ChatGPT  
   - Discord
   - Notion
   - WhatsApp Web
3. 📦 Build each app into its own folder: `dist/appname/`
4. 🔄 Restore your original `.env` file

#### Example Output Structure
```
dist/
├── asana/
│   └── asana.exe (or .app)
├── chatgpt/
│   └── chatgpt.exe (or .app)
├── discord/
│   └── discord.exe (or .app)
├── notion/
│   └── notion.exe (or .app)
└── whatsappweb/
    └── whatsappweb.exe (or .app)
```

The built applications will be available in the `dist` folder, organized by app name.

### GitHub Actions Integration

Electron Session Manager includes GitHub Actions workflows that will:

1. **On every push**: Build and test all examples
2. **On tag creation** (e.g., `v1.0.0`): 
   - Build all examples for Windows and macOS
   - Create a GitHub Release with downloadable archives
   - Include all example apps ready for distribution

#### Creating a Release

To create a release with all examples:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will trigger GitHub Actions to:
- Build all 5 PWA examples
- Package them for Windows (`.zip`) and macOS (`.tar.gz`)
- Create a GitHub Release with download links
- Include installation instructions for each platform


## Security Features

- Context isolation enabled
- Node integration disabled
- Remote module disabled
- External links open in default browser
- Navigation restricted to configured app domain
- Clean interface without application menu

## Customization

### Icons

Electron Session Manager includes icons for popular applications in the `assets/Appicons/` folder:
- `Discord.ico/.png` - Discord desktop app
- `WhatsApp.ico/.png` - WhatsApp Web  
- `Notion.ico/.png` - Notion workspace
- `ChatGPT.ico/.png` - ChatGPT interface
- `Asana.ico/.png` - Asana project management

To add your own icons you can place them in two places:
`assets/Appicons/` or the electron's default `assets/`
just remember to point them correctly in your .env:

```env
WIN_ICON=assets/Appicons/YourAppName.ico
MAC_ICON=assets/Appicons/YourAppName.png

or

WIN_ICON=assets/icon.ico
MAC_ICON=assets/icon.png
```

### App Information

Electron Session Manager uses environment variables for configuration, so you typically don't need to edit everything in `package.json` directly. Instead:

1. **For runtime configuration** - Use your `.env` file:
   ```env
   APP_NAME=Your App Name
   APP_URL=https://your-app.com
   WINDOW_TITLE=Your App
   ```

2. **For build-time configuration** - The build script automatically uses environment variables to customize the final package

3. **For permanent changes** - Edit `package.json` if needed:
   - `name` - App package name
   - `productName` - Display name
   - `author` - Vagner Domingues
   - `description` - App description
- `appId` - Unique app identifier in build config

## Build Configuration

The app uses `electron-builder` for packaging. Configuration is in the `build` section of `package.json`.

### Windows Build Features
- NSIS installer
- Support for x64 and x86 architectures
- Custom installation directory option

### macOS Build Features
- DMG distribution
- Universal binary (Intel + Apple Silicon)
- Proper app categorization

## Troubleshooting

### Common Issues

1. **App doesn't start**: Make sure all dependencies are installed with `npm install`
2. **Build fails**: Check that you have the required build tools for your platform
3. **Web app doesn't load**: Check your internet connection and verify the APP_URL is correct
4. **Icons not showing**: Ensure icon paths in your `.env` file point to existing files

### Platform-Specific Notes

#### Windows
- Windows Defender might flag the app during first build. This is normal for unsigned applications.
- Consider code signing for production distribution.

#### macOS
- The app needs to be signed for distribution inside the Mac App Store.
- Users might need to allow the app in System Preferences > Security & Privacy.


**\*Note:** The example apps that are included are not ready for distribution they are just to explore usecase scenarios.
Each configuration includes the proper app name, icon, URL, and optimized window settings for that specific application.

## License

MIT License - feel free to use this for personal or commercial projects.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve Electron Session Manager.

## Disclaimer

Electron Session Manager is an Electron multi-session PWA client for converting web applications to desktop apps. All application names, trademarks, and logos belong to their respective owners. This project is not affiliated with any of the web applications used in the examples.
