import type { Metadata } from "next";
import { Lora } from "next/font/google";
import { getPosterUrl } from "./poster";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const posterUrl = await getPosterUrl();
  
  return {
    title: "Smushed Blueberries",
    description: "Stories, poems, and other juice - a creative writing community",
    icons: {
      icon: { url: '/icon.svg', type: 'image/svg+xml' }
    },
    openGraph: {
      title: "Smushed Blueberries",
      description: "Stories, poems, and other juice - a creative writing community",
      images: [
        {
          url: posterUrl,
          width: 800,
          height: 1200,
          alt: "Smushed Blueberries Poster"
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: "Smushed Blueberries",
      description: "Stories, poems, and other juice - a creative writing community",
      images: [posterUrl],
    }
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={lora.className} style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
