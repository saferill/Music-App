import YTMusic from 'ytmusic-api';

async function test() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  const artist = await ytmusic.getArtist('UCqECaJ8Gagnn7YCbPEzWH6g'); // Taylor Swift
  console.log('Top songs length:', artist.topSongs.length);
  console.log('Top songs:', artist.topSongs.map(s => s.name));
}

test();
