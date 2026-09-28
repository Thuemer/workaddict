import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ZoneScope } from '../../app/ZoneScope'
import type { TimeEntry } from '../../domain/types'
import '../../i18n'
import { createMemoryAdapter, MemoryFileStore } from '../../storage'
import { renderWithSession } from '../../test/renderWithSession'
import { getZone, setDeviceZone, setTeamZone } from '../../timeZone'
import SettingsPage from './SettingsPage'
import { ShiftEntriesModal } from './ShiftEntries'
import { TimeZoneSection } from './TimeZoneSection'

const alice = { login: 'alice', avatarUrl: null }
const bob = { login: 'bob', avatarUrl: null }

function team(store = new MemoryFileStore()) {
  return { store, collaborators: [alice, bob], admins: ['alice'] }
}

afterEach(() => {
  setDeviceZone(null)
  setTeamZone(null)
  localStorage.clear()
})

describe('TimeZoneSection', () => {
  it('lets a team leader set the team zone when the browser reports UTC', async () => {
    const adapter = createMemoryAdapter(alice, team())
    await renderWithSession(
      <ZoneScope>
        <TimeZoneSection />
      </ZoneScope>,
      adapter,
    )

    const section = (await screen.findByRole('heading', { name: 'Time zone' })).closest('section')!
    expect(
      within(section).getByText(/Your browser reports UTC\..*may be shifted/),
    ).toBeInTheDocument()
    await within(section).findByText(/No team time zone is set yet/)
    // The browser hides its zone, so there is no zone to offer as a one-click default.
    expect(within(section).queryByRole('button', { name: /^Use / })).toBeNull()

    fireEvent.change(within(section).getByRole('combobox', { name: 'Team time zone' }), {
      target: { value: 'Europe/Vienna' },
    })

    await screen.findByText('Team time zone set to Europe/Vienna.')
    expect((await adapter.getWorkspace()).timeZone).toBe('Europe/Vienna')
    await waitFor(() => expect(getZone()).toBe('Europe/Vienna'))
    const updated = (await screen.findByRole('heading', { name: 'Time zone' })).closest('section')!
    expect(within(updated).getByText('(team time zone)')).toBeInTheDocument()
    expect(
      within(updated).getByText(/Your browser reports UTC\..*shown in Europe\/Vienna instead/),
    ).toBeInTheDocument()
  })

  it('shows the team zone read-only to an editor', async () => {
    const store = new MemoryFileStore()
    const owner = createMemoryAdapter(alice, team(store))
    await owner.init()
    await owner.setTeamTimeZone('Europe/Vienna')
    await owner.setRole('bob', 'editor')

    await renderWithSession(<TimeZoneSection />, createMemoryAdapter(bob, team(store)))

    const section = (await screen.findByRole('heading', { name: 'Time zone' })).closest('section')!
    await within(section).findByText('Europe/Vienna')
    expect(within(section).queryByRole('combobox', { name: 'Team time zone' })).toBeNull()
    expect(within(section).queryByText(/No team time zone is set yet/)).toBeNull()
  })

  it('remembers a zone chosen for this device', async () => {
    await renderWithSession(<TimeZoneSection />, createMemoryAdapter(alice, team()))

    fireEvent.change(await screen.findByRole('combobox', { name: 'On this device' }), {
      target: { value: 'America/New_York' },
    })

    expect(getZone()).toBe('America/New_York')
    expect(localStorage.getItem('workaddict.timeZone')).toBe('America/New_York')
    expect(await screen.findByText('(this device)')).toBeInTheDocument()
  })
})

describe('Shift entry times', () => {
  function entry(login: string, start: string): TimeEntry {
    return {
      id: crypto.randomUUID(),
      login,
      start,
      end: new Date(new Date(start).getTime() + 3_600_000).toISOString(),
      description: '',
      projectId: null,
      tagIds: [],
      createdAt: '',
      updatedAt: '',
    }
  }

  it("shifts a member's entries after showing a preview", async () => {
    const adapter = createMemoryAdapter(alice, team())
    await adapter.init()
    await adapter.importData(
      {
        workspace: { projects: [], tags: [] },
        entries: [
          entry('bob', '2026-09-21T10:00:00.000Z'),
          entry('bob', '2026-09-22T10:00:00.000Z'),
          entry('alice', '2026-09-21T10:00:00.000Z'),
        ],
      },
      'test',
    )
    let closed = false
    await renderWithSession(<ShiftEntriesModal onClose={() => (closed = true)} />, adapter)

    const member = await screen.findByRole('combobox', { name: 'Entries of' })
    await screen.findByRole('option', { name: 'bob' })
    fireEvent.change(member, { target: { value: 'bob' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } })

    expect(
      await screen.findByText(/2 entries will move\. Example: .*10:00 → 08:00\./),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Shift 2 entries' }))

    await waitFor(() => expect(closed).toBe(true))
    const starts = (await adapter.listAllEntries())
      .filter((e) => e.login === 'bob')
      .map((e) => e.start)
      .sort()
    expect(starts).toEqual(['2026-09-21T08:00:00.000Z', '2026-09-22T08:00:00.000Z'])
  })

  it('disables the action when nothing matches or the offset is invalid', async () => {
    const adapter = createMemoryAdapter(alice, team())
    await renderWithSession(<ShiftEntriesModal onClose={() => {}} />, adapter)

    const member = await screen.findByRole('combobox', { name: 'Entries of' })
    await screen.findByRole('option', { name: 'bob' })
    fireEvent.change(member, { target: { value: 'bob' } })
    expect(await screen.findByText('No entries match.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Shift 0 entries$/ })).toBeDisabled()

    fireEvent.change(screen.getByDisplayValue('2:00'), { target: { value: '25:00' } })
    expect(screen.getByText('Enter a shift between 0:01 and 24:00.')).toBeInTheDocument()
  })

  it('is offered to team leaders', async () => {
    await renderWithSession(<SettingsPage />, createMemoryAdapter(alice, team()))
    expect(await screen.findByRole('button', { name: 'Shift entry times' })).toBeEnabled()
  })

  it('is offered to team leaders only', async () => {
    const store = new MemoryFileStore()
    const owner = createMemoryAdapter(alice, team(store))
    await owner.init()
    await owner.setRole('bob', 'editor')

    await renderWithSession(<SettingsPage />, createMemoryAdapter(bob, team(store)))
    await screen.findAllByText('Editor')
    await screen.findByRole('heading', { name: 'Time zone' })
    expect(screen.queryByRole('button', { name: 'Shift entry times' })).toBeNull()
  })
})
