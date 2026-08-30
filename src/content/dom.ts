import type {
  LinkedInEducation,
  LinkedInExperience,
  LinkedInProfile,
} from '../lib/types';

function getText(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function queryFirst(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function queryAll(selectors: string[]): Element[] {
  for (const selector of selectors) {
    const els = document.querySelectorAll(selector);
    if (els.length > 0) return Array.from(els);
  }
  return [];
}

function findSectionByHeading(keywords: string[]): Element | null {
  const headings = document.querySelectorAll(
    'section h2, section .pvs-header__title, #experience, #education, #skills, #about'
  );

  for (const heading of headings) {
    const text = getText(heading).toLowerCase();
    if (keywords.some((kw) => text.includes(kw))) {
      return heading.closest('section') ?? heading.parentElement;
    }
  }

  if (keywords.includes('about')) {
    const about = document.getElementById('about');
    if (about) return about.closest('section') ?? about.parentElement;
  }

  return null;
}

function extractName(): string {
  const el = queryFirst([
    'h1.text-heading-xlarge',
    'h1.inline.t-24',
    '.pv-text-details__left-panel h1',
    'main h1',
    '[data-generated-suggestion-target] h1',
    '.ph5 h1',
  ]);
  return getText(el);
}

function extractHeadline(): string {
  const el = queryFirst([
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium',
    'div.text-body-medium',
    '.ph5 .text-body-medium',
  ]);
  const text = getText(el);
  if (text === extractName()) return '';
  return text;
}

function extractLocation(): string {
  const el = queryFirst([
    '.pv-text-details__left-panel.mt2 span.text-body-small',
    '.pv-text-details__left-panel + div span.text-body-small',
    'span.text-body-small.inline.t-black--light.break-words',
    '.ph5 span.text-body-small.inline.t-black--light',
  ]);

  const text = getText(el);
  // The same class is used for the "500+ connections" counter.
  if (/connection|follower/i.test(text)) return '';
  return text;
}

function extractAbout(): string {
  const section = findSectionByHeading(['about', 'summary']);
  if (!section) return '';

  const aboutEl = queryFirst([
    '#about ~ div .inline-show-more-text',
    '#about ~ div .display-flex .visually-hidden + span',
    '#about ~ div .pv-shared-text-with-see-more span[aria-hidden="true"]',
    '#about ~ div .inline-show-more-text--is-collapsed span[aria-hidden="true"]',
    '#about ~ div .display-flex.ph5 span[aria-hidden="true"]',
    'section.pv-about-section .pv-about__summary-text',
    '[data-section="summary"] .pv-about__summary-text',
  ]);

  if (aboutEl) return getText(aboutEl);

  const spans = section.querySelectorAll('span[aria-hidden="true"]');
  for (const span of spans) {
    const text = getText(span);
    if (text.length > 30) return text;
  }

  return getText(section);
}

function deduplicateExperiences(
  experiences: LinkedInExperience[]
): LinkedInExperience[] {
  const seen = new Set<string>();
  return experiences.filter((exp) => {
    const key = `${exp.title}|${exp.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractExperienceFallback(section: Element): LinkedInExperience[] {
  const experiences: LinkedInExperience[] = [];
  const blocks = section.querySelectorAll('.pvs-entity, .pv-entity');

  for (const block of blocks) {
    const texts = Array.from(block.querySelectorAll('span[aria-hidden="true"]'))
      .map((s) => getText(s))
      .filter(Boolean);

    if (texts.length >= 2) {
      experiences.push({
        title: texts[0],
        company: texts[1],
        duration: texts.find((t) => /\d{4}|present/i.test(t)) ?? '',
        description: texts.slice(3).join(' '),
      });
    }
  }

  return deduplicateExperiences(experiences);
}

function isDurationText(text: string): boolean {
  return (
    /\d{4}/.test(text) ||
    /present/i.test(text) ||
    /^\d+\s*(yr|mo|mos|month|year)/i.test(text)
  );
}

function isEmploymentType(text: string): boolean {
  return /^(full-time|part-time|contract|internship|freelance|self-employed|seasonal|apprenticeship)/i.test(
    text.trim()
  );
}

function extractDescription(item: Element): string {
  const descSpans = item.querySelectorAll(
    '.inline-show-more-text span[aria-hidden="true"], .pv-shared-text-with-see-more span[aria-hidden="true"]'
  );
  let description = '';
  for (const span of descSpans) {
    const text = getText(span);
    if (text.length > description.length) description = text;
  }

  if (!description) {
    const descEl = item.querySelector('.pvs-list__outer-container + div');
    if (descEl) description = getText(descEl);
  }

  return description;
}

function extractExperienceFromItem(
  item: Element,
  companyFallback = ''
): LinkedInExperience | null {
  const boldSpans = Array.from(
    item.querySelectorAll(
      '.mr1.t-bold span[aria-hidden="true"], .t-bold span[aria-hidden="true"], .hoverable-link-text.t-bold span[aria-hidden="true"]'
    )
  )
    .map((s) => getText(s))
    .filter(Boolean);

  const allTexts = Array.from(item.querySelectorAll('span[aria-hidden="true"]'))
    .map((s) => getText(s))
    .filter(Boolean);

  const duration =
    allTexts.find((t) => isDurationText(t) && !isEmploymentType(t)) ?? '';

  const contentTexts = allTexts.filter(
    (t) => t !== duration && !isEmploymentType(t) && !/^·/.test(t)
  );

  let title = boldSpans[0] ?? '';
  let company = boldSpans[1] ?? companyFallback;

  if (!title && contentTexts.length > 0) {
    title = contentTexts[0] ?? '';
  }
  if (!company && contentTexts.length > 1) {
    company = contentTexts[1] ?? companyFallback;
  }

  // LinkedIn sometimes shows "Company · Full-time" on one line — take company part.
  if (company.includes(' · ')) {
    company = company.split(' · ')[0]?.trim() ?? company;
  }

  if (!title && company && companyFallback && company === companyFallback) {
    title = '';
  }

  if (!title && !company) return null;

  return {
    title,
    company: company || companyFallback,
    duration,
    description: extractDescription(item),
  };
}

function extractExperience(): LinkedInExperience[] {
  const experiences: LinkedInExperience[] = [];
  const section = findSectionByHeading(['experience']);
  if (!section) return experiences;

  const items = queryAll([
    '#experience ~ div .pvs-list__paged-list-item',
    '#experience ~ div li.artdeco-list__item',
    'section[data-section="experience"] li',
    '#experience ~ div ul > li',
    '.pvs-list__outer-container .pvs-list__paged-list-item',
  ]);

  const searchRoot = items.length > 0 ? null : section;
  const listItems =
    items.length > 0
      ? items
      : Array.from(
          searchRoot?.querySelectorAll(
            'li.pvs-list__paged-list-item, li.artdeco-list__item'
          ) ?? []
        );

  for (const item of listItems) {
    const subRoles = item.querySelectorAll(
      '.pvs-entity__sub-components li, ul.pvs-list li.pvs-list__paged-list-item'
    );

    if (subRoles.length > 0) {
      const parentCompany =
        getText(
          item.querySelector(
            '.mr1.t-bold span[aria-hidden="true"], .t-bold span[aria-hidden="true"]'
          )
        ) || '';

      for (const subRole of subRoles) {
        const exp = extractExperienceFromItem(subRole, parentCompany);
        if (exp) experiences.push(exp);
      }
      continue;
    }

    const exp = extractExperienceFromItem(item);
    if (exp) experiences.push(exp);
  }

  if (experiences.length === 0) {
    return extractExperienceFallback(section);
  }

  return deduplicateExperiences(experiences);
}

function extractEducation(): LinkedInEducation[] {
  const education: LinkedInEducation[] = [];
  const section = findSectionByHeading(['education']);
  if (!section) return education;

  const items = section.querySelectorAll(
    'li.pvs-list__paged-list-item, li.artdeco-list__item, .pvs-entity'
  );

  for (const item of items) {
    const texts = Array.from(item.querySelectorAll('span[aria-hidden="true"]'))
      .map((s) => getText(s))
      .filter(Boolean);

    if (texts.length >= 1) {
      education.push({
        school: texts[0],
        degree: texts[1] ?? '',
        duration: texts.find((t) => /\d{4}/.test(t)) ?? texts[2] ?? '',
      });
    }
  }

  return education;
}

function extractSkills(): string[] {
  const skills: string[] = [];
  const section = findSectionByHeading(['skills']);
  if (!section) return skills;

  const skillEls = section.querySelectorAll(
    'span[aria-hidden="true"], .pv-skill-category-entity__name-text, .pvs-list__item--line-separated span'
  );

  for (const el of skillEls) {
    const text = getText(el);
    if (
      text &&
      text.length < 60 &&
      !/skill|endorse|show all/i.test(text) &&
      !skills.includes(text)
    ) {
      skills.push(text);
    }
  }

  return skills.slice(0, 50);
}

export function extractProfileFromDom(): LinkedInProfile {
  return {
    name: extractName(),
    headline: extractHeadline(),
    about: extractAbout(),
    location: extractLocation(),
    experience: extractExperience(),
    education: extractEducation(),
    skills: extractSkills(),
  };
}
