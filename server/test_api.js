async function runTests() {
  console.log("Testing POST /api/auth/register-student (Missing fields)...");
  try {
    const res = await fetch('http://localhost:5001/api/auth/register-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }) // Missing password, etc
    });
    
    const data = await res.json();
    console.log("Status Code:", res.status);
    console.log("Response Body:", data);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTests();
