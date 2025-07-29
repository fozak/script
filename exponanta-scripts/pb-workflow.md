https://chatgpt.com/c/688403dd-4ef4-8007-9135-175277ba66f1

ISS-2025-00003


simplified idea
{
  "workflow_field": "status",
  "states": ["Draft", "Submitted", "Approved", "Rejected"],
  "roles": {
    "Employee": ["Draft → Submitted"],
    "Manager": ["Submitted → Approved", "Submitted → Rejected"]
  }
}

component v1 
https://claude.ai/chat/5731ba50-f55a-4086-a00b-badbea72ab00 

more advanced v - 
{
  "sales_flow": [
    "sales_order.draft(sales_user) -> sales_order.submitted(sales_user) -> sales_order.approved(sales_manager)",
    "sales_order.approved -[AUTO]-> sales_invoice.draft(accounts_user) -> sales_invoice.submitted(accounts_user) -> sales_invoice.approved(accounts_manager)"
  ],
  "purchase_flow": [
    "material_request.draft(requester) -> material_request.submitted(requester) -> material_request.approved(dept_manager)",
    "purchase_order.draft(purchase_user) -> purchase_order.submitted(purchase_user) -> purchase_order.approved(purchase_manager)",
    "purchase_order.approved -[AUTO]-> purchase_receipt.draft(warehouse) -> purchase_receipt.submitted(warehouse) -> purchase_receipt.completed(warehouse)",
    "purchase_invoice.draft(accounts_user) -> purchase_invoice.submitted(accounts_user) -> purchase_invoice.approved(finance_manager)"
  ],
  "expense_flow": [
    "expense_claim.draft(employee) -> expense_claim.submitted(employee) -> expense_claim.approved(manager)",
    "expense_claim.approved -[AUTO]-> payment_entry.draft(accounts) -> payment_entry.submitted(accounts) -> payment_entry.paid(accounts)"
  ],
  "hr_flow": [
    "leave_application.applied(employee) -> leave_application.approved(supervisor|hr_manager)",
    "salary_slip.draft(hr) -> salary_slip.verified(hr) -> salary_slip.approved(finance_manager) -> salary_slip.paid(accounts)"
  ]
}
