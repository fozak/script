1. File storage in PocketBase
PocketBase does not store the original filename directly in the record field.

When you upload a file, PocketBase saves it as:

php-template
Copy
Edit
<original_name>_<10charRandom>.ext
_10charRandom is always 10 alphanumeric lowercase characters and ensures unique filenames.

Example:

makefile
Copy
Edit
Original: test.txt
Stored:   test_v3uaemdcsk.txt
2. Record structure for file fields
Single file field: stored as a string:

js
Copy
Edit
const record = await pb.collection('items').getOne('8r7iwkdl8i2kx6k');
console.log(record.file);
// Output: "test_v3uaemdcsk.txt"
Multiple files field: stored as an array:

json
Copy
Edit
"files": ["file1_v3uaemdcsk.txt", "file2_v9k2p1x7lm.pdf"]
System fields are always present:

json
Copy
Edit
{
  "id": "8r7iwkdl8i2kx6k",
  "created": "2025-08-15T15:00:00.000Z",
  "updated": "2025-08-15T15:10:00.000Z",
  "owner": "user123",
  "collectionId": "items",
  "collectionName": "items"
}
3. Access control / “restricted” files
Restricted = the file is served only if the parent record’s ACL/view rules allow it.

Logged-in users can access the file without a token, if the rules pass:

js
Copy
Edit
const fileUrl = pb.files.getUrl(record, record.file);
Tokens are only needed for temporary or public access without authentication.

4. Original filename and metadata
Stored in the .attr JSON file alongside the file:

json
Copy
Edit
{
  "user.metadata": {"original-filename": "test.txt"},
  "user.content_type": "text/plain; charset=utf-8",
  "md5": "CY9rzUYh03PK3k6DJie09g=="
}
To access it in Node.js:

js
Copy
Edit
import fs from 'fs';
const attrPath = 'pb_data/files/items/8r7iwkdl8i2kx6k/test_v3uaemdcsk.txt.attr';
const metadata = JSON.parse(fs.readFileSync(attrPath, 'utf8'));
console.log(metadata.user.metadata['original-filename']); // "test.txt"
The record field itself only stores the server-side filename, not original name or MIME type.

5. Reconstructing original filenames
_10char postfix is always 10 chars preceded by _.

To “guess” original name: remove _10chars before the extension:

js
Copy
Edit
function getOriginalName(storedName) {
  const extIndex = storedName.lastIndexOf('.');
  const basename = storedName.substring(0, extIndex);
  const ext = storedName.substring(extIndex);
  return basename.slice(0, -11) + ext; // remove _ + 10 chars
}

console.log(getOriginalName("test_v3uaemdcsk.txt")); // "test.txt"
✅ Safer approach: read from .attr file if available.

6. Summary Diagram (conceptual)
pgsql
Copy
Edit
Record in PB (file field) --> stores server filename (with _10char)
        |
        v
Actual file on disk: test_v3uaemdcsk.txt
        |
        v
Metadata in .attr file --> original filename, MIME type, MD5, etc.
If you want, I can also write a ready-to-use helper function in JS that, given a record and file field, returns full metadata including original filename, URL, and MIME type. This is super handy for any UI or download logic.

Do you want me to do that?









Ask ChatGPT





ChatGPT can make mistakes. Check important info.