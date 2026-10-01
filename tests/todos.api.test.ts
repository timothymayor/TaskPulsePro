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

    it('should filter todos by custom tag via ?tag= query parameter', async () => {
      const res = await request(app).get('/api/todos?tag=devops');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.ok(res.body.data.every((t: { tags: string[] }) => t.tags.includes('devops')));
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

    it('should accept, deduplicate, and sanitize custom tags array during creation', async () => {
      const payload = {
        title: 'Task with Custom Tags',
        priority: 'medium',
        tags: ['Frontend', '  DevOps  ', 'frontend', '<script>tag', 'performance'],
        tagColors: {
          frontend: 'sky',
          devops: 'indigo',
          invalidColorTag: 'not-a-valid-color',
        },
      };
      const res = await request(app).post('/api/todos').send(payload);
      assert.equal(res.status, 201);
      assert.ok(Array.isArray(res.body.data.tags));
      assert.deepEqual(res.body.data.tags, ['frontend', 'devops', 'tag', 'performance']);
      assert.deepEqual(res.body.data.tagColors, {
        frontend: 'sky',
        devops: 'indigo',
      });
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update an existing todo and return 200', async () => {
      const updates = {
        title: 'Updated Task Title',
        priority: 'low',
        completed: true,
        tags: ['refactor', 'architecture'],
      };

      const res = await request(app).put('/api/todos/tp-1').send(updates);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, 'Updated Task Title');
      assert.equal(res.body.data.priority, 'low');
      assert.equal(res.body.data.completed, true);
      assert.deepEqual(res.body.data.tags, ['refactor', 'architecture']);
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

  describe('POST /api/todos/reorder', () => {
    it('should successfully reorder tasks by updating their numerical priority rank', async () => {
      // Reorder with reverse sequence: tp-3 first, then tp-2, then tp-1
      const res = await request(app).post('/api/todos/reorder').send({
        orderedIds: ['tp-3', 'tp-2', 'tp-1'],
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.reorderedCount, 3);
      assert.equal(res.body.data.totalRequested, 3);

      // Verify the new order in storage
      const check3 = await request(app).get('/api/todos/tp-3');
      const check2 = await request(app).get('/api/todos/tp-2');
      const check1 = await request(app).get('/api/todos/tp-1');

      assert.equal(check3.body.data.order, 1);
      assert.equal(check2.body.data.order, 2);
      assert.equal(check1.body.data.order, 3);
    });

    it('should reject reorder request when orderedIds is missing or empty', async () => {
      const emptyRes = await request(app).post('/api/todos/reorder').send({
        orderedIds: [],
      });
      assert.equal(emptyRes.status, 400);
      assert.equal(emptyRes.body.code, 'INVALID_ORDERED_IDS');

      const missingRes = await request(app).post('/api/todos/reorder').send({});
      assert.equal(missingRes.status, 400);
      assert.equal(missingRes.body.code, 'INVALID_ORDERED_IDS');
    });

    it('should reject reorder request containing non-string IDs', async () => {
      const res = await request(app).post('/api/todos/reorder').send({
        orderedIds: ['tp-1', 123, null],
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_ID_TYPE');
    });
  });

  describe('Task Prerequisite Dependencies', () => {
    it('should create a task with dependencyIds linking to an existing task', async () => {
      const res = await request(app).post('/api/todos').send({
        title: 'Deploy microservice to production cluster',
        dependencyIds: ['tp-1'],
        priority: 'high',
        category: 'work',
      });

      assert.equal(res.status, 201);
      assert.ok(Array.isArray(res.body.data.dependencyIds));
      assert.deepEqual(res.body.data.dependencyIds, ['tp-1']);
    });

    it('should prevent completion with 422 if prerequisite dependencies are active', async () => {
      // tp-2 has dependency tp-1, which is not completed
      const res = await request(app).put('/api/todos/tp-2').send({
        completed: true,
      });

      assert.equal(res.status, 422);
      assert.equal(res.body.code, 'DEPENDENCIES_UNRESOLVED');
      assert.ok(res.body.error.includes('Cannot complete task while active prerequisite dependencies remain uncompleted'));
      assert.ok(Array.isArray(res.body.data.activeDependencies));
      assert.equal(res.body.data.activeDependencies[0].id, 'tp-1');

      // Verify tp-2 is still incomplete
      const check = await request(app).get('/api/todos/tp-2');
      assert.equal(check.body.data.completed, false);
    });

    it('should allow completion once all prerequisite dependencies are completed', async () => {
      // Complete tp-1 first
      const completeDep = await request(app).put('/api/todos/tp-1').send({
        completed: true,
      });
      assert.equal(completeDep.status, 200);
      assert.equal(completeDep.body.data.completed, true);

      // Now complete tp-2
      const completeTask = await request(app).put('/api/todos/tp-2').send({
        completed: true,
      });
      assert.equal(completeTask.status, 200);
      assert.equal(completeTask.body.data.completed, true);
    });

    it('should clean up dependencyIds when the prerequisite task is deleted', async () => {
      // Create a task that depends on tp-3
      const createRes = await request(app).post('/api/todos').send({
        title: 'Run analysis on workout metrics',
        dependencyIds: ['tp-3'],
        category: 'health',
      });
      const newTaskId = createRes.body.data.id;

      // Delete tp-3
      const delRes = await request(app).delete('/api/todos/tp-3');
      assert.equal(delRes.status, 200);

      // Verify new task no longer has tp-3 in dependencyIds
      const check = await request(app).get(`/api/todos/${newTaskId}`);
      assert.deepEqual(check.body.data.dependencyIds, []);
    });
  });

  describe('Task Archiving & Historical Record-Keeping (/api/todos/*archive*)', () => {
    it('should archive a completed task via POST /api/todos/:id/archive and set archivedAt timestamp', async () => {
      // tp-3 is seeded as completed: true
      const res = await request(app).post('/api/todos/tp-3/archive');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, 'tp-3');
      assert.equal(res.body.data.archived, true);
      assert.ok(res.body.data.archivedAt);

      // Verify filtering by archived=true and archived=false
      const archivedRes = await request(app).get('/api/todos?archived=true');
      assert.equal(archivedRes.status, 200);
      assert.equal(archivedRes.body.data.length, 1);
      assert.equal(archivedRes.body.data[0].id, 'tp-3');

      const unarchivedRes = await request(app).get('/api/todos?archived=false');
      assert.equal(unarchivedRes.status, 200);
      assert.ok(unarchivedRes.body.data.every((t: { id: string }) => t.id !== 'tp-3'));
    });

    it('should reject archiving an active (incomplete) task with 422 TASK_NOT_COMPLETED', async () => {
      // tp-1 is incomplete
      const res = await request(app).post('/api/todos/tp-1/archive');
      assert.equal(res.status, 422);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'TASK_NOT_COMPLETED');
    });

    it('should return 404 when archiving or unarchiving a non-existent task', async () => {
      const archRes = await request(app).post('/api/todos/non-existent/archive');
      assert.equal(archRes.status, 404);
      assert.equal(archRes.body.code, 'NOT_FOUND');

      const unarchRes = await request(app).post('/api/todos/non-existent/unarchive');
      assert.equal(unarchRes.status, 404);
      assert.equal(unarchRes.body.code, 'NOT_FOUND');
    });

    it('should restore an archived task via POST /api/todos/:id/unarchive', async () => {
      await request(app).post('/api/todos/tp-3/archive');
      const unarchRes = await request(app).post('/api/todos/tp-3/unarchive');
      assert.equal(unarchRes.status, 200);
      assert.equal(unarchRes.body.success, true);
      assert.equal(unarchRes.body.data.archived, false);
      assert.equal(unarchRes.body.data.archivedAt, undefined);
    });

    it('should archive all completed tasks at once via POST /api/todos/archive-completed', async () => {
      // Complete tp-1 as well so both tp-1 and tp-3 are completed
      await request(app).put('/api/todos/tp-1').send({ completed: true });

      const res = await request(app).post('/api/todos/archive-completed');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.archivedCount, 2);
      assert.ok(res.body.data.archivedIds.includes('tp-1'));
      assert.ok(res.body.data.archivedIds.includes('tp-3'));

      // Active task tp-2 should remain unarchived
      const tp2 = await request(app).get('/api/todos/tp-2');
      assert.equal(Boolean(tp2.body.data.archived), false);
    });

    it('should support bulk archive and bulk unarchive actions via POST /api/todos/bulk', async () => {
      // Bulk archive tp-3 (completed) and tp-1 (incomplete - should be skipped)
      const archBulk = await request(app).post('/api/todos/bulk').send({
        action: 'archive',
        ids: ['tp-3', 'tp-1'],
      });
      assert.equal(archBulk.status, 200);
      assert.equal(archBulk.body.data.affectedCount, 1);

      const checkArchived = await request(app).get('/api/todos/tp-3');
      assert.equal(checkArchived.body.data.archived, true);

      // Bulk unarchive tp-3
      const unarchBulk = await request(app).post('/api/todos/bulk').send({
        action: 'unarchive',
        ids: ['tp-3'],
      });
      assert.equal(unarchBulk.status, 200);
      assert.equal(unarchBulk.body.data.affectedCount, 1);

      const checkRestored = await request(app).get('/api/todos/tp-3');
      assert.equal(checkRestored.body.data.archived, false);
    });

    it('should automatically unarchive a task when updated to completed: false via PUT /api/todos/:id', async () => {
      await request(app).post('/api/todos/tp-3/archive');
      const putRes = await request(app).put('/api/todos/tp-3').send({ completed: false });
      assert.equal(putRes.status, 200);
      assert.equal(putRes.body.data.completed, false);
      assert.equal(putRes.body.data.archived, false);
      assert.equal(putRes.body.data.archivedAt, undefined);
    });

    it('should reject PUT /api/todos/:id with 422 when attempting to archive an incomplete task', async () => {
      const putRes = await request(app).put('/api/todos/tp-1').send({ archived: true });
      assert.equal(putRes.status, 422);
      assert.equal(putRes.body.success, false);
      assert.equal(putRes.body.code, 'TASK_NOT_COMPLETED');
    });
  });
});
