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
  
  // If running in Capacitor (capacitor:// or http://localhost/ in Android)
  const isCapacitor = window.location.protocol === 'capacitor:' || 
                     (window.location.hostname === 'localhost' && window.location.port === '');
                     
  // Better yet, just check if we're on the hosted domain
  if (window.location.host === 'musicapp-lime.vercel.app') {
    return '';
  }
  
  // Default for native app
  return WEBSITE_URL;
};

export const API_BASE_URL = getApiBaseUrl();
