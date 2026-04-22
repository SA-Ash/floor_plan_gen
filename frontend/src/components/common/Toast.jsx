import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeNotification } from '../../store/slices/uiSlice';
import { FiCheck, FiAlertTriangle, FiInfo, FiX, FiAlertCircle } from 'react-icons/fi';
import './Toast.css';

const ICONS = {
  success: <FiCheck size={18} />,
  error: <FiAlertCircle size={18} />,
  warning: <FiAlertTriangle size={18} />,
  info: <FiInfo size={18} />,
};

function ToastItem({ notification, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const duration = notification.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(notification.id), 350);
    }, duration);
    return () => clearTimeout(timer);
  }, [notification.id, duration, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(notification.id), 350);
  };

  return (
    <div className={`toast-item toast-${notification.type || 'info'} ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className="toast-icon">{ICONS[notification.type || 'info']}</div>
      <div className="toast-content">
        {notification.title && <div className="toast-title">{notification.title}</div>}
        <div className="toast-message">{notification.message}</div>
      </div>
      <button className="toast-close" onClick={handleDismiss} aria-label="Dismiss">
        <FiX size={14} />
      </button>
      <div className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}

export default function ToastContainer() {
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.ui.notifications);

  return (
    <div className="toast-container">
      {notifications.map(n => (
        <ToastItem
          key={n.id}
          notification={n}
          onDismiss={(id) => dispatch(removeNotification(id))}
        />
      ))}
    </div>
  );
}
