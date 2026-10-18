import os

expense_path = r'C:\Tyreshop\src\pages\Accounting\ExpenseManager.jsx'

print("=== Fixing missing handleExportExcel in ExpenseManager.jsx ===")

with open(expense_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'const handleExportExcel' not in content:
    export_func = """
  const handleExportExcel = async () => {
    try {
      if (window.api?.export?.accountingFinancialStatements) {
        const res = await window.api.export.accountingFinancialStatements({
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        if (res?.success) {
          alert('Expense Report & General Ledger exported to Excel successfully!');
        } else if (res?.error && res.error !== 'Export cancelled') {
          alert('Export error: ' + res.error);
        }
      }
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };
"""

    # Insert right before handleDeleteExpense
    content = content.replace("const handleDeleteExpense =", export_func + "\n  const handleDeleteExpense =")

    with open(expense_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("SUCCESS: Defined handleExportExcel in ExpenseManager.jsx")
else:
    print("handleExportExcel already present.")

print("=== FIX APPLIED SUCCESSFULLY ===")
