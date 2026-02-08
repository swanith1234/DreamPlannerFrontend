import api from './client';

export interface WeeklyInsightResponse {
    snapshot: {
        id: string;
        weekStart: string;
        weekEnd: string;
        activeDays: number;
        disciplineScore: number;
        consistencyScore: number;
        executionRate: number; // Derived from totalCheckpointsCompleted / Planned
        totalCheckpointsPlanned: number;
        totalCheckpointsCompleted: number;
        lateCheckpoints: number;
        earlyStarts: number;
        overachievementDays: number;
        dailyEffort: Record<string, number>;
        // ... other fields
    } | null;
    insight: {
        insightType: string;
        evidence: any;
    } | null;
}

export const analyticsApi = {
    getWeeklyDashboard: async (date?: string): Promise<WeeklyInsightResponse> => {
        const params = date ? { date } : {};
        const response = await api.get('/analytics/dashboard', { params });
        return response.data;
    },

    // Dev only
    triggerGeneration: async () => {
        return api.post('/analytics/generate');
    }
};
