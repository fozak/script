// ============================================================
// v44.5 for d1 addons CW-config.js
// ============================================================


//schemas added

// ── schemas ──────────────────────────────────────────────────
globalThis.CW.Schema = {}
globalThis.CW.Schema['Task'] = {"_schema_doctype":"Task","explicit_edit_intent":0,"_autosave":1,"_state":{"1":{"primary":{"0_1":true,"1_2":true,"1_3":true},"name":"_task_status","values":[0,1,2,3],"options":["Draft","Pending","Approved","Rejected"],"transitions":{"0":[1],"1":[2,3],"2":[3],"3":[1]},"labels":{"0_1":"Submit for Review","1_2":"Approve","1_3":"Reject","2_3":"Revoke Approval","3_1":"Resubmit"},"sideEffects":{"0_1":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var updateRun = await run_doc.child({ operation: 'update', target_doctype: 'Task', query: { where: { name: rec.name } }, input: { status: 'Pending' }, options: { render: false, internal: true } }); }","1_2":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var updateRun = await run_doc.child({ operation: 'update', target_doctype: 'Task', query: { where: { name: rec.name } }, input: { status: 'Approved' }, options: { render: false, internal: true } }); }","1_3":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var updateRun = await run_doc.child({ operation: 'update', target_doctype: 'Task', query: { where: { name: rec.name } }, input: { status: 'Rejected' }, options: { render: false, internal: true } }); }","2_3":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var updateRun = await run_doc.child({ operation: 'update', target_doctype: 'Task', query: { where: { name: rec.name } }, input: { status: 'Rejected' }, options: { render: false, internal: true } }); }","3_1":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; var updateRun = await run_doc.child({ operation: 'update', target_doctype: 'Task', query: { where: { name: rec.name } }, input: { status: 'Pending' }, options: { render: false, internal: true } }); }"},"rules":{"1_2":"(run_doc) => { const doc = run_doc.target?.data?.[0] || {}; return CW._getDimValue(doc, '0', CW._getStateDef(run_doc.target_doctype)['0']) === 0; }"},"requires":{}}},"actions":[],"allow_import":1,"autoname":"TASK-.YYYY.-.#####","creation":"2013-01-29 19:25:50","docstatus":1,"doctype":"Schema","document_type":"Setup","engine":"InnoDB","field_order":["name","_states","subject","project","issue","type","relationship_parent","color","is_group","is_template","column_break0","status","priority","task_weight","parent_task","completed_by","completed_on","sb_timeline","exp_start_date","expected_time","start","column_break_11","exp_end_date","progress","duration","is_milestone","sb_details","description","sb_depends_on","depends_on","depends_on_tasks","sb_actual","act_start_date","actual_time","column_break_15","act_end_date","sb_costing","total_costing_amount","column_break_20","total_billing_amount","sb_more_info","review_date","closing_date","column_break_22","department","company","lft","rgt","old_parent","template_task","actionbutton","top_parent"],"fields":[{"fieldname":"name","fieldtype":"Data","label":"Name","in_list_view":1,"read_only":1,"hidden":0},{"allow_in_quick_entry":1,"fieldname":"subject","fieldtype":"Data","in_global_search":1,"in_standard_filter":1,"label":"Subject","reqd":1,"search_index":1},{"allow_in_quick_entry":1,"bold":1,"fieldname":"project","fieldtype":"Link","in_global_search":1,"in_list_view":1,"in_standard_filter":1,"label":"Project","oldfieldname":"project","oldfieldtype":"Link","options":"Project","remember_last_selected_value":1,"search_index":1},{"fieldname":"issue","fieldtype":"Link","label":"Issue","options":"Issue"},{"fieldname":"type","fieldtype":"Link","label":"Type","options":"Task Type"},{"bold":1,"default":"0","fieldname":"is_group","fieldtype":"Check","in_list_view":1,"label":"Is Group"},{"fieldname":"column_break0","fieldtype":"Column Break","oldfieldtype":"Column Break","print_width":"50%","width":"50%"},{"bold":1,"fieldname":"status","fieldtype":"Select","in_list_view":1,"in_standard_filter":1,"label":"Status","no_copy":1,"oldfieldname":"status","oldfieldtype":"Select","options":"\nDraft\nApproved\nRejected\nPending"},{"fieldname":"priority","fieldtype":"Select","in_list_view":1,"in_standard_filter":1,"label":"Priority","oldfieldname":"priority","oldfieldtype":"Select","options":"Low\nMedium\nHigh\nUrgent","search_index":1},{"fieldname":"relationship_parent","fieldtype":"Table","in_list_view":0,"label":"relationship Children","options":"Relationship","search_index":1},{"fieldname":"color","fieldtype":"Color","label":"Color"},{"bold":1,"fieldname":"parent_task","fieldtype":"Link","ignore_user_permissions":1,"label":"Parent Task","options":"Task","search_index":1},{"collapsible":1,"collapsible_depends_on":"exp_start_date","fieldname":"sb_timeline","fieldtype":"Section Break","label":"Timeline"},{"bold":1,"fieldname":"exp_start_date","fieldtype":"Datetime","label":"Expected Start Date","oldfieldname":"exp_start_date","oldfieldtype":"Date"},{"default":"0","fieldname":"expected_time","fieldtype":"Float","label":"Expected Time (in hours)","oldfieldname":"exp_total_hrs","oldfieldtype":"Data"},{"fetch_from":"type.weight","fieldname":"task_weight","fieldtype":"Float","label":"Weight"},{"fieldname":"column_break_11","fieldtype":"Column Break"},{"bold":1,"fieldname":"exp_end_date","fieldtype":"Datetime","label":"Expected End Date","oldfieldname":"exp_end_date","oldfieldtype":"Date","search_index":1},{"fieldname":"progress","fieldtype":"Percent","label":"% Progress","no_copy":1},{"default":"0","fieldname":"is_milestone","fieldtype":"Check","in_list_view":1,"label":"Is Milestone"},{"fieldname":"sb_details","fieldtype":"Section Break","label":"Details","oldfieldtype":"Section Break"},{"fieldname":"description","fieldtype":"BlockNote","label":"Task Description","oldfieldname":"description","oldfieldtype":"Text Editor","print_width":"300px","width":"300px"},{"fieldname":"sb_depends_on","fieldtype":"Section Break","label":"Dependencies","oldfieldtype":"Section Break"},{"fieldname":"depends_on","fieldtype":"Table","label":"Dependent Tasks","options":"Task Depends On"},{"fieldname":"depends_on_tasks","fieldtype":"Code","hidden":1,"label":"Depends on Tasks","read_only":1},{"fieldname":"sb_actual","fieldtype":"Section Break","oldfieldtype":"Column Break","print_width":"50%","width":"50%"},{"fieldname":"act_start_date","fieldtype":"Date","label":"Actual Start Date (via Timesheet)","oldfieldname":"act_start_date","oldfieldtype":"Date","read_only":1},{"fieldname":"actual_time","fieldtype":"Float","label":"Actual Time in Hours (via Timesheet)","read_only":1},{"fieldname":"column_break_15","fieldtype":"Column Break"},{"fieldname":"act_end_date","fieldtype":"Date","label":"Actual End Date (via Timesheet)","oldfieldname":"act_end_date","oldfieldtype":"Date","read_only":1},{"collapsible":1,"fieldname":"sb_costing","fieldtype":"Section Break","label":"Costing"},{"fieldname":"total_costing_amount","fieldtype":"Currency","label":"Total Costing Amount (via Timesheet)","oldfieldname":"actual_budget","oldfieldtype":"Currency","options":"Company:company:default_currency","read_only":1},{"fieldname":"column_break_20","fieldtype":"Column Break"},{"fieldname":"total_billing_amount","fieldtype":"Currency","label":"Total Billable Amount (via Timesheet)","read_only":1},{"collapsible":1,"fieldname":"sb_more_info","fieldtype":"Section Break","label":"More Info"},{"depends_on":"eval:doc.status == \"Closed\" || doc.status == \"Pending Review\"","fieldname":"review_date","fieldtype":"Date","label":"Review Date","oldfieldname":"review_date","oldfieldtype":"Date"},{"depends_on":"eval:doc.status == \"Closed\"","fieldname":"closing_date","fieldtype":"Date","label":"Closing Date","oldfieldname":"closing_date","oldfieldtype":"Date"},{"fieldname":"column_break_22","fieldtype":"Column Break"},{"fieldname":"department","fieldtype":"Link","label":"Department","options":"Department"},{"fetch_from":"project.company","fieldname":"company","fieldtype":"Link","label":"Company","options":"Company","remember_last_selected_value":1},{"fieldname":"lft","fieldtype":"Int","hidden":1,"label":"lft","read_only":1},{"fieldname":"rgt","fieldtype":"Int","hidden":1,"label":"rgt","read_only":1},{"fieldname":"old_parent","fieldtype":"Data","hidden":1,"ignore_user_permissions":1,"label":"Old Parent","read_only":1},{"depends_on":"eval: doc.status == \"Completed\"","fieldname":"completed_by","fieldtype":"Link","label":"Completed By","no_copy":1,"options":"User"},{"default":"0","fieldname":"is_template","fieldtype":"Check","label":"Is Template"},{"depends_on":"is_template","fieldname":"start","fieldtype":"Int","label":"Begin On (Days)"},{"depends_on":"is_template","fieldname":"duration","fieldtype":"Int","label":"Duration (Days)"},{"depends_on":"eval: doc.status == \"Completed\"","fieldname":"completed_on","fieldtype":"Date","label":"Completed On","mandatory_depends_on":"eval: doc.status == \"Completed\""},{"fieldname":"template_task","fieldtype":"Data","hidden":1,"label":"Template Task"},{"fieldname":"actionbutton","fieldtype":"Button","hidden":0,"label":"Save"},{"description":"states","fieldname":"_states","fieldtype":"Code","label":"New States","options":"JSON"},{"fieldname":"relationships","fieldtype":"Relationship Panel","label":"Relationships"},{"fieldname":"top_parent","fieldtype":"Link","options":"Task","label":"Top Parent Task","hidden":1,"read_only":1},{"fieldname":"share_doctype","fieldtype":"Link","in_list_view":1,"label":"Document Type","options":"DocType","reqd":0,"search_index":1},{"fieldname":"share_name","fieldtype":"Dynamic Link","in_list_view":1,"label":"Document Name","options":"share_doctype","reqd":0,"search_index":1}],"icon":"fa fa-check","idx":1,"is_submittable":1,"is_tree":1,"links":[],"max_attachments":5,"modified":"2024-05-24 12:36:12.214577","modified_by":"Administrator","module":"Projects","name":"schemataskxxxxx","naming_rule":"Expression (old style)","nsm_parent_field":"parent_task","owner":"Administrator","permissions":[{"role":"Projects User","read":1,"write":1,"create":1,"delete":1,"transitions":{"1.0_1":"Submit for Review","1.3_1":"Resubmit"}},{"role":"Projects Manager","read":1,"transitions":{"1.1_2":"Approve","1.1_3":"Reject","1.2_3":"Revoke Approval"}}],"quick_entry":1,"schema_name":"Task","search_fields":"subject","show_name_in_global_search":1,"show_preview_popup":1,"sort_field":"creation","sort_order":"DESC","states":[],"timeline_field":"project","title_field":"subject","track_seen":1}
globalThis.CW.Schema['Role'] = {"_schema_doctype":"Role","actions":[],"allow_rename":1,"autoname":"field:role_name","creation":"2013-01-08 15:50:01","doctype":"Schema","document_type":"Document","engine":"InnoDB","field_order":["name","role_name","home_page","restrict_to_domain","column_break_4","disabled","is_custom","desk_access","two_factor_auth","docstatus","owner","_allowed","_allowed_read"],"fields":[{"fieldname":"name","fieldtype":"Data","label":"Name","in_list_view":1,"read_only":1,"hidden":0},{"fieldname":"role_name","fieldtype":"Data","label":"Role Name","oldfieldname":"role_name","oldfieldtype":"Data","reqd":1,"unique":1,"in_list_view":1},{"default":"0","description":"If disabled, this role will be removed from all users.","fieldname":"disabled","fieldtype":"Check","label":"Disabled"},{"default":"1","fieldname":"desk_access","fieldtype":"Check","in_list_view":1,"label":"Desk Access"},{"default":"0","fieldname":"two_factor_auth","fieldtype":"Check","label":"Two Factor Authentication"},{"fieldname":"restrict_to_domain","fieldtype":"Link","label":"Restrict To Domain","options":"Domain"},{"description":"Route: Example \"/app\"","fieldname":"home_page","fieldtype":"Data","label":"Home Page"},{"fieldname":"column_break_4","fieldtype":"Column Break"},{"default":"0","fieldname":"is_custom","fieldtype":"Check","in_list_view":1,"label":"Is Custom"},{"default":"0","fieldname":"docstatus","fieldtype":"Int","hidden":1,"label":"Document Status","no_copy":1,"print_hide":1,"read_only":1},{"fieldname":"owner","fieldtype":"Data","hidden":1,"label":"Created By","no_copy":1,"print_hide":1,"read_only":1},{"fieldname":"_allowed","fieldtype":"JSON","hidden":1,"label":"Allowed Roles (Write)","no_copy":1,"print_hide":1,"read_only":1},{"fieldname":"_allowed_read","fieldtype":"JSON","hidden":1,"label":"Allowed Roles (Read)","no_copy":1,"print_hide":1,"read_only":1}],"icon":"fa fa-bookmark","id":"jzkvxsrrfwhpyfn","idx":1,"index_web_pages_for_search":1,"links":[],"modified":"2024-09-19 17:07:08.672124","modified_by":"Administrator","module":"Core","name":"schemarolexxxxx","naming_rule":"By fieldname","owner":"Administrator","permissions":[{"create":1,"delete":1,"email":1,"print":1,"read":1,"report":1,"role":"System Manager","share":1,"write":1}],"quick_entry":1,"schema_name":"Role","sort_field":"creation","sort_order":"DESC","states":[],"track_changes":1,"translated_doctype":1,"title_field":"role_name"}
globalThis.CW.Schema['User'] = {"_schema_doctype":"User","actions":[],"allow_import":1,"allow_rename":1,"autoname":"field:email","creation":"2022-01-10 17:29:51.672911","description":"Represents a User in the system.","doctype":"Schema","engine":"InnoDB","field_order":["name","_state","user_details_tab","enabled","section_break_3","email","first_name","middle_name","last_name","column_break0","full_name","username","column_break_11","language","time_zone","send_welcome_email","unsubscribed","user_image","roles_permissions_tab","sb1","role_profile_name","role_profiles","roles_html","roles","sb_allow_modules","module_profile","modules_html","block_modules","home_settings","short_bio","gender","birth_date","interest","column_break_26","phone","location","bio","column_break_22","mobile_no","settings_tab","desk_settings_section","mute_sounds","desk_theme","code_editor_type","banner_image","navigation_settings_section","search_bar","notifications","list_settings_section","list_sidebar","bulk_actions","view_switcher","form_settings_section","form_sidebar","timeline","dashboard","change_password","new_password","logout_all_sessions","reset_password_key","last_reset_password_key_generated_on","last_password_reset_date","redirect_url","document_follow_notifications_section","document_follow_notify","document_follow_frequency","column_break_75","follow_created_documents","follow_commented_documents","follow_liked_documents","follow_assigned_documents","follow_shared_documents","email_settings","email_signature","thread_notify","send_me_a_copy","allowed_in_mentions","user_emails","workspace_section","default_workspace","app_section","default_app","sb2","defaults","sb3","simultaneous_sessions","restrict_ip","last_ip","column_break1","login_after","user_type","last_active","section_break_63","login_before","bypass_restrict_ip_check_if_2fa_enabled","last_login","last_known_versions","third_party_authentication","social_logins","api_access","api_key","generate_keys","column_break_65","api_secret","onboarding_status","connections_tab","docstatus","owner","_allowed","_allowed_read","password","tokenKey","emailVisibility","token","verification_code","verified"],"fields":[{"fieldname":"name","fieldtype":"Data","label":"Name","in_list_view":1,"read_only":1,"hidden":0},{"default":"1","fieldname":"enabled","fieldtype":"Check","label":"Enabled","oldfieldname":"enabled","oldfieldtype":"Check","read_only":1},{"depends_on":"enabled","fieldname":"section_break_3","fieldtype":"Section Break","label":"Basic Info"},{"fieldname":"email","fieldtype":"Data","label":"Email","no_copy":1,"oldfieldname":"email","oldfieldtype":"Data","options":"Email","reqd":1},{"fieldname":"first_name","fieldtype":"Data","label":"First Name","oldfieldname":"first_name","oldfieldtype":"Data","reqd":1},{"fieldname":"middle_name","fieldtype":"Data","label":"Middle Name","oldfieldname":"middle_name","oldfieldtype":"Data"},{"bold":1,"fieldname":"last_name","fieldtype":"Data","label":"Last Name","oldfieldname":"last_name","oldfieldtype":"Data"},{"fieldname":"full_name","fieldtype":"Data","in_global_search":1,"in_standard_filter":1,"label":"Full Name","read_only":1},{"bold":1,"default":"1","depends_on":"eval:doc.__islocal","fieldname":"send_welcome_email","fieldtype":"Check","label":"Send Welcome Email"},{"default":"0","fieldname":"unsubscribed","fieldtype":"Check","hidden":1,"label":"Unsubscribed","no_copy":1},{"fieldname":"column_break0","fieldtype":"Column Break","oldfieldtype":"Column Break","print_width":"50%","width":"50%"},{"fieldname":"username","fieldtype":"Data","in_global_search":1,"in_standard_filter":1,"label":"Username","unique":1},{"fieldname":"language","fieldtype":"Link","label":"Language","options":"Language"},{"fieldname":"time_zone","fieldtype":"Autocomplete","label":"Time Zone"},{"description":"Get your globally recognized avatar from Gravatar.com","fieldname":"user_image","fieldtype":"Attach Image","hidden":1,"label":"User Image","no_copy":1,"print_hide":1},{"depends_on":"eval:in_list(['System User', 'Website User'], doc.user_type) && doc.enabled == 1","fieldname":"sb1","fieldtype":"Section Break","label":"Roles","permlevel":1,"read_only":1},{"fieldname":"role_profile_name","fieldtype":"Link","hidden":1,"label":"Role Profile","options":"Role Profile","permlevel":1},{"fieldname":"roles_html","fieldtype":"HTML","label":"Roles HTML","read_only":1},{"fieldname":"roles","fieldtype":"Table","hidden":1,"label":"Roles Assigned","options":"Has Role","permlevel":1,"print_hide":1,"read_only":1},{"collapsible":1,"depends_on":"enabled","fieldname":"short_bio","fieldtype":"Tab Break","label":"More Information"},{"fieldname":"gender","fieldtype":"Link","label":"Gender","oldfieldname":"gender","oldfieldtype":"Select","options":"Gender"},{"fieldname":"phone","fieldtype":"Data","label":"Phone","options":"Phone"},{"fieldname":"mobile_no","fieldtype":"Data","label":"Mobile No","options":"Phone","unique":1},{"fieldname":"birth_date","fieldtype":"Date","label":"Birth Date","no_copy":1,"oldfieldname":"birth_date","oldfieldtype":"Date"},{"fieldname":"location","fieldtype":"Data","label":"Location","no_copy":1},{"fieldname":"banner_image","fieldtype":"Attach Image","label":"Banner Image"},{"fieldname":"column_break_22","fieldtype":"Column Break"},{"fieldname":"interest","fieldtype":"Small Text","label":"Interests"},{"fieldname":"bio","fieldtype":"Small Text","label":"Bio","no_copy":1},{"default":"0","fieldname":"mute_sounds","fieldtype":"Check","label":"Mute Sounds"},{"collapsible":1,"depends_on":"eval:doc.enabled && (!doc.__islocal || !cint(doc.send_welcome_email))","fieldname":"change_password","fieldtype":"Section Break","label":"Change Password"},{"fieldname":"new_password","fieldtype":"Password","label":"Set New Password","no_copy":1},{"default":"1","fieldname":"logout_all_sessions","fieldtype":"Check","label":"Logout From All Devices After Changing Password"},{"fieldname":"reset_password_key","fieldtype":"Data","hidden":1,"label":"Reset Password Key","no_copy":1,"permlevel":1,"print_hide":1,"read_only":1},{"fieldname":"last_password_reset_date","fieldtype":"Date","hidden":1,"label":"Last Password Reset Date","no_copy":1,"print_hide":1,"read_only":1},{"fieldname":"redirect_url","fieldtype":"Small Text","hidden":1,"label":"Redirect URL"},{"collapsible":1,"fieldname":"document_follow_notifications_section","fieldtype":"Section Break","label":"Document Follow"},{"default":"0","fieldname":"document_follow_notify","fieldtype":"Check","label":"Send Notifications For Documents Followed By Me"},{"default":"Daily","depends_on":"eval:(doc.document_follow_notify== 1)","fieldname":"document_follow_frequency","fieldtype":"Select","label":"Frequency","options":"Hourly\nDaily\nWeekly"},{"collapsible":1,"depends_on":"enabled","fieldname":"email_settings","fieldtype":"Section Break","label":"Email"},{"default":"1","fieldname":"thread_notify","fieldtype":"Check","label":"Send Notifications For Email Threads"},{"default":"0","fieldname":"send_me_a_copy","fieldtype":"Check","label":"Send Me A Copy of Outgoing Emails"},{"default":"1","fieldname":"allowed_in_mentions","fieldtype":"Check","label":"Allowed In Mentions"},{"fieldname":"email_signature","fieldtype":"Text Editor","label":"Email Signature","no_copy":1},{"fieldname":"user_emails","fieldtype":"Table","label":"User Emails","options":"User Email","permlevel":1},{"depends_on":"eval:in_list(['System User'], doc.user_type)","fieldname":"sb_allow_modules","fieldtype":"Section Break","label":"Allow Modules","permlevel":1},{"fieldname":"modules_html","fieldtype":"HTML","label":"Modules HTML","permlevel":1},{"fieldname":"block_modules","fieldtype":"Table","hidden":1,"label":"Block Modules","options":"Block Module","permlevel":1},{"fieldname":"home_settings","fieldtype":"Code","hidden":1,"label":"Home Settings"},{"description":"These values will be automatically updated in transactions and also will be useful to restrict permissions for this user on transactions containing these values.","fieldname":"sb2","fieldtype":"Section Break","hidden":1,"label":"Defaults","oldfieldtype":"Column Break","permlevel":1,"print_width":"50%","read_only":1,"width":"50%"},{"description":"Enter default value fields (keys) and values. If you add multiple values for a field, the first one will be picked. These defaults are also used to set \"match\" permission rules. To see list of fields, go to \"Customize Form\".","fieldname":"defaults","fieldtype":"Table","hidden":1,"label":"User Defaults","no_copy":1,"options":"DefaultValue"},{"collapsible":1,"depends_on":"enabled","fieldname":"sb3","fieldtype":"Section Break","label":"Security Settings","oldfieldtype":"Section Break","read_only":1},{"default":"2","fieldname":"simultaneous_sessions","fieldtype":"Int","label":"Simultaneous Sessions"},{"bold":1,"default":"System User","description":"If the user has any role checked, then the user becomes a \"System User\". \"System User\" has access to the desktop","fieldname":"user_type","fieldtype":"Link","in_list_view":1,"in_standard_filter":1,"label":"User Type","oldfieldname":"user_type","oldfieldtype":"Select","options":"User Type","permlevel":1},{"description":"Allow user to login only after this hour (0-24)","fieldname":"login_after","fieldtype":"Int","label":"Login After","permlevel":1},{"description":"Allow user to login only before this hour (0-24)","fieldname":"login_before","fieldtype":"Int","label":"Login Before","permlevel":1},{"description":"Restrict user from this IP address only. Multiple IP addresses can be added by separating with commas. Also accepts partial IP addresses like (111.111.111)","fieldname":"restrict_ip","fieldtype":"Small Text","label":"Restrict IP","permlevel":1},{"default":"0","depends_on":"eval:doc.restrict_ip && doc.restrict_ip.length","description":"If enabled,  user can login from any IP Address using Two Factor Auth, this can also be set for all users in System Settings","fieldname":"bypass_restrict_ip_check_if_2fa_enabled","fieldtype":"Check","label":"Bypass Restricted IP Address Check If Two Factor Auth Enabled"},{"fieldname":"column_break1","fieldtype":"Column Break","oldfieldtype":"Column Break","print_width":"50%","width":"50%"},{"fieldname":"last_login","fieldtype":"Read Only","label":"Last Login","no_copy":1,"oldfieldname":"last_login","oldfieldtype":"Read Only","read_only":1},{"fieldname":"last_ip","fieldtype":"Read Only","label":"Last IP","no_copy":1,"oldfieldname":"last_ip","oldfieldtype":"Read Only","read_only":1},{"fieldname":"last_active","fieldtype":"Datetime","label":"Last Active","no_copy":1,"read_only":1,"search_index":1},{"description":"Stores the JSON of last known versions of various installed apps. It is used to show release notes.","fieldname":"last_known_versions","fieldtype":"Text","hidden":1,"label":"Last Known Versions","read_only":1},{"collapsible":1,"depends_on":"enabled","fieldname":"third_party_authentication","fieldtype":"Section Break","label":"Third Party Authentication","permlevel":1},{"fieldname":"social_logins","fieldtype":"Table","label":"Social Logins","options":"User Social Login"},{"collapsible":1,"fieldname":"api_access","fieldtype":"Section Break","label":"API Access"},{"description":"API Key cannot be regenerated","fieldname":"api_key","fieldtype":"Data","label":"API Key","no_copy":1,"permlevel":1,"read_only":1,"unique":1},{"fieldname":"generate_keys","fieldtype":"Button","label":"Generate Keys","permlevel":1},{"fieldname":"column_break_65","fieldtype":"Column Break"},{"fieldname":"api_secret","fieldtype":"Password","label":"API Secret","permlevel":1,"read_only":1},{"fieldname":"column_break_11","fieldtype":"Column Break"},{"fieldname":"column_break_26","fieldtype":"Column Break"},{"fieldname":"section_break_63","fieldtype":"Column Break"},{"fieldname":"desk_theme","fieldtype":"Select","label":"Desk Theme","options":"Light\nDark\nAutomatic"},{"fieldname":"module_profile","fieldtype":"Link","label":"Module Profile","options":"Module Profile"},{"description":"Stores the datetime when the last reset password key was generated.","fieldname":"last_reset_password_key_generated_on","fieldtype":"Datetime","hidden":1,"label":"Last Reset Password Key Generated On","permlevel":1,"read_only":1},{"fieldname":"column_break_75","fieldtype":"Column Break"},{"default":"0","depends_on":"eval:(doc.document_follow_notify== 1)","fieldname":"follow_created_documents","fieldtype":"Check","label":"Auto follow documents that you create"},{"default":"0","depends_on":"eval:(doc.document_follow_notify== 1)","fieldname":"follow_commented_documents","fieldtype":"Check","label":"Auto follow documents that you comment on"},{"default":"0","depends_on":"eval:(doc.document_follow_notify== 1)","fieldname":"follow_liked_documents","fieldtype":"Check","label":"Auto follow documents that you Like"},{"default":"0","depends_on":"eval:(doc.document_follow_notify== 1)","fieldname":"follow_shared_documents","fieldtype":"Check","label":"Auto follow documents that are shared with you"},{"default":"0","depends_on":"eval:(doc.document_follow_notify== 1)","fieldname":"follow_assigned_documents","fieldtype":"Check","label":"Auto follow documents that are assigned to you"},{"fieldname":"user_details_tab","fieldtype":"Tab Break","label":"User Details"},{"fieldname":"roles_permissions_tab","fieldtype":"Tab Break","label":"Roles & Permissions"},{"fieldname":"settings_tab","fieldtype":"Tab Break","label":"Settings"},{"fieldname":"connections_tab","fieldtype":"Tab Break","label":"Connections","show_dashboard":1},{"collapsible":1,"fieldname":"desk_settings_section","fieldtype":"Section Break","label":"Desk Settings"},{"default":"{}","fieldname":"onboarding_status","fieldtype":"Small Text","hidden":1,"label":"Onboarding Status"},{"allow_in_quick_entry":1,"fieldname":"role_profiles","fieldtype":"Table MultiSelect","label":"Role Profiles","options":"User Role Profile","permlevel":1},{"description":"If left empty, the default workspace will be the last visited workspace","fieldname":"default_workspace","fieldtype":"Link","label":"Default Workspace","options":"Workspace"},{"collapsible":1,"fieldname":"workspace_section","fieldtype":"Section Break","label":"Workspace"},{"default":"vscode","fieldname":"code_editor_type","fieldtype":"Select","label":"Code Editor Type","options":"vscode\nvim\nemacs"},{"collapsible":1,"fieldname":"app_section","fieldtype":"Section Break","label":"App"},{"description":"Redirect to the selected app after login","fieldname":"default_app","fieldtype":"Select","label":"Default App"},{"collapsible":1,"fieldname":"navigation_settings_section","fieldtype":"Section Break","label":"Navigation Settings"},{"default":"1","fieldname":"search_bar","fieldtype":"Check","label":"Search Bar"},{"default":"1","fieldname":"notifications","fieldtype":"Check","label":"Notifications"},{"collapsible":1,"fieldname":"list_settings_section","fieldtype":"Section Break","label":"List Settings"},{"default":"1","fieldname":"list_sidebar","fieldtype":"Check","label":"Sidebar"},{"default":"1","fieldname":"bulk_actions","fieldtype":"Check","label":"Bulk Actions"},{"default":"1","fieldname":"view_switcher","fieldtype":"Check","label":"View Switcher"},{"collapsible":1,"fieldname":"form_settings_section","fieldtype":"Section Break","label":"Form Settings"},{"default":"1","fieldname":"form_sidebar","fieldtype":"Check","label":"Sidebar"},{"default":"1","fieldname":"timeline","fieldtype":"Check","label":"Timeline"},{"default":"1","fieldname":"dashboard","fieldtype":"Check","label":"Dashboard"},{"default":"0","fieldname":"docstatus","fieldtype":"Int","hidden":1,"label":"Document Status","no_copy":1,"print_hide":1,"read_only":1},{"fieldname":"owner","fieldtype":"Data","hidden":1,"label":"Owner","no_copy":1,"print_hide":1,"read_only":1},{"fieldname":"_allowed","fieldtype":"Code","options":"JSON","hidden":1,"label":"Allowed Roles (Write)","no_copy":1,"print_hide":1,"read_only":1},{"fieldname":"_allowed_read","fieldtype":"Code","options":"JSON","hidden":1,"label":"Allowed Roles (Read)","no_copy":1,"print_hide":1,"read_only":1},{"description":"Hashed password for user authentication","fieldname":"password","fieldtype":"Password","label":"Password","no_copy":1},{"description":"rotating it invalidates all active sessions","fieldname":"tokenKey","fieldtype":"Data","hidden":1,"label":"Token Key","no_copy":1},{"default":0,"description":"Controls whether the user's email is publicly visible (0 = Hidden, 1 = Visible)","fieldname":"emailVisibility","fieldtype":"Check","label":"Email Visible"},{"description":"virtual for token","fieldname":"token","fieldtype":"Data","is_virtual":1,"label":"Token"},{"description":"verification_code","fieldname":"verification_code","fieldtype":"Data","is_virtual":1,"label":"verification code"},{"default":0,"description":"Set to 1 by Adapter.auth.activate after code verification","fieldname":"verified","fieldtype":"Check","hidden":1,"label":"Verified","no_copy":1,"read_only":1},{"fieldname":"_state","fieldtype":"Code","options":"JSON","hidden":1,"label":"State","read_only":1},{"fieldname":"relationships","fieldtype":"Relationship Panel","label":"Relationships"}],"icon":"fa fa-user","id":"7xzeg43zusjxdui","idx":413,"image_field":"user_image","links":[{"group":"Profile","link_doctype":"Contact","link_fieldname":"user"},{"group":"Profile","link_doctype":"Blogger","link_fieldname":"user"},{"group":"Logs","link_doctype":"Access Log","link_fieldname":"user"},{"group":"Logs","link_doctype":"Activity Log","link_fieldname":"user"},{"group":"Logs","link_doctype":"Energy Point Log","link_fieldname":"user"},{"group":"Logs","link_doctype":"Route History","link_fieldname":"user"},{"group":"Settings","link_doctype":"User Permission","link_fieldname":"user"},{"group":"Settings","link_doctype":"Document Follow","link_fieldname":"user"},{"group":"Activity","link_doctype":"Communication","link_fieldname":"user"},{"group":"Activity","link_doctype":"ToDo","link_fieldname":"allocated_to"},{"group":"Integrations","link_doctype":"Token Cache","link_fieldname":"user"}],"make_attachments_public":1,"modified":"2025-03-17 11:29:39.254304","modified_by":"Administrator","module":"Core","name":"schemauserxxxxx","owner":"Administrator","_state":{"1":{"name":"_auth_status","values":[0,1,2,3,4],"options":["Invited","Active","Locked","Password Reset Pending","Disabled"],"transitions":{"0":[1,4],"1":[2,3,4],"2":[1,4],"3":[1,4],"4":[0]},"labels":{"0_1":"Activate","0_4":"Cancel Invitation","1_2":"Lock Account","1_3":"Require Password Reset","1_4":"Disable User","2_1":"Unlock Account","3_1":"Complete Reset","4_0":"Re-invite"},"sideEffects":{"0_1":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; await pb.collection('users').update(rec.name, { verified: true }); }","1_2":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; await pb.collection('users').update(rec.name, { verified: false }); }","1_4":"async function(run_doc) { var rec = run_doc.target && run_doc.target.data && run_doc.target.data[0]; if (!rec) return; await pb.collection('users').update(rec.name, { verified: false }); }"},"rules":{},"requires":{}}},"permissions":[{"role":"System Manager","read":1,"write":1,"create":1,"delete":1,"transitions":{"1.0_1":"Activate User","1.0_4":"Cancel Invitation","1.1_2":"Lock Account","1.1_3":"Require Password Reset","1.1_4":"Disable User","1.2_1":"Unlock Account","1.3_1":"Complete Reset","1.4_0":"Re-invite"}},{"role":"User Manager","read":1,"write":1,"transitions":{}}],"explicit_edit_intent":1,"quick_entry":1,"route":"user","row_format":"Dynamic","schema_name":"User","search_fields":"full_name","show_name_in_global_search":1,"sort_field":"creation","sort_order":"DESC","states":[],"title_field":"full_name","track_changes":1}
globalThis.CW.Schema['Role'] = {"_schema_doctype":"Role","actions":[],"allow_rename":1,"autoname":"field:role_name","creation":"2013-01-08 15:50:01","doctype":"Schema","document_type":"Document","engine":"InnoDB","field_order":["name","role_name","home_page","restrict_to_domain","column_break_4","disabled","is_custom","desk_access","two_factor_auth"],"fields":[{"fieldname":"name","fieldtype":"Data","label":"Name","in_list_view":1,"read_only":1,"hidden":0},{"fieldname":"role_name","fieldtype":"Data","label":"Role Name","oldfieldname":"role_name","oldfieldtype":"Data","reqd":1,"unique":1,"in_list_view":1},{"default":"0","description":"If disabled, this role will be removed from all users.","fieldname":"disabled","fieldtype":"Check","label":"Disabled"},{"default":"1","fieldname":"desk_access","fieldtype":"Check","in_list_view":1,"label":"Desk Access"},{"default":"0","fieldname":"two_factor_auth","fieldtype":"Check","label":"Two Factor Authentication"},{"fieldname":"restrict_to_domain","fieldtype":"Link","label":"Restrict To Domain","options":"Domain"},{"description":"Route: Example \"/app\"","fieldname":"home_page","fieldtype":"Data","label":"Home Page"},{"fieldname":"column_break_4","fieldtype":"Column Break"},{"default":"0","fieldname":"is_custom","fieldtype":"Check","in_list_view":1,"label":"Is Custom"}],"icon":"fa fa-bookmark","idx":1,"index_web_pages_for_search":1,"links":[],"modified":"2024-09-19 17:07:08.672124","modified_by":"Administrator","module":"Core","name":"schemarolexxxxx","naming_rule":"By fieldname","owner":"Administrator","permissions":[{"create":1,"delete":1,"email":1,"print":1,"read":1,"report":1,"role":"System Manager","share":1,"write":1}],"quick_entry":1,"schema_name":"Role","sort_field":"creation","sort_order":"DESC","states":[],"track_changes":1,"translated_doctype":1,"title_field":"role_name"}

