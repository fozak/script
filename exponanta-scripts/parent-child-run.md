Flow Summary: MainForm with Link Fields Architecture

Initial State
CoworkerState.runs = {}
CoworkerState.current_run = null

Step 1: User Opens Customer Form
javascriptcoworker.run({
  operation: 'takeone',
  doctype: 'Customer',
  input: { where: { name: 'Jim Vorough' } },
  component: 'MainForm',
  options: { render: true }
})
→ Creates parent run_doc:
javascript{
  name: 'run_k1mgyc402zatt8j',
  operation: 'takeone',
  source_doctype: 'Customer',
  input: { where: { name: 'Jim Vorough' } },
  output: {
    data: [{
      name: 'Jim Vorough',
      customer_group: null,
      gender: null,        // Empty Link field
      salutation: null     // Empty Link field
    }],
    schema: { fields: [...] }
  },
  parent_run_id: null,
  child_run_ids: [],
  component: 'MainForm'
}
→ Updates state:
javascriptCoworkerState.runs['run_k1mgyc402zatt8j'] = parentRun
CoworkerState.current_run = 'run_k1mgyc402zatt8j'
```

**→ Renders:**
```
MainForm renders with:
- FieldData for name: "Jim Vorough"
- FieldLink for gender: (empty dropdown)
- FieldLink for salutation: (empty dropdown)

Step 2: User Focuses on Gender Link Field
javascript// FieldLink component calls:
run.child({
  operation: 'select',
  doctype: 'Gender',
  input: { take: 50 }
})
→ Creates child run_doc:
javascript{
  name: 'run_3bfs6ettr97anpg',
  operation: 'select',
  source_doctype: 'Gender',
  parent_run_id: 'run_k1mgyc402zatt8j',  // ← Links to parent
  input: { take: 50 },
  output: {
    data: [
      { name: 'Male' },
      { name: 'Female' },
      { name: 'Other' },
      { name: 'Prefer not to say' }
    ],
    schema: null
  },
  component: null  // No rendering
}
→ Updates state:
javascriptCoworkerState.runs['run_3bfs6ettr97anpg'] = childRun
CoworkerState.current_run = 'run_3bfs6ettr97anpg'  // ← Points to child
```

**→ FieldLink displays:**
```
Dropdown shows:
- Male
- Female
- Other
- Prefer not to say

Step 3: User Selects "Female"
javascript// FieldLink handleSelect:
setSearchText('Female')  // ← Field component re-renders
run.input.data.gender = 'Female'  // ← Updates parent run_doc
→ Parent run updated in memory:
javascriptparentRun.input.data = {
  gender: 'Female'  // ← New value stored
}
→ State unchanged (no CoworkerState update)
→ Field shows: "Female"

Step 4: User Focuses on Salutation Link Field
javascript// FieldLink component calls:
run.child({
  operation: 'select',
  doctype: 'Salutation',
  input: { take: 50 }
})
→ Creates second child run_doc:
javascript{
  name: 'run_ehmavcs65w6ppwv',
  operation: 'select',
  source_doctype: 'Salutation',
  parent_run_id: 'run_k1mgyc402zatt8j',  // ← Same parent
  input: { take: 50 },
  output: {
    data: [
      { name: 'Mr' },
      { name: 'Mrs' },
      { name: 'Ms' },
      { name: 'Dr' },
      { name: 'Prof' }
    ]
  }
}
→ Updates state:
javascriptCoworkerState.runs['run_ehmavcs65w6ppwv'] = childRun2
CoworkerState.current_run = 'run_ehmavcs65w6ppwv'  // ← Points to latest child
```

**→ FieldLink displays:**
```
Dropdown shows:
- Mr
- Mrs
- Ms
- Dr
- Prof

Step 5: User Selects "Mrs"
javascript// FieldLink handleSelect:
setSearchText('Mrs')
run.input.data.salutation = 'Mrs'
→ Parent run updated:
javascriptparentRun.input.data = {
  gender: 'Female',
  salutation: 'Mrs'  // ← Second value stored
}
→ Field shows: "Mrs"

Final State
javascriptCoworkerState.runs = {
  'run_k1mgyc402zatt8j': {  // Parent form
    operation: 'takeone',
    input: { 
      data: { 
        gender: 'Female',
        salutation: 'Mrs' 
      }
    },
    output: { 
      data: [{ name: 'Jim Vorough', ... }] 
    },
    child_run_ids: []  // ⚠️ Not tracked
  },
  
  'run_3bfs6ettr97anpg': {  // Child 1: Gender SELECT
    operation: 'select',
    parent_run_id: 'run_k1mgyc402zatt8j',
    output: { data: [{ name: 'Male' }, ...] }
  },
  
  'run_ehmavcs65w6ppwv': {  // Child 2: Salutation SELECT
    operation: 'select',
    parent_run_id: 'run_k1mgyc402zatt8j',
    output: { data: [{ name: 'Mr' }, ...] }
  }
}

CoworkerState.current_run = 'run_ehmavcs65w6ppwv'  // Latest operation
```

**Form displays:**
```
Customer: Jim Vorough
Gender: Female ✓
Salutation: Mrs ✓
```

---

## Key Achievements:

✅ **Parent form** renders dynamically from schema  
✅ **Link fields** spawn child SELECT operations via `run.child()`  
✅ **Child operations** fetch data from database without rendering  
✅ **Parent-child relationship** tracked via `parent_run_id`  
✅ **User selections** stored in `parent.input.data`  
✅ **Field components** maintain their own display state  
✅ **Operation history** preserved in `CoworkerState.runs`  
✅ **No memory leaks** - intentional state retention by design  

---

## Architecture Pattern:
```
User Action → FieldComponent → run.child() → DB Query → Options → User Select → Update Parent
