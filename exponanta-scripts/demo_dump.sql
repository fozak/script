-- List of tables

-- Table: Currency
('AFN', 'Pul', 100, '0.01000000000', '؋', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:26.609Z', '2025-08-05T15:57:26.609Z')
('ALL', 'Qindarkë', 100, '0.01000000000', 'L', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:26.610Z', '2025-08-05T15:57:26.610Z')
('DZD', 'Santeem', 100, '0.01000000000', 'د.ج', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:26.611Z', '2025-08-05T15:57:26.611Z')
('EUR', 'Cent', 100, '0.01000000000', '€', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:26.611Z', '2025-08-05T15:57:26.611Z')

-- Table: NumberSeries
('PAY-', 1001, 4, 'Payment', 1378, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.035Z', '2025-08-05T15:58:54.175Z')
('JV-', 1001, 4, 'JournalEntry', 1002, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.074Z', '2025-08-05T15:57:39.919Z')
('PRLE-', 1001, 4, 'PricingRule', 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.112Z', '2025-08-05T15:57:28.112Z')
('SMOV-', 1001, 4, 'StockMovement', 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.117Z', '2025-08-05T15:57:28.117Z')

-- Table: Account
('Application of Funds (Assets)', 'Asset', None, '', 1, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.185Z', '2025-08-05T15:57:27.185Z', 0, 0)
('Current Assets', 'Asset', 'Application of Funds (Assets)', '', 1, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.191Z', '2025-08-05T15:57:27.191Z', 0, 0)
('Accounts Receivable', 'Asset', 'Current Assets', '', 1, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.196Z', '2025-08-05T15:57:27.196Z', 0, 0)
('Debtors', 'Asset', 'Accounts Receivable', 'Receivable', 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.201Z', '2025-08-05T15:57:27.201Z', 0, 0)

-- Table: AccountingLedgerEntry
('000000001', '2025-02-05T00:00:00.000Z', None, 'Supreme Bank', '5055069.00000000000', '0.00000000000', 'JournalEntry', 'JV-1001', 0, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:39.909Z', '2025-08-05T15:57:39.909Z')
('000000002', '2025-02-05T00:00:00.000Z', None, 'Secured Loans', '0.00000000000', '5055069.00000000000', 'JournalEntry', 'JV-1001', 0, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:39.913Z', '2025-08-05T15:57:39.913Z')
('000000003', '2025-02-05T00:00:00.000Z', None, 'Cash', '1516520.70000000000', '0.00000000000', 'JournalEntry', 'JV-1002', 0, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:39.939Z', '2025-08-05T15:57:39.939Z')
('000000004', '2025-02-05T00:00:00.000Z', None, 'Supreme Bank', '0.00000000000', '1516520.70000000000', 'JournalEntry', 'JV-1002', 0, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:39.943Z', '2025-08-05T15:57:39.943Z')

-- Table: Lead

-- Table: Address
('New Address 01', '1st Column, Fitzgerald Bridge', None, 'Pune', 'India', 'Maharashtra', '411001', None, None, None, '1st Column, Fitzgerald Bridge, Pune, Maharashtra, India, 411001', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:58:54.271Z', '2025-08-05T15:58:54.271Z', 'Maharashtra')

-- Table: ItemGroup

-- Table: UOM
('Unit', 1, '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.255Z', '2025-08-05T15:57:26.255Z')
('Kg', 0, '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.258Z', '2025-08-05T15:57:26.258Z')
('Gram', 0, '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.261Z', '2025-08-05T15:57:26.261Z')
('Meter', 0, '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.265Z', '2025-08-05T15:57:26.265Z')

-- Table: UOMConversionItem

-- Table: LoyaltyProgram

-- Table: LoyaltyPointEntry

-- Table: CollectionRulesItems

-- Table: Payment
('PAY-1001', 'PAY-', 'Only Fulls', '2024-09-01T01:00:00.000Z', 'Pay', 'Cash', 'Creditors', 'Cash', None, None, None, '17886.40000000000', '0.00000000000', None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:58:19.210Z', '2025-08-05T15:58:19.247Z', 1, 0)
('PAY-1002', 'PAY-', 'Just Epaulettes', '2024-09-01T01:00:00.000Z', 'Pay', 'Cash', 'Creditors', 'Cash', None, None, None, '29488.20000000000', '0.00000000000', None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:58:19.301Z', '2025-08-05T15:58:19.323Z', 1, 0)
('PAY-1003', 'PAY-', 'Lankness Feet Fomenters', '2024-09-01T01:00:00.000Z', 'Pay', 'Cash', 'Creditors', 'Cash', None, None, None, '153364.60000000000', '0.00000000000', None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:58:19.375Z', '2025-08-05T15:58:19.396Z', 1, 0)
('PAY-1004', 'PAY-', "Josféña's 611s", '2024-09-01T01:00:00.000Z', 'Pay', 'Cash', 'Creditors', 'Cash', None, None, None, '123177.60000000000', '0.00000000000', None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:58:19.452Z', '2025-08-05T15:58:19.474Z', 1, 0)

-- Table: PaymentMethod
('Cash', 'Cash', None, '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.279Z', '2025-08-05T15:57:26.279Z')
('Bank', 'Bank', None, '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.279Z', '2025-08-05T15:57:26.279Z')
('Transfer', 'Bank', None, '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.279Z', '2025-08-05T15:57:26.279Z')

-- Table: PaymentFor
('w1eqbi-mdyq49ak', 'PurchaseInvoice', 'PINV-1001', '17886.40000000000', 0, 'PAY-1001', 'Payment', 'for')
('m5o0nf-mdyq49ak', 'PurchaseInvoice', 'PINV-1002', '29488.20000000000', 0, 'PAY-1002', 'Payment', 'for')
('vs0jd3-mdyq49al', 'PurchaseInvoice', 'PINV-1003', '153364.60000000000', 0, 'PAY-1003', 'Payment', 'for')
('ppktav-mdyq49al', 'PurchaseInvoice', 'PINV-1004', '123177.60000000000', 0, 'PAY-1004', 'Payment', 'for')

-- Table: JournalEntry
('JV-1001', 'JV-', 'Bank Entry', '2025-02-05', None, None, None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:39.859Z', '2025-08-05T15:57:39.903Z', 1, 0)
('JV-1002', 'JV-', 'Cash Entry', '2025-02-05', None, None, None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:39.917Z', '2025-08-05T15:57:39.933Z', 1, 0)

-- Table: JournalEntryAccount
('9sm5iq-mdyq3ez4', 'Supreme Bank', '5055069.00000000000', '0.00000000000', 0, 'JV-1001', 'JournalEntry', 'accounts')
('io3iow-mdyq3ez5', 'Secured Loans', '0.00000000000', '5055069.00000000000', 1, 'JV-1001', 'JournalEntry', 'accounts')
('imvvi8-mdyq3ez6', 'Cash', '1516520.70000000000', '0.00000000000', 0, 'JV-1002', 'JournalEntry', 'accounts')
('wppbgp-mdyq3ez6', 'Supreme Bank', '0.00000000000', '1516520.70000000000', 1, 'JV-1002', 'JournalEntry', 'accounts')

-- Table: ItemEnquiry

-- Table: CouponCode

-- Table: AppliedCouponCodes

-- Table: PriceList

-- Table: PriceListItem

-- Table: PricingRule

-- Table: PricingRuleItem

-- Table: PricingRuleDetail

-- Table: Tax
('GST-28', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.855Z', '2025-08-05T15:57:27.855Z')
('GST-18', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.867Z', '2025-08-05T15:57:27.867Z')
('GST-12', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.878Z', '2025-08-05T15:57:27.878Z')
('GST-6', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:27.889Z', '2025-08-05T15:57:27.889Z')

-- Table: TaxDetail
('4ac534-mdyq35pq', 'CGST', None, 14.0, 0, 'GST-28', 'Tax', 'details')
('9nzf6g-mdyq35pq', 'SGST', None, 14.0, 1, 'GST-28', 'Tax', 'details')
('76b49c-mdyq35q2', 'CGST', None, 9.0, 0, 'GST-18', 'Tax', 'details')
('v45oas-mdyq35q2', 'SGST', None, 9.0, 1, 'GST-18', 'Tax', 'details')

-- Table: TaxSummary
('diuvf1-mdyq3irg', 'CGST', None, 9.0, '634.32000000000', 0, 'SINV-1034', 'SalesInvoice', 'taxes')
('0ilbds-mdyq3irg', 'SGST', None, 9.0, '634.32000000000', 1, 'SINV-1034', 'SalesInvoice', 'taxes')
('uterhi-mdyq3q42', 'CGST', None, 9.0, '802.98000000000', 0, 'SINV-1105', 'SalesInvoice', 'taxes')
('p64vk2-mdyq3q42', 'SGST', None, 9.0, '802.98000000000', 1, 'SINV-1105', 'SalesInvoice', 'taxes')

-- Table: Location
('Stores', None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.030Z', '2025-08-05T15:57:28.030Z')



-- Table: SalesInvoice
('SINV-1001', 'SINV-', 'Daniel', 'Debtors', '2024-09-02T04:00:00.000Z', None, '48367.00000000000', '55183.42000000000', '55183.42000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, None, None, 0, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:40.569Z', '2025-08-05T15:58:20.012Z', 1, 0)
('SINV-1002', 'SINV-', 'Susan', 'Debtors', '2024-09-02T04:00:00.000Z', None, '1123.00000000000', '1257.76000000000', '1257.76000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, None, None, 0, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:40.664Z', '2025-08-05T15:58:20.095Z', 1, 0)
('SINV-1003', 'SINV-', 'Carl', 'Debtors', '2024-09-03T04:00:00.000Z', None, '8096.00000000000', '9472.40000000000', '9472.40000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, None, None, 0, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:40.730Z', '2025-08-05T15:58:20.172Z', 1, 0)
('SINV-1004', 'SINV-', 'Sandra', 'Debtors', '2024-09-05T04:00:00.000Z', None, '25871.00000000000', '29312.90000000000', '29312.90000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, None, None, 0, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:40.802Z', '2025-08-05T15:58:20.251Z', 1, 0)

-- Table: PurchaseInvoice
('PINV-1001', 'PINV-', 'Only Fulls', 'Creditors', '2024-09-01T00:00:00.000Z', None, '15970.00000000000', '17886.40000000000', '17886.40000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:39.949Z', '2025-08-05T15:58:19.271Z', 1, 0)
('PINV-1002', 'PINV-', 'Just Epaulettes', 'Creditors', '2024-09-01T00:00:00.000Z', None, '24990.00000000000', '29488.20000000000', '29488.20000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:40.017Z', '2025-08-05T15:58:19.347Z', 1, 0)
('PINV-1003', 'PINV-', 'Lankness Feet Fomenters', 'Creditors', '2024-09-01T00:00:00.000Z', None, '129970.00000000000', '153364.60000000000', '153364.60000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:40.080Z', '2025-08-05T15:58:19.421Z', 1, 0)
('PINV-1004', 'PINV-', "Josféña's 611s", 'Creditors', '2024-09-01T00:00:00.000Z', None, '109980.00000000000', '123177.60000000000', '123177.60000000000', 0, '0.00000000000', 0.0, 'Party', 'INR', 1.0, 0, 0, 0, '0.00000000000', 0.0, '', None, 0, 0, 0, None, None, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:40.152Z', '2025-08-05T15:58:19.499Z', 1, 0)

-- Table: SalesQuote

-- Table: SalesInvoiceItem
('yuzg3t-mdyq3dxl', '611 Jeans - PCH', None, 'Peach coloured 611s', '10123.00000000000', 'Unit', 1.0, 'Unit', None, 1.0, 1.0, 'Sales', 'GST-12', '10123.00000000000', 0, '0.00000000000', 0.0, 62034990, 0.0, 0, None, 0, 'SINV-1001', 'SalesInvoice', 'items')
('fyj9yn-mdyq3dxq', 'Cryo Gloves', None, 'Keeps hands cool', '7873.00000000000', 'Unit', 1.0, 'Unit', None, 1.0, 1.0, 'Sales', 'GST-18', '7873.00000000000', 0, '0.00000000000', 0.0, 611693, 0.0, 0, None, 1, 'SINV-1001', 'SalesInvoice', 'items')
('2lx72a-mdyq3dxx', 'Full Sleeve - COL', None, 'All color sleeved', '1123.00000000000', 'Unit', 1.0, 'Unit', None, 1.0, 1.0, 'Sales', 'GST-12', '1123.00000000000', 0, '0.00000000000', 0.0, 100820, 0.0, 0, None, 2, 'SINV-1001', 'SalesInvoice', 'items')
('zpnunn-mdyq3dy4', 'Jacket - RAW', None, 'Raw baby skinned jackets', '20248.00000000000', 'Unit', 1.0, 'Unit', None, 1.0, 1.0, 'Sales', 'GST-12', '20248.00000000000', 0, '0.00000000000', 0.0, 100820, 0.0, 0, None, 3, 'SINV-1001', 'SalesInvoice', 'items')

-- Table: PurchaseInvoiceItem
('52oiko-mdyq3e8c', 'Full Sleeve - COL', None, 'All color sleeved', '499.00000000000', 'Unit', 20.0, 'Unit', None, 20.0, 1.0, 'Cost of Goods Sold', 'GST-12', '9980.00000000000', 0, '0.00000000000', 0.0, 100820, 0.0, 0, 'PINV-1001', 'PurchaseInvoice', 'items')
('cux382-mdyq3e8h', 'Full Sleeve - BLK', None, 'Black sleeved', '599.00000000000', 'Unit', 10.0, 'Unit', None, 10.0, 1.0, 'Cost of Goods Sold', 'GST-12', '5990.00000000000', 0, '0.00000000000', 0.0, 100820, 0.0, 1, 'PINV-1001', 'PurchaseInvoice', 'items')
('ncu9r1-mdyq3e8o', 'Epaulettes - 4POR', None, 'Porcelain epaulettes', '2499.00000000000', 'Unit', 10.0, 'Unit', None, 10.0, 1.0, 'Cost of Goods Sold', 'GST-18', '24990.00000000000', 0, '0.00000000000', 0.0, 62179090, 0.0, 0, 'PINV-1002', 'PurchaseInvoice', 'items')
('dba5fa-mdyq3e8u', 'Jade Slippers', None, None, '2999.00000000000', 'Unit', 10.0, 'Unit', None, 10.0, 1.0, 'Cost of Goods Sold', 'GST-18', '29990.00000000000', 0, '0.00000000000', 0.0, 640520, 0.0, 0, 'PINV-1003', 'PurchaseInvoice', 'items')


-- Table: PatchRun
('updateSchemas', 0, '0.0.0', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.145Z', '2025-08-05T15:57:26.145Z')
('testPatch', 0, '0.0.0', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.150Z', '2025-08-05T15:57:26.150Z')
('fixRoundOffAccount', 0, '0.0.0', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.157Z', '2025-08-05T15:57:26.157Z')
('createInventoryNumberSeries', 0, '0.0.0', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:26.161Z', '2025-08-05T15:57:26.161Z')

-- Table: SingleValue
('ujbkdw-mdyq33bt', 'Misc', 'useFullWidth', '0.0', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:24.761Z', '2025-08-05T15:58:54.735Z')
('f9tavj-mdyq33bx', 'Defaults', 'saveButtonColour', '#9575cd', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:24.765Z', '2025-08-05T15:57:28.432Z')
('mqla3g-mdyq33c0', 'Defaults', 'cancelButtonColour', '#e86674', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:24.768Z', '2025-08-05T15:57:28.435Z')
('uxi96q-mdyq33c4', 'Defaults', 'submitButtonColour', '#00bcd4', '__SYSTEM__', '__SYSTEM__', '2025-08-05T15:57:24.772Z', '2025-08-05T15:57:28.439Z')

-- Table: Item
(None, 'Dry-Cleaning', None, None, 'Sales', 'Service', 'Unit', '69.00000000000', None, 'Service', 'Cost of Goods Sold', 'GST-18', '999712', None, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.667Z', '2025-08-05T15:57:28.667Z')
(None, 'Electricity', None, None, 'Purchases', 'Service', 'Day', '6000.00000000000', 'Bzz Bzz', 'Service', 'Utility Expenses', 'GST-0', '271600', None, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.673Z', '2025-08-05T15:57:28.673Z')
(None, 'Marketing - Video', None, None, 'Purchases', 'Product', 'Unit', '15000.00000000000', 'One single video', 'Sales', 'Marketing Expenses', 'GST-18', '998371', None, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.680Z', '2025-08-05T15:57:28.680Z')
(None, 'Office Rent', None, None, 'Purchases', 'Product', 'Day', '50000.00000000000', 'Rent per day', 'Sales', 'Office Rent', 'GST-18', '997212', None, 0, 0, 0, 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.685Z', '2025-08-05T15:57:28.685Z')

-- Table: Party
(None, 'Roy Rolston', 'Customer', 'roy-rolston@partiesunited.co', '+91 8364-764417', None, 'Debtors', 'INR', None, None, 0, '0.00000000000', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.754Z', '2025-08-05T15:57:28.754Z', 'Registered Regular', '27YQPCH7868M1Z4')
(None, 'Aloysius Albuquerque', 'Customer', 'aloysius.albuquerque-418@gmail.com', '+91 9624-847744', None, 'Debtors', 'INR', None, None, 0, '0.00000000000', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.759Z', '2025-08-05T15:57:28.759Z', 'Consumer', None)
(None, 'James', 'Customer', None, None, None, 'Debtors', 'INR', None, None, 0, '0.00000000000', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.764Z', '2025-08-05T15:58:25.586Z', 'Consumer', None)
(None, 'Mary', 'Customer', 'mary-654@partiesunited.co', '+91 6578-469775', None, 'Debtors', 'INR', None, None, 0, '0.00000000000', 'i771468@gmail.com', 'i771468@gmail.com', '2025-08-05T15:57:28.769Z', '2025-08-05T15:58:25.227Z', 'Consumer', None)
