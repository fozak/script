//TODO jwt token implementation
// ANALIZE THE REQUIREMENTS
//1. I use universale User.json and its scheama to store all particular uer dat
//2. I want to implement exact JWT flow as in POCKETBASE
//3. I will use operations from my CRUD

//theere is a need to have meta operation POST(or put ) 
//  for user login and registration, because we need 
// WHy its not create or update
// if new user then its create on new USer doctype, 
// if login then we update the USer document (in _states, workflow vector) 
// - dimention 1-core vecor 2-workflow vector 3 - types semantic matrix like blocked user etc
// then we just run the FSM adaper for 2-workflow in any case
// needed to define more accurately 
// A. the _states in FSM adapter for User doctype
// B. the User document in _allowed, _allowed_read, owner specifics (to be blocked by Guardian)
// C. Special flow (if email, phone, linkedinid) so any on unique keys while signup or -> 
// login view with recover password button, so we need to have form implementation for hidden sections
// D. which view is that - another 

// vectorized user registration types, 1-email, 2-phone, 3-linkedinid, 4-googleid, 5-facebookid, 6-appleid
// vectorized business types: 1-company, 2-individual, etc
// VECTORS are read from DOCTYPE schema into FSM. we postentially might keep vector states 





