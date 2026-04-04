<p align="center">
  <img src="assets/banner.png" alt="Hermes Agent - Web Console GUI" width="100%">
</p>

# Hermes Web Console GUI 🖥️✨

Welcome to the **Hermes Web Console GUI**! This repository transforms the core capabilities of the [NousResearch Hermes Agent](https://github.com/NousResearch/hermes-agent) into an exceptional, native web-browser experience. 

It provides absolute feature-parity with the Hermes CLI while drastically reducing the friction of configuration via intuitive, highly-polished React components. 

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
- **React 18** (Vite Compiler)
- **TypeScript** natively integrated bounding UI props to strict Python schema counterparts.
- **Zustand** orchestrating lightweight global state logic cleanly.
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
