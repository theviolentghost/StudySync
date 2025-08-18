
import 'dotenv/config';

import { Innertube } from 'youtubei.js';

const yt = await Innertube.create();

console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(yt)));
  

async function getPlaylistVideos(playlistId, nextPageToken){
  let playlistData;
  let results;
  let newNextPageToken;
  if(!nextPageToken){
    playlistData = await yt.actions.execute('/browse', {
      browseId: 'VL' + playlistId
    });
    results = playlistData.data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
    newNextPageToken = results.at(-1).continuationItemRenderer?.continuationEndpoint.commandExecutorCommand.commands[1].continuationCommand.token || '';
  }else{
    playlistData = await yt.actions.execute('/browse', {
      continuation: nextPageToken
    });
    results = playlistData.data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
    newNextPageToken = results.at(-1).continuationItemRenderer?.continuationEndpoint.continuationCommand.token || '';
  }

  let videos = [];

  for(let video = 0; video < results.length; video++){
    try{
      let videoObject = {
        id: results[video].playlistVideoRenderer.videoId,
        channelId: results[video].playlistVideoRenderer.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
        uploadDate: results[video].playlistVideoRenderer.videoInfo.runs[2].text,
        title: results[video].playlistVideoRenderer.title.runs[0].text,
        description: '',
        viewCount: results[video].playlistVideoRenderer.videoInfo.runs[0].text,
        videoThumbnailUrl: results[video].playlistVideoRenderer.thumbnail.thumbnails[results[video].playlistVideoRenderer.thumbnail.thumbnails.length -1].url,
        duration: results[video].playlistVideoRenderer.lengthText?.simpleText || null,

      };
      videos.push(videoObject);
    }catch(err){
      continue;
    }
  }

  return {results: videos, nextPageToken: newNextPageToken};
}

export default{
  getPlaylistVideos: getPlaylistVideos,
}

