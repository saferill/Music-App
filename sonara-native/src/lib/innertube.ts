const INNERTUBE_BASE_URL = 'https://music.youtube.com/youtubei/v1';

// Constants for client spoofing (identical to the original web version)
export const CLIENTS = {
  IOS: {
    name: 'IOS',
    version: '17.33.2',
    clientName: 5,
    userAgent: 'com.google.ios.youtubemusic/17.33.2 (iPhone16,2; U; CPU iOS 17_0 like Mac OS X; en_US)',
  },
  ANDROID: {
    name: 'ANDROID',
    version: '6.45.54',
    clientName: 21,
    userAgent: 'com.google.android.apps.youtube.music/6.45.54 (Linux; U; Android 14; en_US; Pixel 8 Pro; Build/UQ1A.240205.004) gzip',
  },
  TV: {
    name: 'TV_HTML5',
    version: '2.20230622.06.00',
    clientName: 4,
    userAgent: 'Mozilla/5.0 (WebOS; SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Safari/537.36 YouTubeTV/1.0',
  },
  WEB: {
    name: 'WEB_REMIX',
    version: '1.20240430.01.00',
    clientName: 67,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
};

type Context = {
  client: {
    clientName: string;
    clientVersion: string;
    userAgent: string;
    hl: string;
    gl: string;
    utcOffsetMinutes: number;
  };
};

function createContext(client: typeof CLIENTS.IOS): Context {
  return {
    client: {
      clientName: client.name,
      clientVersion: client.version,
      userAgent: client.userAgent,
      hl: 'en',
      gl: 'US',
      utcOffsetMinutes: 0,
    },
  };
}

export async function fetchFromInnerTube(endpoint: string, body: Record<string, any>, client = CLIENTS.IOS) {
  const url = `${INNERTUBE_BASE_URL}/${endpoint}?prettyPrint=false`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': client.userAgent,
      'X-YouTube-Client-Name': String(client.clientName),
      'X-YouTube-Client-Version': client.version,
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    body: JSON.stringify({
      context: createContext(client),
      ...body,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`InnerTube Error (${endpoint}): ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get player data (including streaming URLs)
 */
export async function getPlayerData(videoId: string) {
  try {
    return await fetchFromInnerTube('player', {
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          signatureTimestamp: 19800,
        },
      },
    }, CLIENTS.IOS);
  } catch (e) {
    return await fetchFromInnerTube('player', {
      videoId,
    }, CLIENTS.ANDROID);
  }
}

/**
 * Search InnerTube
 */
export async function searchInnerTube(query: string) {
  return await fetchFromInnerTube('search', { query }, CLIENTS.WEB);
}
