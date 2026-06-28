/**
 * Tests for the groups and group_members tables introduced in migration
 * 20260627002_create_groups. Verifies schema, constraints, and cascade behaviour.
 */
import crypto from 'crypto';
import { db } from './setup.js';

let user1, user2;

beforeAll(async () => {
  await db.seed.run();
});

beforeEach(async () => {
  await db('group_members').del();
  await db('groups').del();
  await db('users').del();

  const now = new Date().toISOString();

  [user1] = await db('users')
    .insert({
      id: crypto.randomUUID(),
      identifier: 'groupuser1',
      password_hash: 'hash',
      home_country: 'GB',
      created_at: now,
    })
    .returning('*');

  [user2] = await db('users')
    .insert({
      id: crypto.randomUUID(),
      identifier: 'groupuser2',
      password_hash: 'hash',
      home_country: 'FR',
      created_at: now,
    })
    .returning('*');
});

afterEach(async () => {
  await db('group_members').del();
  await db('groups').del();
  await db('users').del();
});

describe('Groups — Schema', () => {
  test('groups table has correct columns', async () => {
    const cols = await db.table('groups').columnInfo();
    expect(cols).toHaveProperty('id');
    expect(cols).toHaveProperty('name');
    expect(cols).toHaveProperty('created_by');
    expect(cols).toHaveProperty('created_at');
  });

  test('group_members table has correct columns', async () => {
    const cols = await db.table('group_members').columnInfo();
    expect(cols).toHaveProperty('id');
    expect(cols).toHaveProperty('group_id');
    expect(cols).toHaveProperty('user_id');
    expect(cols).toHaveProperty('primary_colour');
    expect(cols).toHaveProperty('secondary_colour');
    expect(cols).toHaveProperty('joined_at');
  });
});

describe('Groups — CRUD', () => {
  test('can create a group', async () => {
    const groupId = crypto.randomUUID();
    const now = new Date().toISOString();

    const [group] = await db('groups')
      .insert({ id: groupId, name: 'Europe Trip', created_by: user1.id, created_at: now })
      .returning('*');

    expect(group.id).toBe(groupId);
    expect(group.name).toBe('Europe Trip');
    expect(group.created_by).toBe(user1.id);
  });

  test('can rename a group', async () => {
    const groupId = crypto.randomUUID();
    await db('groups').insert({ id: groupId, name: 'Old Name', created_by: user1.id });

    await db('groups').where({ id: groupId }).update({ name: 'New Name' });

    const group = await db('groups').where({ id: groupId }).first();
    expect(group.name).toBe('New Name');
  });

  test('can delete a group', async () => {
    const groupId = crypto.randomUUID();
    await db('groups').insert({ id: groupId, name: 'Temporary', created_by: user1.id });

    await db('groups').where({ id: groupId }).delete();

    const group = await db('groups').where({ id: groupId }).first();
    expect(group).toBeUndefined();
  });

  test('group name is required (not nullable)', async () => {
    await expect(
      db('groups').insert({ id: crypto.randomUUID(), created_by: user1.id })
    ).rejects.toThrow();
  });

  test('created_by references users.id — rejects unknown user', async () => {
    await expect(
      db('groups').insert({ id: crypto.randomUUID(), name: 'Ghost Group', created_by: crypto.randomUUID() })
    ).rejects.toThrow();
  });
});

describe('Groups — Membership', () => {
  let groupId;

  beforeEach(async () => {
    groupId = crypto.randomUUID();
    await db('groups').insert({ id: groupId, name: 'Test Group', created_by: user1.id });
  });

  test('can add a member', async () => {
    const memberId = crypto.randomUUID();
    const [member] = await db('group_members')
      .insert({
        id: memberId,
        group_id: groupId,
        user_id: user1.id,
        primary_colour: '#FF0000',
        secondary_colour: '#0000FF',
      })
      .returning('*');

    expect(member.group_id).toBe(groupId);
    expect(member.user_id).toBe(user1.id);
    expect(member.primary_colour).toBe('#FF0000');
  });

  test('duplicate member (group_id, user_id) is prevented', async () => {
    await db('group_members').insert({
      id: crypto.randomUUID(),
      group_id: groupId,
      user_id: user1.id,
      primary_colour: '#FF0000',
      secondary_colour: '#0000FF',
    });

    await expect(
      db('group_members').insert({
        id: crypto.randomUUID(),
        group_id: groupId,
        user_id: user1.id,
        primary_colour: '#00FF00',
        secondary_colour: '#000000',
      })
    ).rejects.toThrow();
  });

  test('multiple users can join the same group', async () => {
    await db('group_members').insert([
      { id: crypto.randomUUID(), group_id: groupId, user_id: user1.id, primary_colour: '#FF0000', secondary_colour: '#0000FF' },
      { id: crypto.randomUUID(), group_id: groupId, user_id: user2.id, primary_colour: '#00FF00', secondary_colour: '#FFFF00' },
    ]);

    const members = await db('group_members').where({ group_id: groupId });
    expect(members).toHaveLength(2);
  });

  test('can update member colours', async () => {
    const memberId = crypto.randomUUID();
    await db('group_members').insert({
      id: memberId,
      group_id: groupId,
      user_id: user1.id,
      primary_colour: '#FF0000',
      secondary_colour: '#0000FF',
    });

    await db('group_members').where({ id: memberId }).update({
      primary_colour: '#FFFFFF',
      secondary_colour: '#000000',
    });

    const member = await db('group_members').where({ id: memberId }).first();
    expect(member.primary_colour).toBe('#FFFFFF');
    expect(member.secondary_colour).toBe('#000000');
  });

  test('can remove a member', async () => {
    const memberId = crypto.randomUUID();
    await db('group_members').insert({
      id: memberId,
      group_id: groupId,
      user_id: user1.id,
      primary_colour: '#FF0000',
      secondary_colour: '#0000FF',
    });

    await db('group_members').where({ id: memberId }).delete();

    const member = await db('group_members').where({ id: memberId }).first();
    expect(member).toBeUndefined();
  });
});

describe('Groups — Cascade Deletes', () => {
  test('deleting a group removes all its members', async () => {
    const groupId = crypto.randomUUID();
    await db('groups').insert({ id: groupId, name: 'Cascade Test', created_by: user1.id });
    await db('group_members').insert([
      { id: crypto.randomUUID(), group_id: groupId, user_id: user1.id, primary_colour: '#FF0000', secondary_colour: '#0000FF' },
      { id: crypto.randomUUID(), group_id: groupId, user_id: user2.id, primary_colour: '#00FF00', secondary_colour: '#FFFF00' },
    ]);

    await db('group_members').where({ group_id: groupId }).delete();
    await db('groups').where({ id: groupId }).delete();

    const members = await db('group_members').where({ group_id: groupId });
    expect(members).toHaveLength(0);
  });

  test('deleting a user removes their group memberships', async () => {
    const groupId = crypto.randomUUID();
    await db('groups').insert({ id: groupId, name: 'User Cascade', created_by: user1.id });
    await db('group_members').insert({
      id: crypto.randomUUID(),
      group_id: groupId,
      user_id: user2.id,
      primary_colour: '#FF0000',
      secondary_colour: '#0000FF',
    });

    await db('group_members').where({ user_id: user2.id }).delete();
    await db('users').where({ id: user2.id }).delete();

    const members = await db('group_members').where({ user_id: user2.id });
    expect(members).toHaveLength(0);
  });
});
