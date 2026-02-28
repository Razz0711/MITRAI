// ============================================
// MitrAI - Chat / Messaging Operations
// ============================================

import { DirectMessage, ChatThread } from '../types';
import { supabase, toRow, fromRow } from './core';

export function getChatId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('__');
}

export async function getMessagesForChat(chatId: string, limit = 50, before?: string): Promise<DirectMessage[]> {
  let query = supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
  if (before) query = query.lt('created_at', before);
  query = query.limit(limit);
  const { data, error } = await query;
  if (error) { console.error('getMessagesForChat error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<DirectMessage>(r));
}

export async function addMessage(msg: DirectMessage): Promise<DirectMessage> {
  const { error } = await supabase.from('messages').insert(toRow(msg));
  if (error) console.error('addMessage error:', error);

  // Update or create chat thread
  const { data: threadData } = await supabase.from('chat_threads').select('*').eq('chat_id', msg.chatId).single();
  if (threadData) {
    const updates: Record<string, unknown> = { last_message: msg.text, last_message_at: msg.createdAt };
    if (threadData.user1_id === msg.receiverId) {
      updates.unread_count1 = (threadData.unread_count1 || 0) + 1;
    } else {
      updates.unread_count2 = (threadData.unread_count2 || 0) + 1;
    }
    await supabase.from('chat_threads').update(updates).eq('chat_id', msg.chatId);
  } else {
    await supabase.from('chat_threads').insert({
      chat_id: msg.chatId,
      user1_id: msg.senderId,
      user1_name: msg.senderName,
      user2_id: msg.receiverId,
      user2_name: '',
      last_message: msg.text,
      last_message_at: msg.createdAt,
      unread_count1: 0,
      unread_count2: 1,
    });
  }
  return msg;
}

export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  // Only allow sender to delete their own message
  const { data: msg } = await supabase.from('messages').select('*').eq('id', messageId).single();
  if (!msg || msg.sender_id !== userId) return false;

  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  if (error) { console.error('deleteMessage error:', error); return false; }

  // Update thread's last message if this was the latest
  const chatId = msg.chat_id;
  const { data: latest } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    await supabase.from('chat_threads').update({
      last_message: latest.text,
      last_message_at: latest.created_at,
    }).eq('chat_id', chatId);
  } else {
    // No messages left — update thread to show empty
    await supabase.from('chat_threads').update({
      last_message: '',
      last_message_at: new Date().toISOString(),
    }).eq('chat_id', chatId);
  }

  return true;
}

export async function markMessagesRead(chatId: string, userId: string): Promise<void> {
  await supabase.from('messages').update({ read: true }).eq('chat_id', chatId).eq('receiver_id', userId).eq('read', false);
  const { data: thread } = await supabase.from('chat_threads').select('*').eq('chat_id', chatId).single();
  if (thread) {
    if (thread.user1_id === userId) {
      await supabase.from('chat_threads').update({ unread_count1: 0 }).eq('chat_id', chatId);
    } else {
      await supabase.from('chat_threads').update({ unread_count2: 0 }).eq('chat_id', chatId);
    }
  }
}

export async function getThreadsForUser(userId: string, limit = 50): Promise<ChatThread[]> {
  const { data, error } = await supabase.from('chat_threads').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).order('last_message_at', { ascending: false }).limit(limit);
  if (error) { console.error('getThreadsForUser error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<ChatThread>(r));
}

export async function getUnreadCountForUser(userId: string): Promise<number> {
  const threads = await getThreadsForUser(userId);
  let count = 0;
  threads.forEach(t => {
    if (t.user1Id === userId) count += t.unreadCount1;
    else if (t.user2Id === userId) count += t.unreadCount2;
  });
  return count;
}

export async function updateThreadUserName(chatId: string, userId: string, userName: string): Promise<void> {
  const { data: thread } = await supabase.from('chat_threads').select('*').eq('chat_id', chatId).single();
  if (thread) {
    if (thread.user1_id === userId) {
      await supabase.from('chat_threads').update({ user1_name: userName }).eq('chat_id', chatId);
    } else if (thread.user2_id === userId) {
      await supabase.from('chat_threads').update({ user2_name: userName }).eq('chat_id', chatId);
    }
  }
}
