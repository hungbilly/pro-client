
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'sent':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'completed':
    case 'accepted':
    case 'paid':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'draft':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
