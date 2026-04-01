/**
 * Global configuration to handle API Base URL routing.
 * In a Capacitor Android app, relative URLs (/api/...) don't work.
 * We must point to the absolute URL of the hosted website.
 */

// Your Vercel URL
export const WEBSITE_URL = 'https://musicapp-lime.vercel.app';

// Determine the base URL based on environment
// For Capacitor, this would typically be the absolute URL
// For Web/Development, we use relative / for local and WEBSITE_URL for cloud
export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  
  // If running in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }
  
  // If running in Capacitor (capacitor://)
  const isCapacitor = window.location.protocol === 'capacitor:';
  if (isCapacitor) return WEBSITE_URL;

  // Default for web (relative)
  return '';
};
