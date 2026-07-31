import type { DragEvent } from 'react';

interface Props {
  onDropComplete: (id: number) => void;
}

export default function DoneBox({ onDropComplete }: Props) {
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (id) onDropComplete(id);
  }

  return (
    <div className="done-box" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="empty-note">Drag a task here from the calendar to mark it done, even if it's already marked done.</div>
    </div>
  );
}
