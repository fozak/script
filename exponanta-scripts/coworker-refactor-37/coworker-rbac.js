// ════════════════════════════════════════════════════════
// COWORKER-RBAC.JS - Role-Based Access Control
// DB-agnostic using coworker.run() and coworker.getSchema()
// ════════════════════════════════════════════════════════

coworker.rbac = {
  
  // ══════════════════════════════════════════════════════
  // EXTRACT SCHEMA PERMISSIONS
  // ══════════════════════════════════════════════════════
  async getDocTypePermissions(doctype) {
    // Use coworker.getSchema() instead of direct DB call
    const schema = await coworker.getSchema(doctype);
    
    if (!schema) {
      throw new Error(`Schema not found for doctype: ${doctype}`);
    }
    
    const permissions = schema.permissions || [];
    
    const writeRoles = [];
    const readOnlyRoles = [];
    
    for (const perm of permissions) {
      if (perm.write) {
        writeRoles.push(perm.role);
      } else if (perm.read) {
        readOnlyRoles.push(perm.role);
      }
    }
    
    return {
      _allowed: writeRoles.map(role => generateId("Role", role)),
      _allowed_read: readOnlyRoles.map(role => generateId("Role", role)),
      roleNames: {
        write: writeRoles,
        read: readOnlyRoles
      }
    };
  },

  // ══════════════════════════════════════════════════════
  // ENSURE ROLES EXIST (AUTO-CREATE MISSING)
  // ══════════════════════════════════════════════════════
  async ensureRolesExist(doctype) {
    const doctypePerms = await this.getDocTypePermissions(doctype);
    const roleSchemaPerms = await this.getDocTypePermissions("Role");
    
    const allRoleNames = [
      ...doctypePerms.roleNames.write,
      ...doctypePerms.roleNames.read
    ];
    
    for (const roleName of allRoleNames) {
      const roleId = generateId("Role", roleName);
      
      // Use run('select') instead of direct DB call
      const checkRun = await coworker.run({
        operation: 'select',
        source_doctype: 'Role',
        query: {
          where: { id: roleId },
          take: 1
        },
        options: { 
          render: false,
          includeSchema: false
        }
      });
      
      if (checkRun.success && checkRun.target?.data?.length > 0) {
        console.log(`✓ Role exists: ${roleName}`);
      } else {
        console.log(`Creating role: ${roleName}`);
        
        // Use run('create') instead of direct DB call
        const createRun = await coworker.run({
          operation: 'create',
          target_doctype: 'Role',
          input: {
            id: roleId,
            name: roleName,
            doctype: 'Role',
            docstatus: 0,
            owner: '',
            ...roleSchemaPerms,
            role_name: roleName
          },
          options: {
            render: false,
            includeSchema: false
          }
        });
        
        if (createRun.success) {
          console.log(`✓ Created role: ${roleName}`);
        } else {
          console.error(`Failed to create role: ${roleName}`, createRun.error);
        }
      }
    }
    
    return {
      _allowed: doctypePerms._allowed,
      _allowed_read: doctypePerms._allowed_read
    };
  },

  // ══════════════════════════════════════════════════════
  // CHECK USER PERMISSION
  // ══════════════════════════════════════════════════════
  async checkPermission(userId, record, operation = "read") {
    // Get user's roles
    const userRun = await coworker.run({
      operation: 'select',
      source_doctype: 'User',
      query: {
        where: { id: userId },
        take: 1
      },
      options: { 
        render: false,
        includeSchema: false
      }
    });
    
    if (!userRun.success || !userRun.target?.data?.length) {
      return false;
    }
    
    const user = userRun.target.data[0];
    const userRoles = user._allowed_read || []; // User's capabilities
    
    // Check against record's ACL
    if (operation === "write" || operation === "update" || operation === "delete") {
      const allowed = record._allowed || [];
      return userRoles.some(role => allowed.includes(role));
    }
    
    if (operation === "read") {
      const allowed = record._allowed || [];
      const allowedRead = record._allowed_read || [];
      return userRoles.some(role => 
        allowed.includes(role) || allowedRead.includes(role)
      );
    }
    
    return false;
  },

  // ══════════════════════════════════════════════════════
  // APPLY PERMISSIONS TO CREATE/UPDATE
  // ══════════════════════════════════════════════════════
  async applyPermissions(doctype, data) {
    const perms = await this.ensureRolesExist(doctype);
    
    return {
      ...data,
      ...perms
    };
  }
};

console.log('✅ RBAC module loaded - DB-agnostic via coworker.run()');
