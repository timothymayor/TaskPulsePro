import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/app';
import { todoStore } from '../server/store';

describe('Backup API Endpoints (/api/backup)', () => {
  beforeEach(() => {
    todoStore.seed();
  });

  describe('GET /api/backup/export', () => {
    it('should export all todos with checksum and metadata', async () => {
      const res = await request(app).get('/api/backup/export');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.checksum);
      assert.ok(Array.isArray(res.body.data.todos));
      assert.equal(res.body.data.itemCount, res.body.data.todos.length);
      assert.equal(res.body.data.version, '2.4.0');
    });
  });

  describe('POST /api/backup/import', () => {
    it('should restore valid backup payload and update store', async () => {
      const backupData = {
        todos: [
          {
            title: 'Imported task from test backup',
            priority: 'urgent',
            category: 'work',
          },
        ],
      };

      const res = await request(app).post('/api/backup/import').send(backupData);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.importedCount, 1);
      assert.ok(res.body.data.checksum);

      // Verify store was updated
      const listRes = await request(app).get('/api/todos');
      assert.equal(listRes.body.data.length, 1);
      assert.equal(listRes.body.data[0].title, 'Imported task from test backup');
    });

    it('should reject invalid or empty backup payloads with 400', async () => {
      const res = await request(app).post('/api/backup/import').send({ todos: [] });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('should sanitize imported tasks before saving', async () => {
      const dirtyBackup = {
        todos: [
          {
            title: '<script>alert(1)</script>Clean Imported Title',
            description: '<iframe src="malicious.html"></iframe>Notes',
            priority: 'high',
          },
        ],
      };

      const res = await request(app).post('/api/backup/import').send(dirtyBackup);
      assert.equal(res.status, 200);

      const listRes = await request(app).get('/api/todos');
      assert.equal(listRes.body.data[0].title, 'Clean Imported Title');
      assert.ok(!listRes.body.data[0].description.includes('iframe'));
    });
  });
});
