import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    return res.status(200).json(result.rows);
  }

  const { action, name, mobile, id, isReset } = req.body;

  try {
    if (action === 'add') {
      // Generate ID: RK + 4 random digits
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const custId = `RK${randomId}`;
      
      await pool.query('INSERT INTO customers (name, mobile, customer_id) VALUES ($1, $2, $3)', [name, mobile, custId]);
      return res.status(200).json({ customerId: custId });
    }

    if (action === 'stamp') {
      if (isReset) {
        await pool.query('UPDATE customers SET stamps = 0 WHERE customer_id = $1', [id]);
      } else {
        await pool.query('UPDATE customers SET stamps = stamps + 1 WHERE customer_id = $1', [id]);
      }
      return res.status(200).json({ message: 'Updated' });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
