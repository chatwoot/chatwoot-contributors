import db from '../../data/db.json';

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json(db.authors);
  } else {
    res.status(404);
  }
}
