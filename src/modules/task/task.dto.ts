export interface CreateTaskRequest {
  dreamId: string;
  title: string;
  description?: string;
  startDate?: string; // ISO date
  deadline: string; // ISO date
  estimatedDuration?: number; // minutes
  priority: number; // 1-5
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  startDate?: string;
  deadline?: string;
  estimatedDuration?: number;
  priority?: number;
  status?: string;
}