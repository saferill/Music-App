import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();

async function test() {
  await ytmusic.initialize();
  const playlist = await ytmusic.getPlaylist('RDCLAK5uy_lJeZqEKiNQfxqttQvrx_iZLY2JUPqLVm4');
  console.log(JSON.stringify(playlist, null, 2));
}

test().catch(console.error);
