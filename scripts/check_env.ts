console.log('--- Environment Variables Keys ---');
for (const key of Object.keys(process.env)) {
  console.log(`- ${key}: ${process.env[key] ? 'PRESENT' : 'EMPTY'}`);
}
