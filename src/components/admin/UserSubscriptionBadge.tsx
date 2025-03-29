
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface UserSubscriptionBadgeProps {
  status: string;
}

const UserSubscriptionBadge: React.FC<UserSubscriptionBadgeProps> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
          Active
        </Badge>
      );
    case 'trialing':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Trialing
        </Badge>
      );
    case 'canceled':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Canceled
        </Badge>
      );
    case 'incomplete':
    case 'incomplete_expired':
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
          Incomplete
        </Badge>
      );
    case 'past_due':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Past Due
        </Badge>
      );
    case 'unpaid':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Unpaid
        </Badge>
      );
    case 'none':
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-200">
          None
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status || 'Unknown'}
        </Badge>
      );
  }
};

export default UserSubscriptionBadge;
