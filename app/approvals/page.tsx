'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { EmptyState, Spinner, toast } from '@/components/ui';
import { CheckCircle, XCircle, ClipboardList, Users, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import PoConfirmModal from '@/components/procurement/PoConfirmModal';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [pos,      setPos]      = useState<any[]>([]);
  const [leaves,   setLeaves]   = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [poToApprove, setPoToApprove] = useState<any>(null);
  const [poApproving, setPoApproving] = useState(false);

  const canApprovePO      = ['business_owner','accountant'].includes(user?.role || '');
  const canApproveLeave   = ['business_owner','hr_manager'].includes(user?.role || '');
  const canApprovePayroll = ['business_owner','accountant'].includes(user?.role || '');

  const load = async () => {
    setLoading(true);
    try {
      const [poRes, leaveRes, payrollRes] = await Promise.all([
        canApprovePO      ? api.get('/purchase-orders?status=pending_approval').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        canApproveLeave   ? api.get('/leave-requests').catch(() => ({ data: { data: [] } }))               : Promise.resolve({ data: { data: [] } }),
        canApprovePayroll ? api.get('/payroll').catch(() => ({ data: { data: [] } }))                      : Promise.resolve({ data: { data: [] } }),
      ]);
      setPos((poRes.data.data || []).filter((p: any) => p.status === 'pending_approval'));
      setLeaves((leaveRes.data.data || []).filter((l: any) => l.status === 'pending'));
      setPayrolls((payrollRes.data.data || []).filter((p: any) => p.status === 'submitted'));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approvePO = async () => {
    if (!poToApprove) return;
    setPoApproving(true);
    try {
      await api.patch(`/purchase-orders/${poToApprove.id}/approve`);
      toast.success('PO approved');
      setPoToApprove(null);
      load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setPoApproving(false); }
  };

  const approveLeave = async (id: string, status: 'approved' | 'rejected') => {
    try { await api.patch(`/leave-requests/${id}`, { status }); toast.success(`Leave ${status}`); load(); }
    catch(e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const approvePayroll = async (id: string) => {
    try { await api.patch(`/payroll/${id}/approve`); toast.success('Payroll approved'); load(); }
    catch(e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const total = pos.length + leaves.length + payrolls.length;

  return (
    <AppLayout
      title="Approvals"
      subtitle="Pending items waiting for your sign-off"
      allowedRoles={['business_owner','accountant','hr_manager']}
    >
      {loading ? <Spinner /> : (
        <div className="space-y-6">

          {/* Summary bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Purchase Orders', count: pos.length,      icon: <ClipboardList className="w-5 h-5 text-blue-600"/>,   color: 'bg-blue-50',   show: canApprovePO },
              { label: 'Leave Requests',  count: leaves.length,   icon: <Users className="w-5 h-5 text-purple-600"/>,         color: 'bg-purple-50', show: canApproveLeave },
              { label: 'Payroll Runs',    count: payrolls.length, icon: <DollarSign className="w-5 h-5 text-green-600"/>,     color: 'bg-green-50',  show: canApprovePayroll },
            ].filter(s => s.show).map(s => (
              <div key={s.label} className={`card flex items-center gap-4 ${s.color}`}>
                {s.icon}
                <div>
                  <div className="text-2xl font-bold">{s.count}</div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {total === 0 && (
            <EmptyState
              message="All caught up — nothing pending your approval"
              icon={<CheckCircle className="w-10 h-10 text-green-400"/>}
            />
          )}

          {/* Purchase Orders */}
          {canApprovePO && pos.length > 0 && (
            <Section title="Purchase Orders" icon={<ClipboardList className="w-4 h-4"/>} count={pos.length}>
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>{['PO Number','Supplier','Total','Created',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pos.map((po: any) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-700">{po.po_number}</td>
                      <td className="px-4 py-3 font-medium">{po.supplier_id?.name || '—'}</td>
                      <td className="px-4 py-3 font-semibold">GHS {parseFloat(po.total_cost||0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(po.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setPoToApprove(po)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5"/> Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Leave Requests */}
          {canApproveLeave && leaves.length > 0 && (
            <Section title="Leave Requests" icon={<Users className="w-4 h-4"/>} count={leaves.length}>
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>{['Employee','Type','From','To','Reason',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaves.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{l.employee_id?.name || '—'}</td>
                      <td className="px-4 py-3"><span className="badge bg-purple-100 text-purple-700">{l.leave_type}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => approveLeave(l.id, 'approved')} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1.5 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5"/> Approve
                          </button>
                          <button onClick={() => approveLeave(l.id, 'rejected')} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg">
                            <XCircle className="w-3.5 h-3.5"/> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Payroll Runs */}
          {canApprovePayroll && payrolls.length > 0 && (
            <Section title="Payroll Runs" icon={<DollarSign className="w-4 h-4"/>} count={payrolls.length}>
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>{['Employee','Month','Year','Gross','Net',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payrolls.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.employee_id?.name || '—'}</td>
                      <td className="px-4 py-3">{p.month}</td>
                      <td className="px-4 py-3">{p.year}</td>
                      <td className="px-4 py-3">GHS {parseFloat(p.gross_salary||0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">GHS {parseFloat(p.net_salary||0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => approvePayroll(p.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5"/> Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

        </div>
      )}

      <PoConfirmModal
        open={!!poToApprove}
        action="approve"
        po={poToApprove}
        saving={poApproving}
        onClose={() => !poApproving && setPoToApprove(null)}
        onConfirm={approvePO}
      />
    </AppLayout>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        {icon}
        <span className="font-semibold text-gray-800">{title}</span>
        <span className="ml-1 text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{count} pending</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
