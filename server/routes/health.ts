import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';

const router = Router();
const startTime = Date.now();

router.get('/', (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const mem = process.memoryUsage();

  const body: ApiResponse<{
    status: string;
    uptimeSeconds: number;
    nodeVersion: string;
    memoryMb: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  }> = {
    success: true,
    data: {
      status: 'healthy',
      uptimeSeconds,
      nodeVersion: process.version,
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      },
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(body);
});

export default router;
