import React from 'react';

export default function ExploreProject({ open, onClose }) {
  if (!open) return null;

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  };

  const modalStyle = {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    width: 'min(920px, 92vw)',
    maxHeight: '86vh',
    overflowY: 'auto',
    padding: '24px'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  };

  const titleStyle = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: 0
  };

  const closeBtnStyle = {
    background: 'transparent',
    border: 'none',
    fontSize: '22px',
    lineHeight: 1,
    cursor: 'pointer',
    color: '#6b7280'
  };

  const sectionStyle = { marginTop: '16px' };
  const sectionTitle = { fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' };
  const sectionBody = { color: '#4b5563', fontSize: '14px', margin: 0 };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Explore Project</h2>
          <button aria-label="Close" onClick={onClose} style={closeBtnStyle}>×</button>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Background of the Study</h3>
          <p style={sectionBody}>Placeholder content. </p>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Related Review of Literature (RRL)</h3>
          <p style={sectionBody}>Placeholder content.</p>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Objectives</h3>
          <p style={sectionBody}>Placeholder content.</p>
        </div>
      </div>
    </div>
  );
}
