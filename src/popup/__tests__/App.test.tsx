import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { selectActiveDocument, useResumeStore } from '../../store/resumeStore';
import { getChromeMock, resetChromeMock } from '../../test/chromeMock';
import App from '../App';

const store = () => useResumeStore.getState();

function setActiveTabUrl(url: string | undefined) {
  getChromeMock().tabs.query = () => Promise.resolve([{ id: 1, url }]);
}

/** Makes the background worker answer a capture request with `response`. */
function respondToMessages(response: unknown) {
  getChromeMock().runtime.sendMessage = (_message, callback) => {
    callback?.(response);
  };
}

beforeEach(() => {
  resetChromeMock();
  vi.stubGlobal('close', vi.fn());
  useResumeStore.setState({
    documents: [],
    activeDocumentId: null,
    versions: [],
    hydrated: false,
  });
});

describe('popup App', () => {
  it('explains what to do when the tab is not a LinkedIn profile', async () => {
    setActiveTabUrl('https://example.com');
    render(<App />);

    const capture = await screen.findByRole('button', {
      name: /capture this profile/i,
    });

    expect(capture).toBeDisabled();
    expect(screen.getByText(/open a linkedin\.com\/in/i)).toBeInTheDocument();
  });

  it('stays disabled when the tab URL is not readable', async () => {
    setActiveTabUrl(undefined);
    render(<App />);

    expect(
      await screen.findByRole('button', { name: /capture this profile/i })
    ).toBeDisabled();
  });

  it('captures the profile in the active tab', async () => {
    setActiveTabUrl('https://www.linkedin.com/in/ada-lovelace/');
    respondToMessages({
      data: {
        name: 'Ada Lovelace',
        headline: 'Staff Engineer',
        about: 'Bio',
        experience: [
          {
            title: 'Staff Engineer',
            company: 'Acme',
            duration: '2020 - Present',
            description: 'Led the rewrite.',
          },
        ],
        education: [],
        skills: ['Go'],
      },
      source: 'mixed',
    });

    render(<App />);

    const capture = await screen.findByRole('button', {
      name: /capture this profile/i,
    });
    await waitFor(() => expect(capture).toBeEnabled());

    fireEvent.click(capture);

    await waitFor(() => {
      expect(selectActiveDocument(store())?.resume.name).toBe('Ada Lovelace');
    });
  });

  it('shows the error returned by the background worker', async () => {
    setActiveTabUrl('https://www.linkedin.com/in/ada-lovelace/');
    respondToMessages({ error: 'Scroll the profile and try again.' });

    render(<App />);

    const capture = await screen.findByRole('button', {
      name: /capture this profile/i,
    });
    await waitFor(() => expect(capture).toBeEnabled());

    fireEvent.click(capture);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Scroll the profile and try again.'
    );
  });

  it('toggles advanced capture from the settings panel', async () => {
    setActiveTabUrl('https://example.com');
    render(<App />);
    await screen.findByRole('button', { name: /capture this profile/i });

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: /advanced capture/i })
    );

    await waitFor(() => {
      expect(store().settings.advancedCapture).toBe(false);
    });
  });

  it('lists saved resumes', async () => {
    setActiveTabUrl('https://example.com');
    render(<App />);
    await screen.findByRole('button', { name: /capture this profile/i });

    store().renameDocument(store().documents[0].id, 'Backend roles');

    expect(await screen.findByText('Backend roles')).toBeInTheDocument();
  });
});
