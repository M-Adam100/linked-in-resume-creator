import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectActiveDocument, useResumeStore } from '../../store/resumeStore';
import { resetChromeMock } from '../../test/chromeMock';
import App from '../App';

const store = () => useResumeStore.getState();

beforeEach(() => {
  resetChromeMock();
  useResumeStore.setState({
    documents: [],
    activeDocumentId: null,
    versions: [],
    hydrated: false,
    error: null,
    notice: null,
  });
});

/**
 * Mounts the whole editor page. This is the cheapest guard against wiring
 * mistakes — a missing prop or a bad store selector shows up here rather than
 * as a blank tab after loading the unpacked extension.
 */
describe('editor App', () => {
  it('shows a loading state, then the editor', async () => {
    render(<App />);

    expect(screen.getByText(/loading your resumes/i)).toBeInTheDocument();

    expect(
      await screen.findByRole('textbox', { name: /resume name/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/live preview/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download pdf/i })
    ).toBeInTheDocument();
  });

  it('opens the design drawer and switches template', async () => {
    render(<App />);
    await screen.findByRole('textbox', { name: /resume name/i });

    fireEvent.click(screen.getByRole('button', { name: /design/i }));

    const drawer = screen.getByRole('dialog', { name: /design/i });
    expect(drawer).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /compact/i }));

    await waitFor(() => {
      expect(selectActiveDocument(store())?.theme.templateId).toBe('compact');
    });
  });

  it('opens the history drawer', async () => {
    render(<App />);
    await screen.findByRole('textbox', { name: /resume name/i });

    fireEvent.click(screen.getByRole('button', { name: /history/i }));

    expect(
      screen.getByRole('dialog', { name: /version history/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/no snapshots yet/i)).toBeInTheDocument();
  });

  it('opens the paste dialog from the top bar', async () => {
    render(<App />);
    await screen.findByRole('textbox', { name: /resume name/i });

    fireEvent.click(screen.getByRole('button', { name: /paste profile/i }));

    expect(
      screen.getByRole('dialog', { name: /paste linkedin profile text/i })
    ).toBeInTheDocument();
  });

  it('surfaces store errors as an alert', async () => {
    render(<App />);
    await screen.findByRole('textbox', { name: /resume name/i });

    store().setError('Could not read that file.');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not read that file.'
    );
  });

  it('renders edits into the preview', async () => {
    render(<App />);
    await screen.findByRole('textbox', { name: /resume name/i });

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Ada Lovelace' },
    });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });
});
