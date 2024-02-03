import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-gray-300  flex-col items-center justify-between p-24">
      <div className=" max-w-[300px] w-full">
        <div>Get recommendations</div>
        <Input
          placeholder="Create a prompt for your new playlist"
          className=""
        />
      </div>
    </main>
  );
}
