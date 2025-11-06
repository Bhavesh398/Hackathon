import { toast } from './silent-toast';

export function handleError(error: unknown) {
  // Only log errors to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
  }
  // Don't show any error messages to the user
  return null;
}