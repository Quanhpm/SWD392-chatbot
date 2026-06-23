import React from 'react';
import { Badge } from '../shared/Badge.js';
import { Icon } from '../shared/Icon.js';
import type { DocumentStatus as StatusType } from '../../types/index.js';

interface DocumentStatusProps {
  status: StatusType;
}

export const DocumentStatus: React.FC<DocumentStatusProps> = ({ status }) => {
  switch (status) {
    case 'uploaded':
      return (
        <Badge variant="default">
          <Icon name="cloud_done" style={{ fontSize: '14px' }} />
          <span>Uploaded</span>
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="warning">
          <Icon name="sync" className="animate-spin" style={{ fontSize: '14px' }} />
          <span>Processing</span>
          <style>{`
            .animate-spin { animation: spin 1.5s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </Badge>
      );
    case 'ready':
      return (
        <Badge variant="success">
          <Icon name="check_circle" style={{ fontSize: '14px' }} />
          <span>Ready</span>
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="error">
          <Icon name="error" style={{ fontSize: '14px' }} />
          <span>Failed</span>
        </Badge>
      );
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};
