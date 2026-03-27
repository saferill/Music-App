import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();

async function test() {
  await ytmusic.initialize();
  try {
    const playlist = await ytmusic.getPlaylist('PL4fGSI1pI0s_oT4w-0Q8l8Pz4282_v_k2');
    console.log(Object.keys(playlist));
    if ((playlist as any).videos) console.log('has videos');
    if ((playlist as any).songs) console.log('has songs');
  } catch (e: any) {
    console.error(e.message);
  }
}

test().catch(console.error);
