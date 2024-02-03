/**
 * v0 by Vercel.
 * @see https://v0.dev/t/VJx5P4UatnC
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import {
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent,
  Card,
} from "@/components/ui/card";
import Image from "next/image";

export default function Component({ title, previewUrl, artist }) {
  return (
    <Card className="max-w-[300px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{artist}</CardDescription>
      </CardHeader>
      <CardContent>
        <Image
          alt=""
          height={300}
          src={`${previewUrl}`}
          width={300}
          className="aspect-square overflow-hidden rounded-lg object-cover"
        />
      </CardContent>
    </Card>
  );
}
