import express, { Request, Response, NextFunction } from 'express';
import todosRouter from './routes/todos';
import healthRouter from './routes/health';
import auditRouter from './routes/audit';
import backupRouter from './routes/backup';

export function createApp() {
  const app = express();

  // Defensive body parsing with bounded payload sizes
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Security HTTP Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Mount API routers
  app.use('/api/todos', todosRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/backup', backupRouter);

  // Fallback for unmatched /api routes
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      code: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString(),
    });
  });

  // Global Error Handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

export const app = createApp();
