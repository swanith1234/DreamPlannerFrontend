import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.use(cors());
app.use(express.json());

// 1. Security Feature: requireAuth Middleware
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// GET /api/admin/dashboard-data
app.get('/api/admin/dashboard-data', requireAuth, async (req: Request, res: Response) => {
  try {
    // 1. Fetch Real Metrics
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const [totalUsers, totalTasks, completedTasks, onlineCount, dreamCount] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.refreshToken.count({ 
        where: { 
          lastActiveAt: { gte: fifteenMinutesAgo },
          revoked: false 
        } 
      }),
      prisma.dream.count()
    ]);

    const passRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // 2. Real Demographics (Aggregate by Dream Domain)
    const domainCounts = await prisma.dream.groupBy({
      by: ['domain'],
      _count: { _all: true },
    });

    const colors = ["#10B981", "#06B6D4", "#64748B", "#F59E0B", "#EF4444"];
    const demographics = domainCounts
      .filter(d => d.domain)
      .map((d, index) => ({
        name: d.domain as string,
        value: Math.round((d._count._all / (dreamCount || 1)) * 100),
        color: colors[index % colors.length]
      }));

    if (demographics.length === 0) {
      demographics.push({ name: "Core Systems", value: 100, color: "#64748B" });
    }

    // 3. Fetch Audit Logs
    const audits = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    const liveFeed = audits.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const op = log.operation.toUpperCase();
      const table = log.tableName;
      return `[${time}] ${op} on ${table}${log.recordId ? ` (ID: ${log.recordId.slice(0, 8)}...)` : ''}`;
    });

    // 4. Multi-Level Analytics (User Progression)
    const dbUsers = await prisma.user.findMany({
      take: 10,
      include: {
        _count: {
          select: { tasks: true }
        },
        tasks: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    const users = dbUsers.map(u => {
      const uTotalTasks = u._count.tasks;
      const uCompletedTasks = u.tasks.length;
      const progress = uTotalTasks > 0 ? Math.round((uCompletedTasks / uTotalTasks) * 100) : 0;
      
      return {
        id: u.id,
        name: u.name || 'Anonymous Recruit',
        target: 'Sector Ops',
        progress: progress,
        status: progress > 80 ? 'HIGH_PERF' : 'SYNCHRONIZED',
        isSlipping: false 
      };
    });

    res.json({
      metrics: {
        totalUsers,
        online: onlineCount || 1,
        passRate: parseFloat(passRate.toFixed(1)),
        delta: "+0.0 Days"
      },
      demographics,
      liveFeed: liveFeed.length > 0 ? liveFeed : ["SYSTEM NOMINAL // AWAITING DB EVENT"],
      users
    });
  } catch (error) {
    console.error('Relational fetch error:', error);
    res.status(500).json({ error: 'AetherCore Sync Failure' });
  }
});

app.listen(PORT, () => {
  console.log(`Admin Command Center Backend running on port ${PORT}`);
});
