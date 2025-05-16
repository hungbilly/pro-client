
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/components/dashboard/StatusUtils';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <Badge className={getStatusColor(status)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default StatusBadge;
