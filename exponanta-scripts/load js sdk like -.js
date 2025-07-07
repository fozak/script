load js sdk like - 

https://cdn.jsdelivr.net/npm/pocketbase@0.26.1/dist/pocketbase.umd.js



await pb.collection('users').authWithPassword("example@example.com", "12345678");
VM103:1 Fetch finished loading: POST "http://127.0.0.1:8090/api/collections/users/auth-with-password".
send @ VM103:1
authWithPassword @ VM103:1
(anonymous) @ VM541:1
{record: {…}, token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0a…RoIn0.CVJhJ7nzSKOEyRW4W99ubcNUP3HsVdVYTbRTi89eXt4'}
console.log(pb.authStore.model);

VM574:1 {avatar: '', collectionId: '_pb_users_auth_', collectionName: 'users', created: '2025-07-05 17:06:23.198Z', email: 'example@example.com', …}
undefined


await pb.collection('code').create({
  code: "console.log('Hello, pocketbase!');",
  done: false,
  user: pb.authStore.model.id  // relate to the currently logged-in user
});