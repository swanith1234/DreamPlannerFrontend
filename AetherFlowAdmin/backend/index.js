"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 1. Security Feature: requireAuth Middleware
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jsonwebtoken_1.default.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });
    }
    else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});
// GET /api/admin/dashboard-data
app.get('/api/admin/dashboard-data', requireAuth, (req, res) => {
    const mockData = {
        metrics: { totalUsers: 1204, online: 42, passRate: 45.2, delta: "+1.2 Days" },
        demographics: [
            { name: "Backend", value: 45, color: "#10B981" },
            { name: "Applied AI", value: 30, color: "#06B6D4" },
            { name: "Full-Stack", value: 25, color: "#64748B" }
        ],
        liveFeed: [
            "[12:41 PM] User Alex_M FAILED React Hooks (Attempt 2)",
            "[12:42 PM] User Sarah_J PASSED Node.js Event Loop",
            "[12:45 PM] SYSTEM: Flagged Chakradhar for ETA intervention."
        ],
        users: [
            { id: 1, name: "Afroze", target: "FAANG Backend", progress: 60, status: "↓ -2 Days", isSlipping: false },
            { id: 2, name: "Chakradhar", target: "AI Engineer", progress: 20, status: "↑ +5 Days", isSlipping: true },
            { id: 3, name: "Swanith", target: "Full-Stack Arch", progress: 85, status: "↓ -1 Day", isSlipping: false }
        ]
    };
    res.json(mockData);
});
app.listen(PORT, () => {
    console.log(`Admin Command Center Backend running on port ${PORT}`);
});