CW._compileSchemas();  // ← add this





globalThis.CW.defaultFields = [
  "name",
  "doctype",
  "docstatus",
  "owner",
  "modified",
  "modified_by",
  "_state",
  "parent",
  "parentfield",
  "parenttype",
  "idx",
  "_allowed",
  "_allowed_read",
  "files",
  "_changes",
  "_threads", // ← add both
];

globalThis.CW._config = {

roles: {
  systemManager: 'rolesystemmanag',
  public:        'roleispublicxxx',
},

// ── D1 SQL defaults ──────────────────────────────────────────
  sql: {


    // default ACL joins — reused in every SELECT
    aclJoins: `
      LEFT JOIN json_each(item._allowed)      __je_allowed
      LEFT JOIN json_each(item._allowed_read) __je_allowed_read
    `,

    // default ACL WHERE fragment — ? bindings: [doctype, sub, sub, sub, ...roles, ...roles]
    aclWhere: (cfg) => `(
      __je_allowed_read.value = '${cfg.roles.public}'
      OR item.owner = ?
      OR __je_allowed.value = ?
      OR __je_allowed_read.value = ?
    )`,

    // default listSQL — override per schema if needed
  listSQL: (cfg) => `
  SELECT DISTINCT item.* FROM item
  ${cfg.sql.aclJoins}
  WHERE (
    __je_allowed_read.value = '${cfg.roles.public}'
    OR item.owner = ?
    OR __je_allowed.value = ?
    OR __je_allowed_read.value = ?
  )
`,

    // default aclParams — bindings for ACL WHERE in order
    aclParams: (user) => [
      user?.sub ?? '',   // owner
      user?.sub ?? '',   // _allowed
      user?.sub ?? '',   // _allowed_read
    ],
  },

hub: {
  url: "https://hub-cf.i771468.workers.dev/",  //url: "https://hub.i771468.workers.dev/",
},

 identity: {
    keys: {
      user:    'cw_user',      // localStorage key
      utms:    'cw_utms',
      session: 'cw_session',   // sessionStorage key
    },
    pseudo_domain: {
      anon:  '@user.anon.invalid',
      phone: '@user.phone.invalid',
    },
    qualify: {
      time_ms:       120000,
      scroll_pct:    0.5,
      require_score: 2,
    },
    bot_patterns: [/bot/i, /crawler/i, /spider/i, /headless/i],
  },


  ui: {
    show_state_badges: false,
  },

  systemSettings: {
    logChanges: 1, // 0 = off, 1 = on
    logThreads: 1,
  },

  /*doctypeAliases: {
    todo: "ToDo",
  },*/ //see below

  pb_url: "http://143.198.29.88:8090",
  collection: "item",

  topLevelFields: new Set([
    "id",
    "name",
    "doctype",
    "docstatus",
    "title",  // data is left out 
    "domain",
    "owner",
    "_allowed",
    "_allowed_read",
    "created",
    "modified",
    "files",
  ]),

  dbColumns: new Set([
  "id",
  "name",
  "doctype",
  "docstatus",
  "title",
  "domain",
  "owner",
  "_allowed",
  "_allowed_read",
  "created",
  "modified",
  "files",
  "data",   // ← blob column
]),

  publicDoctypes: ["Event", "WebPage", "UserPublicProfile", "Session"],

  publicSites: {
    "exponanta.com": "/var/www/exponanta.com",
    "cfeglobal.org": "/var/www/cfeglobal.org",
  },

  trackable_doctypes: ["Content", "Event"],

  runParams: [
    { path: "target_doctype", url: "doctype", type: "string" },
    { path: "operation", url: "operation", type: "string", default: "select" },
    { path: "view", url: "view", type: "string" },
    { path: "component", url: "component", type: "string" },
    { path: "container", url: "container", type: "string" },
    { path: "source_doctype", url: "source_doctype", type: "string" },
    { path: "query.filter", url: "filter", type: "string" },
    { path: "query.sort", url: "sort", type: "string" },
    { path: "query.fields", url: "fields", type: "string" },
    { path: "query.expand", url: "expand", type: "string" },
    { path: "query.perPage", url: "perPage", type: "int" },
    { path: "query.page", url: "page", type: "int" },
    { path: "query.where.name", url: "name", type: "string" },
  ],

  calendar: {
    weekDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    bookingWindowDays: 60,
    defaultDuration: 30,
    defaultBuffer: 10,
    defaultStartHour: 8,
    defaultEndHour: 18,
    timezones: Intl.supportedValuesOf("timeZone"),
  },

  systemFields: [
    {
      name: "doctype",
      fetch: true,
      hidden: 0,
      in_list_view: 1,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc) doc.doctype = doc.doctype || run_doc.target_doctype;
      },
    },
    {
      name: "slug",
      fetch: true,
      hidden: 0,
      in_list_view: 1,
      fieldtype: "Data",
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc || doc.slug) return;
        doc.slug = generateSlug(run_doc);
      },
    },
    {
  name: "title",
  fetch: true,
  hidden: 0,
  in_list_view: 1,
  fieldtype: "Data",
  onCreate: (run_doc) => {
    const doc = run_doc.target?.data?.[0];
    if (!doc) return;
    const s = CW.Schema?.[run_doc.target_doctype];
    const titleFieldName = s?.title_field || "title";
    if (titleFieldName === "title") return;
    doc.title = doc[titleFieldName] ?? doc.title;
  },
},
    {
      name: "name",
      fetch: true,
      hidden: 0,
      in_list_view: 1,
      fieldtype: "Data",
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc || doc.name) return;
        const s = CW.Schema?.[run_doc.target_doctype];
        const a = s?.autoname;
        const seed = a?.startsWith("field:") ? doc[a.slice(6)] : doc.slug;
        doc.name = generateId(run_doc.target_doctype, seed);
      },
    },
    {
  name: "id",
  fetch: true,
  hidden: 0,
  onCreate: (run_doc) => {
    const doc = run_doc.target?.data?.[0];
    if (!doc || doc.id) return;
    doc.id = doc.name;  // id always mirrors name
  },
},
    {
      name: "docstatus",
      fetch: true,
      hidden: 1,
      in_list_view: 1,
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc && doc.docstatus === undefined) doc.docstatus = 0;
      },
    },
   {
  name: "created",           // ← was "creation"
  fetch: true,
  hidden: 1,
  read_only: 1,
  fieldtype: "Datetime",
  label: "Created",
  in_list_view: 1,
  onCreate: (run_doc) => {
    const doc = run_doc.target?.data?.[0];
    if (doc) doc.created = Date.now();  // ← was doc.creation
  },
},
    {
      name: "owner",
      fetch: true,
      hidden: 0,
      read_only: 1,
      fieldtype: "Data",
      label: "Owner",
      in_list_view: 0,
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc)
          doc.owner =
            doc.doctype === "User"
              ? ""
              : globalThis.pb?.authStore?.model?.id || "";
      },
    },
    {
      name: "modified",
      fetch: true,
      hidden: 0,
      read_only: 1,
      fieldtype: "Datetime",
      label: "Modified",
      in_list_view: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc) doc.modified = Date.now();
      },
    },
    {
      name: "modified_by",
      fetch: true,
      hidden: 0,
      read_only: 1,
      fieldtype: "Data",
      label: "Modified By",
      in_list_view: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc) doc.modified_by = globalThis.pb?.authStore?.model?.id || "";
      },
    },
    {
      name: "_state",
      fetch: true,
      in_list_view: 1,
      hidden: 0,
      read_only: 1,
      fieldtype: "Data",
      label: "State",
    },
    {
      name: "top_parent",
      fetch: true,
      hidden: 0,
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const parentRun = CW.runs[run_doc.parent_run_id];
        const p = parentRun?.target?.data?.[0];
        if (!p || p.doctype !== run_doc.target_doctype) return;
        doc.top_parent = p.top_parent || p.name;
      },
    },
    {
      name: "parent",
      fetch: true,
      hidden: 0,
      fieldtype: "Data",
      in_list_view: 1,
      label: "Parent",
    },
    {
      name: "parenttype",
      fetch: true,
      hidden: 0,
      fieldtype: "Data",
      in_list_view: 1,
      label: "Parent Type",
    },
    {
      name: "parentfield",
      fetch: true,
      hidden: 0,
      fieldtype: "Data",
      in_list_view: 1,
      label: "Parent Field",
    },
    { name: "idx", fetch: true, hidden: 1 },
    {
      name: "_allowed",
      fetch: true,
      hidden: 0,
      read_only: 0,
      fieldtype: "SharePanel",
      label: "Sharing",
      in_list_view: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const schema = CW.Schema?.[run_doc.target_doctype];
        const linkFields = (schema?.fields || []).filter(
          (f) => f.fieldtype === "Link",
        );
        const hasParent = !!(doc.parent && doc.parenttype);
        const hasLinks = linkFields.some((f) => doc[f.fieldname]);
        if (!hasParent && !hasLinks && run_doc.operation !== "create") return;

        const roles = (schema?.permissions || [])
          .filter((p) => p.role && (p.write === 1 || p.create === 1))
          .map((p) => generateId("Role", p.role));

        if (hasParent) {
          const parentRun = CW.runs[run_doc.parent_run_id];
          const p = parentRun?.target?.data?.[0];
          if (p?._allowed) roles.push(...p._allowed);
        }

        for (const f of linkFields) {
          const linked = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === f.options &&
              r.target?.data?.[0]?.name === doc[f.fieldname],
          )?.target?.data?.[0];
          if (linked?._allowed) roles.push(...linked._allowed);
        }

        doc._allowed = [...new Set([...(doc._allowed || []), ...roles])];

        if (
          run_doc.target_doctype === "Relationship" &&
          doc.related_name &&
          doc.related_doctype
        ) {
          const parentRun = CW.runs[run_doc.parent_run_id];
          const parentDoc = parentRun?.target?.data?.[0];
          const relatedRun = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === doc.related_doctype &&
              r.target?.data?.[0]?.name === doc.related_name,
          );
          const relatedDoc = relatedRun?.target?.data?.[0];
          if (parentDoc && relatedDoc) {
            run_doc.child({
              operation: "update",
              target_doctype: doc.related_doctype,
              query: { where: { name: doc.related_name } },
              target: { data: [relatedDoc] },
              input: {
                _allowed: [...new Set([...(parentDoc._allowed || [])])],
              },
              options: { render: false, internal: true },
              source_field: "_allowed", // ← add
            });
          }
        }
      },
    },
    {
      name: "_allowed_read",
      fetch: true,
      hidden: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const schema = CW.Schema?.[run_doc.target_doctype];
        const linkFields = (schema?.fields || []).filter(
          (f) => f.fieldtype === "Link",
        );
        const hasParent = !!(doc.parent && doc.parenttype);
        const hasLinks = linkFields.some((f) => doc[f.fieldname]);
        if (!hasParent && !hasLinks && run_doc.operation !== "create") return;

        const roles = (schema?.permissions || [])
          .filter(
            (p) => p.role && p.read === 1 && !(p.write === 1 || p.create === 1),
          )
          .map((p) => generateId("Role", p.role));
        if (schema?.is_public && !roles.includes("roleispublixxxx"))
          roles.push("roleispublixxxx");

        if (hasParent) {
          const parentRun = CW.runs[run_doc.parent_run_id];
          const p = parentRun?.target?.data?.[0];
          if (p?._allowed_read) roles.push(...p._allowed_read);
        }

        for (const f of linkFields) {
          const linked = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === f.options &&
              r.target?.data?.[0]?.name === doc[f.fieldname],
          )?.target?.data?.[0];
          if (linked?._allowed_read) roles.push(...linked._allowed_read);
        }

        doc._allowed_read = [
          ...new Set([...(doc._allowed_read || []), ...roles]),
        ];

        if (
          run_doc.target_doctype === "Relationship" &&
          doc.related_name &&
          doc.related_doctype
        ) {
          const parentDoc = CW.runs[run_doc.parent_run_id]?.target?.data?.[0];
          const relatedDoc = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === doc.related_doctype &&
              r.target?.data?.[0]?.name === doc.related_name,
          )?.target?.data?.[0];
          if (parentDoc && relatedDoc) {
            run_doc.child({
              operation: "update",
              target_doctype: doc.related_doctype,
              query: { where: { name: doc.related_name } },
              target: { data: [relatedDoc] },
              input: {
                _allowed_read: [
                  ...new Set([...(parentDoc._allowed_read || [])]),
                ],
              },
              options: { render: false, internal: true },
              source_field: "_allowed_read", // ← add
            });
          }
        }
      },
    },
    {
      name: "files",
      fetch: true,
      hidden: 0,
      read_only: 0,
      fieldtype: "Filepicker",
      label: "Attachments",
      in_list_view: 1,
    },
    {
      name: "_changes",
      fetch: true,
      in_list_view: 1,
      hidden: 0,
      read_only: 1,
      onCreate: (run_doc) => {
        if (!CW._config.systemSettings?.logChanges) return;
        if (run_doc.options?._logging === false) return;
        console.log("onCreate fired");
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const skip = new Set([
          "_changes",
          "modified",
          "modified_by",
          "creation",
          "_state",
          "_allowed",
          "_allowed_read",
          "files",
          "name",
          "doctype",
          "docstatus",
          "owner",
        ]);
        const ch = Object.entries(doc)
          .filter(
            ([k, v]) =>
              !skip.has(k) && v !== null && v !== undefined && v !== "",
          )
          .map(([field, to]) => ({ field, from: null, to }));
        if (!ch.length) return;
        doc._changes = [
          {
            at: Date.now(),
            by: run_doc.user?.name || null,
            op: "create",
            ch,
          },
        ];
      },
    },
  ],

  // ============================================================
  // SYSTEM CONFIG
  // ============================================================
  debug: true,
  adapters: {
    // Default adapter per category
    defaults: {
      db: "d1",   //pocketbase
      auth: "auth",
      storage: null, // Future
      email: null, // Future
    },
    payloadAdapters: {
      Request: "auth",
      Object: null, //was "run-builder"
      Run: null,
    },

    // doctype → adapter name mapping
    // if target_doctype matches, use this adapter instead of db
    doctypeAdapters: {
      File: {
        select: "fs",
        update: ["fs", "dispatch", "pocketbase"],
        create: ["fs", "pocketbase"],
        delete: "fs",
      },
      GitCommit: "git",
      GitBranch: "git",
      GitDiff: "git",
    },

    // Adapter registry (defines what's available)
    registry: {
      // ──────────────────────────────────────────────────────
      // DATABASE ADAPTERS
      // ──────────────────────────────────────────────────────
      pocketbase: {
        type: "db",
        name: "PocketBase",
        description: "PocketBase cloud database",
        handler: "_dbAdapters.pocketbase",
        capabilities: ["select", "create", "update", "delete"], // ✅ "select" not "query"
        config: {
          url: "http://127.0.0.1:8090", //not used, set in CW._config.pb_url
          collection: "item",
        },
      },
      fs: {
        type: "fs",
        name: "FileSystem",
        logChanges: 1,
      },

      memory: {
        type: "db",
        name: "Memory",
        description: "In-memory storage (volatile)",
        handler: "_dbAdapters.memory",
        capabilities: ["select", "create", "update", "delete"],
        config: {
          maxRecords: 10000,
        },
      },

      storage: {
        type: "db",
        name: "Local Storage",
        description: "Browser localStorage persistence",
        handler: "_dbAdapters.storage",
        capabilities: ["select", "create", "update", "delete"],
        config: {
          prefix: "coworker_",
          maxSize: 5 * 1024 * 1024, // 5MB
        },
      },

      // ──────────────────────────────────────────────────────
      // AUTH ADAPTERS
      // ──────────────────────────────────────────────────────
      auth: {
        type: "auth",
        name: "auth",
        description: "",
        handler: "_authAdapters.jwt", // not used
        capabilities: [
          // HTTP gateway
          "parse_request",
          "rate_limit",
          // Auth
          "signup",
          "signin",
          "signout",
          "refresh",
          "verifyJWT",
          "change_password",
        ],
        config: {
          // ── HTTP Gateway ──────────────────────────────────────
          rateLimit: {
            ip: { max: 100, window: 60000 },
            user: { max: 1000, window: 60000 },
          },
          bodySize: 102400,
          methods: ["POST"],
          contentType: "application/json",

          // ── JWT Auth ──────────────────────────────────────────
          jwtSecret:
            (typeof process !== "undefined" && process.env?.JWT_SECRET) ||
            "change-this-secret-in-production",
          jwtAlgorithm: "HS256",

          // Token expiration
          accessTokenExpiry: "15m", // 15 minutes
          refreshTokenExpiry: "30d", // 30 days

          // For internal calculations
          accessTokenExpiryMs: 15 * 60 * 1000, // 15 minutes
          refreshTokenExpiryMs: 30 * 24 * 60 * 60 * 1000, // 30 days

          // Security settings
          passwordHashIterations: 100000,
          saltLength: 16,
          maxFailedAttempts: 5,
          lockDurationMs: 15 * 60 * 1000, // 15 minutes
          maxRefreshTokens: 5, // Max concurrent sessions per user

          // User doctype fields
          userDoctype: "User",
          userEmailField: "email",
          emailVerifiedField: "email_verified", // <-- 1/0 field

          // Default roles
          defaultRoles: ["Desk User"],
          adminRole: "System Manager",
          publicRole: "Is Public",

          // Optional: include any flags in JWT payload
          includeInJWT: ["_allowed_read", "email_verified"], // ensures payload has 1/0
        },
      },
    },
  },

  relationshipTypes: {
    Event: {
      User: [
        "Attendee",
        "Speaker",
        "Volunteer",
        "Organizer",
        "Sponsor Contact",
      ],
      Organization: ["Sponsor", "Partner", "Media Partner"],
      Event: ["Related Event", "Follow-up Event"],
    },
    Task: {
      User: ["Assignee", "Reviewer", "Observer"],
      Task: ["Blocks", "Blocked By", "Related"],
      Project: ["Belongs To"],
      Role: ["Read Access", "Write Access"], //experimental
      Customer: ["Customer"],
    },
    User: {
      Role: ["Has Role"],
      User: ["Editor", "Delegate", "Assistant"],
    },
  },

  relationshipAccessMap: {
    Event: {
      User: {
        Attendee: "read",
        Speaker: "read",
        Volunteer: "read",
        Organizer: "write",
        "Sponsor Contact": "read",
      },
      Organization: {
        Sponsor: "none",
        Partner: "none",
        "Media Partner": "none",
      },
      Event: {
        "Related Event": "none",
        "Follow-up Event": "none",
      },
    },
    Task: {
      User: {
        Assignee: "write",
        Reviewer: "read",
        Observer: "read",
      },
      Task: {
        Blocks: "none",
        "Blocked By": "none",
        Related: "none",
      },
      Project: {
        "Belongs To": "none",
      },
    },
    User: {
      Role: {
        "Has Role": "read",
      },
      User: {
        Editor: "write",
        Delegate: "write",
        Assistant: "read",
      },
    },
  },

  // ============================================================
  // OPERATION ALIASES (existing)
  // ============================================================
  operationAliases: {
    // CRUD aliases
    read: "select",
    insert: "create",
    query: "select",
    fetch: "select",
    add: "create",
    remove: "delete",
    modify: "update",
    patch: "update",

    // Auth aliases (✅ NEW)
    login: "signin",
    register: "signup",
    logout: "signout",
    refresh_token: "refresh",
  },

  // ============================================================
  // DOCTYPE ALIASES (existing)
  // ============================================================
  doctypeAliases: {
    user: "User",
    order: "Sales Order",
    customer: "Customer",
    item: "Item",
    invoice: "Sales Invoice",
  },

  // ============================================================
  // OPERATION BEHAVIOR CONFIGURATION
  // ============================================================
  operations: {
    // ──────────────────────────────────────────────────────
    // READ OPERATIONS
    // ──────────────────────────────────────────────────────
    select: {
      type: "read",
      adapterType: "db", // ✅ NEW: Explicit adapter type
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    takeone: {
      type: "read",
      adapterType: "db", // ✅ NEW
      draft: true, // ✅ error corrected the true is correct
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },

    // ──────────────────────────────────────────────────────
    // WRITE OPERATIONS
    // ──────────────────────────────────────────────────────
    create: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: true,
      requiresSchema: true,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    update: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: true,
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    delete: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: true,
      bypassController: false,
    },
    upsert: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: true,
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    updateMany: {
      type: "updateMany",
      adapterType: "db", // ✅ NEW
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },

    // ──────────────────────────────────────────────────────
    // AUTH OPERATIONS (✅ NEW)
    // ──────────────────────────────────────────────────────
    signup: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    signin: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    signout: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    refresh: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    verifyJWT: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    change_password: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
  },

  /* OLD: Operation behavior configuration for controller
  operations: {
    select: {
      type: "read",
      draft: false, // ✅ ADD THIS - Reading, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    takeone: {
      type: "read",
      draft: false, // ✅ ADD THIS - Viewing, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    create: {
      type: "write",
      draft: true, // ✅ ADD THIS - Creating, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    update: {
      type: "write",
      draft: true, // ✅ ADD THIS - Editing, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    delete: {
      type: "write",
      draft: false, // ✅ ADD THIS - Deleting, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: true,
      bypassController: false,
    },
    upsert: {
      type: "write",
      draft: true, // ✅ ADD THIS - Upserting, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    bulk_update: {
      type: "write",
      draft: false, // ✅ ADD THIS - Bulk ops, not draft-based
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
  }, */

  /* ✅ INITIAL
  views: {
    list: {
      component: "MainGrid",
      container: "main_container",
      options: {
        render: true,
      },
    },
    form: {
      component: "MainForm",
      container: "main_container",
      options: {
        render: true,
      },
    },
    chat: {
      component: "MainChat",
      container: "right_pane",
      options: {
        render: true,
      },
    },
    edit: { component: 'MainForm', container: 'main_container' },  // ← added
  read: { component: 'MainForm', container: 'main_container' } // ← added
  },*/

  views: {
    list: { component: "UniversalGrid", container: "right_pane" }, //MainGrid
    form: { component: "MainForm", container: "right_pane" },
    read: { component: "MainForm", container: "right_pane" },
    edit: { component: "MainForm", container: "right_pane" },
  },

  // old structure
  // Operation → View mapping
  operationToView: {
    select: "form", //was list
    create: "form",
    update: "form",
    delete: null,
    takeone: "form", // Internal operation for rendering
  },

  // View → Component mapping
  viewToComponent: {
    list: "MainGrid",
    form: "MainForm",
    chat: "MainChat",
    grid: "MainGrid",
    detail: "MainForm",
    conversation: "MainChat",
  },

  // View → Container mapping
  viewToContainer: {
    list: "main_container",
    form: "main_container",
    chat: "right_pane",
    grid: "main_container",
    detail: "main_container",
    MainGrid: "main_container",
    MainForm: "main_container",
    MainChat: "right_pane",
  },

  behaviorMatrix: {
    // ═══════════════════════════════════════════════════════════
    // MATRIX: [is_submittable]-[docstatus]-[_autosave]
    // Only 8 meaningful combinations (2 × 4 × 1 for non-submittable)
    // ═══════════════════════════════════════════════════════════

    // ───────────────────────────────────────────────────────────
    // Non-Submittable Documents (is_submittable = 0)
    // ───────────────────────────────────────────────────────────

    "0-0-0": {
      name: "Non-Submittable, Manual Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "delete"],
        badge: null,
      },
      controller: {
        autoSave: false, // Don't auto-save
        validateOnChange: true, // But do validate for feedback
      },
      guardian: {
        allowOperations: ["update", "delete", "takeone"],
        blockOperations: [],
      },
    },

    "0-0-1": {
      name: "Non-Submittable, Auto-Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "delete"], // Keep save button anyway
        badge: null,
      },
      controller: {
        autoSave: true, // Auto-save enabled
        validateOnChange: true, // Validate before saving
      },
      guardian: {
        allowOperations: ["update", "delete", "takeone"],
        blockOperations: [],
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - DRAFT (is_submittable = 1, docstatus = 0)
    // ───────────────────────────────────────────────────────────

    "1-0-0": {
      name: "Submittable Draft, Manual Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "submit", "delete"],
        badge: { label: "Draft", class: "warning" },
      },
      controller: {
        autoSave: false,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["update", "submit", "delete", "takeone"],
        blockOperations: ["cancel", "amend"],
      },
    },

    "1-0-1": {
      name: "Submittable Draft, Auto-Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "submit", "delete"],
        badge: { label: "Draft", class: "warning" },
      },
      controller: {
        autoSave: true,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["update", "submit", "delete", "takeone"],
        blockOperations: ["cancel", "amend"],
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - SUBMITTED (is_submittable = 1, docstatus = 1)
    // ───────────────────────────────────────────────────────────

    "1-1-0": {
      name: "Submitted Document, Manual Save",
      ui: {
        fieldsEditable: false, // Unless field.allow_on_submit
        showButtons: ["cancel"],
        badge: { label: "Submitted", class: "success" },
      },
      controller: {
        autoSave: false,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["cancel", "takeone"],
        blockOperations: ["update", "submit", "delete", "amend"],
        exceptions: {
          update: { condition: "field.allow_on_submit === 1" },
        },
      },
    },

    "1-1-1": {
      name: "Submitted Document, Auto-Save",
      ui: {
        fieldsEditable: false, // Unless field.allow_on_submit
        showButtons: ["cancel"],
        badge: { label: "Submitted", class: "success" },
      },
      controller: {
        autoSave: true, // For allow_on_submit fields
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["cancel", "takeone"],
        blockOperations: ["update", "submit", "delete", "amend"],
        exceptions: {
          update: { condition: "field.allow_on_submit === 1" },
        },
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - CANCELLED (is_submittable = 1, docstatus = 2)
    // ───────────────────────────────────────────────────────────

    "1-2-0": {
      name: "Cancelled Document",
      ui: {
        fieldsEditable: false,
        showButtons: ["amend"],
        badge: { label: "Cancelled", class: "danger" },
      },
      controller: {
        autoSave: false,
        validateOnChange: false,
      },
      guardian: {
        allowOperations: ["amend", "takeone"],
        blockOperations: ["update", "submit", "delete", "cancel"],
      },
    },

    "1-2-1": {
      name: "Cancelled Document",
      ui: {
        fieldsEditable: false,
        showButtons: ["amend"],
        badge: { label: "Cancelled", class: "danger" },
      },
      controller: {
        autoSave: false, // Doesn't matter, nothing editable
        validateOnChange: false,
      },
      guardian: {
        allowOperations: ["amend", "takeone"],
        blockOperations: ["update", "submit", "delete", "cancel"],
      },
    },
  },
  //not used see below
  /* fieldInteractionConfig: {
    // ═══════════════════════════════════════════════════════════
    // Field interaction triggers (independent of auto-save)
    // ═══════════════════════════════════════════════════════════

    triggers: {
      onChange: {
        enabled: true, // Fire on every change
        debounce: 300, // Wait 300ms after last change
        action: "write_draft", // Always write to draft
      },

      onBlur: {
        enabled: true, // Fire when field loses focus
        debounce: 0, // Immediate
        action: "validate", // Validate when leaving field
      },
    },

    // You can configure different profiles
    profiles: {
      default: {
        onChange: { enabled: true, debounce: 300, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "validate" },
        onButtonClick: {
          enabled: true,
          action: "workflow_action",
          debounce: 0,
        },
      },

      blur_save: {
        onChange: { enabled: true, debounce: 0, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "auto_save" },
      },

      instant: {
        onChange: { enabled: true, debounce: 0, action: "auto_save" },
        onBlur: { enabled: false },
      },

      manual_only: {
        onChange: { enabled: true, debounce: 0, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "validate" },
      },
    },

    // Active profile
    activeProfile: "default",
  },*/

  fieldComponents: {
    Table: "UniversalGrid",
  },

  // ✅ Field types - NOT USED
  fieldTypes: {
    // ════════════════════════════════════════════════════════
    // TEXT INPUTS
    // ════════════════════════════════════════════════════════

    Data: {
      element: "input",
      props: { type: "text" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    Text: {
      element: "textarea",
      props: { rows: 3 },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    "Long Text": {
      element: "textarea",
      props: { rows: 6 },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // NUMERIC INPUTS
    // ════════════════════════════════════════════════════════

    Int: {
      element: "input",
      props: {
        type: "number",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseInt", // Parse to integer
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Float: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat", // Parse to float
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Currency: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat", // Parse to float
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // BOOLEAN
    // ════════════════════════════════════════════════════════

    Check: {
      element: "input",
      props: {
        type: "checkbox",
        checked: "{{value || false}}", // Use checked, not value
        disabled: "{{readOnly}}",
      },
      state: { localValue: "{{value || false}}" },
      events: {
        onChange: {
          updateState: "localValue",
          extract: "checked", // Extract e.target.checked instead of value
          delegate: "onChange",
        },
        // No onBlur for checkbox - change is immediate
      },
    },

    // ════════════════════════════════════════════════════════
    // DATE/TIME
    // ════════════════════════════════════════════════════════

    Date: {
      element: "input",
      props: { type: "date" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        // No debounce for date picker - selection is final
      },
    },

    Datetime: {
      element: "input",
      props: { type: "datetime-local" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
      },
    },

    Time: {
      element: "input",
      props: { type: "time" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // SELECT
    // ════════════════════════════════════════════════════════

    Select: {
      element: "select",
      props: {
        disabled: "{{readOnly}}",
      },
      state: { localValue: "{{value}}" },
      children: [
        {
          element: "option",
          props: { value: "" },
          content: "",
        },
        {
          repeat:
            "{{(field.options || '').split('\\n').filter(o => o.trim())}}",
          element: "option",
          props: { value: "{{item}}" },
          content: "{{item}}",
        },
      ],
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        // No onBlur for select - selection is final
      },
    },
    // ════════════════════════════════════════════════════════
    // LAYOUT FIELDS - NO INLINE STYLES
    // ════════════════════════════════════════════════════════

    "Section Break": {
      layoutOnly: true,
      render: function ({ field }) {
        if (!field.label) {
          return React.createElement("div", {
            className: globalThis.CWStyles.form.sectionBreak, // ✅ CSS only
          });
        }

        return React.createElement(
          "div",
          { className: globalThis.CWStyles.form.sectionBreak }, // ✅ CSS only
          React.createElement(
            "h4",
            {
              className: globalThis.CWStyles.form.sectionBreakTitle, // ✅ CSS only
            },
            field.label,
          ),
        );
      },
    },

    "Tab Break": {
      layoutOnly: true,
      render: function ({ field }) {
        return React.createElement(
          "div",
          { className: globalThis.CWStyles.form.tabBreak }, // ✅ CSS only
          field.label &&
            React.createElement(
              "h3",
              {
                className: globalThis.CWStyles.form.tabBreakTitle, // ✅ CSS only
              },
              field.label,
            ),
        );
      },
    },

    "Column Break": {
      layoutOnly: true,
      render: function () {
        return null; // ✅ CSS Grid handles layout
      },
    },

    Code: {
      element: "textarea",
      props: {
        rows: 10,
        className: "{{CWStyles.field.code}}",
      },
      state: {
        // ✅ Stringify objects for display in textarea
        localValue:
          "{{typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : (value || '')}}",
      },
      events: {
        onChange: {
          updateState: "localValue",
          // ✅ Try to parse JSON, otherwise keep as string
          delegate: function (value) {
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          },
        },
        onBlur: { delegate: "onBlur" },
        onKeyDown: {
          custom: true,
          handler: function (e, setState, handlers, field) {
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.target.selectionStart;
              const end = e.target.selectionEnd;
              const value = e.target.value;
              const newValue =
                value.substring(0, start) + "  " + value.substring(end);

              setState((prev) => ({ ...prev, localValue: newValue }));
              setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 2;
              }, 0);
            }
          },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // ATTACH IMAGE - NO INLINE STYLES
    // ════════════════════════════════════════════════════════

    "Attach Image": {
      customComponent: true,
      render: function AttachImage({ field, value, handlers, run }) {
        const [preview, setPreview] = React.useState(value || null);
        const [uploading, setUploading] = React.useState(false);

        const handleFileSelect = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => setPreview(e.target.result);
          reader.readAsDataURL(file);

          setUploading(true);
          const base64 = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(file);
          });

          if (handlers.onChange) {
            handlers.onChange(field.fieldname, base64);
          }
          setUploading(false);
        };

        const handleRemove = () => {
          setPreview(null);
          if (handlers.onChange) {
            handlers.onChange(field.fieldname, null);
          }
        };

        return React.createElement(
          "div",
          { className: globalThis.CWStyles.field.attachImageWrapper },

          preview &&
            React.createElement(
              "div",
              { className: globalThis.CWStyles.field.attachImagePreview },
              React.createElement("img", { src: preview }),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: globalThis.CWStyles.field.attachImageRemove,
                  onClick: handleRemove,
                },
                "×",
              ),
            ),

          !preview &&
            React.createElement("input", {
              type: "file",
              accept: "image/*",
              onChange: handleFileSelect,
              disabled: field.read_only || uploading,
            }),

          uploading &&
            React.createElement(
              "span",
              { className: globalThis.CWStyles.field.attachImageUploading },
              "Uploading...",
            ),
        );
      },
    },

    // ════════════════════════════════════════════════════════
    // MISSING EASY TYPES
    // ════════════════════════════════════════════════════════

    Percent: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
        min: "0",
        max: "100",
      },
      state: {
        localValue: "{{value === null || value === undefined ? '' : value}}",
      },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat",
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
      suffix: "%", // ✅ Will display % after input
    },

    "Text Editor": {
      element: "textarea",
      props: {
        rows: 10,
        className: "{{CWStyles.field.textarea}}",
      },
      state: {
        localValue: "{{value || ''}}",
      },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Password: {
      element: "input",
      props: {
        type: "password",
        autoComplete: "current-password", //was autocomplete
      },
      state: { localValue: "{{value || ''}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // FIX: Read Only - Proper className concatenation
    // ════════════════════════════════════════════════════════

    "Read Only": {
      element: "input",
      props: {
        type: "text",
        readOnly: true,
        // ✅ Concatenate inside single template expression
        className: "{{CWStyles.field.input + ' ' + CWStyles.input.readOnly}}",
      },
      state: { localValue: "{{value || ''}}" },
      events: {}, // No events for read-only
    },

    HTML: {
      layoutOnly: true,
      render: function ({ field, value }) {
        // Display HTML content from field.options or value
        const htmlContent = field.options || value || "";

        return React.createElement("div", {
          className: globalThis.CWStyles.field.html,
          dangerouslySetInnerHTML: { __html: htmlContent },
        });
      },
    },

    Button: {
      customComponent: true,
      render: function ButtonField({ field, handlers, run }) {
        const handleClick = () => {
          if (handlers?.onButtonClick) {
            handlers.onButtonClick(field.fieldname, field.label);
          }
        };

        return React.createElement(
          "button",
          {
            type: "button",
            className: globalThis.CWStyles.button.primary,
            onClick: handleClick,
            disabled: field.read_only,
          },
          field.label || "Button",
        );
      },
    },

    // ════════════════════════════════════════════════════════
    // COMPLEX FIELDS (inline component definitions)
    // ════════════════════════════════════════════════════════

    Link: {
      customComponent: true,
      render: function LinkField({ field, value, handlers, run }) {
        const [options, setOptions] = React.useState([]);
        const [isOpen, setIsOpen] = React.useState(false);
        const [searchText, setSearchText] = React.useState(value || "");

        const loadOptions = async () => {
          const childRun = await run.child({
            operation: "select",
            doctype: field.options,
            query: { take: 50 },
            options: { render: false },
          });
          if (childRun.success) {
            const data = Array.isArray(childRun.target?.data)
              ? childRun.target.data
              : [];
            setOptions(data);
            setIsOpen(true);
          }
        };

        const handleSelect = (option) => {
          setSearchText(option.name);
          setIsOpen(false);
          if (handlers.onChange) {
            handlers.onChange(field.fieldname, option.name);
          }
          if (handlers.onBlur) {
            handlers.onBlur(field.fieldname, option.name);
          }
        };

        return React.createElement(
          "div",
          { className: globalThis.CWStyles.field.link },
          React.createElement("input", {
            type: "text",
            className: globalThis.CWStyles.field.linkInput,
            value: searchText,
            onFocus: loadOptions,
            onChange: (e) => setSearchText(e.target.value),
            placeholder: `Select ${field.label}...`,
            readOnly: field.read_only,
          }),
          isOpen &&
            Array.isArray(options) &&
            React.createElement(
              "div",
              {
                className: globalThis.CWStyles.field.linkDropdown,
                style: { display: "block" },
              },
              options.map((opt) =>
                React.createElement(
                  "div",
                  {
                    key: opt.name,
                    className: globalThis.CWStyles.field.linkOption,
                    onClick: () => handleSelect(opt),
                  },
                  opt.name,
                ),
              ),
            ),
        );
      },
    },
  },

  // ✅ Element defaults - applied automatically
  elementDefaults: {
    input: {
      className: "{{CWStyles.field.input}}",
      readOnly: "{{readOnly}}",
      placeholder: "{{field.placeholder}}",
    },

    textarea: {
      className: "{{CWStyles.field.textarea}}",
      readOnly: "{{readOnly}}",
      placeholder: "{{field.placeholder}}",
    },

    select: {
      className: "{{CWStyles.field.select}}",
      disabled: "{{readOnly}}",
    },
  },

fieldInteractionConfig: {
  activeProfile: "default",
  profiles: {
    default: {
      onChange:      { enabled: true, debounce: 300,  action: "write_draft" },
      onBlur:        { enabled: true, debounce: 0,    action: "auto_save" },
      onButtonClick: { enabled: true, debounce: 0,    action: "workflow_action" },
      onCodeChange:  { enabled: true, debounce: 3000, action: "auto_save" },
    },
  },
},

  //== version 2 = checking for wrong combitations https://claude.ai/chat/fc16e068-e05b-4631-9ec0-928dface364a

  // ============================================================
  // FIELD HANDLERS CONFIG (Rendering Only)
  // ============================================================
  field_handlers: {
    // ===== TEXT FIELDS =====
    Data: {
      component: "FieldData",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    Text: {
      component: "FieldText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Long Text": {
      component: "FieldLongText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Small Text": {
      component: "FieldText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Read Only": {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },

    // ===== NUMERIC FIELDS =====
    Int: {
      component: "FieldInt",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Float: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Currency: {
      component: "FieldCurrency",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Percent: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Rating: {
      component: "FieldInt",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Duration: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },

    // ===== BOOLEAN FIELDS =====
    Check: {
      component: "FieldCheck",
      category: "boolean",
      jstype: "boolean",
      value_processor: "boolean",
    },

    // ===== CHOICE FIELDS =====
    Select: {
      component: "FieldSelect",
      category: "choice",
      jstype: "string",
      value_processor: "text",
      _optionsResolver: "_resolverSelect",
    },

    // ===== REFERENCE FIELDS =====
    Link: {
      component: "FieldLink",
      category: "reference",
      jstype: "string",
      value_processor: "text",
      _optionsResolver: "_resolverLink",
    },
    "Dynamic Link": {
      component: "FieldLink",
      category: "reference",
      jstype: "string",
      value_processor: "text",
    },

    // ===== DATE/TIME FIELDS =====
    Date: {
      component: "FieldDate",
      category: "date",
      jstype: "string",
      value_processor: "date",
    },
    Datetime: {
      component: "FieldDatetime",
      category: "date",
      jstype: "string",
      value_processor: "date",
    },
    Time: {
      component: "FieldTime",
      category: "date",
      jstype: "string",
      value_processor: "text",
    },

    // ===== MULTI-VALUE FIELDS =====
    MultiSelect: {
      _handler: "_handleMultiSelectField",
      category: "multi",
      jstype: "array",
      value_processor: "multi",
    },
    MultiCheck: {
      _handler: "_handleMultiCheckField",
      category: "multi",
      jstype: "array",
      value_processor: "multi",
    },

    // ===== CHILD TABLE FIELDS =====
    Table: {
      _handler: "_handleTableField",
      category: "child",
      jstype: "array",
      value_processor: "multi",
    },
    "Table MultiSelect": {
      _handler: "_handleTableMultiSelectField",
      category: "child",
      jstype: "array",
      value_processor: "multi",
    },

    // ===== MEDIA FIELDS =====
    Attach: {
      _handler: "_handleAttachField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    "Attach Image": {
      _handler: "_handleAttachImageField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    Image: {
      _handler: "_handleAttachImageField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    Signature: {
      _handler: "_handleSignatureField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },

    // ===== SPECIAL FIELDS =====
    HTML: {
      _handler: "_handleHTMLField",
      category: "layout",
      jstype: "string",
      value_processor: "text",
    },
    "HTML Editor": {
      _handler: "_handleHTMLEditorField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    Code: {
      _handler: "_handleCodeField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Markdown Editor": {
      _handler: "_handleMarkdownField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    JSON: {
      _handler: "_handleJSONField",
      category: "data",
      jstype: "object",
      value_processor: "text",
    },
    Geolocation: {
      _handler: "_handleGeolocationField",
      category: "data",
      jstype: "object",
      value_processor: "text",
    },

    // ===== INPUT FIELDS =====
    Autocomplete: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Barcode: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Color: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Phone: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },

    // ===== LAYOUT FIELDS (no component needed) =====
    "Section Break": {
      category: "layout",
      jstype: "null",
    },
    "Column Break": {
      category: "layout",
      jstype: "null",
    },
    Heading: {
      category: "layout",
      jstype: "null",
    },
    Fold: {
      category: "layout",
      jstype: "null",
    },

    // ===== CONTROL FIELDS =====
    Button: {
      category: "control",
      jstype: "null",
    },
  },

  // ============================================================
  // FIELD METADATA (from Configuration doctype)
  // ============================================================
  fieldtypes: {
    all_fieldtypes: {
      Attach: { category: "media", jstype: "string" },
      AttachImage: { category: "media", jstype: "string" },
      Autocomplete: { category: "input", jstype: "string" },
      Barcode: { category: "input", jstype: "string" },
      Button: { category: "control", jstype: "null" },
      Check: { category: "boolean", jstype: "boolean" },
      Code: { category: "text", jstype: "string" },
      Color: { category: "input", jstype: "string" },
      "Column Break": { category: "layout", jstype: "null" },
      Currency: { category: "numeric", jstype: "number" },
      Data: { category: "text", jstype: "string" },
      Date: { category: "date", jstype: "string" },
      Datetime: { category: "date", jstype: "string" },
      Duration: { category: "numeric", jstype: "number" },
      "Dynamic Link": { category: "reference", jstype: "string" },
      Float: { category: "numeric", jstype: "number" },
      Fold: { category: "layout", jstype: "null" },
      Geolocation: { category: "data", jstype: "object" },
      Heading: { category: "layout", jstype: "null" },
      HTML: { category: "layout", jstype: "string" },
      "HTML Editor": { category: "text", jstype: "string" },
      Image: { category: "media", jstype: "string" },
      Int: { category: "numeric", jstype: "number" },
      JSON: { category: "data", jstype: "object" },
      Link: { category: "reference", jstype: "string" },
      "Long Text": { category: "text", jstype: "string" },
      "Markdown Editor": { category: "text", jstype: "string" },
      MultiCheck: { category: "multi", jstype: "array" },
      MultiSelect: { category: "multi", jstype: "array" },
      Percent: { category: "numeric", jstype: "number" },
      Phone: { category: "input", jstype: "string" },
      "Read Only": { category: "input", jstype: "string" },
      Rating: { category: "numeric", jstype: "number" },
      "Section Break": { category: "layout", jstype: "null" },
      Select: { category: "choice", jstype: "string" },
      Signature: { category: "media", jstype: "string" },
      "Small Text": { category: "text", jstype: "string" },
      Table: { category: "child", jstype: "array" },
      "Table MultiSelect": { category: "child", jstype: "array" },
      Text: { category: "text", jstype: "string" },
      Time: { category: "date", jstype: "string" },
    },

    boolean_fieldtypes: ["Check"],
    child_fieldtypes: ["Table", "Table MultiSelect"],
    date_fieldtypes: ["Date", "Datetime", "Duration", "Time"],
    html_fieldtypes: ["HTML", "HTML Editor", "Markdown Editor"],
    layout_fieldtypes: ["Column Break", "Fold", "Heading", "Section Break"],
    multi_value_fieldtypes: ["MultiCheck", "MultiSelect", "Table MultiSelect"],
    numeric_fieldtypes: [
      "Currency",
      "Duration",
      "Float",
      "Int",
      "Percent",
      "Rating",
    ],
    text_fieldtypes: [
      "Autocomplete",
      "Barcode",
      "Code",
      "Color",
      "Data",
      "Long Text",
      "Phone",
      "Read Only",
      "Select",
      "Small Text",
      "Text",
    ],

    link_behavior: {
      default: "lazy",
      overrides: {
        Company: "cached",
        Role: "lazy",
        User: "eager",
      },
    },

    std_fields_override: {
      creation: {
        jstype: "string",
        description: "ISO datetime string when created",
      },
      docstatus: { jstype: "number", enum: [0, 1, 2] },
      idx: { jstype: "number" },
      modified: { jstype: "string" },
      modified_by: { jstype: "string", link: "User" },
      name: { jstype: "string", description: "Primary key" },
      owner: { jstype: "string", link: "User" },
      parent: { jstype: "string", link: "Any" },
      parentfield: { jstype: "string" },
      parenttype: { jstype: "string" },
    },
  },

  // ============================================================
  // RENDER BEHAVIOR
  // ============================================================
  render_behavior: {
    value_processors: {
      boolean: "Boolean(value)",
      date: "new Date(value).toISOString()",
      numeric: "Number(value)",
      text: "String(value)",
      multi: "Array.isArray(value) ? value : []",
    },
  },

  // ============================================================
  // LAYOUT RULES
  // ============================================================
  layout_rules: {
    "Section Break": {
      type: "container",
      className: "form.section",
      creates_section: true,
      header: { type: "heading", level: 3, className: "form.sectionLabel" },
    },
    "Column Break": {
      type: "container",
      className: "form.column",
      creates_column: true,
    },
    _default: {
      type: "field",
      wrapper: { type: "container", className: "form.fieldWrapper" },
    },
  },

  // ============================================================
  // RENDER MAP (Universal Renderer Config)
  // ============================================================
  render_map: {
    container: { element: "div" },
    heading: { element: (cfg) => `h${cfg.level || 2}` },
    label: { element: "label" },
    field: { handler: "_renderField" },
    button: { element: "button" },
    link: { element: "a" },
    component: { handler: "_renderComponent" },
  },
};

console.log("Coworker Config Loaded:", CW._config);
