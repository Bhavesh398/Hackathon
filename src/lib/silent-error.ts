export function silentError(error: unknown) {
  // Only log errors to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Silently handled error:', error);
  }
  // Don't show any error messages to the user
  return null;
}