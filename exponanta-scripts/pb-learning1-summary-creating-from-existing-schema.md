this is the code that separates data from schema and code
so architecure is 
1) user saving widget code in currentRecord.code (mostly js and React code)
2) user saving schema in currentRecord.schema
3) browser renders it, after user click on Save button, it goes to currentRecord.data


Loader is so architecure is 
file:///C:/python/script/exponanta-scripts/pb-render-code.html (selecting rows)

data is being saved to currentRecord.data

the queriying the data (including timing)

console.time('query');

const records = await pb.collection("code").getList(1, 50, {
  filter: 'data.subject = "javascript"'
});
console.timeEnd('query');