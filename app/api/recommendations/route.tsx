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
      model: "gpt-3.5-turbo",
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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
            Your job is to recommend give one artist name from each genre.
            Identify best artists names to recommend.
            Available genres are: ${validGenres.join(", ")}
        `,
        },
        {
          role: "user",
          content: `Give one artist name from each genre: ${validGenres.join(
            ", "
          )}`,
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

    const list = JSON.parse(genreArtist.choices[0].message.tool_calls![0].function.arguments).artists.slice(0,5);

    console.log(list);

    return NextResponse.json({ genres: validGenres, artists: genreArtist });
  } catch (e) {
    console.log(e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
