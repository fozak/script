/**
 * SCHEMA-DRIVEN RECORD CREATION WITH AUTO-PERMISSIONS
 * 
 * This system automatically populates _allowed and _allowed_read fields
 * based on permissions defined in Schema documents.
 * 
 * Flow:
 * 1. Fetch Schema document for the target doctype
 * 2. Extract permissions array from schema.data.permissions
 * 3. For each permission, get/create the Role
 * 4. Separate roles into write-enabled and read-only
 * 5. Create record with auto-populated _allowed and _allowed_read
 */

/**
 * Get or create a Role by name
 * 
 * @param {string} roleName - Name of the role (e.g., "Projects User")
 * @returns {Promise<string>} - Role ID
 * 
 * Process:
 * 1. Generate deterministic ID from role name
 * 2. Try to fetch existing role with that ID
 * 3. If not found, create new role record
 * 4. Return role ID for use in _allowed/_allowed_read
 */
async function getOrCreateRole(roleName) {
  // Generate deterministic ID: "Projects User" -> "roleprojectsuse"
  const roleId = generateID('Role', roleName);
  
  try {
    // Try to fetch existing role
    const existing = await pb.collection('item').getOne(roleId);
    console.log(`   ✓ Role "${roleName}" already exists: ${roleId}`);
    return roleId;
  } catch (e) {
    // Role doesn't exist, create it
    console.log(`   → Creating role "${roleName}": ${roleId}`);
    await pb.collection('item').create({
      id: roleId,
      doctype: 'Role',
      owner: '',              // Roles have no owner
      user_id: '',            // Only User profiles need user_id
      _allowed: [],           // Who can edit this role (empty for now)
      _allowed_read: [],      // Who can read this role (empty for now)
      data: {
        role_name: roleName,
        description: `Auto-created role: ${roleName}`
      }
    });
    return roleId;
  }
}

/**
 * Extract permissions from schema and return separated role arrays
 * 
 * @param {object} schema - Schema document from @item collection
 * @returns {Promise<{writeRoles: string[], readOnlyRoles: string[]}>}
 * 
 * Permission logic:
 * - write: 1 -> Role goes into _allowed (can edit)
 * - write: 0 and read: 1 -> Role goes into _allowed_read (read-only)
 * 
 * Example schema.data.permissions:
 * [
 *   { role: "Projects User", read: 1, write: 1, create: 1, delete: 1 },
 *   { role: "Guest", read: 1, write: 0 }
 * ]
 * 
 * Result:
 * writeRoles: ["roleprojectsuse"]
 * readOnlyRoles: ["roleguestxxxxx"]
 */
async function extractPermissions(schema) {
  console.log('\n→ Extracting permissions from schema...');
  
  const writeRoles = [];      // Roles that can write (edit/delete)
  const readOnlyRoles = [];   // Roles that can only read

  // Iterate through all permissions in the schema
  for (const perm of schema.data.permissions) {
    const roleName = perm.role;
    
    // Get or create the role and get its ID
    const roleId = await getOrCreateRole(roleName);

    // Determine access level based on permission flags
    if (perm.write === 1) {
      // Write permission includes read, so add to _allowed
      writeRoles.push(roleId);
      console.log(`   ✓ Write access: ${roleName} (${roleId})`);
    } else if (perm.read === 1) {
      // Read-only permission goes to _allowed_read
      readOnlyRoles.push(roleId);
      console.log(`   ✓ Read-only access: ${roleName} (${roleId})`);
    }
    // If neither read nor write, role is not added (no access)
  }

  return { writeRoles, readOnlyRoles };
}

/**
 * Fetch schema document for a specific doctype
 * 
 * @param {string} doctype - The doctype to fetch schema for (e.g., "Task")
 * @returns {Promise<object>} - Schema document
 * 
 * Searches for:
 * - doctype = "Schema"
 * - data._schema_doctype = {requested doctype}
 * 
 * Example: getSchema("Task") finds the Schema document where
 * data._schema_doctype = "Task"
 */
async function getSchema(doctype) {
  const schemas = await pb.collection('item').getList(1, 1, {
    filter: `doctype = "Schema" && data._schema_doctype = "${doctype}"`
  });

  if (schemas.items.length === 0) {
    throw new Error(`Schema not found for doctype: ${doctype}`);
  }

  return schemas.items[0];
}

