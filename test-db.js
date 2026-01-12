const { Client } = require('pg');

async function testDatabaseConnection() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_mDFVMJ9cP1EB@ep-round-mouse-ad2cwoxt-pooler.c-2.us-east-1.aws.neon.tech/maktab?sslmode=require&channel_binding=require"
  });

  try {
    console.log('Database ga ulanishga urinmoqda...');
    await client.connect();
    console.log('✅ Database ga muvaffaqiyatli ulandi!');
    
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Test query muvaffaqiyatli:', result.rows);
    
    // Test table mavjudligini tekshirish
    const tableCheck = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5");
    console.log('✅ Database jadvallar:', tableCheck.rows);
    
  } catch (error) {
    console.error('❌ Database xatoligi:', error.message);
    console.error('❌ To\'liq xato:', error);
  } finally {
    await client.end();
  }
}

testDatabaseConnection();