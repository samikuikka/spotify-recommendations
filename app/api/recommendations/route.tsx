import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/index.mjs";
import { z } from "zod";

import genresList from "@/lib/genres.json";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

export async function POST() {
  try {
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
        content: "User prompt: I want to listen to something relaxing.",
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

    const res = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const genres = JSON.parse(
      res.choices[0].message.tool_calls![0].function.arguments
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

    console.log(validGenres);
    return NextResponse.json(res);
  } catch (e) {
    console.log(e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
