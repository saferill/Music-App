import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();

async function test() {
  await ytmusic.initialize();
  const album = await ytmusic.getAlbum('MPREb_4jnVJ5IIw9h');
  console.log(JSON.stringify(album, null, 2));
}

test().catch(console.error);