/**
 * Create a record with auto-populated permissions from its schema
 * 
 * @param {string} doctype - Type of document to create (e.g., "Task", "Order")
 * @param {object} data - Data to store in the record's data field
 * @returns {Promise<object>} - Created record
 * 
 * This is the main function that ties everything together:
 * 
 * STEP 1: Fetch the Schema document for this doctype
 *         Example: For doctype="Task", fetches Schema with _schema_doctype="Task"
 * 
 * STEP 2: Extract permissions from schema.data.permissions
 *         Separates roles into write-enabled and read-only
 * 
 * STEP 3: Create the record with auto-populated access control
 *         _allowed = roles with write permission
 *         _allowed_read = roles with read-only permission
 * 
 * Example usage:
 * const task = await createRecord('Task', {
 *   subject: 'Fix bug',
 *   status: 'Open',
 *   priority: 'High'
 * });
 * 
 * Result:
 * - Record created with ID like "taskxxxxxxik28v"
 * - _allowed automatically set to ["roleprojectsuse"]
 * - _allowed_read automatically set based on schema
 * - owner set to current authenticated user
 */
async function createRecord(doctype, data) {
  console.log(`\n========================================`);
  console.log(`Creating ${doctype} record with schema-based permissions`);
  console.log(`========================================`);

  // STEP 1: Fetch schema for this doctype
  console.log(`\nSTEP 1: Fetching schema for ${doctype}...`);
  const schema = await getSchema(doctype);
  console.log(`✅ Schema found: ${schema.id}`);
  console.log(`   Title field: ${schema.data.title_field}`);
  console.log(`   Autoname: ${schema.data.autoname}`);

  // STEP 2: Extract and process permissions from schema
  console.log(`\nSTEP 2: Processing permissions...`);
  const { writeRoles, readOnlyRoles } = await extractPermissions(schema);
  console.log(`\n✅ Permissions extracted:`);
  console.log(`   Write roles: ${writeRoles.length}`);
  console.log(`   Read-only roles: ${readOnlyRoles.length}`);

  // STEP 3: Create the record with auto-populated permissions
  console.log(`\nSTEP 3: Creating ${doctype} record...`);
  
  // Generate unique ID for this record
  const recordId = generateID(doctype, null);
  
  // Create the record in @item collection
  const record = await pb.collection('item').create({
    id: recordId,
    doctype: doctype,
    owner: pb.authStore.model?.id || '',  // Current authenticated user
    user_id: '',                           // Empty - not a User profile
    _allowed: writeRoles,                  // Roles that can edit this record
    _allowed_read: readOnlyRoles,          // Roles that can only read
    data: data                             // Actual record data
  });

  console.log(`✅ ${doctype} created successfully!`);
  console.log(`   ID: ${record.id}`);
  console.log(`   Owner: ${record.owner}`);
  console.log(`   _allowed: [${record._allowed.join(', ')}]`);
  console.log(`   _allowed_read: [${record._allowed_read.join(', ')}]`);

  return record;
}

/**
 * USAGE EXAMPLE
 * 
 * Assuming you are already logged in and have pb and generateID available:
 */

// Create a Task - permissions will be auto-populated from Task schema
const task = await createRecord('Task', {
  subject: 'Implement schema-based permissions',
  status: 'Open',
  priority: 'High',
  description: 'Auto-populate _allowed and _allowed_read from schema permissions'
});

// Create another Task
const task2 = await createRecord('Task', {
  subject: 'Test permission system',
  status: 'Open',
  priority: 'Medium',
  project: 'Permission Framework'
});

// Create an Order (if you have Order schema defined)
const order = await createRecord('Order', {
  order_number: 'ORD-001',
  customer_name: 'Test Customer',
  total_amount: 1500.00,
  status: 'pending'
});

/**
 * IMPORTANT NOTES:
 * 
 * 1. Schema Structure Required:
 *    - Schema documents must have doctype = "Schema"
 *    - Must have data._schema_doctype = {target doctype}
 *    - Must have data.permissions array with role definitions
 * 
 * 2. Permission Structure:
 *    schema.data.permissions = [
 *      { role: "Role Name", read: 1, write: 1, create: 1, delete: 1 },
 *      { role: "Guest Role", read: 1, write: 0 }
 *    ]
 * 
 * 3. Role Creation:
 *    - Roles are auto-created if they don't exist
 *    - Role IDs are deterministic based on role name
 *    - Example: "Projects User" -> "roleprojectsuse"
 * 
 * 4. Access Control Result:
 *    - write: 1 -> Role added to record._allowed
 *    - read: 1, write: 0 -> Role added to record._allowed_read
 *    - Owner always has access via: owner = @request.auth.id
 * 
 * 5. ViewRule Compatibility:
 *    This works with the unified ViewRule:
 *    owner = @request.auth.id ||
 *    (_allowed:length > 0 && @request.auth.item_via_user_id._allowed:each ?= _allowed:each) ||
 *    (_allowed_read:length > 0 && @request.auth.item_via_user_id._allowed:each ?= _allowed_read:each)
 */