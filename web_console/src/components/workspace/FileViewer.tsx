interface FileViewerProps {
  path: string;
  content: string;
}

export function FileViewer({ path, content }: FileViewerProps) {
  return (
    <section className="workspace-card" aria-label="File viewer">
      <div className="workspace-card-header">
        <h2>{path}</h2>
        <p>Current file contents.</p>
      </div>
      <pre className="workspace-pre">{content}</pre>
    </section>
  );
}
