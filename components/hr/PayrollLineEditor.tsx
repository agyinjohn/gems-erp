'use client';

import { Plus, Trash2 } from 'lucide-react';

export type PayLine = { name: string; amount: string };

const ALLOWANCE_PRESETS = ['Transport allowance', 'Housing allowance', 'Meal allowance', 'Overtime', 'Bonus'];
const DEDUCTION_PRESETS = ['Staff loan', 'Union dues', 'Welfare fund', 'Advance salary recovery'];

interface PayrollLineEditorProps {
  label: string;
  lines: PayLine[];
  onChange: (lines: PayLine[]) => void;
  presets?: string[];
  amountPrefix?: '+' | '-';
}

export default function PayrollLineEditor({ label, lines, onChange, presets = [], amountPrefix }: PayrollLineEditorProps) {
  const updateLine = (index: number, patch: Partial<PayLine>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => onChange([...lines, { name: '', amount: '' }]);
  const removeLine = (index: number) => onChange(lines.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="form-label mb-0">{label}</label>
        <button type="button" className="btn-secondary py-1 text-xs" onClick={addLine}>
          <Plus className="w-3 h-3" /> Add line
        </button>
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-[#0D3B6E]/8 hover:text-[#0D3B6E]"
              onClick={() => onChange([...lines, { name: preset, amount: '' }])}
            >
              + {preset}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="flex gap-2 items-center">
            <input
              className="form-input flex-1"
              placeholder="Name e.g. Transport allowance"
              value={line.name}
              onChange={(e) => updateLine(index, { name: e.target.value })}
            />
            <div className="relative w-32">
              {amountPrefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{amountPrefix}</span>}
              <input
                type="number"
                className={`form-input w-full ${amountPrefix ? 'pl-7' : ''}`}
                placeholder="0.00"
                value={line.amount}
                onChange={(e) => updateLine(index, { amount: e.target.value })}
              />
            </div>
            {lines.length > 1 && (
              <button type="button" onClick={() => removeLine(index)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const DEFAULT_ALLOWANCE_LINES: PayLine[] = [{ name: '', amount: '' }];
export const DEFAULT_DEDUCTION_LINES: PayLine[] = [{ name: '', amount: '' }];
export { ALLOWANCE_PRESETS, DEDUCTION_PRESETS };

export function activePayLines(lines: PayLine[]) {
  return lines
    .map((line) => ({ name: line.name.trim(), amount: parseFloat(line.amount) || 0 }))
    .filter((line) => line.name && line.amount > 0);
}

export function formatPayLinesForDisplay(payroll: any) {
  const allowances = payroll?.allowance_lines?.length
    ? payroll.allowance_lines
    : (parseFloat(payroll?.allowances || 0) > 0 ? [{ name: 'Allowances', amount: payroll.allowances }] : []);
  const deductions = payroll?.deduction_lines?.length
    ? payroll.deduction_lines
    : [
      ...(parseFloat(payroll?.paye || 0) > 0 ? [{ name: 'PAYE', amount: payroll.paye }] : []),
      ...(parseFloat(payroll?.ssnit_employee || 0) > 0 ? [{ name: 'SSNIT (employee 5.5%)', amount: payroll.ssnit_employee }] : []),
    ];
  return { allowances, deductions };
}

export function buildPayslipDisplayRows(payroll: any) {
  const lines = formatPayLinesForDisplay(payroll);
  return [
    { label: 'Gross Salary', value: `GH₵ ${parseFloat(payroll.gross_salary).toFixed(2)}`, color: 'text-gray-800', bg: '' },
    ...lines.allowances.map((line: { name: string; amount: number }) => ({
      label: line.name,
      value: `+ GH₵ ${parseFloat(String(line.amount)).toFixed(2)}`,
      color: 'text-green-600',
      bg: 'bg-green-50/40',
    })),
    ...lines.deductions.map((line: { name: string; amount: number }) => ({
      label: line.name,
      value: `- GH₵ ${parseFloat(String(line.amount)).toFixed(2)}`,
      color: 'text-red-600',
      bg: 'bg-red-50/40',
    })),
  ];
}
