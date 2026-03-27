import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();

async function test() {
  await ytmusic.initialize();
  try {
    const playlist = await ytmusic.getPlaylist('UCm3-mvahIVK_4LckN38p7eQ');
    console.log(JSON.stringify(playlist, null, 2));
  } catch (e: any) {
    console.error(e.message);
  }
}

test().catch(console.error);
