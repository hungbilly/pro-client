
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'sent':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100 border border-blue-200 dark:border-blue-800/50';
    case 'completed':
    case 'accepted':
    case 'paid':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100 border border-green-200 dark:border-green-800/50';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100 border border-red-200 dark:border-red-800/50';
    case 'draft':
      return 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100 border border-amber-200 dark:border-amber-800/30';
    case 'pending':
      return 'bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-100 border border-purple-200 dark:border-purple-800/30';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700';
  }
};
