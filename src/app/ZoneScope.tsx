import { Fragment, useEffect, type ReactNode } from 'react'
import { useWorkspace } from '../features/data/hooks'
import { setTeamZone, useZone } from '../timeZone'

/**
 * Pushes the team time zone from `workspace.json` into the zone state, and remounts the signed-in
 * app when the effective zone changes, so every date computed with the old zone is redone.
 */
export function ZoneScope({ children }: { children: ReactNode }) {
  const teamZone = useWorkspace().data?.timeZone ?? null
  useEffect(() => setTeamZone(teamZone), [teamZone])
  // Signing out (or switching repositories) must not leave the previous team's zone behind.
  useEffect(() => () => setTeamZone(null), [])
  const zone = useZone()
  return <Fragment key={zone}>{children}</Fragment>
}
