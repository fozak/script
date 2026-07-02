/* now I want to add activation of functions so when we do run(select, Adapter ..) 
* we before success=true make the functions globally available. dont give code */

/* requirement after activation of function:
* make functions available as opearations by name in global scope. 
** run(get_post, input {} ..) should work without options: adapter: adapter_name if there is
only 1 get_post name through all doctype = Adapter
* duplicate function names across adapters should be handled by adapter: adapter_name option
* if no adapter is given and multiple functions with same name exist system is using dafault
adapter for this operation defined in is_default = 1 in adapter doctype document
* so basically inside run(select, Adepter) before end of execution and after activation function is available
*
