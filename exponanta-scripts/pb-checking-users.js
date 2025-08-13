async function canUserCreateUsers(userEmail) {
  // Step 1: Get all roles for this user
  const roleDocs = await pb.getChildren("Has Role", userEmail);
  const roleNames = roleDocs.map(r => r.data.role);

  if (roleNames.length === 0) {
    console.warn(`User ${userEmail} has no roles`);
    return false;
  }

  // Step 2: Get the User schema definition
  const userSchema = await pb.getSchema("User");
  if (!userSchema || !Array.isArray(userSchema.permissions)) {
    throw new Error("User schema not found or invalid");
  }

  // Step 3: Check if any role has create=1
  const canCreate = userSchema.permissions.some(perm =>
    roleNames.includes(perm.role) && perm.create === 1
  );

  return canCreate;
}

// Example usage:
canUserCreateUsers("Administrator").then(result => {
  console.log(`Can create users?`, result);
});

