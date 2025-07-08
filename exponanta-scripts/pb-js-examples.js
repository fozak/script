https://claude.ai/share/6f54a939-32a7-4d9f-9bc2-9ec7ab10172d

const authData = await pb.collection('users').authWithPassword(
  'user2@example.com',
  'password123'
);

console.log('User logged in:', authData);


  "record": {
    "avatar": "",
    "collectionId": "_pb_users_auth_",
    "collectionName": "users",
    "created": "2025-07-07 17:20:52.278Z",
    "email": "user2@example.com",
    "emailVisibility": false,
    "id": "snsjsg884qavxjy",
    "name": "User Two",
    "updated": "2025-07-07 17:20:52.278Z",
    "verified": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJfcGJfdXNlcnNfYXV0aF8iLCJleHAiOjE3NTI1MTU0NTUsImlkIjoic25zanNnODg0cWF2eGp5IiwicmVmcmVzaGFibGUiOnRydWUsInR5cGUiOiJhdXRoIn0.I34rqCk3s2Sd9OR9obvj20mzdfariAUBmLX0B74NlV8"
}


// Change password (user already authenticated)
if (pb.authStore.isValid) {
  const updatedUser = await pb.collection('users').update(pb.authStore.model.id, {
    password: 'newpassword456',
    passwordConfirm: 'newpassword456',
    oldPassword: 'password123'
  });
  console.log('Password changed successfully');
} else {
  console.log('Please login first');
}

