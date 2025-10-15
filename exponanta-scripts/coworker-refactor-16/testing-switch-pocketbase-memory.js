pb.useAdapter('pocketbase');
ALLARRAY = await pb.query("All",{},); //copy of all collection items
//{data: Array(2126), viewConfig: {…}}
ARRAY = ALLARRAY.data //we work olnly with flattened
//and then work offline

pb.useAdapter('memory');
//pb-adapter-switch.js:28 🔄 Adapter switched: pocketbase → memory

window.MEMORY_DB = ARRAY;
