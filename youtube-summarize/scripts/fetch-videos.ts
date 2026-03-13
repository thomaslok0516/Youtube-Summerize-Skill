import * as fs from "fs";
import * as path from "path";
import type { YouTubePlaylistItem, YouTubePlaylistItemListResponse } from "./types";

interface Channel {
  name: string;
  channelLink: string;
  handle: string;
  channelId?: string;
  uploadsPlaylistId?: string;
  lastFetchTime: string;
}

export interface VideoItem {
  channelName: string;
  title: string;
  videoId: string;
  url: string;
  publishedAt: string;
  description: string;
}

const CONFIG_PATH = path.resolve(__dirname, "../data/youtube-channels.json");
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.error("Error: YOUTUBE_API_KEY is not set in environment.");
  process.exit(1);
}

async function fetchAllVideos(playlistId: string): Promise<YouTubePlaylistItem[]> {
  const items: YouTubePlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,status",
      maxResults: "50",
      playlistId,
      key: API_KEY!,
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);

    if (!res.ok) {
      console.warn(`playlistItems request failed: ${res.status} ${res.statusText}`);
      break;
    }

    const data: YouTubePlaylistItemListResponse = await res.json();
    items.push(...data.items);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

function filterNewVideos(items: YouTubePlaylistItem[], lastFetchTime: string): YouTubePlaylistItem[] {
  const cutoff = new Date(lastFetchTime).getTime();
  return items.filter((item) => {
    const publishedAt = item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt;
    if (!publishedAt) return false;
    return new Date(publishedAt).getTime() > cutoff;
  });
}

async function main() {
  const channels: Channel[] = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

  const results: VideoItem[] = [];

  for (const channel of channels) {
    if (!channel.uploadsPlaylistId) {
      console.warn(`[${channel.name}] Missing uploadsPlaylistId — run resolve-channel.ts first.`);
      continue;
    }

    console.log(`[${channel.name}] Fetching videos from playlist ${channel.uploadsPlaylistId}...`);
    const allVideos = await fetchAllVideos(channel.uploadsPlaylistId);
    const newVideos = filterNewVideos(allVideos, channel.lastFetchTime);

    console.log(`[${channel.name}] ${newVideos.length} new video(s) since ${channel.lastFetchTime}`);

    for (const item of newVideos) {
      const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId.videoId ?? "";
      results.push({
        channelName: channel.name,
        title: item.snippet?.title ?? "(no title)",
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? "",
        description: item.snippet?.description ?? "",
      });
    }
  }

  const outputPath = path.resolve(__dirname, "../data/new-videos.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Done. ${results.length} new video(s) written to new-videos.json`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
