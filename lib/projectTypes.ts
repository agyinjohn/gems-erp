/**
 * Project type profiles, fetched once and shared.
 *
 * The definitions live on the server so there is a single source of truth — a
 * copy here would drift, and the drift would show up as a tab the API refuses
 * to serve. What this adds is a safe shape to read them through before the
 * fetch lands, and the fallback for projects created before types existed.
 */
import api from '@/lib/api';

export interface ProjectTypeProfile {
  key: string;
  label: string;
  description: string;
  capabilities: {
    programme: boolean;
    site_diary: boolean;
    time_claims: boolean;
    retention: boolean;
    certificate: boolean;
  };
  terms: {
    stage: string; stages: string;
    application: string; applications: string;
    client_role: string; certificate_title: string;
    work_done: string; site_tab: string;
  };
  delay_causes: string[];
  document_categories: string[];
}

/**
 * Used until the profiles arrive, and for a project whose type predates the
 * field. Construction rather than the blandest option, because every project
 * that predates types is a building job.
 */
export const FALLBACK: ProjectTypeProfile = {
  key: 'construction',
  label: 'Construction',
  description: 'Building and civil works, billed on valuations with retention.',
  capabilities: { programme: true, site_diary: true, time_claims: true, retention: true, certificate: true },
  terms: {
    stage: 'Stage', stages: 'Stages',
    application: 'Application', applications: 'Applications',
    client_role: 'Employer', certificate_title: 'Interim Payment Certificate',
    work_done: 'Work executed', site_tab: 'Site',
  },
  delay_causes: ['weather', 'materials', 'labour', 'plant', 'client_instruction', 'access', 'other'],
  document_categories: ['contract', 'drawing', 'permit', 'certificate', 'photo', 'correspondence', 'other'],
};

let cache: ProjectTypeProfile[] | null = null;
let inFlight: Promise<ProjectTypeProfile[]> | null = null;

/** The profiles, fetched once per page load and then reused. */
export async function loadProjectTypes(): Promise<ProjectTypeProfile[]> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = api.get('/projects/types')
      .then(r => { cache = r.data.data || [FALLBACK]; return cache!; })
      .catch(() => [FALLBACK])
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

export const profileFor = (types: ProjectTypeProfile[], key?: string) =>
  types.find(t => t.key === key) || types.find(t => t.key === 'construction') || FALLBACK;
