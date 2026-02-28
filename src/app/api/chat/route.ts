import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getChatId,
  getMessagesForChat,
  addMessage,
  deleteMessage,
  markMessagesRead,
  getThreadsForUser,
  getUnreadCountForUser,
  updateThreadUserName,
  addNotification,
} from '@/lib/store';
import { DirectMessage } from '@/lib/types';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Ownership: can only read own threads/unread
    if (userId !== authUser.id) return forbidden();

    // Get unread count
    if (action === 'unread') {
      const count = await getUnreadCountForUser(userId);
      return NextResponse.json({ unreadCount: count });
    }

    // Get messages for a specific chat
    if (chatId) {
      const messages = await getMessagesForChat(chatId);
      return NextResponse.json({ messages });
    }

    // Get all threads for user
    const threads = await getThreadsForUser(userId);
    return NextResponse.json({ threads });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat — send a message
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { senderId, senderName, receiverId, receiverName, text } = body;
    if (!senderId || !receiverId || !text) {
      return NextResponse.json({ error: 'senderId, receiverId, text required' }, { status: 400 });
    }
    if (!rateLimit(`chat:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }
    if (senderId !== authUser.id) return forbidden();

    const chatId = getChatId(senderId, receiverId);
    const message: DirectMessage = {
      id: uuidv4(), chatId, senderId, senderName: senderName || 'Unknown',
      receiverId, text: text.trim(), read: false, createdAt: new Date().toISOString(),
    };
    await addMessage(message);
    try {
      await addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: receiverId, type: NOTIFICATION_TYPES.SESSION_REQUEST, title: 'New Message',
        message: `${senderName || 'Someone'}: ${text.trim().slice(0, 50)}${text.length > 50 ? '...' : ''}`,
        read: false, createdAt: new Date().toISOString(),
      });
    } catch (err) { /* non-critical: notification send */ }
    if (receiverName) await updateThreadUserName(chatId, receiverId, receiverName);
    if (senderName) await updateThreadUserName(chatId, senderId, senderName);
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/chat — mark messages as read
export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { chatId, userId } = body;
    if (!chatId || !userId) {
      return NextResponse.json({ error: 'chatId, userId required' }, { status: 400 });
    }
    if (userId !== authUser.id) return forbidden();
    await markMessagesRead(chatId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chat — delete a message
export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { messageId, userId } = body;
    if (!messageId || !userId) {
      return NextResponse.json({ error: 'messageId, userId required' }, { status: 400 });
    }
    if (userId !== authUser.id) return forbidden();
    const success = await deleteMessage(messageId, userId);
    if (!success) {
      return NextResponse.json({ error: 'Could not delete message' }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
