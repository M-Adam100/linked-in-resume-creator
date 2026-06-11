import type {
  LinkedInEducation,
  LinkedInExperience,
  LinkedInProfile,
} from './types';

const VOYAGER_BASE = 'https://www.linkedin.com/voyager/api';

const DEFAULT_DECORATION_IDS = [
  'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93',
  'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85',
  'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-76',
  'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-73',
  'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-57',
];

type VoyagerEntity = Record<string, unknown>;

function getCookie(name: string): string | null {
  const match = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
  return match ? decodeURIComponent(match[2]) : null;
}

function getCsrfToken(): string | null {
  const jsession = getCookie('JSESSIONID');
  if (!jsession) return null;
  return jsession.replace(/"/g, '');
}

export function getProfileVanityFromUrl(url = window.location.href): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

function voyagerHeaders(): HeadersInit | null {
  const csrf = getCsrfToken();
  if (!csrf) return null;

  return {
    accept: 'application/vnd.linkedin.normalized+json+2.1',
    'csrf-token': csrf,
    'x-restli-protocol-version': '2.0.0',
  };
}

async function voyagerGet(path: string): Promise<unknown | null> {
  const headers = voyagerHeaders();
  if (!headers) return null;

  const url = path.startsWith('http') ? path : `${VOYAGER_BASE}${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) return null;
  return response.json();
}

function discoverVoyagerRequestsFromPage(): string[] {
  const urls = new Set<string>();

  document.querySelectorAll('code').forEach((code) => {
    try {
      const parsed = JSON.parse(code.textContent ?? '') as {
        request?: string;
      };
      if (parsed.request?.includes('/voyager/api/')) {
        urls.add(parsed.request);
      }
    } catch {
      // not JSON metadata
    }
  });

  return Array.from(urls);
}

function discoverDecorationIdsFromPage(): string[] {
  const ids = new Set<string>();

  for (const request of discoverVoyagerRequestsFromPage()) {
    try {
      const url = new URL(request, 'https://www.linkedin.com');
      const decorationId = url.searchParams.get('decorationId');
      if (decorationId) ids.add(decorationId);
    } catch {
      // skip malformed URLs
    }
  }

  return Array.from(ids);
}

function extractEmbeddedVoyagerPayloads(): unknown[] {
  const payloads: unknown[] = [];

  document.querySelectorAll('code[id^="bpr-guid-"]').forEach((code) => {
    try {
      payloads.push(JSON.parse(code.textContent ?? ''));
    } catch {
      // skip invalid JSON blocks
    }
  });

  return payloads;
}

function buildEntityMap(included: unknown[]): Map<string, VoyagerEntity> {
  const map = new Map<string, VoyagerEntity>();
  for (const item of included) {
    if (!item || typeof item !== 'object') continue;
    const entity = item as VoyagerEntity;
    const urn = entity.entityUrn;
    if (typeof urn === 'string') map.set(urn, entity);
  }
  return map;
}

function getType(entity: VoyagerEntity): string {
  const recipe = entity.$recipeType;
  if (typeof recipe === 'string') return recipe;
  const type = entity.$type;
  return typeof type === 'string' ? type : '';
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as VoyagerEntity;
    if (typeof obj.text === 'string') return obj.text.trim();
    if (typeof obj.accessibilityText === 'string') {
      return obj.accessibilityText.trim();
    }
  }
  return '';
}

function titleFrom(entity: VoyagerEntity): string {
  return (
    textValue(entity.title) ||
    textValue(entity.multiLocaleTitle) ||
    textValue(entity.positionTitle) ||
    ''
  );
}

function companyNameFrom(entity: VoyagerEntity, isGroup = false): string {
  const direct = textValue(entity.companyName);
  if (direct) return direct;
  if (entity.company && typeof entity.company === 'object') {
    const nested = textValue((entity.company as VoyagerEntity).name);
    if (nested) return nested;
  }
  // On position groups, `name` is the employer name (legacy profileView).
  if (isGroup) return textValue(entity.name);
  return '';
}

function formatDateRange(timePeriod: unknown): string {
  if (!timePeriod || typeof timePeriod !== 'object') return '';
  const period = timePeriod as VoyagerEntity;
  const start = period.startDate ?? period.start;
  const end = period.endDate ?? period.end;

  const startStr = formatPartialDate(start);
  const endStr = formatPartialDate(end);

  if (startStr && endStr) return `${startStr} – ${endStr}`;
  return startStr || endStr;
}

function formatPartialDate(date: unknown): string {
  if (!date || typeof date !== 'object') return '';
  const d = date as VoyagerEntity;
  const year = d.year;
  const month = d.month;
  if (typeof year !== 'number') return '';
  if (typeof month === 'number') {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${monthNames[month - 1] ?? month} ${year}`;
  }
  return String(year);
}

