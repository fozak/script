(async () => {
  // ===== MOCK USER DATA =====
  const run_doc = {
    target: {
      data: [{
        email: "alice@example.com",
        name: "Alice",
        _allowed_read: ["Admin", "Editor"],
        email_verified: true
      }]
    }
  };

  // ===== GENERATE TOKEN =====
  await generateToken(run_doc);

  console.log("User object with token:");
  console.log(run_doc.target.data[0]);

  // Extract token from user
  const token = run_doc.target.data[0].token;

  // ===== VERIFY TOKEN =====
  const payload = await verifyJWT(token, globalThis.CW._config.auth.jwtSecret);

  if (payload) {
    console.log("JWT verified successfully!");
    console.log("Decoded payload:", payload);

    // Attach to run_doc.user like your auth flow
    run_doc.user = payload;
    console.log("run_doc.user set for controller:", run_doc.user);

  } else {
    console.log("Invalid or expired JWT");
  }

})();
VM231:17 User object with token:
VM231:18 {email: 'alice@example.com', name: 'Alice', _allowed_read: Array(2), email_verified: true, token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhb…wODl9.FGSgdUx_5hHgvZU_l_fs8hSFDVecp8IIRvzWbMkUaPc'}
VM231:27 JWT verified successfully!
VM231:28 Decoded payload: {sub: 'alice@example.com', email: 'alice@example.com', name: 'Alice', _allowed_read: Array(2), email_verified: 1, …}
VM231:32 run_doc.user set for controller: {sub: 'alice@example.com', email: 'alice@example.com', name: 'Alice', _allowed_read: Array(2), email_verified: 1, …}
Promise {<fulfilled>: undefined}