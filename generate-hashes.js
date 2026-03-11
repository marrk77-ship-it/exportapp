import bcrypt from 'bcryptjs';

async function generateHashes() {
  const password = 'password123';
  const hash1 = await bcrypt.hash(password, 10);
  const hash2 = await bcrypt.hash(password, 10);
  
  console.log('Password:', password);
  console.log('Hash for client1:', hash1);
  console.log('Hash for client2:', hash2);
}

generateHashes();
