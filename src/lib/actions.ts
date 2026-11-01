export const getSuggestions = async (chatHistory: [string, string][]) => {
  const chatModel = localStorage.getItem('chatModelKey');
  const chatModelProvider = localStorage.getItem('chatModelProviderId');

  const res = await fetch(`/api/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatHistory,
      chatModel: {
        providerId: chatModelProvider,
        key: chatModel,
      },
    }),
  });

  const data = (await res.json()) as { suggestions: string[] };

  return data.suggestions;
};

export const getApproxLocation = async (): Promise<{
  latitude: number;
  longitude: number;
  city: string;
} | null> => {
  try {
    const res = await fetch('/api/location', {
      method: 'GET',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude != null && data.longitude != null) {
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          city: data.city || '',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from /api/location:', err);
  }

  try {
    const res = await fetch('https://free.freeipapi.com/api/json', {
      method: 'GET',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude != null && data.longitude != null) {
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          city: data.cityName || '',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch approx location from freeipapi:', err);
  }

  return null;
};

