import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getChatId,
  getMessagesForChat,
  addMessage,
  markMessagesRead,
  getThreadsForUser,
  getUnreadCountForUser,
  updateThreadUserName,
  addNotification,
} from '@/lib/store';
import { DirectMessage } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'send') {
      const { senderId, senderName, receiverId, receiverName, text } = body;
      if (!senderId || !receiverId || !text) {
        return NextResponse.json({ error: 'senderId, receiverId, text required' }, { status: 400 });
      }

      const chatId = getChatId(senderId, receiverId);
      const message: DirectMessage = {
        id: uuidv4(),
        chatId,
        senderId,
        senderName: senderName || 'Unknown',
        receiverId,
        text: text.trim(),
        read: false,
        createdAt: new Date().toISOString(),
      };

      await addMessage(message);

      // Notify the receiver about the new message
      try {
        await addNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: receiverId,
          type: 'session_request',
          title: 'New Message',
          message: `${senderName || 'Someone'}: ${text.trim().slice(0, 50)}${text.length > 50 ? '...' : ''}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch { /* non-critical */ }

      // Update receiver name in thread if provided
      if (receiverName) {
        await updateThreadUserName(chatId, receiverId, receiverName);
      }
      // Update sender name too
      if (senderName) {
        await updateThreadUserName(chatId, senderId, senderName);
      }

      return NextResponse.json({ message });
    }

    if (action === 'read') {
      const { chatId, userId } = body;
      if (!chatId || !userId) {
        return NextResponse.json({ error: 'chatId, userId required' }, { status: 400 });
      }
      await markMessagesRead(chatId, userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
