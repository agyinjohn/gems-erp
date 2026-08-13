'use client';

import { useState } from 'react';
import { Modal, toast } from '@/components/ui';
import api from '@/lib/api';
import AccountingOverviewPanel from '@/components/accounting/AccountingOverviewPanel';
import AccountingAccountsPanel from '@/components/accounting/AccountingAccountsPanel';
import AccountingExpensesPanel from '@/components/accounting/AccountingExpensesPanel';
import AccountingJournalPanel from '@/components/accounting/AccountingJournalPanel';
import AccountingReceivablesPanel from '@/components/accounting/AccountingReceivablesPanel';
import AccountingPayablesPanel from '@/components/accounting/AccountingPayablesPanel';
import AccountingCreditNotesPanel from '@/components/accounting/AccountingCreditNotesPanel';
import AccountingVendorBillsPanel from '@/components/accounting/AccountingVendorBillsPanel';
import AccountingReconciliationPanel from '@/components/accounting/AccountingReconciliationPanel';
import AccountingPlPanel from '@/components/accounting/AccountingPlPanel';
import AccountingBalanceSheetPanel from '@/components/accounting/AccountingBalanceSheetPanel';
import AccountingCashFlowPanel from '@/components/accounting/AccountingCashFlowPanel';
import AccountingBudgetPanel from '@/components/accounting/AccountingBudgetPanel';
import AccountingTaxPanel from '@/components/accounting/AccountingTaxPanel';
import AccountingTrialBalancePanel from '@/components/accounting/AccountingTrialBalancePanel';
import AccountingInvoicesPanel from '@/components/accounting/AccountingInvoicesPanel';
import AccountingPeriodsPanel from '@/components/accounting/AccountingPeriodsPanel';
import type { AccountingSectionSlug } from '@/lib/accountingNav';

interface AccountingWorkspaceProps {
  section: AccountingSectionSlug;
}

export default function AccountingWorkspace({ section }: AccountingWorkspaceProps) {
  const [importModal, setImportModal] = useState(false);
  const [importType, setImportType] = useState<'expenses' | 'journal'>('expenses');
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);

  const load = async () => {
    // Reserved for cross-panel refresh hooks from child panels
  };

  const parseCsvRows = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cols[i] || ''; });
      return row;
    });
  };

  const runImport = async () => {
    const rows = parseCsvRows(importCsv);
    if (!rows.length) {
      toast.error('Paste CSV with a header row and at least one data row.');
      return;
    }
    setImporting(true);
    try {
      const res = await api.post('/accounting/import', { type: importType, rows });
      toast.success(`Imported ${res.data.data.imported} record(s)`);
      setImportModal(false);
      setImportCsv('');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      {section === 'overview' && (
        <AccountingOverviewPanel onDataChange={load} onImport={() => setImportModal(true)} />
      )}

      {section === 'accounts' && (
        <AccountingAccountsPanel onDataChange={load} />
      )}

      {section === 'expenses' && (
        <AccountingExpensesPanel onDataChange={load} />
      )}

      {section === 'ar' && (
        <AccountingReceivablesPanel onDataChange={load} />
      )}

      {section === 'vendor-bills' && (
        <AccountingVendorBillsPanel onDataChange={load} />
      )}

      {section === 'credit-notes' && (
        <AccountingCreditNotesPanel onDataChange={load} />
      )}

      {section === 'ap' && (
        <AccountingPayablesPanel onDataChange={load} />
      )}

      {section === 'reconciliation' && (
        <AccountingReconciliationPanel onDataChange={load} />
      )}

      {section === 'journal' && (
        <AccountingJournalPanel onDataChange={load} />
      )}

      {section === 'bs' && (
        <AccountingBalanceSheetPanel onDataChange={load} />
      )}

      {section === 'cashflow' && (
        <AccountingCashFlowPanel onDataChange={load} />
      )}

      {section === 'pl' && (
        <AccountingPlPanel onDataChange={load} />
      )}

      {section === 'budget' && (
        <AccountingBudgetPanel onDataChange={load} />
      )}

      {section === 'tax' && (
        <AccountingTaxPanel onDataChange={load} />
      )}

      {section === 'trial-balance' && (
        <AccountingTrialBalancePanel onDataChange={load} />
      )}

      {section === 'invoices' && (
        <AccountingInvoicesPanel onDataChange={load} />
      )}

      {section === 'periods' && (
        <AccountingPeriodsPanel onDataChange={load} />
      )}

      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import CSV">
        <div className="space-y-4">
          <div>
            <label className="form-label">Import type</label>
            <select className="form-input" value={importType} onChange={(e) => setImportType(e.target.value as 'expenses' | 'journal')}>
              <option value="expenses">Expenses — columns: title, amount, category, expense_date, description</option>
              <option value="journal">Journal — columns: description, account_code, debit, credit, entry_date, reference</option>
            </select>
          </div>
          <div>
            <label className="form-label">CSV data</label>
            <textarea
              className="form-input font-mono text-xs"
              rows={8}
              placeholder={importType === 'expenses' ? 'title,amount,category,expense_date\nRent,500,Rent,2025-01-15' : 'description,account_code,debit,credit,reference\nOffice supplies,5200,50,0,EXP-001'}
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" onClick={runImport} disabled={importing}>
            {importing ? 'Importing…' : 'Run Import'}
          </button>
        </div>
      </Modal>
    </>
  );
}
