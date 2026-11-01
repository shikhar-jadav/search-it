import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const isPrivateIp = (ip: string) => {
  return (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fe80:')
  );
};

export const GET = async (req: NextRequest) => {
  const forwarded = req.headers.get('x-forwarded-for');
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : '';
  const clientIp = isPrivateIp(rawIp) ? '' : rawIp;

  // 1. Try free.freeipapi.com
  try {
    const freeIpUrl = clientIp
      ? `https://free.freeipapi.com/api/json/${clientIp}`
      : 'https://free.freeipapi.com/api/json';

    const res = await fetch(freeIpUrl, {
      method: 'GET',
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude != null && data.longitude != null) {
        return Response.json({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          city: data.cityName || '',
        });
      }
    }
  } catch (err) {
    console.warn('freeipapi lookup failed:', err);
  }

  // 2. Fallback to ip-api.com
  try {
    const ipApiUrl = clientIp
      ? `http://ip-api.com/json/${clientIp}`
      : 'http://ip-api.com/json/';

    const res = await fetch(ipApiUrl, {
      method: 'GET',
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && data.lat != null && data.lon != null) {
        return Response.json({
          latitude: Number(data.lat),
          longitude: Number(data.lon),
          city: data.city || '',
        });
      }
    }
  } catch (err) {
    console.warn('ip-api lookup failed:', err);
  }

  return Response.json({
    latitude: null,
    longitude: null,
    city: '',
  });
};
