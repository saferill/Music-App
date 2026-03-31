import { searchInnerTube } from './lib/innertube';

async function test() {
  try {
    console.log('Testing InnerTube search...');
    const results = await searchInnerTube('Billie Eilish', 'song');
    console.log('Success!');
    console.log(JSON.stringify(results).substring(0, 500));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
