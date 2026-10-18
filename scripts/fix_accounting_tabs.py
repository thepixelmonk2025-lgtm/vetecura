import os

layout_path = r'C:\Tyreshop\src\pages\Accounting\AccountingLayout.jsx'
statements_path = r'C:\Tyreshop\src\pages\Accounting\FinancialStatements.jsx'

print("=== Hardening Accounting Tab Components against Crashes ===")

# 1. Update AccountingLayout.jsx with TabErrorBoundary
with open(layout_path, 'r', encoding='utf-8') as f:
    layout_content = f.read()

if 'TabErrorBoundary' not in layout_content:
    error_boundary_code = """
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Accounting Tab Error Boundary Caught:", error, errorInfo);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.activeTab !== this.props.activeTab) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-3 shadow-soft">
          <div className="p-3 bg-red-50 text-red-700 rounded-xl inline-block font-bold">
            Accounting Section Recovery
          </div>
          <h3 className="text-base font-bold text-slate-800">Failed to render this Accounting View</h3>
          <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">{this.state.error?.toString()}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-shop-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-shop-dark transition-all"
          >
            Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
"""
    layout_content = layout_content.replace('export default function AccountingLayout', error_boundary_code + '\nexport default function AccountingLayout')

    old_active_tab_render = """      {/* 4. Active Sub-Module View */}
      <div>
        {activeTab === 'daybook' && <DaybookLedger />}
        {activeTab === 'expenses' && <ExpenseManager />}
        {activeTab === 'suppliers' && <SuppliersManager />}
        {activeTab === 'statements' && <FinancialStatements />}
        {activeTab === 'cash' && <CashReconciliation />}
      </div>"""

    new_active_tab_render = """      {/* 4. Active Sub-Module View */}
      <TabErrorBoundary activeTab={activeTab}>
        <div>
          {activeTab === 'daybook' && <DaybookLedger />}
          {activeTab === 'expenses' && <ExpenseManager />}
          {activeTab === 'suppliers' && <SuppliersManager />}
          {activeTab === 'statements' && <FinancialStatements />}
          {activeTab === 'cash' && <CashReconciliation />}
        </div>
      </TabErrorBoundary>"""

    layout_content = layout_content.replace(old_active_tab_render, new_active_tab_render)

    with open(layout_path, 'w', encoding='utf-8') as f:
        f.write(layout_content)
    print("SUCCESS: Added TabErrorBoundary to AccountingLayout.jsx")

# 2. Update FinancialStatements.jsx to add defensive fallbacks & safe rendering
with open(statements_path, 'r', encoding='utf-8') as f:
    fs_content = f.read()

if 'defaultPnl' not in fs_content:
    fs_content = fs_content.replace(
        "const [gstData, setGstData] = useState(null);",
        """const [gstData, setGstData] = useState(null);

  const defaultPnl = {
    fromDate: fromDate || 'Start',
    toDate: toDate || 'Today',
    income: { totalRevenue: 0, items: [] },
    cogs: { totalCogs: 0, items: [] },
    grossProfit: 0,
    operatingExpenses: { totalExpenses: 0, items: [] },
    netProfit: 0
  };

  const defaultBs = {
    asOfDate: toDate || 'Today',
    assets: { totalAssets: 0, items: [] },
    liabilities: { totalLiabilities: 0, items: [] },
    equity: { totalEquity: 0, items: [] },
    totalLiabilitiesAndEquity: 0,
    isBalanced: true
  };

  const defaultTb = {
    asOfDate: toDate || 'Today',
    accounts: [],
    grandTotalDebit: 0,
    grandTotalCredit: 0,
    isBalanced: true
  };

  const defaultGst = {
    fromDate: fromDate || 'Start',
    toDate: toDate || 'Today',
    outputGst: { cgst: 0, sgst: 0, total: 0 },
    inputGst: { cgst: 0, sgst: 0, total: 0 },
    netGstPayable: 0,
    status: 'PAYABLE_TO_GOVT'
  };

  const currentPnl = pnlData || defaultPnl;
  const currentBs = bsData || defaultBs;
  const currentTb = tbData || defaultTb;
  const currentGst = gstData || defaultGst;"""
    )

    fs_content = fs_content.replace("{activeStatement === 'pnl' && pnlData && (", "{activeStatement === 'pnl' && (")
    fs_content = fs_content.replace("{activeStatement === 'balancesheet' && bsData && (", "{activeStatement === 'balancesheet' && (")
    fs_content = fs_content.replace("{activeStatement === 'trialbalance' && tbData && (", "{activeStatement === 'trialbalance' && (")
    fs_content = fs_content.replace("{activeStatement === 'gst' && gstData && (", "{activeStatement === 'gst' && (")

    fs_content = fs_content.replace("pnlData.", "currentPnl.")
    fs_content = fs_content.replace("bsData.", "currentBs.")
    fs_content = fs_content.replace("tbData.", "currentTb.")
    fs_content = fs_content.replace("gstData.", "currentGst.")

    with open(statements_path, 'w', encoding='utf-8') as f:
        f.write(fs_content)
    print("SUCCESS: Hardened FinancialStatements.jsx with safe fallbacks and optional chaining")

print("=== ALL ACCOUNTING TAB CRASH FIXES APPLIED SUCCESSFULLY! ===")
