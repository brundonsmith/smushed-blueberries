import { list } from '@vercel/blob';
import sharp from 'sharp';

function getContrastingColor(rgb: [number, number, number]): string {
    const [r, g, b] = rgb;
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Return white for dark backgrounds, dark for light backgrounds
    return luminance > 0.5 ? '#2c2c2c' : '#f5f5f5';
}

function getComplementaryAccent(rgb: [number, number, number]): string {
    const [r, g, b] = rgb;
    // Create a subtle complementary color by shifting hue slightly
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0) {
        // Gray background - use a warm accent
        return 'rgba(180, 140, 100, 0.8)';
    }

    // Find dominant channel and create subtle complement
    let accentR = r, accentG = g, accentB = b;

    if (r === max) {
        // Red dominant - shift toward cyan
        accentR = Math.max(0, r - 30);
        accentG = Math.min(255, g + 20);
        accentB = Math.min(255, b + 20);
    } else if (g === max) {
        // Green dominant - shift toward magenta
        accentR = Math.min(255, r + 20);
        accentG = Math.max(0, g - 30);
        accentB = Math.min(255, b + 20);
    } else {
        // Blue dominant - shift toward yellow
        accentR = Math.min(255, r + 20);
        accentG = Math.min(255, g + 20);
        accentB = Math.max(0, b - 30);
    }

    return `rgba(${accentR}, ${accentG}, ${accentB}, 0.7)`;
}

async function extractEdgeColors(buffer: Buffer): Promise<[number, number, number]> {
    try {
        const image = sharp(buffer);
        const { width, height } = await image.metadata();

        if (!width || !height || width < 10 || height < 10) {
            return [255, 255, 255]; // Default white
        }


        // Get corners instead of full edges to avoid extraction issues
        const cornerSize = Math.floor(Math.min(10, Math.min(width, height) / 4));

        const corners = [
            // Top-left
            { left: 0, top: 0, width: cornerSize, height: cornerSize },
            // Top-right
            { left: Math.floor(width - cornerSize), top: 0, width: cornerSize, height: cornerSize },
            // Bottom-left
            { left: 0, top: Math.floor(height - cornerSize), width: cornerSize, height: cornerSize },
            // Bottom-right
            { left: Math.floor(width - cornerSize), top: Math.floor(height - cornerSize), width: cornerSize, height: cornerSize }
        ];

        let totalR = 0, totalG = 0, totalB = 0, totalPixels = 0;

        for (const corner of corners) {
            try {
                const cornerBuffer = await image
                    .extract(corner)
                    .raw()
                    .toBuffer();

                for (let i = 0; i < cornerBuffer.length; i += 3) {
                    totalR += cornerBuffer[i];
                    totalG += cornerBuffer[i + 1];
                    totalB += cornerBuffer[i + 2];
                    totalPixels++;
                }
            } catch (cornerError) {
                console.warn('Error extracting corner:', cornerError);
                continue;
            }
        }

        if (totalPixels === 0) {
            return [255, 255, 255]; // Default white
        }

        const avgR = Math.round(totalR / totalPixels);
        const avgG = Math.round(totalG / totalPixels);
        const avgB = Math.round(totalB / totalPixels);

        return [avgR, avgG, avgB];
    } catch (error) {
        console.error('Error extracting edge colors:', error);
        return [255, 255, 255]; // Default white
    }
}

export async function getPosterUrl(): Promise<string> {
    const { blobs } = await list({ prefix: 'smushed_poster.png' });
    return blobs[0]!.url;
}

export async function getPosterImageDataAndColors(): Promise<{ dataUri: string; backgroundColor: string; textColor: string; accentColor: string }> {
    const { blobs } = await list({ prefix: 'smushed_poster.png' });
    const response = await fetch(blobs[0]!.url);

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';

    // Extract colors from the image
    const backgroundColor = await extractEdgeColors(imageBuffer);
    const textColor = getContrastingColor(backgroundColor);
    const accentColor = getComplementaryAccent(backgroundColor);

    // Cache the colors (but not the data URI since it's large)
    const colorData = {
        backgroundColor: `rgb(${backgroundColor.join(', ')})`,
        textColor,
        accentColor
    };

    // Color caching disabled

    // Convert to data URI
    const dataUri = `data:${contentType};base64,${imageBuffer.toString('base64')}`;

    return {
        dataUri,
        ...colorData
    };
}
