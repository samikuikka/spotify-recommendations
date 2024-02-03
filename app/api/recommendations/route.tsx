import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/index.mjs";
import { z } from "zod";

import genresList from "@/lib/genres.json";
import { list } from "postcss";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

export async function POST(req: Request, res: Response) {
  try {
    const { prompt } = await req.json();
    const promptSchema = z.string().nonempty();
    const promptResult = promptSchema.safeParse(prompt);
    if (!promptResult.success) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `
            Your job is to tchoose 3-5 genres from the following genre list after user input. 
            Analyze the user prompt and identify best genres to recommend.
            Available genres are: ${genresList.join(", ")}
        `,
      },
      {
        role: "user",
        content: `User prompt: ${prompt}`,
      },
    ];
    const tools: ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "list_of_genres",
          description:
            "Retrrieves 3-5 genres from the genre list based on the user's input",
          parameters: {
            type: "object",
            properties: {
              genres: {
                type: "array",
                items: {
                  type: "string",
                  description: "The genre from the genre list",
                },
                minItems: 3,
                maxItems: 5,
              },
            },
          },
        },
      },
    ];

    const chatRes = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const genres = JSON.parse(
      chatRes.choices[0].message.tool_calls![0].function.arguments
    ).genres;
    const genreSchema = z.array(z.string()).refine((val) => {
      return val.every((genre) => genresList.includes(genre));
    });

    const genreResult = genreSchema.safeParse(genres);
    if (!genreResult.success) {
      return new NextResponse("Invalid genres", { status: 400 });
    }

    // Genres are valid
    const validGenres = genreResult.data;

    // Now i want to get artists from theses different genres that have been provided as a list, use gpt again to get artists from the different genres. Make so that it is in a list format at the end. Take insporation from the soution above.

    const genreArtist = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [
        {
          role: "system",
          content: `
            You are given list of genres. From each genre give 1 popular artist name! GIVE ONLY ARTIST NAME NOT THE GENRE!.
            Genres: ${validGenres.join(", ")}
        `,
        },
        {
          role: "user",
          content: `List of artists:`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "list_of_artists",
            description:
              "Retrrieves 3-5 artists from the genre list based on the user's input",
            parameters: {
              type: "object",
              properties: {
                artists: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "The artist name",
                  },
                  minItems: 3,
                  maxItems: 5,
                },
              },
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    const artistNames = JSON.parse(
      genreArtist.choices[0].message.tool_calls![0].function.arguments
    ).artists.slice(0, 5) as string[];

    const spotifyToken = await fetch(
      `https://accounts.spotify.com/api/token?grant_type=client_credentials&client_id=${process.env.SPOTIFY_CLIENT_ID}&client_secret=${process.env.SPOTIFY_CLIENT_SECRET}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const data = await spotifyToken.json(); // Converts the response body to JSON
    const tokenSchema = z.object({
      access_token: z.string(),
      token_type: z.string(),
      expires_in: z.number(),
    });
    const tokenResult = tokenSchema.safeParse(data);
    if (!tokenResult.success) {
      return new NextResponse("Invalid Spotify token", { status: 500 });
    }
    const token = `Bearer ${tokenResult.data.access_token}`;

    const artistIds = await Promise.all(
      artistNames.map(async (artist) => {
        const artistRes = await fetch(
          `https://api.spotify.com/v1/search?q=${artist}&type=artist&limit=1`,
          {
            headers: {
              Authorization: token,
            },
          }
        );
        const artistData = await artistRes.json();
        return artistData.artists.items[0].id;
      })
    );

    const topTracks = await Promise.all(
      artistIds.map(async (id) => {
        const topTracksRes = await fetch(
          `https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`,
          {
            headers: {
              Authorization: token,
            },
          }
        );
        const topTracksData = await topTracksRes.json();
        let mostPopularTrack = topTracksData.tracks[0];
        return mostPopularTrack.id;
      })
    );

    const recommendationRes = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_genres=${validGenres.join(
        ","
      )}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const recommendationData = await recommendationRes.json();

    return NextResponse.json(recommendationData);
  } catch (e) {
    console.log(e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
