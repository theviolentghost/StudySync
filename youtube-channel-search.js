import { google } from 'googleapis';
import 'dotenv/config';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

async function getFullChannelDetails(channelId) {
  try {
    const response = await youtube.channels.list({
      part: 'snippet,contentDetails,statistics,brandingSettings',
      id: channelId,
    });

    if (!response || response.data.items.length === 0) {
      console.log('Channel not found.');
      return null;
    }

    const channel = response.data.items[0];

    return channel;
  } catch (error) {
    console.error('Error fetching channel details:', error);
  }
}

async function getFullChannel(id){
    if (!id || id.trim() === '') {
        console.error('id must be a non-empty string');
        return null;
    }

    try {
        return await getFullChannelDetails(id);
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return null;
    }
}

export default{
    getFullChannel: getFullChannel,
};