/**
 * Dashboard Presence Indicator UI Component (T05)
 *
 * Displays live presence of reviewers currently online,
 * showing name, role, current feature, and time online.
 */

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface PresenceRecord {
  connectionId: string;
  userId?: string;
  role?: string;
  currentFeature?: string;
  connectedAt: number;
  lastActivityAt: number;
  authenticated: boolean;
}

export function ReviewerPresence() {
  const [presence, setPresence] = useState<PresenceRecord[]>([]);
  const { onMessage } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'presence-update') {
        updatePresenceList(message);
      }
    },
  });

  const updatePresenceList = (update: any) => {
    setPresence((prev) => {
      const existing = prev.findIndex((p) => p.connectionId === update.connectionId);

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          userId: update.userId,
          role: update.role,
          currentFeature: update.currentFeature,
          lastActivityAt: update.timestamp || Date.now(),
        };
        return updated;
      }

      return [...prev, { ...update, connectedAt: Date.now() }];
    });
  };

  const getStatusBadge = (record: PresenceRecord) => {
    const idleTime = Date.now() - record.lastActivityAt;
    const idleMinutes = idleTime / 60000;

    if (idleMinutes < 1) {
      return { status: 'online', color: '#4caf50' };
    } else if (idleMinutes < 5) {
      return { status: 'idle', color: '#ff9800' };
    } else {
      return { status: 'offline', color: '#9e9e9e' };
    }
  };

  const formatTimeOnline = (startTime: number) => {
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '<1m';
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>👥 Active Reviewers</h3>

      {presence.length === 0 ? (
        <p style={styles.empty}>No reviewers online</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.headerCell}>Name</th>
              <th style={styles.headerCell}>Role</th>
              <th style={styles.headerCell}>Current Focus</th>
              <th style={styles.headerCell}>Online For</th>
            </tr>
          </thead>
          <tbody>
            {presence.map((record) => {
              const badge = getStatusBadge(record);
              return (
                <tr key={record.connectionId} style={styles.row}>
                  <td style={styles.cell}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: badge.color,
                      }}
                    />
                    {record.userId || 'Unknown'}
                  </td>
                  <td style={styles.cell}>{record.role || 'user'}</td>
                  <td style={styles.cell}>{record.currentFeature || '-'}</td>
                  <td style={styles.cell}>{formatTimeOnline(record.connectedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
    marginBottom: '16px',
  } as React.CSSProperties,
  title: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  } as React.CSSProperties,
  empty: {
    color: '#999',
    fontSize: '12px',
    margin: '8px 0',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  } as React.CSSProperties,
  headerRow: {
    backgroundColor: '#e0e0e0',
  } as React.CSSProperties,
  headerCell: {
    padding: '8px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '1px solid #ccc',
  } as React.CSSProperties,
  row: {
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,
  cell: {
    padding: '8px',
    color: '#333',
  } as React.CSSProperties,
  statusBadge: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
  } as React.CSSProperties,
};
