import { CheckCircle, AlertTriangle, StopCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

/**
 * Mount this component ONCE at the app root (e.g. in App.jsx, just inside
 * <ToastProvider> but outside all <Route> definitions).  Because it lives
 * above the router it survives every tab/route change.
 */
export default function GlobalToastDisplay() {
  const { toasts, removeToast } = useToast();
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 99999,          /* above every modal / overlay */
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        width: '100%',
        pointerEvents: 'none', /* let clicks fall through to the page */
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-notification toast-${t.type}`}
          style={{ pointerEvents: 'all' }}
        >
          <span className="toast-icon">
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.type === 'error'   && <AlertTriangle size={18} />}
            {t.type === 'info'    && <StopCircle size={18} />}
          </span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}