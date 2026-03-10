import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";
import type { VideoItem } from "./fetch-videos";

const INPUT_PATH = path.resolve(__dirname, "../data/new-videos.json");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY is not set in environment.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function groupByChannel(videos: VideoItem[]): Record<string, VideoItem[]> {
  return videos.reduce<Record<string, VideoItem[]>>((acc, video) => {
    if (!acc[video.channelName]) acc[video.channelName] = [];
    acc[video.channelName].push(video);
    return acc;
  }, {});
}

function buildPrompt(channelName: string, videos: VideoItem[]): string {
  const videoList = videos
    .map(
      (v) => `---
Title: ${v.title}
URL: ${v.url}
Published: ${v.publishedAt}
Description: ${v.description || "(no description)"}
---`
    )
    .join("\n");

  return `You are summarizing recent YouTube videos from the channel "${channelName}" for a reader who wants quick takeaways.

Important: Do not translate any content. Always respond in the same language as the video titles and descriptions.

For each video below, provide:
1. A 2-3 sentence summary
2. The main conclusion or key insight

${videoList}`;
}

async function summarizeChannel(channelName: string, videos: VideoItem[]): Promise<string> {
  const prompt = buildPrompt(channelName, videos);

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
  });

  return response.text ?? "(no response)";
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error("new-videos.json not found — run fetch-videos.ts first.");
    process.exit(1);
  }

  const videos: VideoItem[] = JSON.parse(fs.readFileSync(INPUT_PATH, "utf-8"));

  if (videos.length === 0) {
    console.log("No new videos to summarize.");
    return;
  }

  const grouped = groupByChannel(videos);
  const date = new Date().toISOString().slice(0, 10);
  const summariesDir = path.resolve(__dirname, "../summaries");
  fs.mkdirSync(summariesDir, { recursive: true });
  const outputPath = path.join(summariesDir, `${date}.md`);
  const lines: string[] = [];

  for (const [channelName, channelVideos] of Object.entries(grouped)) {
    const header = `\n## ${channelName}\n${channelVideos.length} new video(s)\n`;
    console.log(header);
    lines.push(header);

    try {
      const summary = await summarizeChannel(channelName, channelVideos);
      console.log(summary);
      lines.push(summary);
    } catch (err) {
      console.error(`[${channelName}] Failed to summarize:`, err);
    }
  }

  fs.writeFileSync(outputPath, lines.join("\n"));
  console.log(`\nSummary saved to summaries/${date}.md`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
