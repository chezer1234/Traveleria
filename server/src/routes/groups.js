import express from 'express';
import crypto from 'crypto';
import db from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createGroupSchema,
  renameGroupSchema,
  addGroupMemberSchema,
  updateColoursSchema,
  validateBody,
} from '../lib/schemas.js';
import * as changes from '../lib/changes.js';

const router = express.Router();

// All group routes require authentication.
router.use(requireAuth);

// POST /api/groups — create a new group with the creator + initial members.
// Body: { id?, name, members: [{id?, user_id, primary_colour, secondary_colour}],
//         creator_member_id?, primary_colour, secondary_colour }
router.post('/', validateBody(createGroupSchema), async (req, res) => {
  const { name, members, primary_colour, secondary_colour } = req.body;
  const groupId = req.body.id || crypto.randomUUID();
  const creatorMemberId = req.body.creator_member_id || crypto.randomUUID();
  const now = new Date().toISOString();

  // Ensure creator is not duplicated in the members list.
  const otherMembers = members.filter((m) => m.user_id !== req.user.id);

  await db.transaction(async (trx) => {
    await trx('groups').insert({ id: groupId, name, created_by: req.user.id, created_at: now });
    const groupChangeId = await changes.record(trx, {
      table: 'groups',
      pk: groupId,
      op: 'insert',
      row: { id: groupId, name, created_by: req.user.id, created_at: now },
    });

    // Insert creator as first member.
    const creatorRow = {
      id: creatorMemberId,
      group_id: groupId,
      user_id: req.user.id,
      primary_colour,
      secondary_colour,
      joined_at: now,
    };
    await trx('group_members').insert(creatorRow);
    await changes.record(trx, {
      table: 'group_members',
      pk: creatorMemberId,
      op: 'insert',
      row: creatorRow,
    });

    // Insert other members.
    let lastChangeId = groupChangeId;
    for (const m of otherMembers) {
      const memberId = m.id || crypto.randomUUID();
      const memberRow = {
        id: memberId,
        group_id: groupId,
        user_id: m.user_id,
        primary_colour: m.primary_colour,
        secondary_colour: m.secondary_colour,
        joined_at: now,
      };
      await trx('group_members').insert(memberRow);
      lastChangeId = await changes.record(trx, {
        table: 'group_members',
        pk: memberId,
        op: 'insert',
        row: memberRow,
      });
    }

    res.status(201).json({ id: groupId, change_id: lastChangeId });
  });
});

// PATCH /api/groups/:id — rename (creator only).
router.patch('/:id', validateBody(renameGroupSchema), async (req, res) => {
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.created_by !== req.user.id) return res.status(403).json({ error: 'Only the group creator can rename it' });

  const { name } = req.body;
  await db.transaction(async (trx) => {
    await trx('groups').where({ id: group.id }).update({ name });
    const changeId = await changes.record(trx, {
      table: 'groups',
      pk: group.id,
      op: 'update',
      row: { id: group.id, name, created_by: group.created_by, created_at: group.created_at },
    });
    res.json({ change_id: changeId });
  });
});

// DELETE /api/groups/:id — delete group (creator only).
router.delete('/:id', async (req, res) => {
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.created_by !== req.user.id) return res.status(403).json({ error: 'Only the group creator can delete the group' });

  await db.transaction(async (trx) => {
    // group_members cascade-deletes via FK, but we still need change-feed tombstones.
    const memberIds = await trx('group_members').where({ group_id: group.id }).pluck('id');
    for (const mid of memberIds) {
      await changes.record(trx, { table: 'group_members', pk: mid, op: 'delete' });
    }
    await trx('group_members').where({ group_id: group.id }).delete();
    await changes.record(trx, { table: 'groups', pk: group.id, op: 'delete' });
    await trx('groups').where({ id: group.id }).delete();
    res.json({ ok: true });
  });
});

// POST /api/groups/:id/members — add a member (creator only).
router.post('/:id/members', validateBody(addGroupMemberSchema), async (req, res) => {
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.created_by !== req.user.id) return res.status(403).json({ error: 'Only the group creator can add members' });

  const { user_id, primary_colour, secondary_colour } = req.body;
  const memberId = req.body.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const existing = await db('group_members').where({ group_id: group.id, user_id }).first();
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  const row = { id: memberId, group_id: group.id, user_id, primary_colour, secondary_colour, joined_at: now };
  await db.transaction(async (trx) => {
    await trx('group_members').insert(row);
    const changeId = await changes.record(trx, { table: 'group_members', pk: memberId, op: 'insert', row });
    res.status(201).json({ id: memberId, change_id: changeId });
  });
});

// DELETE /api/groups/:id/members/:userId — remove a member (creator removes others;
// any member can remove themselves via this endpoint too).
router.delete('/:id/members/:userId', async (req, res) => {
  const group = await db('groups').where({ id: req.params.id }).first();
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const targetId = req.params.userId;
  const isCreator = group.created_by === req.user.id;
  const isSelf = targetId === req.user.id;

  if (!isCreator && !isSelf) {
    return res.status(403).json({ error: 'You can only remove yourself from a group' });
  }

  const member = await db('group_members').where({ group_id: group.id, user_id: targetId }).first();
  if (!member) return res.status(404).json({ error: 'Member not found' });

  await db.transaction(async (trx) => {
    await trx('group_members').where({ id: member.id }).delete();
    await changes.record(trx, { table: 'group_members', pk: member.id, op: 'delete' });

    // If the creator just left, transfer ownership to the next-earliest member.
    if (targetId === group.created_by) {
      const nextMember = await trx('group_members')
        .where({ group_id: group.id })
        .orderBy('joined_at', 'asc')
        .first();

      if (!nextMember) {
        // No members left — dissolve the group.
        await changes.record(trx, { table: 'groups', pk: group.id, op: 'delete' });
        await trx('groups').where({ id: group.id }).delete();
      } else {
        const updated = { id: group.id, name: group.name, created_by: nextMember.user_id, created_at: group.created_at };
        await trx('groups').where({ id: group.id }).update({ created_by: nextMember.user_id });
        await changes.record(trx, { table: 'groups', pk: group.id, op: 'update', row: updated });
      }
    }

    res.json({ ok: true });
  });
});

// PATCH /api/groups/:id/members/:userId/colours — update own colours.
router.patch('/:id/members/:userId/colours', validateBody(updateColoursSchema), async (req, res) => {
  if (req.params.userId !== req.user.id) return res.status(403).json({ error: 'You can only update your own colours' });

  const member = await db('group_members')
    .where({ group_id: req.params.id, user_id: req.user.id })
    .first();
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { primary_colour, secondary_colour } = req.body;
  const group = await db('groups').where({ id: req.params.id }).first();

  await db.transaction(async (trx) => {
    await trx('group_members').where({ id: member.id }).update({ primary_colour, secondary_colour });
    const updated = { ...member, primary_colour, secondary_colour };
    const changeId = await changes.record(trx, {
      table: 'group_members',
      pk: member.id,
      op: 'update',
      row: updated,
    });
    res.json({ change_id: changeId });
  });
});

export default router;
