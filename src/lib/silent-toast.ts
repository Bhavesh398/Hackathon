import { toast as originalToast } from '@/hooks/use-toast';

// Wrapper around toast that silently handles errors
export const toast = (options: any) => {
  // Only show non-error toasts
  if (!options.variant || options.variant !== 'destructive') {
    return originalToast(options);
  }
  
  // Log errors to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Silently handled error:', options.description);
  }
  return null;
};