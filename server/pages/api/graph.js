import db from '../../data/db.json';

function generateAuthorsSVG(authors, apiSize = 40, apiColumns = 5) {
  // Ensure size and columns are valid numbers
  const size = parseInt(apiSize, 10); // Clamp between 20 and 200
  const columns = parseInt(apiColumns, 10); // Clamp between 1 and 10

  const padding = Math.ceil(size * 0.1); // Padding proportional to size
  const rows = Math.ceil(authors.length / columns);
  const width = (size + padding) * columns;
  const height = (size + padding) * rows;

  const authorElements = authors
    .map((author, index) => {
      const x = (index % columns) * (size + padding);
      const y = Math.floor(index / columns) * (size + padding);

      return `
      <defs>
        <clipPath id="circle-${author.id}">
          <circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" />
        </clipPath>
      </defs>
      <image
        href="${author.avatarUrl}"
        x="${x}"
        y="${y}"
        width="${size}"
        height="${size}"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#circle-${author.id})"
      />
    `;
    })
    .join('');

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"

    >
      ${authorElements}
    </svg>
  `;
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Get query parameters with default values
    const { size = 40, columns = 5 } = req.query;

    try {
      const svg = generateAuthorsSVG(
        db.authors.sort((a1, a2) => a2.commitsCount - a1.commitsCount),
        size,
        columns
      );

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(svg);
    } catch (error) {
      res.status(400).json({
        error: 'Invalid parameters',
        message: error.message,
      });
    }
  } else {
    res.status(405).end();
  }
}
