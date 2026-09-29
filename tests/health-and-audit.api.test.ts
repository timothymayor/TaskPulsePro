import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/app';

describe('System Health & Security Audit APIs', () => {
  describe('GET /api/health', () => {
    it('should return 200 with healthy status and system metrics', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'healthy');
      assert.ok(typeof res.body.data.uptimeSeconds === 'number');
      assert.ok(res.body.data.memoryMb);
      assert.ok(typeof res.body.data.memoryMb.heapUsed === 'number');
      assert.ok(res.body.data.nodeVersion);
      assert.ok(res.body.timestamp);
    });

    it('should include HTTP security headers', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
    });
  });

  describe('GET /api/audit', () => {
    it('should return 200 and pass all security compliance tests', async () => {
      const res = await request(app).get('/api/audit');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.compliant, true);
      assert.equal(res.body.data.standard, 'OWASP Top 10 API Security Controls');
      assert.ok(Array.isArray(res.body.data.checks));
      assert.ok(res.body.data.checks.length >= 3);
      assert.ok(res.body.data.checks.every((c: { passed: boolean }) => c.passed === true));
    });
  });

  describe('Unmatched routes fallback (/api/*)', () => {
    it('should return 404 with structured error envelope for non-existent routes', async () => {
      const res = await request(app).get('/api/unknown-endpoint');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'ROUTE_NOT_FOUND');
    });
  });
});
