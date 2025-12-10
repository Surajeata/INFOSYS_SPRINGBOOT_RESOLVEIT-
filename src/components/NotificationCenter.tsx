import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, X } from "lucide-react";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useQuery(api.notifications.getUserNotifications, { limit: 20 });
  const markAsRead = useMutation(api.notifications.markNotificationRead);
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsRead);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({ notificationId: notificationId as any });
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({});
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      'COMPLAINT_CREATED': '📝',
      'STATUS_UPDATED': '🔄',
      'ASSIGNED': '👤',
      'ESCALATED': '🚨',
      'AUTO_ESCALATED': '⚡',
      'RESOLVED': '✅',
      'COMMENT_ADDED': '💬',
      'DUE_DATE_APPROACHING': '⏰',
      'OVERDUE': '⚠️',
    };
    return iconMap[type as keyof typeof iconMap] || '📢';
  };

  const getNotificationColor = (type: string) => {
    const colorMap = {
      'ESCALATED': 'from-red-500 to-red-600',
      'AUTO_ESCALATED': 'from-red-500 to-orange-500',
      'OVERDUE': 'from-red-500 to-red-600',
      'RESOLVED': 'from-green-500 to-green-600',
      'ASSIGNED': 'from-blue-500 to-blue-600',
      'DUE_DATE_APPROACHING': 'from-yellow-500 to-yellow-600',
      'STATUS_UPDATED': 'from-purple-500 to-purple-600',
      'COMPLAINT_CREATED': 'from-indigo-500 to-indigo-600',
      'COMMENT_ADDED': 'from-teal-500 to-teal-600',
    };
    return colorMap[type as keyof typeof colorMap] || 'from-gray-500 to-gray-600';
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 hover:bg-gray-100"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-6 h-6" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="absolute right-0 mt-2 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-50 max-h-96 overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <p className="text-sm text-gray-600 mt-1">{unreadCount} new notifications</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <motion.button
                        onClick={handleMarkAllAsRead}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => setIsOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification._id}
                        className={`p-4 hover:bg-gray-50/80 cursor-pointer transition-all duration-200 ${
                          !notification.isRead ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification._id);
                          }
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${getNotificationColor(notification.type)} flex items-center justify-center text-white shadow-lg`}>
                            <span className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p className={`text-sm font-semibold ${
                                !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                              <div className="flex items-center space-x-2 ml-2">
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatTimeAgo(notification._creationTime)}
                                </span>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    className="p-12 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No notifications yet</p>
                    <p className="text-gray-400 text-sm mt-1">We'll notify you when something happens</p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {notifications && notifications.length > 0 && (
                <div className="p-4 border-t border-gray-200/50 bg-gray-50/50">
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    View All Notifications
                  </motion.button>
                </div>
              )}
            </motion.div>

            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
