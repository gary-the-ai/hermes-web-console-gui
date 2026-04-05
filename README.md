<p align="center">
  <img src="assets/banner.png" alt="Hermes Agent - Web Console GUI" width="100%">
</p>

# Hermes Web Console GUI 🖥️✨

Welcome to the **Hermes Web Console GUI**! This repository transforms the core capabilities of the [NousResearch Hermes Agent](https://github.com/NousResearch/hermes-agent) into an exceptional, native web-browser experience. 

It provides absolute feature-parity with the Hermes CLI while drastically reducing the friction of configuration via intuitive, highly-polished React components. 

## 📸 UI Gallery

Here is a glimpse of the gorgeous new interfaces powering your agent:

<details>
<summary><b>💬 Main Chat Interface & Token Streaming</b></summary>

![Chat GUI](assets/screenshots/chat.png)
</details>

<details>
<summary><b>📁 Workspace & Code Tools Sandbox</b></summary>

![Workspace UI](assets/screenshots/workspace.png)
</details>

<details>
<summary><b>⚙️ Settings & Configuration Control Center</b></summary>

![Control Center](assets/screenshots/control_center.png)
</details>

<details>
<summary><b>📋 Persistent Session Browser</b></summary>

![Sessions List](assets/screenshots/sessions.png)
</details>

<details>
<summary><b>🛠️ Skills Hub Storefront</b></summary>

![Skills Hub](assets/screenshots/skills_hub.png)
</details>

## 🌟 Enhanced Features
- **Live SSE Token Streaming**: True GPT-style typewriter rendering connecting directly to the core Hermes API Event Stream (`message.assistant.delta`).
- **xterm.js Interactive Sandbox**: Execute native CLI tasks and inspect live runtime logs entirely from a drawer nested within your browser. No separate windows required.
- **Git-Style Inline Diffs**: Real-time syntax-highlighted visualizations when the agent touches your workspace files.
- **Visual Configurations**: Completely avoid manually touching `config.yaml`.
  - **Fallback Provider Chains**: Build complex failover LLM logic securely with a drag-and-drop sortable GUI list.
  - **Advanced Credentials Pool**: Rotate API keys and assign them to JSON matrices securely preventing invalid configuration schemas on startup.
- **Persistent Web Theme Engine**: Customize dark, light, or aesthetic visual skins syncing natively via your local Hermes backend.
- **Automations & Cron Jobs**: Configure, pause, edit, and track scheduled cron jobs visually without terminal flags.

## 🚀 Installation & Setup

Because this is a massive extension of the core agent, you'll need the Hermes core libraries working structurally.

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- Git

### 1. Clone & Setup Backend
First, pull down the repository and setup the core agent environment:

```bash
git clone https://github.com/gary-the-ai/hermes-web-console-gui.git
cd hermes-web-console-gui

# Create virtual environment and install backend dependencies
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv venv --python 3.11
source venv/bin/activate
uv pip install -e ".[all]"
```

### 2. Start the API Server
The Web Console is natively decoupled from the state logic, meaning you need to serve the Hermes API router:
```bash
hermes api start
```
*(By default, this runs on `http://127.0.0.1:8000`)*

### 3. Build & Run the Web Console 

In a new terminal window, compile the Vite application:

```bash
cd hermes-web-console-gui/web_console

# Install frontend dependencies
npm install

# Start the dev server with hot-reload
npm run dev
```

Navigate to `http://localhost:5173` in your browser. 

If your backend is running on a unique remote port or network, click the **Settings** gear in the GUI and map the "Backend Router URL" accordingly!

## 📦 Production Builds

To compile the React bundle for native static hosting or production deployment:

```bash
cd web_console
npm run build
```

The optimized static assets will populate the `/web_console/dist` directory. This static bundle is drop-in compatible with Vercel, Netlify, Nginx, or directly mounted against the FastAPI endpoints.

## 🛠️ Technology Stack
- **React 19** (Vite 6 Compiler)
- **TypeScript** natively integrated bounding UI props to strict Python schema counterparts.
- **Zustand** orchestrating lightweight global state logic cleanly.
- **Recharts** powering interactive analytics dashboards with responsive bar & pie charts.
- **xterm.js** managing the real-time background web-socket terminal interfaces.
- **react-markdown** / **PrismJS** for extensive rendering rules (Code, Tables, Diff Blocks).

## 🤝 Contributing
Contributions are massively appreciated! Whether it's connecting deeper endpoints, establishing the Skills Hub marketplace native UI, or polishing theme styles:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingUI`)
3. Run the types tests (`npx tsc --noEmit`)
4. Commit your Changes (`git commit -m 'feat: Added AmazingUI'`)
5. Push to the Branch (`git push origin feature/AmazingUI`)
6. Open a Pull Request

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information. Built originally off the fantastic [Nous Research](https://nousresearch.com) stack.

---

## 📜 Changelog

### [2026.4.5c] - Upstream Sync & Analytics Dashboard
- **Upstream Merge**: Synced 52 commits from `NousResearch/hermes-agent` main branch. Resolved merge conflict in `run_agent.py` (structured `tool_progress_callback` signature change).
- **Analytics Dashboard**: New "Analytics & Insights" tab in Control Center powered by `recharts`. Visualizes session history, token usage, cost breakdowns, tool invocation distribution, and activity streaks.
- **API Validated**: All 15+ backend API endpoints verified operational (`/api/gui/usage/insights`, `/api/gui/models/active`, `/api/gui/gateway/platforms`, etc.).
- **Upstream Features Absorbed**: OSV malware scanning for MCP packages, Matrix E2EE support, browser JS evaluation, plugin CLI registration, and 30-min default agent timeout.

### [2026.4.5b] - Skills Hub App Store Redesign
- **App Store UI**: Redesigned `Skills Hub` search mapping onto a glassmorphism-style CSS grid imitating premium app storefronts.
- **Dynamic Browse**: Introduced a zero-query fetch algorithm fetching top & official items seamlessly on mount for immediate content discovery.
- **Navigation Tweaks**: Segmented storefront from locally installed skills using intuitive tab layouts in `SkillsPage`.
- **Rich Context Info**: Inserted visual trust badges, capability indexing tags, and polished hover states inside each storefront card.

### [2026.4.5a] - Provider Configs & Model Switching
- **Backend Sync**: Decoupled `models_api` hardcoded catalog. Subscribes completely to upstream `list_authenticated_providers()`.
- **Global Model Store**: Enabled settings sync into `~/.hermes/config.yaml` using dynamic provider detection. 
- **TopBar Upgrade**: Included visually-striking Dropdown containing active model aliasing & quick-switches instantly mid-session.
- **ProviderManager**: Visual CRUD capabilities to inject localized LocalAI/vLLM endpoints seamlessly.

---
Built by developers who love beautiful terminals, for developers who want more than a terminal. ✨
