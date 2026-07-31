export interface UserSummary {
  id: number;
  name: string;
  email: string;
}

export type TaskKind = 'TASK' | 'MEETING';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type AssignedTo = 'STEPHAN' | 'CHANEL';
export type ChanelStatus = 'TO_DO' | 'DOING' | 'DONE';

export interface Subtask {
  id: number;
  taskId: number;
  text: string;
  done: boolean;
}

export interface WorkLogEntry {
  id: number;
  taskId: number;
  hours: string;
  loggedAt: string;
}

export interface PlannerTask {
  id: number;
  client: string;
  title: string;
  kind: TaskKind;
  budgetHours: string;
  actualHours: string;
  remainingHours: string;
  dueDate: string | null;
  priority: Priority;
  assignedTo: AssignedTo;
  colour: string;
  scheduledDate: string | null;
  startTime: string | null;
  durationSlots: number | null;
  location: string | null;
  agenda: string | null;
  completed: boolean;
  completedAt: string | null;
  readyToBill: boolean;
  chanelStatus: ChanelStatus | null;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  workLog: WorkLogEntry[];
}

export interface PhoneSlip {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;
}
