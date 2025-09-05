/*STEP1*/
// --- PocketBase Login (Official SDK Method) ---

// Your PocketBase instance
// const pb = new PocketBase('http://127.0.0.1:8090');

// User credentials
const email = 'testuser@example.com';
const password = 'ks12345678';

async function loginUser() {
    console.log(`Attempting to log in as ${email} using the official SDK method...`);
    
    try {
        // Authenticate against the 'users' collection with email and password
        const authData = await pb.collection('users').authWithPassword(
            email,
            password
        );

        // After successful login, the authStore is updated automatically
        console.log("✅ Login Successful!");
        console.log("Is the auth token valid?", pb.authStore.isValid);
        
        if (pb.authStore.isValid) {
            console.log("Logged in user data:", pb.authStore.model);
            console.log(`User's roles:`, pb.authStore.model.roles);
        }

    } catch (error) {
        console.error("❌ Login Failed!");
        console.error("The server responded with:", error);
    }
}


loginUser();


/*ENDOF STEP1*/
/*STEP2: */
await pb.createDoc("Task") 
/* missing data */
STEP2: "Task-ib4zxxvuqdlyjsp"

await pb.updateDoc("Task-ib4zxxvuqdlyjsp", { _allowed_roles: "Owner" });
await pb.updateDoc("Task-ib4zxxvuqdlyjsp", { docstatus: 0 });
await pb.updateDoc("Task-ib4zxxvuqdlyjsp", { workflow_state: "Draft" });
await pb.updateDoc("Task-ib4zxxvuqdlyjsp", { owner: pb.authStore.baseModel.name });


/*result:*/
{
  "_allowed_roles": "Owner",
  "docstatus": 0,
  "owner": "User-ckbhibwpthfnt8k",
  "workflow_state": "Draft"
}

/*ENDOF STEP3*/
targetDocument = await pb.getDoc("Task-ib4zxxvuqdlyjsp")
await pb.getWorkflow(targetDocument)
>targetDocument.data.workflow_state
>'Draft'

transitions = await pb.getAvailableTransitions("Task","Draft","") 
[{…}]
0
: 
action
: 
"Submit"
allow_self_approval
: 
undefined
allowed
: 
"Accounts User"
condition
: 
undefined
name
: 
"Workflow-Transition-5sgo2floqfdbwzw"
next_state
: 
"Submitted"
state
: 
"Draft"
[[Prototype]]
: 
Object
length
: 
1
[[Prototype]]
: 
Array(0)


