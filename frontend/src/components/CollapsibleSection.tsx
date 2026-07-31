import { useState, type ReactNode } from 'react';

export default function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible-section">
      <h3 className="collapsible-header" onClick={() => setOpen((v) => !v)}>
        <span className={`chevron${open ? ' open' : ''}`}>▸</span>
        {title}
      </h3>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
