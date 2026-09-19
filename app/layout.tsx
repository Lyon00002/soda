import type { Metadata, Viewport } from 'next';
import { Galada, Inter, Manrope } from 'next/font/google';
import './globals.css';

/* Self-hosted at build time by next/font, so there is no render-blocking
   round trip to Google and no layout shift when the display face lands. */
const galada = Galada({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-galada',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Soda | Pure Zero Refreshment',
  description:
    'Six colourways, zero sugar. An interactive 3D product experience for the Soda range.',
};

export const viewport: Viewport = {
  themeColor: '#011411',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${galada.variable} ${inter.variable} ${manrope.variable}`}
      // The inline script below adds a `js` class to this element before React
      // hydrates, so the client's className legitimately differs from the
      // server's and React 19 reports an attribute mismatch it will not patch.
      // This is the sanctioned escape hatch for exactly that pattern. It is
      // scoped to <html>'s own attributes, not the subtree, and the only other
      // attribute here is a static `lang`, so nothing real can hide behind it.
      suppressHydrationWarning
    >
      <head>
        {/* Marks the document as scripted BEFORE first paint.
            The server sends the hero fully composed, so without this the
            finished page paints, hydration then hides it for the entrance, and
            the opening reads as a flash followed by a replay. The class lets CSS
            pre-hide the entrance slots, and because it is only ever added by
            script, a browser without JS still renders everything visible. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
        {/* The can and the hero fruit are the largest contentful paint; the rest
            of the range is fetched lazily once the experience is interactive. */}
        <link
          rel="preload"
          as="fetch"
          href="/assets/models/soda-can.glb"
          type="model/gltf-binary"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="image"
          href="/assets/images/tex-green.jpg"
          type="image/jpeg"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
