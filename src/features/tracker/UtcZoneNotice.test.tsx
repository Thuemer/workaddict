import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ZoneScope } from '../../app/ZoneScope'
import '../../i18n'
import { createMemoryAdapter, MemoryFileStore } from '../../storage'
import { renderWithSession } from '../../test/renderWithSession'
import { getZone, setDeviceZone, setTeamZone } from '../../timeZone'
import { UtcZoneNotice } from './UtcZoneNotice'

const alice = { login: 'alice', avatarUrl: null }
const bob = { login: 'bob', avatarUrl: null }
const team = (store: MemoryFileStore) => ({ store, collaborators: [alice, bob], admins: ['alice'] })

afterEach(() => {
  setDeviceZone(null)
  setTeamZone(null)
  localStorage.clear()
})

// The test process runs on UTC, like a browser that hides its zone.
describe('UtcZoneNotice', () => {
  it('asks a worker to tell the team leader', async () => {
    await renderWithSession(
      <UtcZoneNotice />,
      createMemoryAdapter(bob, team(new MemoryFileStore())),
    )
    expect(
      await screen.findByText(/Ask your team leader to set a team time zone/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Set a team time zone' })).toBeNull()
  })

  it('links a team leader to the setting', async () => {
    await renderWithSession(
      <UtcZoneNotice />,
      createMemoryAdapter(alice, team(new MemoryFileStore())),
    )
    expect(await screen.findByRole('link', { name: 'Set a team time zone' })).toBeInTheDocument()
  })

  it('is hidden once a team zone is set', async () => {
    const store = new MemoryFileStore()
    const owner = createMemoryAdapter(alice, team(store))
    await owner.init()
    await owner.setTeamTimeZone('Europe/Vienna')

    await renderWithSession(
      <ZoneScope>
        <UtcZoneNotice />
        <p>ready</p>
      </ZoneScope>,
      createMemoryAdapter(bob, team(store)),
    )
    await screen.findByText('ready')
    await waitFor(() => expect(getZone()).toBe('Europe/Vienna'))
    expect(screen.queryByText(/Your browser reports its time zone as UTC/)).toBeNull()
  })

  it('stays dismissed on this device', async () => {
    const store = new MemoryFileStore()
    const first = await renderWithSession(<UtcZoneNotice />, createMemoryAdapter(bob, team(store)))
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/Your browser reports its time zone as UTC/)).toBeNull()
    first.unmount()

    await renderWithSession(<UtcZoneNotice />, createMemoryAdapter(bob, team(store)))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText(/Your browser reports its time zone as UTC/)).toBeNull()
  })
})
