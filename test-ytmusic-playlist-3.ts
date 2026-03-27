import YTMusic from 'ytmusic-api';

async function test() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  try {
    const playlist = await ytmusic.getPlaylist('RDCLAK5uy_lH2Z4p93zE1jQ1NnQ-43J3O1v_XjK-858');
    console.log('Playlist:', playlist.name);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
