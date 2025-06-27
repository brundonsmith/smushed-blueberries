import Image from "next/image";

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '100%'
      }}>
        <h1 style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Smushed Blueberries</h1>
        <h2 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>...stories, poems, and other juice</h2>
        <Image
          src="/smushed_poster.png"
          alt="Smushed Blueberries Poster"
          width={800}
          height={1200}
          style={{
            maxHeight: 'calc(100vh - 140px)',
            maxWidth: '100%',
            width: 'auto',
            height: 'auto'
          }}
          priority
        />
      </div>
    </div>
  );
}