function resolveElements(
  ref: unknown,
  entityMap: Map<string, VoyagerEntity>
): VoyagerEntity[] {
  if (!ref) return [];

  if (typeof ref === 'string') {
    const entity = entityMap.get(ref);
    return entity ? [entity] : [];
  }

  if (typeof ref !== 'object') return [];

  const obj = ref as VoyagerEntity;

  const elementList = obj.elements ?? obj['*elements'];
  if (Array.isArray(elementList)) {
    const results: VoyagerEntity[] = [];
    for (const element of elementList) {
      if (typeof element === 'string') {
        const resolved = entityMap.get(element);
        if (resolved) results.push(resolved);
      } else if (element && typeof element === 'object') {
        results.push(element as VoyagerEntity);
      }
    }
    return results;
  }

  if (typeof obj.entityUrn === 'string') {
    const entity = entityMap.get(obj.entityUrn);
    return entity ? [entity] : [obj];
  }

  return [obj];
}

function mergeExperienceEntry(
  a: LinkedInExperience,
  b: LinkedInExperience
): LinkedInExperience {
  return {
    title: a.title || b.title,
    company: a.company || b.company,
    duration: a.duration || b.duration,
    description:
      a.description.length >= b.description.length
        ? a.description
        : b.description,
  };
}

function normalizeKeyPart(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function experienceMatchKey(exp: LinkedInExperience): string {
  return [
    normalizeKeyPart(exp.company),
    normalizeKeyPart(exp.duration),
    normalizeKeyPart(exp.title),
  ].join('|');
}

function experienceLooseKey(exp: LinkedInExperience): string {
  return `${normalizeKeyPart(exp.company)}|${normalizeKeyPart(exp.duration)}`;
}

function dedupeExperiences(
  experiences: LinkedInExperience[]
): LinkedInExperience[] {
  const byKey = new Map<string, LinkedInExperience>();

  for (const exp of experiences) {
    if (!exp.title && !exp.company) continue;

    const key = experienceMatchKey(exp);
    const looseKey = experienceLooseKey(exp);
    const existing = byKey.get(key) ?? byKey.get(looseKey);

    if (!existing) {
      byKey.set(key, exp);
      if (!byKey.has(looseKey)) byKey.set(looseKey, exp);
      continue;
    }

    const merged = mergeExperienceEntry(existing, exp);
    byKey.set(key, merged);
    byKey.set(looseKey, merged);
  }

  const seen = new Set<LinkedInExperience>();
  const result: LinkedInExperience[] = [];
  for (const exp of byKey.values()) {
    if (seen.has(exp)) continue;
    seen.add(exp);
    result.push(exp);
  }

  return result;
}

function dedupeEducation(education: LinkedInEducation[]): LinkedInEducation[] {
  const seen = new Set<string>();
  return education.filter((edu) => {
    const key = `${edu.school}|${edu.degree}`.toLowerCase();
    if (!edu.school && !edu.degree) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const key = skill.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeProfiles(
  primary: LinkedInProfile,
  secondary: LinkedInProfile
): LinkedInProfile {
  return {
    name: primary.name || secondary.name,
    headline: primary.headline || secondary.headline,
    about: primary.about || secondary.about,
    experience: dedupeExperiences([
      ...primary.experience,
      ...secondary.experience,
    ]),
    education: dedupeEducation([...primary.education, ...secondary.education]),
    skills: dedupeSkills([...primary.skills, ...secondary.skills]),
  };
}

function extractProfileId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as VoyagerEntity;

  const profile = root.profile as VoyagerEntity | undefined;
  const miniProfile = profile?.miniProfile as VoyagerEntity | undefined;
  if (typeof miniProfile?.objectUrn === 'string') {
    const match = /urn:li:fs_miniProfile:([^,]+)/.exec(miniProfile.objectUrn);
    if (match?.[1]) return match[1];
  }

  const entityUrn =
    textValue(profile?.entityUrn) ||
    textValue(root.entityUrn) ||
    textValue((root.data as VoyagerEntity | undefined)?.entityUrn);

  if (entityUrn) {
    const match = /urn:li:fsd_profile:([^,]+)/.exec(entityUrn);
    if (match?.[1]) return match[1];
  }

  const serialized = JSON.stringify(root);
  const profileIdMatch = /"profileId":"([a-zA-Z0-9_\-.]+)"/.exec(serialized);
  return profileIdMatch?.[1] ?? null;
}

function findProfileEntity(
  payload: unknown,
  entityMap: Map<string, VoyagerEntity>
): VoyagerEntity | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as VoyagerEntity;

  if (root.profile && typeof root.profile === 'object') {
    return root.profile as VoyagerEntity;
  }

  const data = root.data as VoyagerEntity | undefined;
  if (data?.elements && Array.isArray(data.elements) && data.elements[0]) {
    const first = data.elements[0];
    if (typeof first === 'string') return entityMap.get(first) ?? null;
    if (typeof first === 'object') return first as VoyagerEntity;
  }

  if (root.elements && Array.isArray(root.elements) && root.elements[0]) {
    const first = root.elements[0];
    if (typeof first === 'string') return entityMap.get(first) ?? null;
    if (typeof first === 'object') return first as VoyagerEntity;
  }

  if (typeof root.firstName === 'string' || typeof root.headline === 'string') {
    return root;
  }

  for (const entity of entityMap.values()) {
    const type = getType(entity);
    if (
      type.includes('Profile') &&
      (entity.firstName || entity.headline || entity.publicIdentifier)
    ) {
      return entity;
    }
  }

  return null;
}

function parsePositionEntity(
  position: VoyagerEntity,
  companyFallback = ''
): LinkedInExperience | null {
  const title = titleFrom(position);
  const company = companyNameFrom(position) || companyFallback;
  const duration = formatDateRange(position.timePeriod ?? position.dateRange);
  const description = textValue(position.description);

  if (!title && !company) return null;

  return { title, company, duration, description };
}

function resolveGroupPositions(
  group: VoyagerEntity,
  entityMap: Map<string, VoyagerEntity>
): VoyagerEntity[] {
  if (Array.isArray(group.positions)) {
    const inline = group.positions as VoyagerEntity[];
    if (inline.some((p) => titleFrom(p))) return inline;
  }

  const resolved = resolveElements(
    group.profilePositionInPositionGroup ??
      group['*profilePositionInPositionGroup'] ??
      group.positions,
    entityMap
  );

  if (resolved.length > 0) return resolved;

  // Fallback: find Position entities in the map that share this group's company.
  const groupCompany = companyNameFrom(group, true);
  if (!groupCompany) return [];

  const matches: VoyagerEntity[] = [];
  for (const entity of entityMap.values()) {
    const type = getType(entity);
    if (!type.includes('Position') || type.includes('PositionGroup')) continue;
    const entityCompany = companyNameFrom(entity) || companyNameFrom(entity, true);
    if (entityCompany.toLowerCase() === groupCompany.toLowerCase() && titleFrom(entity)) {
      matches.push(entity);
    }
  }

  return matches;
}

function parseExperienceFromGroups(
  groups: VoyagerEntity[],
  entityMap: Map<string, VoyagerEntity>
): LinkedInExperience[] {
  const experiences: LinkedInExperience[] = [];

  for (const group of groups) {
    const companyName = companyNameFrom(group, true);
    const positions = resolveGroupPositions(group, entityMap);

    if (positions.length === 0) {
      const title = titleFrom(group);
      if (title || companyName) {
        experiences.push({
          title,
          company: companyName,
          duration: formatDateRange(group.timePeriod ?? group.dateRange),
          description: textValue(group.description),
        });
      }
      continue;
    }

    for (const position of positions) {
      const exp = parsePositionEntity(position, companyName);
      if (exp) experiences.push(exp);
    }
  }

  return experiences;
}

function collectPositionsFromIncluded(
  entityMap: Map<string, VoyagerEntity>
): LinkedInExperience[] {
  const experiences: LinkedInExperience[] = [];

  for (const entity of entityMap.values()) {
    const type = getType(entity);
    if (!type.includes('Position') || type.includes('PositionGroup')) continue;
    const exp = parsePositionEntity(entity);
    if (exp?.title) experiences.push(exp);
  }

  return experiences;
}

function parseExperience(
  profile: VoyagerEntity,
  entityMap: Map<string, VoyagerEntity>,
  root?: VoyagerEntity
): LinkedInExperience[] {
  const experiences: LinkedInExperience[] = [];

  const positionGroupView = root?.positionGroupView as VoyagerEntity | undefined;
  if (positionGroupView?.elements && Array.isArray(positionGroupView.elements)) {
    experiences.push(
      ...parseExperienceFromGroups(
        positionGroupView.elements as VoyagerEntity[],
        entityMap
      )
    );
  }

  const positionGroups = resolveElements(
    profile.profilePositionGroups ??
      profile['*profilePositionGroups'] ??
      profile.positionGroupView,
    entityMap
  );
  experiences.push(...parseExperienceFromGroups(positionGroups, entityMap));
  experiences.push(...collectPositionsFromIncluded(entityMap));

  const flatPositions = resolveElements(
    profile.profilePositions ?? profile.positions,
    entityMap
  );
  for (const position of flatPositions) {
    const exp = parsePositionEntity(position);
    if (exp) experiences.push(exp);
  }

  return dedupeExperiences(experiences);
}

function parseEducation(
  profile: VoyagerEntity,
  entityMap: Map<string, VoyagerEntity>,
  root?: VoyagerEntity
): LinkedInEducation[] {
  const education: LinkedInEducation[] = [];

  const educationView = root?.educationView as VoyagerEntity | undefined;
  const educationElements = educationView?.elements;
  if (Array.isArray(educationElements)) {
    for (const item of educationElements) {
      const school = item as VoyagerEntity;
      education.push({
        school: textValue(school.schoolName) || textValue(school.name),
        degree:
          [textValue(school.degreeName), textValue(school.fieldOfStudy)]
            .filter(Boolean)
            .join(', ') || textValue(school.degree),
        duration: formatDateRange(school.timePeriod ?? school.dateRange),
      });
    }
  }

  const schools = resolveElements(
    profile.profileEducations ?? profile.educations,
    entityMap
  );

  for (const school of schools) {
    education.push({
      school:
        textValue(school.schoolName) ||
        textValue(school.name) ||
        (school.school && typeof school.school === 'object'
          ? textValue((school.school as VoyagerEntity).name)
          : ''),
      degree:
        textValue(school.degreeName) ||
        textValue(school.degree) ||
        textValue(school.fieldOfStudy),
      duration: formatDateRange(school.timePeriod ?? school.dateRange),
    });
  }

  return dedupeEducation(education);
}

function parseSkills(
  profile: VoyagerEntity,
  entityMap: Map<string, VoyagerEntity>,
  root?: VoyagerEntity
): string[] {
  const skills: string[] = [];

  const skillEntities = resolveElements(
    profile.profileSkills ?? profile.skills,
    entityMap
  );

  for (const skill of skillEntities) {
    const name =
      textValue(skill.name) ||
      textValue(skill.skillName) ||
      textValue(
        skill.skill && typeof skill.skill === 'object'
          ? (skill.skill as VoyagerEntity).name
          : ''
      );
    if (name) skills.push(name);
  }

  const skillCategories = resolveElements(profile.skillCategories, entityMap);
  for (const category of skillCategories) {
    const categorySkills = resolveElements(
      category.profileSkillsInCategory ?? category.skills,
      entityMap
    );
    for (const skill of categorySkills) {
      const name = textValue(skill.name) || textValue(skill.skillName);
      if (name) skills.push(name);
    }
  }

  if (root?.elements && Array.isArray(root.elements)) {
    for (const category of root.elements as VoyagerEntity[]) {
      const endorsedSkills = category.endorsedSkills;
      if (!Array.isArray(endorsedSkills)) continue;
      for (const endorsed of endorsedSkills) {
        const item = endorsed as VoyagerEntity;
        const skillObj = item.skill as VoyagerEntity | undefined;
        const name = textValue(skillObj?.name) || textValue(item.name);
        if (name) skills.push(name);
      }
    }
  }

  return dedupeSkills(skills).slice(0, 50);
}

function parseFromIncludedEntities(
  entityMap: Map<string, VoyagerEntity>
): Partial<LinkedInProfile> {
  const experiences: LinkedInExperience[] = [];
  const education: LinkedInEducation[] = [];
  const skills: string[] = [];
  let name = '';
  let headline = '';
  let about = '';

  for (const entity of entityMap.values()) {
    const type = getType(entity);

    if (type.includes('PositionGroup')) {
      experiences.push(...parseExperienceFromGroups([entity], entityMap));
    } else if (type.includes('Position') && !type.includes('PositionGroup')) {
      const exp = parsePositionEntity(entity);
      if (exp) experiences.push(exp);
    } else if (type.includes('Education')) {
      education.push({
        school: textValue(entity.schoolName) || textValue(entity.name),
        degree:
          textValue(entity.degreeName) ||
          textValue(entity.degree) ||
          textValue(entity.fieldOfStudy),
        duration: formatDateRange(entity.timePeriod ?? entity.dateRange),
      });
    } else if (type.includes('Skill')) {
      const skillName =
        textValue(entity.name) ||
        textValue(entity.skillName) ||
        textValue(
          entity.skill && typeof entity.skill === 'object'
            ? (entity.skill as VoyagerEntity).name
            : ''
        );
      if (skillName) skills.push(skillName);
    } else if (
      type.includes('Profile') &&
      (entity.firstName || entity.publicIdentifier)
    ) {
      const first = textValue(entity.firstName);
      const last = textValue(entity.lastName);
      name = name || [first, last].filter(Boolean).join(' ');
      headline = headline || textValue(entity.headline);
      about =
        about || textValue(entity.summary) || textValue(entity.about);
    }
  }

  return {
    name,
    headline,
    about,
    experience: dedupeExperiences(experiences),
    education: dedupeEducation(education),
    skills: dedupeSkills(skills),
  };
}

function parseVoyagerPayload(payload: unknown): LinkedInProfile | null {
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as VoyagerEntity;
  const included = Array.isArray(root.included) ? root.included : [];
  const entityMap = buildEntityMap(included);
  const profile = findProfileEntity(payload, entityMap);
  const includedData = parseFromIncludedEntities(entityMap);

  const profileEntity = profile ?? ({} as VoyagerEntity);
  const firstName = textValue(profileEntity.firstName);
  const lastName = textValue(profileEntity.lastName);
  const name =
    [firstName, lastName].filter(Boolean).join(' ') || includedData.name || '';

  const result: LinkedInProfile = {
    name,
    headline:
      textValue(profileEntity.headline) || includedData.headline || '',
    about:
      textValue(profileEntity.summary) ||
      textValue(profileEntity.about) ||
      includedData.about ||
      '',
    experience: parseExperience(profileEntity, entityMap, root),
    education: parseEducation(profileEntity, entityMap, root),
    skills: parseSkills(profileEntity, entityMap, root),
  };

  if (includedData.experience?.length) {
    result.experience = dedupeExperiences([
      ...result.experience,
      ...includedData.experience,
    ]);
  }
  if (includedData.education?.length) {
    result.education = dedupeEducation([
      ...result.education,
      ...includedData.education,
    ]);
  }
  if (includedData.skills?.length) {
    result.skills = dedupeSkills([...result.skills, ...includedData.skills]);
  }

  if (
    !result.name &&
    !result.headline &&
    result.experience.length === 0 &&
    result.education.length === 0 &&
    result.skills.length === 0
  ) {
    return null;
  }

  return result;
}

async function fetchDashProfile(
  vanityName: string,
  decorationId: string
): Promise<unknown | null> {
  const params = new URLSearchParams({
    q: 'memberIdentity',
    memberIdentity: vanityName,
    decorationId,
  });

  return voyagerGet(`/identity/dash/profiles?${params.toString()}`);
}

async function fetchLegacyProfileView(
  identifier: string
): Promise<unknown | null> {
  return voyagerGet(`/identity/profiles/${identifier}/profileView`);
}

async function fetchSkillCategory(profileId: string): Promise<unknown | null> {
  return voyagerGet(
    `/identity/profiles/${profileId}/skillCategory?includeHiddenEndorsers=true`
  );
}

function absorbPayload(
  current: LinkedInProfile | null,
  payload: unknown
): LinkedInProfile | null {
  const parsed = parseVoyagerPayload(payload);
  if (!parsed) return current;
  return current ? mergeProfiles(parsed, current) : parsed;
}

export async function extractViaVoyager(): Promise<LinkedInProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let best: any = null;
  let profileId: string | null = null;

  const absorb = (payload: unknown) => {
    profileId = profileId || extractProfileId(payload);
    best = absorbPayload(best, payload);
  };

  for (const payload of extractEmbeddedVoyagerPayloads()) {
    absorb(payload);
  }

  const pageRequests = discoverVoyagerRequestsFromPage();
  const priorityPatterns = [
    /profileView/i,
    /position/i,
    /education/i,
    /skill/i,
    /dash\/profiles/i,
    /graphql/i,
  ];

  const sortedRequests = [
    ...pageRequests.filter((r) =>
      priorityPatterns.some((p) => p.test(r))
    ),
    ...pageRequests.filter(
      (r) => !priorityPatterns.some((p) => p.test(r))
    ),
  ];

  for (const request of sortedRequests.slice(0, 12)) {
    try {
      absorb(await voyagerGet(request));
    } catch {
      // skip failed page-cached requests
    }
  }

  const vanityName = getProfileVanityFromUrl();

  if (vanityName) {
    const decorationIds = [
      ...discoverDecorationIdsFromPage(),
      ...DEFAULT_DECORATION_IDS,
    ];

    for (const decorationId of Array.from(new Set(decorationIds))) {
      try {
        absorb(await fetchDashProfile(vanityName, decorationId));
      } catch {
        // try next decorationId
      }
    }

    try {
      const legacy = await fetchLegacyProfileView(vanityName);
      absorb(legacy);
      profileId = profileId || extractProfileId(legacy);
    } catch {
      // legacy endpoint unavailable
    }
  }

  if (profileId) {
    try {
      absorb(await fetchSkillCategory(profileId));
    } catch {
      // skills endpoint unavailable
    }
  }

  if (best) {
    console.info('[ResumeForge] Voyager capture:', {
      experience: best.experience.length,
      education: best.education?.length ?? 0,
      skills: best.skills?.length ?? 0,
    });
  }

  return best as LinkedInProfile | null;
}
