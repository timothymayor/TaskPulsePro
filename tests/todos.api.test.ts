import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/app';
import { todoStore } from '../server/store';

describe('Todos API Endpoints (/api/todos)', () => {
  beforeEach(() => {
    // Reset repository before each test
    todoStore.seed();
  });

  describe('GET /api/todos', () => {
    it('should return 200 and a list of todos with standard envelope', async () => {
      const res = await request(app).get('/api/todos');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 3);
      assert.ok(res.body.timestamp);
    });

    it('should filter todos by category', async () => {
      const res = await request(app).get('/api/todos?category=work');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.every((t: { category: string }) => t.category === 'work'));
    });

    it('should filter todos by priority', async () => {
      const res = await request(app).get('/api/todos?priority=urgent');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.every((t: { priority: string }) => t.priority === 'urgent'));
    });

    it('should search todos matching query', async () => {
      const res = await request(app).get('/api/todos?search=endurance');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.match(res.body.data[0].title, /endurance/i);
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return 200 and the matching todo', async () => {
      const res = await request(app).get('/api/todos/tp-1');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, 'tp-1');
    });

    it('should return 404 when todo does not exist', async () => {
      const res = await request(app).get('/api/todos/non-existent-id');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'NOT_FOUND');
    });
  });

  describe('POST /api/todos', () => {
    it('should create a valid todo and return 201', async () => {
      const newTodo = {
        title: 'Conduct zero-trust penetration test',
        description: 'Run automated fuzz testing against all authentication and API endpoints.',
        priority: 'high',
        category: 'work',
        dueDate: '2026-10-15',
        estimatedMinutes: 60,
      };

      const res = await request(app).post('/api/todos').send(newTodo);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, newTodo.title);
      assert.equal(res.body.data.priority, 'high');
      assert.equal(res.body.data.completed, false);
      assert.ok(res.body.data.id);
    });

    it('should reject creation with 400 when title is missing or empty', async () => {
      const res = await request(app).post('/api/todos').send({ priority: 'low' });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'VALIDATION_FAILED');
    });

    it('should neutralize XSS attack vectors in title and description', async () => {
      const maliciousPayload = {
        title: '<script>alert("XSS")</script>Security Hardened Task',
        description: '<img src=x onerror="fetch(\'https://attacker.com\')">Sensitive details',
        priority: 'urgent',
      };

      const res = await request(app).post('/api/todos').send(maliciousPayload);
      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, 'Security Hardened Task');
      assert.ok(!res.body.data.description.includes('onerror'));
      assert.ok(!res.body.data.title.includes('<script>'));
    });

    it('should block prototype pollution during item creation', async () => {
      const protoPayload = JSON.parse('{"__proto__": {"polluted": true}, "title": "Pollution Test"}');
      const res = await request(app).post('/api/todos').send(protoPayload);
      assert.equal(res.status, 201);
      assert.equal((Object.prototype as Record<string, unknown>).polluted, undefined);
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update an existing todo and return 200', async () => {
      const updates = {
        title: 'Updated Task Title',
        priority: 'low',
        completed: true,
      };

      const res = await request(app).put('/api/todos/tp-1').send(updates);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, 'Updated Task Title');
      assert.equal(res.body.data.priority, 'low');
      assert.equal(res.body.data.completed, true);
    });

    it('should return 404 when updating non-existent todo', async () => {
      const res = await request(app).put('/api/todos/missing-id').send({ title: 'New' });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete existing todo and return 200', async () => {
      const res = await request(app).delete('/api/todos/tp-1');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.deletedId, 'tp-1');

      // Verify deletion from store
      const getRes = await request(app).get('/api/todos/tp-1');
      assert.equal(getRes.status, 404);
    });

    it('should return 404 when deleting non-existent todo', async () => {
      const res = await request(app).delete('/api/todos/does-not-exist');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  describe('Subtasks API (/api/todos/:id/subtasks)', () => {
    it('should add a subtask and return 200 with updated item', async () => {
      const res = await request(app)
        .post('/api/todos/tp-1/subtasks')
        .send({ title: 'Verify staging deployment' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const subtasks = res.body.data.subtasks;
      assert.ok(subtasks.some((s: { title: string }) => s.title === 'Verify staging deployment'));
    });

    it('should reject subtask with empty title', async () => {
      const res = await request(app)
        .post('/api/todos/tp-1/subtasks')
        .send({ title: '   ' });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'EMPTY_SUBTASK_TITLE');
    });

    it('should toggle subtask completion via PATCH', async () => {
      const res = await request(app).patch('/api/todos/tp-1/subtasks/st-3');
      assert.equal(res.status, 200);
      const sub = res.body.data.subtasks.find((s: { id: string }) => s.id === 'st-3');
      assert.equal(sub.completed, true);
    });
  });

  describe('POST /api/todos/bulk', () => {
    it('should bulk complete selected items', async () => {
      const res = await request(app).post('/api/todos/bulk').send({
        action: 'complete',
        ids: ['tp-1', 'tp-2'],
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.affectedCount, 2);

      const check1 = await request(app).get('/api/todos/tp-1');
      assert.equal(check1.body.data.completed, true);
    });

    it('should bulk change category for selected items', async () => {
      const res = await request(app).post('/api/todos/bulk').send({
        action: 'category',
        category: 'finance',
        ids: ['tp-1'],
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.affectedCount, 1);

      const check = await request(app).get('/api/todos/tp-1');
      assert.equal(check.body.data.category, 'finance');
    });

    it('should bulk delete selected items', async () => {
      const res = await request(app).post('/api/todos/bulk').send({
        action: 'delete',
        ids: ['tp-1', 'tp-2'],
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.affectedCount, 2);

      const remaining = await request(app).get('/api/todos');
      assert.ok(!remaining.body.data.some((t: { id: string }) => t.id === 'tp-1' || t.id === 'tp-2'));
    });

    it('should return 400 on invalid bulk action', async () => {
      const res = await request(app).post('/api/todos/bulk').send({
        action: 'invalid_action',
        ids: ['tp-1'],
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'UNKNOWN_ACTION');
    });
  });
});
