import db from '../../data/db.json';

const MAX_AUTHORS = 5000;
const MIN_SIZE = 20;
const MAX_SIZE = 200;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 100;

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    // Return a default avatar image in base64 format
    return '/default-avatar.png';
  }
}

function encodeXMLAttribute(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
}

async function generateAuthorsSVG(authors, apiSize = 40, apiColumns = 5) {
  // Validate and bound input parameters
  const size = Math.min(
    Math.max(parseInt(apiSize, 10) || 40, MIN_SIZE),
    MAX_SIZE
  );
  const columns = Math.min(
    Math.max(parseInt(apiColumns, 10) || 5, MIN_COLUMNS),
    MAX_COLUMNS
  );

  const padding = Math.ceil(size * 0.1);
  const rows = Math.ceil(authors.length / columns);
  const width = (size + padding) * columns;
  const height = (size + padding) * rows;

  // Convert all valid image URLs to base64
  const authorPromises = authors.map(async (author, index) => {
    const x = (index % columns) * (size + padding);
    const y = Math.floor(index / columns) * (size + padding);
    const safeId = encodeXMLAttribute(author.login);
    const safeUsername = encodeXMLAttribute(author.username || safeId);

    let imageData;
    if (isValidImageUrl(author.avatarUrl)) {
      imageData = await fetchImageAsBase64(author.avatarUrl);
    } else {
      imageData = '/default-avatar.png';
    }

    const safeImageData = encodeXMLAttribute(imageData);

    return `
    <a xmlns="http://www.w3.org/2000/svg"
       xmlns:xlink="http://www.w3.org/1999/xlink"
       xlink:href="https://github.com/${safeUsername}"
       class="opencollective-svg"
       target="_blank"
       rel="nofollow sponsored"
       id="${safeId}">
      <image x="${x}"
             y="${y}"
             width="${size}"
             height="${size}"
             xlink:href="${safeImageData}"/>
    </a>`;
  });

  const authorElements = await Promise.all(authorPromises);

  return `
    <svg xmlns="http://www.w3.org/2000/svg"
         xmlns:xlink="http://www.w3.org/1999/xlink"
         width="${width}"
         height="${height}"
         viewBox="0 0 ${width} ${height}">
      ${authorElements.join('')}
    </svg>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  try {
    // Validate authors data
    if (!Array.isArray(db.authors)) {
      throw new Error('Invalid authors data structure');
    }

    // Get and validate query parameters
    const { size, columns } = req.query;

    // Generate SVG with bounded author list
    const authors = db.authors
      .sort((a1, a2) => a2.commitsCount - a1.commitsCount)
      .slice(0, MAX_AUTHORS);

    const svg = await generateAuthorsSVG(authors, size, columns);

    // Set security headers
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('CDN-Cache-Control', 'max-age=86400');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=86400');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self' data:;"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.status(200).send(svg);
  } catch (error) {
    console.error('SVG generation error:', error);
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Unable to generate SVG',
    });
  }
}
