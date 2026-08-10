/**
 * Payslips, gathered under the pay run that produced them.
 *
 * A pay run is not a separate thing to look at — it is these payslips, added
 * up. Listing both was the same money shown twice, so the run's totals and
 * actions belong on a band above its own payslips.
 *
 * Payroll run for a single employee belongs to no pay run at all. Those collect
 * at the bottom under their own heading rather than being hidden, or invented
 * into a run they were never part of.
 */

export interface PayrollGroup<Run, Batch> {
  key: string;
  batch: Batch | null;
  runs: Run[];
  /** Net across this band — what the business actually pays out for it. */
  net: number;
}

interface HasBatch { batch_id?: string | null; net_salary?: number | string; month?: number; year?: number }
interface HasId { _id?: string; id?: string }

export function groupPayrollByRun<Run extends HasBatch, Batch extends HasId>(
  runs: Run[],
  batches: Batch[],
): PayrollGroup<Run, Batch>[] {
  const byBatch = new Map<string, Run[]>();
  for (const run of runs) {
    const key = run.batch_id ? String(run.batch_id) : '';
    const bucket = byBatch.get(key);
    if (bucket) bucket.push(run);
    else byBatch.set(key, [run]);
  }

  const batchById = new Map(batches.map((b) => [String(b._id || b.id), b]));

  return [...byBatch.entries()]
    .map(([key, group]) => ({
      key,
      // A pay run the list hasn't got is still a real grouping — the payslips
      // stay together under a band that simply has no actions on it, rather
      // than scattering into the loose pile.
      batch: key ? batchById.get(key) || null : null,
      runs: group,
      net: group.reduce((sum, r) => sum + (parseFloat(String(r.net_salary ?? 0)) || 0), 0),
    }))
    .sort((a, b) => {
      // Loose payslips last; everything else newest period first.
      if (!a.key) return 1;
      if (!b.key) return -1;
      const ay = a.runs[0]?.year || 0;
      const by = b.runs[0]?.year || 0;
      return ay !== by ? by - ay : (b.runs[0]?.month || 0) - (a.runs[0]?.month || 0);
    });
}
