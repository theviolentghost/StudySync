import music from './music.js';

console.log('Music module loaded:', music);
music.spotify.get_recommondations().then(recommendations => {
    console.log('Recommendations:', recommendations);
});
while(true) {}