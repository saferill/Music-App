import YTMusic from 'ytmusic-api';

async function test() {
  const res = await fetch('http://localhost:3000/api/ytplaylist?id=PLV9Y77TQ4I9dbaEOCCt_pdPavAXOXMkkN');
  const data = await res.json();
  console.log('Playlist:', data.name);
  console.log('Videos:', data.videos?.length);
  if (data.videos && data.videos.length > 0) {
    console.log('First video:', data.videos[0].name);
  }
}
test().catch(console.error);
