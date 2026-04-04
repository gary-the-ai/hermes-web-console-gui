interface FileTreeProps {
  files: string[];
  selectedPath: string;
  onSelect(path: string): void;
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  return (
    <section className="workspace-card" aria-label="File tree" style={{ overflow: 'hidden' }}>
      <div className="workspace-card-header">
        <h2>File tree</h2>
        <p>Browse workspace files and directories.</p>
      </div>
      <ul className="workspace-list" style={{ overflow: 'hidden' }}>
        {files.map((path) => (
          <li key={path} style={{ overflow: 'hidden' }}>
            <button
              type="button"
              className={selectedPath === path ? 'workspace-row workspace-row-active' : 'workspace-row'}
              onClick={() => onSelect(path)}
              title={path}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {path.split('/').pop() || path}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
