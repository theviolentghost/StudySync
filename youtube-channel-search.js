
import 'dotenv/config';

import { Innertube } from 'youtubei.js';

const yt = await Innertube.create();

async function getFullChannelDetails(channelId){
  const channelData = await yt.getChannel(channelId);
  return {
    channelId: channelId,
    uploadsId: 'UU' + channelId.substring(2),
    name: channelData.header.page_title,
    tag: channelData.current_tab.endpoint.payload.canonicalBaseUrl.substring(1),
    description: channelData.metadata.description,
    iconUrl: channelData.header.content.image.avatar.image[0].url,
    bannerUrl: channelData.header.content.banner.image[0].url,
  };
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