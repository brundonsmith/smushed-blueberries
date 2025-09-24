import type { Metadata } from "next";
import { Lora } from "next/font/google";
import { headers } from "next/headers";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const posterURL = proto + '://' + host + '/smushed_poster.jpeg'
  
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
          url: posterURL,
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
      images: [posterURL],
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
