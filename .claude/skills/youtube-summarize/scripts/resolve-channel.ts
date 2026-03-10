import * as fs from "fs";
import * as path from "path";
import type { YouTubeChannelListResponse } from "./types";

interface Channel {
  name: string;
  channelLink: string;
  handle: string;
  channelId?: string;
  uploadsPlaylistId?: string;
  lastFetchTime: string;
}

const CONFIG_PATH = path.resolve(__dirname, "../data/youtube-channels.json");
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.error("Error: YOUTUBE_API_KEY is not set in environment.");
  process.exit(1);
}

async function resolveChannel(channel: Channel): Promise<Channel> {
  if (channel.channelId && channel.uploadsPlaylistId) {
    console.log(`[${channel.name}] Already resolved, skipping.`);
    return channel;
  }

  console.log(`[${channel.name}] Resolving handle @${channel.handle}...`);

  const url = `https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle=${channel.handle}&key=${API_KEY}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.warn(`[${channel.name}] API request failed: ${res.status} ${res.statusText}`);
    return channel;
  }

  const data: YouTubeChannelListResponse = await res.json();

  if (!data.items || data.items.length === 0) {
    console.warn(`[${channel.name}] Could not resolve handle @${channel.handle}. Skipping.`);
    return channel;
  }

  const item = data.items[0];
  const channelId = item.id;
  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists.uploads;

  if (!uploadsPlaylistId) {
    console.warn(`[${channel.name}] uploads playlist not found in response. Skipping.`);
    return channel;
  }

  console.log(`[${channel.name}] Resolved: channelId=${channelId}, uploadsPlaylistId=${uploadsPlaylistId}`);

  return { ...channel, channelId, uploadsPlaylistId };
}

async function main() {
  const channels: Channel[] = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

  const updated = await Promise.all(channels.map(resolveChannel));

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  console.log("Done. youtube-channels.json updated.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
