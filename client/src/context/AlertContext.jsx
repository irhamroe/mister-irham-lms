import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from 'lucide-react';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [toast, setToast] = useState(null); // { type, message }
  const [dialog, setDialog] = useState(null); // { title, message, confirmText, cancelText, type, resolve }
  const toastTimerRef = useRef(null);

  const showToast = (type = 'info', message = '') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const showAlert = ({ title = 'Pemberitahuan', message, type = 'info', confirmText = 'Tutup' }) => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmText,
        cancelText: null, // No cancel button for alert
        type,
        resolve: () => {
          setDialog(null);
          resolve(true);
        }
      });
    });
  };

  const showConfirm = ({
    title = 'Konfirmasi',
    message,
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    type = 'danger'
  }) => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve: (confirmed) => {
          setDialog(null);
          resolve(confirmed);
        }
      });
    });
  };

  // Intercept window.alert so that any alert() call throughout the app is rendered with modern UI
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const text = typeof msg === 'string' ? msg : (msg ? String(msg) : '');
      const isError = /gagal|error|salah|peringatan|tidak valid/i.test(text);
      const isSuccess = /berhasil|sukses/i.test(text);
      if (text.length > 90 || text.includes('\n')) {
        showAlert({
          title: isError ? 'Pemberitahuan' : (isSuccess ? 'Berhasil' : 'Informasi'),
          message: text,
          type: isError ? 'danger' : (isSuccess ? 'success' : 'info')
        });
      } else {
        showToast(isError ? 'error' : (isSuccess ? 'success' : 'info'), text);
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* Modern Center Modal Confirmation & Alert Dialog */}
      {dialog && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999,
            padding: 16
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && dialog.cancelText) {
              dialog.resolve(false);
            }
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: '28px 24px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              position: 'relative',
              border: '1px solid #E2E8F0',
              animation: 'modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Close Button if dismissable */}
            {dialog.cancelText && (
              <button
                type="button"
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => dialog.resolve(false)}
              >
                <X size={16} />
              </button>
            )}

            {/* Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background:
                  dialog.type === 'danger'
                    ? '#FEF2F2'
                    : dialog.type === 'warning'
                    ? '#FFFBEB'
                    : dialog.type === 'success'
                    ? '#F0FDF4'
                    : '#EFF6FF',
                border: `6px solid ${
                  dialog.type === 'danger'
                    ? '#FEE2E2'
                    : dialog.type === 'warning'
                    ? '#FEF3C7'
                    : dialog.type === 'success'
                    ? '#DCFCE7'
                    : '#DBEAFE'
                }`,
                color:
                  dialog.type === 'danger'
                    ? '#DC2626'
                    : dialog.type === 'warning'
                    ? '#D97706'
                    : dialog.type === 'success'
                    ? '#16A34A'
                    : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow:
                  dialog.type === 'danger'
                    ? '0 8px 16px rgba(239, 68, 68, 0.15)'
                    : dialog.type === 'warning'
                    ? '0 8px 16px rgba(217, 119, 6, 0.15)'
                    : '0 8px 16px rgba(37, 99, 235, 0.15)'
              }}
            >
              {dialog.type === 'danger' ? (
                <AlertTriangle size={30} strokeWidth={2.4} />
              ) : dialog.type === 'warning' ? (
                <AlertTriangle size={30} strokeWidth={2.4} />
              ) : dialog.type === 'success' ? (
                <CheckCircle size={30} strokeWidth={2.4} />
              ) : (
                <Info size={30} strokeWidth={2.4} />
              )}
            </div>

            {/* Title */}
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.01em'
              }}
            >
              {dialog.title}
            </h3>

            {/* Description */}
            <div
              style={{
                margin: '0 0 24px',
                fontSize: '0.88rem',
                color: '#64748B',
                lineHeight: 1.55,
                padding: '0 8px',
                whiteSpace: 'pre-line',
                textAlign: dialog.message?.includes('\n') ? 'left' : 'center'
              }}
            >
              {dialog.message}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: dialog.cancelText ? '1fr 1fr' : '1fr',
                gap: 12
              }}
            >
              {dialog.cancelText && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    height: 44,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    borderColor: '#CBD5E1',
                    color: '#475569',
                    background: '#FFFFFF'
                  }}
                  onClick={() => dialog.resolve(false)}
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                type="button"
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#FFFFFF',
                  background:
                    dialog.type === 'danger'
                      ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                      : dialog.type === 'warning'
                      ? 'linear-gradient(135deg, #D97706, #B45309)'
                      : dialog.type === 'success'
                      ? 'linear-gradient(135deg, #16A34A, #15803D)'
                      : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow:
                    dialog.type === 'danger'
                      ? '0 4px 14px rgba(220, 38, 38, 0.35)'
                      : dialog.type === 'warning'
                      ? '0 4px 14px rgba(217, 119, 6, 0.35)'
                      : '0 4px 14px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => dialog.resolve(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 99999999,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            borderRadius: 12,
            backgroundColor:
              toast.type === 'error'
                ? '#FEF2F2'
                : toast.type === 'warning'
                ? '#FFFBEB'
                : toast.type === 'success'
                ? '#F0FDF4'
                : '#EFF6FF',
            color:
              toast.type === 'error'
                ? '#991B1B'
                : toast.type === 'warning'
                ? '#92400E'
                : toast.type === 'success'
                ? '#166534'
                : '#1E40AF',
            border: `1.5px solid ${
              toast.type === 'error'
                ? '#FECACA'
                : toast.type === 'warning'
                ? '#FDE68A'
                : toast.type === 'success'
                ? '#BBF7D0'
                : '#BFDBFE'
            }`,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            fontWeight: 600,
            fontSize: '0.88rem',
            animation: 'modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {toast.type === 'error' && <AlertCircle size={20} color="#DC2626" />}
          {toast.type === 'warning' && <AlertTriangle size={20} color="#D97706" />}
          {toast.type === 'success' && <CheckCircle size={20} color="#16A34A" />}
          {toast.type === 'info' && <Info size={20} color="#2563EB" />}
          <span style={{ maxWidth: 360, wordBreak: 'break-word' }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 8,
              opacity: 0.7
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useDialog must be used within an AlertProvider');
  }
  return ctx;
}

