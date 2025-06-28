import { getPosterImageDataAndColors } from '../poster';
import UploadComponent from './UploadComponent';
import LinksEditor from './LinksEditor';

export default async function SmushThemBerries() {
  const { backgroundColor, textColor } = await getPosterImageDataAndColors();

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body {
            background-color: ${backgroundColor};
            color: ${textColor}
          }
        `
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '800px',
          width: '100%'
        }}>
          <h1 style={{
            margin: '0 0 40px 0',
            textAlign: 'center',
            fontSize: '3.5rem',
            fontWeight: 'bold'
          }}>
            Hi Meg! :)
          </h1>

          <UploadComponent />
          <LinksEditor />
        </div>
      </div>
    </>
  );
}