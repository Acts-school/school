const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set in env');
    process.exit(1);
  }
  const c = new Client({ connectionString: url });
  try {
    await c.connect();
    const tables = ['Admin','Teacher','Student','Parent'];
    for (const t of tables) {
      const r = await c.query(`SELECT COUNT(*)::int AS count FROM "${t}"`);
      console.log(`${t}: ${r.rows[0].count}`);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await c.end();
  }
})();
