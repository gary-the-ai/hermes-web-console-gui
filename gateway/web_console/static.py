"""Static placeholder content for the Hermes Web Console."""


def get_web_console_placeholder_html() -> str:
    """Return a minimal placeholder page for the GUI app shell."""
    return """<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Hermes Web Console</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
      background: #0b1020;
      color: #edf2ff;
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
    main {
      max-width: 42rem;
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 1rem;
      background: rgba(18, 25, 45, 0.92);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    }
    h1 {
      margin-top: 0;
    }
    p {
      line-height: 1.5;
      color: #cbd5f5;
    }
    code {
      background: rgba(255, 255, 255, 0.08);
      padding: 0.15rem 0.35rem;
      border-radius: 0.35rem;
    }
  </style>
</head>
<body>
  <main>
    <h1>Hermes Web Console</h1>
    <p>This is the initial GUI backend placeholder mounted by the API server.</p>
    <p>Backend status endpoints are available at <code>/api/gui/health</code> and <code>/api/gui/meta</code>.</p>
  </main>
</body>
</html>
"""
