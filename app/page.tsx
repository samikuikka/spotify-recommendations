"use client";

import { Input } from "@/components/ui/input";

export default function Home() {

  async function onSubmit() {
    console.log('clicked')
    const res = await fetch("/api/recommendations", {
      method: "POST",
    });
    const data = await res.json();
    console.log(data);
  }

  return (
    <main className="flex min-h-screen bg-gray-300  flex-col items-center justify-between p-24">
      <div className=" max-w-[300px] w-full">
        <div>Get recommendations</div>
        <Input
          placeholder="Create a prompt for your new playlist"
          className=""
        />
        <button
          onClick={() => onSubmit()}
          className="bg-blue-500 text-white p-2 rounded-md mt-4"
        >Submit</button>
      </div>
    </main>
  );
}
