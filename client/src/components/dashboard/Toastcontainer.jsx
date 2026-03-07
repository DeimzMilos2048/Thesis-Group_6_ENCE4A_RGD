import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import './Toastcontainer.css';

/**
 * ToastContainer
 * ──────────────
 * Renders active toast notifications in the top-right corner.
 * Receives `toasts` array and `removeToast` from useNotificationService.
 *
 * Props:
 *   toasts       – [{ id, type, title, message, timestamp }]
 *   removeToast  – (id) => void
 */
const ToastContainer = ({ toasts = [], removeToast }) => {
  if (!toasts.length) return null;

  const icon = (type) => {
    if (type === 'critical') return <AlertTriangle size={18} />;
    if (type === 'warning')  return <AlertTriangle size={18} />;
    return <CheckCircle size={18} />;
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
          role="alert"
        >
          {/* Progress bar — animates from full to empty in 5 s */}
          <div className="toast-progress">
            <div className={`toast-progress-bar toast-progress-${toast.type}`} />
          </div>

          <div className="toast-body">
            <span className={`toast-icon-wrap toast-icon-${toast.type}`}>
              {icon(toast.type)}
            </span>

            <div className="toast-text">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-message">{toast.message}</span>
              <span className="toast-time">{formatTime(toast.timestamp)}</span>
            </div>

            <button
              className="toast-dismiss"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;