import { supabase } from './supabase';

export interface InternalNotification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: string;
  post_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATIONS_TABLE = 'internal_notifications';

export const getInternalNotifications = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id, recipient_id, sender_id, type, post_id, message, is_read, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data as InternalNotification[];
  } catch (error) {
    console.error("Error fetching internal notifications:", error);
    return [];
  }
};

export const getUnreadCount = async (userId: string, userLevel?: string) => {
  try {
    // Read deleted IDs from localStorage to filter them out
    let deletedIds: string[] = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        deletedIds = JSON.parse(localStorage.getItem('mz_deleted_notification_ids') || '[]');
      } catch (e) {
        console.error("Error reading deleted notifications from localStorage:", e);
      }
    }
    const deletedSet = new Set(deletedIds);

    // 1. Count Internal Notifications
    const { data: internalUnread, error: internalError } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id')
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (internalError) throw internalError;

    const unreadInternalFiltered = (internalUnread || []).filter(n => !deletedSet.has(n.id)).length;

    // 2. Count Admin Push Notifications (more complex as it depends on receipts)
    // Server-side filtering using or/and to fetch only notifications targeting 'all', this user, or this user's level
    let notifQuery = supabase
      .from('admin_push_notifications')
      .select('id, target_type, target_value');

    if (userLevel) {
      notifQuery = notifQuery.or(`target_type.eq.all,and(target_type.eq.level,target_value.eq.${userLevel}),and(target_type.eq.user,target_value.eq.${userId})`);
    } else {
      notifQuery = notifQuery.or(`target_type.eq.all,and(target_type.eq.user,target_value.eq.${userId})`);
    }

    const { data: allNotifs } = await notifQuery;

    const relevantIds = (allNotifs || [])
      .filter(n => !deletedSet.has(n.id))
      .map(n => n.id);

    if (relevantIds.length > 0) {
      const { data: readIds } = await supabase
        .from('admin_push_receipts')
        .select('notification_id')
        .eq('user_id', userId)
        .in('notification_id', relevantIds);

      const readSet = new Set((readIds || []).map(r => r.notification_id));
      const unreadPushCount = relevantIds.filter(id => !readSet.has(id)).length;
      
      return unreadInternalFiltered + unreadPushCount;
    }

    return unreadInternalFiltered;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
};

export const markAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

export const markAllAsRead = async (userId: string) => {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error marking all as read:", error);
    return false;
  }
};

export const deleteInternalNotification = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting internal notification:", error);
    return false;
  }
};

export const getDeletedNotificationIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('mz_deleted_notification_ids') || '[]');
  } catch (e) {
    console.error("Error parsing deleted notifications from localStorage:", e);
    return [];
  }
};

export const deleteLocalNotification = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const deleted = getDeletedNotificationIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem('mz_deleted_notification_ids', JSON.stringify(deleted));
    }
  } catch (e) {
    console.error("Error saving deleted notification to localStorage:", e);
  }
};

export const subscribeToNotifications = (userId: string, onUpdate: () => void) => {
  // Remplacer le websocket temps réel lourd par un intervalle de rafraîchissement passif (10 minutes)
  // afin d'alléger considérablement la charge et l'Egress de la base de données.
  const interval = setInterval(() => {
    onUpdate();
  }, 600000);

  return () => {
    clearInterval(interval);
  };
};
