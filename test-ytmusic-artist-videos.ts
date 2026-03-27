import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();

async function test() {
  await ytmusic.initialize();
  const artist = await ytmusic.getArtist('UCQgUHOPJJrmzCjExg-ISupA');
  console.log(JSON.stringify(artist.topVideos, null, 2));
}

test().catch(console.error);
