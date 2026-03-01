// ============================================
// MitrAI - Notification Broadcast Helpers
// ============================================

import { addNotification } from './notifications';
import { getAllStudents } from './students';
import { Notification } from '../types';
import { NotificationType } from '../constants';

/** Broadcast a notification to all users */
export async function broadcastNotification({
  type,
  title,
  message,
  excludeUserId,
}: {
  type: NotificationType;
  title: string;
  message: string;
  excludeUserId?: string;
}) {
  const users = await getAllStudents();
  for (const u of users) {
    if (excludeUserId && u.id === excludeUserId) continue;
    await addNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: u.id,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}
