import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectActiveDocument, useResumeStore } from '../../store/resumeStore';
import { resetChromeMock } from '../../test/chromeMock';
import { PasteModal } from '../PasteModal';
import { PreviewPane } from '../editor/PreviewPane';
import { ResumeForm } from '../editor/ResumeForm';

const store = () => useResumeStore.getState();

function activeDocument() {
  const doc = selectActiveDocument(store());
  if (!doc) throw new Error('No active document');
  return doc;
}

beforeEach(async () => {
  resetChromeMock();
  await store().hydrate();
});

describe('ResumeForm', () => {
  it('writes basics through to the store', () => {
    render(<ResumeForm resume={activeDocument().resume} />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ada@example.com' },
    });

    expect(activeDocument().resume.name).toBe('Ada Lovelace');
    expect(activeDocument().resume.contact.email).toBe('ada@example.com');
  });

  it('adds a role and edits its fields', () => {
    const { rerender } = render(
      <ResumeForm resume={activeDocument().resume} />
    );

    fireEvent.click(screen.getByRole('button', { name: /add role/i }));
    rerender(<ResumeForm resume={activeDocument().resume} />);

    fireEvent.change(screen.getByLabelText(/job title/i), {
      target: { value: 'Staff Engineer' },
    });

    expect(activeDocument().resume.experience[0].title).toBe('Staff Engineer');
  });

  it('offers stronger verbs for a weak bullet', () => {
    store().addExperienceEntry();
    const roleId = activeDocument().resume.experience[0].id;
    store().updateBullet(roleId, 0, 'Responsible for the checkout rewrite');

    const { rerender } = render(
      <ResumeForm resume={activeDocument().resume} />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /start with a stronger verb/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /^Led…$/ }));
    rerender(<ResumeForm resume={activeDocument().resume} />);

    expect(activeDocument().resume.experience[0].bullets[0]).toBe(
      'Led the checkout rewrite'
    );
  });

  it('splits comma-separated skills into chips', () => {
    const { rerender } = render(
      <ResumeForm resume={activeDocument().resume} />
    );

    const input = screen.getByPlaceholderText(/add skills/i);
    fireEvent.change(input, { target: { value: 'Go, Rust, Postgres' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    rerender(<ResumeForm resume={activeDocument().resume} />);

    expect(activeDocument().resume.skills).toEqual(['Go', 'Rust', 'Postgres']);
    expect(screen.getByText('Rust')).toBeInTheDocument();
  });
});

describe('PasteModal', () => {
  it('imports pasted text and closes', () => {
    let closed = false;
    render(
      <PasteModal
        onClose={() => {
          closed = true;
        }}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Ada Lovelace\nEngineer\nSkills\nGo, Rust' },
    });
    fireEvent.click(screen.getByRole('button', { name: /build resume/i }));

    expect(activeDocument().resume.name).toBe('Ada Lovelace');
    expect(closed).toBe(true);
  });

  it('keeps the import button disabled while empty', () => {
    render(<PasteModal onClose={() => undefined} />);
    expect(
      screen.getByRole('button', { name: /build resume/i })
    ).toBeDisabled();
  });
});

describe('PreviewPane', () => {
  it('renders the resume content and zoom controls', () => {
    store().updateResume({ name: 'Ada Lovelace', summary: 'Builds things.' });
    const doc = activeDocument();

    render(<PreviewPane resume={doc.resume} theme={doc.theme} />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Builds things.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '100%' })).toBeInTheDocument();
  });
});
