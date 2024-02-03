"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import Track from "@/components/track";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [tracks, setTracks] = useState([] as any[]);

  async function onSubmit() {
    const res = await fetch("/api/recommendations", {
      method: "POST",
      body: JSON.stringify({ prompt: prompt }),
    });
    const data = await res.json();
    console.log(data.tracks);
    setTracks(data.tracks);
  }

  return (
    <main className="flex  min-h-screen bg-gray-300  flex-col items-center justify-between p-12">
      <div className="w-full gap-4 flex flex-col items-center">
        <div className="w-[500px] flex flex-col gap-4">
          <div>Get recommendations</div>
          <Input
            placeholder="Create a prompt for your new playlist"
            className=""
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="w-full flex justify-end items-end">
            <Button disabled={!prompt} onClick={() => onSubmit()}>
              Submit
            </Button>
          </div>
        </div>

        <div className="grid pt-10 grid-cols-3 gap-4">
          {tracks.map((track, i) => {
            return (
              <Track
                key={i}
                title={track.name}
                previewUrl={track.album.images[0].url}
                artist={track.artists[0].name}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
