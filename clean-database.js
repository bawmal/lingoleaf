// clean-database.js
// Script to clean all test data from the database

require('dotenv').config();
const fetch = require('node-fetch');

const DB_URL = process.env.DB_URL;
const DB_API_KEY = process.env.DB_API_KEY;

async function cleanDatabase() {
  console.log('🗑️  Cleaning database...\n');

  try {
    // First, check how many plants exist
    const countRes = await fetch(`${DB_URL}/rest/v1/plants?select=count`, {
      headers: {
        'apikey': DB_API_KEY,
        'Authorization': `Bearer ${DB_API_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    const countHeader = countRes.headers.get('content-range');
    const totalCount = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
    
    console.log(`📊 Found ${totalCount} plants in database`);

    if (totalCount === 0) {
      console.log('✅ Database is already empty!');
      return;
    }

    // Confirm deletion
    console.log(`\n⚠️  About to delete ${totalCount} plants...`);
    
    // Delete all plants
    const deleteRes = await fetch(`${DB_URL}/rest/v1/plants?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: {
        'apikey': DB_API_KEY,
        'Authorization': `Bearer ${DB_API_KEY}`,
        'Prefer': 'return=minimal'
      }
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      throw new Error(`Delete failed: ${deleteRes.status} ${errorText}`);
    }

    console.log('✅ All plants deleted successfully!');
    
    // Verify deletion
    const verifyRes = await fetch(`${DB_URL}/rest/v1/plants?select=count`, {
      headers: {
        'apikey': DB_API_KEY,
        'Authorization': `Bearer ${DB_API_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    const verifyHeader = verifyRes.headers.get('content-range');
    const remainingCount = verifyHeader ? parseInt(verifyHeader.split('/')[1]) : 0;
    
    console.log(`\n📊 Remaining plants: ${remainingCount}`);
    console.log('🎉 Database cleaned successfully!\n');

  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanDatabase();
