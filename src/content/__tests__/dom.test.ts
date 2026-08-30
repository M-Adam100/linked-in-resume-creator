import { afterEach, describe, expect, it } from 'vitest';

import { extractProfileFromDom } from '../dom';

/**
 * Mirrors the structure LinkedIn renders on a profile page: section anchors
 * (`#about`, `#experience`, …) followed by sibling containers, with the visible
 * text in `aria-hidden` spans next to a screen-reader copy. If LinkedIn changes
 * its markup these tests are the first thing that should fail.
 */
const PROFILE_HTML = `
<main>
  <section>
    <div class="ph5">
      <h1 class="text-heading-xlarge">Ada Lovelace</h1>
      <div class="text-body-medium break-words">Staff Engineer at Acme</div>
      <span class="text-body-small inline t-black--light break-words">Berlin, Germany</span>
      <span class="text-body-small inline t-black--light break-words">500+ connections</span>
    </div>
  </section>

  <section>
    <div id="about"></div>
    <div class="pvs-header__container"><h2 class="pvs-header__title">About</h2></div>
    <div class="display-flex ph5">
      <span class="visually-hidden">About</span>
      <span aria-hidden="true">I build data platforms that teams enjoy using every day.</span>
    </div>
  </section>

  <section>
    <div id="experience"></div>
    <div class="pvs-header__container"><h2 class="pvs-header__title">Experience</h2></div>
    <div class="pvs-list__outer-container">
      <ul>
        <li class="pvs-list__paged-list-item">
          <div class="pvs-entity">
            <div class="mr1 t-bold"><span aria-hidden="true">Staff Engineer</span></div>
            <span class="t-14 t-normal"><span aria-hidden="true">Acme Inc. · Full-time</span></span>
            <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Jan 2021 - Present · 3 yrs 2 mos</span></span>
            <div class="inline-show-more-text">
              <span aria-hidden="true">Led the billing rewrite and cut invoice errors by 60%.</span>
            </div>
          </div>
        </li>
        <li class="pvs-list__paged-list-item">
          <div class="pvs-entity">
            <div class="mr1 t-bold"><span aria-hidden="true">Senior Engineer</span></div>
            <span class="t-14 t-normal"><span aria-hidden="true">Globex</span></span>
            <span class="t-14 t-normal t-black--light"><span aria-hidden="true">2018 - 2021</span></span>
          </div>
        </li>
      </ul>
    </div>
  </section>

  <section>
    <div id="education"></div>
    <div class="pvs-header__container"><h2 class="pvs-header__title">Education</h2></div>
    <div class="pvs-list__outer-container">
      <ul>
        <li class="pvs-list__paged-list-item">
          <div class="mr1 t-bold"><span aria-hidden="true">University of Cambridge</span></div>
          <span class="t-14 t-normal"><span aria-hidden="true">BSc, Computer Science</span></span>
          <span class="t-14 t-normal t-black--light"><span aria-hidden="true">2014 - 2018</span></span>
        </li>
      </ul>
    </div>
  </section>

  <section>
    <div id="skills"></div>
    <div class="pvs-header__container"><h2 class="pvs-header__title">Skills</h2></div>
    <div class="pvs-list__outer-container">
      <ul>
        <li class="pvs-list__paged-list-item">
          <div class="mr1 t-bold"><span aria-hidden="true">TypeScript</span></div>
        </li>
        <li class="pvs-list__paged-list-item">
          <div class="mr1 t-bold"><span aria-hidden="true">Postgres</span></div>
        </li>
      </ul>
    </div>
  </section>
</main>`;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('extractProfileFromDom', () => {
  it('reads the header block', () => {
    document.body.innerHTML = PROFILE_HTML;
    const profile = extractProfileFromDom();

    expect(profile.name).toBe('Ada Lovelace');
    expect(profile.headline).toBe('Staff Engineer at Acme');
    expect(profile.location).toBe('Berlin, Germany');
    expect(profile.about).toContain('data platforms');
  });

  it('separates title, company, dates and description', () => {
    document.body.innerHTML = PROFILE_HTML;
    const [first, second] = extractProfileFromDom().experience;

    expect(first).toMatchObject({
      title: 'Staff Engineer',
      company: 'Acme Inc.',
      duration: 'Jan 2021 - Present · 3 yrs 2 mos',
    });
    expect(first.description).toContain('billing rewrite');

    expect(second).toMatchObject({
      title: 'Senior Engineer',
      company: 'Globex',
      duration: '2018 - 2021',
    });
    expect(second.description).toBe('');
  });

  it('reads education and skills', () => {
    document.body.innerHTML = PROFILE_HTML;
    const profile = extractProfileFromDom();

    expect(profile.education[0]).toMatchObject({
      school: 'University of Cambridge',
      degree: 'BSc, Computer Science',
      duration: '2014 - 2018',
    });
    expect(profile.skills).toContain('TypeScript');
    expect(profile.skills).toContain('Postgres');
  });

  it('does not mistake the connection count for a location', () => {
    document.body.innerHTML = `
      <main><div class="ph5">
        <h1 class="text-heading-xlarge">Ada</h1>
        <span class="text-body-small inline t-black--light break-words">500+ connections</span>
      </div></main>`;

    expect(extractProfileFromDom().location).toBe('');
  });

  it('returns empty values on a page with no profile', () => {
    document.body.innerHTML = '<main><p>Nothing here</p></main>';
    const profile = extractProfileFromDom();

    expect(profile.name).toBe('');
    expect(profile.experience).toEqual([]);
    expect(profile.education).toEqual([]);
    expect(profile.skills).toEqual([]);
  });

  it('falls back to entity blocks when list items are missing', () => {
    document.body.innerHTML = `
      <main><section>
        <div id="experience"></div>
        <h2>Experience</h2>
        <div class="pv-entity">
          <span aria-hidden="true">Engineer</span>
          <span aria-hidden="true">Initech</span>
          <span aria-hidden="true">2016 - 2018</span>
        </div>
      </section></main>`;

    const [role] = extractProfileFromDom().experience;
    expect(role).toMatchObject({ title: 'Engineer', company: 'Initech' });
  });
});
