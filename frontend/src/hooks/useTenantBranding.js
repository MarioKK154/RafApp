import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const baseUrl = () => (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');

// Fallback when tenant has no backgrounds configured
const DEFAULT_BACKGROUNDS = [
  '/branding/default-bg-1.jpg',
  '/branding/default-bg-2.jpg',
  '/branding/default-bg-3.jpg',
];

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function useTenantBranding() {
  const { user } = useAuth();
  const location = useLocation();

  const { background } = useMemo(() => {
    const tenant = user?.tenant;
    let images = [];
    if (tenant?.background_image_urls?.length) {
      images = tenant.background_image_urls.map((path) =>
        path.startsWith('http') ? path : `${baseUrl()}${path}`
      );
    }
    if (!images.length) images = DEFAULT_BACKGROUNDS;

    const hash = hashString(location.pathname + (user?.tenant_id ?? ''));
    const index = Math.abs(hash) % images.length;
    return { background: images[index] };
  }, [user, location.pathname]);

  return { background };
}

