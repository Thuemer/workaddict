import { isSameDay } from '../../domain/zoned'
import { useRef, useState, type FormEvent } from 'react'
import type { ManualTimeResult } from '../../domain/time'
import { Modal } from '../../components/Modal'
import type { TimeEntry } from '../../domain/types'
import { useI18n } from '../../i18n'
import { useSaveEntry } from '../data/hooks'
import { useToast } from '../../components/Toasts'
import { useErrorToast } from '../data/useErrorText'
import { readPref, writePref } from '../../prefs'
import {
  GroupPickers,
  resolveTimeFields,
  TimeInputs,
  timeFieldsFrom,
  type TimeFields,
  type WorkFields,
} from './EntryFields'

/** What the user typed in the dialog, kept to reopen it after a failed save. */
export interface EntryDraft {
  fields: WorkFields
  times: TimeFields
}

export function EntryEditModal({
  entry,
  draft,
  onClose,
  onSaveFailed,
}: {
  entry: TimeEntry
  /** Values to start with instead of the entry's, e.g. after a failed save. */
  draft?: EntryDraft
  onClose: () => void
  /** Reports a save that failed after the dialog closed; without it, an error toast is shown. */
  onSaveFailed?: (draft: EntryDraft, error: unknown) => void
}) {
  const { t, timeFormat } = useI18n()
  const toast = useToast()
  const onError = useErrorToast()
  const initialTimes = timeFieldsFrom(new Date(entry.start), new Date(entry.end), timeFormat)
  const [fields, setFields] = useState<WorkFields>(
    draft?.fields ?? {
      description: entry.description,
      projectId: entry.projectId,
      tagIds: entry.tagIds,
    },
  )
  const [times, setTimes] = useState<TimeFields>(
    () =>
      draft?.times ?? { ...initialTimes, useDuration: readPref('manualTimeInput') === 'duration' },
  )
  const [showErrors, setShowErrors] = useState(false)
  // The dialog closes before GitHub confirms the save, so failures are reported through
  // hook-level callbacks, which still run after this component unmounts.
  const save = useSaveEntry({
    onError: (e) => {
      if (onSaveFailed && submitted.current) onSaveFailed(submitted.current, e)
      else onError(e)
    },
  })
  const submitted = useRef<EntryDraft | null>(null)

  const timesChanged =
    times.date !== initialTimes.date ||
    times.startTime !== initialTimes.startTime ||
    (times.useDuration
      ? times.duration !== initialTimes.duration
      : times.endTime !== initialTimes.endTime)
  // Keep second precision of timer entries unless the times were actually edited
  // (minute-rounded fields could otherwise turn a sub-minute entry into 0 h or 24 h).
  const resolved: ManualTimeResult = timesChanged
    ? resolveTimeFields(times)
    : {
        ok: true,
        start: new Date(entry.start),
        end: new Date(entry.end),
        overnight: !isSameDay(new Date(entry.start), new Date(entry.end)),
      }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!resolved.ok) {
      setShowErrors(true)
      return
    }
    const start = timesChanged ? resolved.start.toISOString() : entry.start
    const end = timesChanged ? resolved.end.toISOString() : entry.end
    submitted.current = { fields, times }
    // The list shows the new values at once (optimistic update), so there is nothing to wait for.
    save.mutate({
      entry: { ...entry, ...fields, description: fields.description.trim(), start, end },
      previousStart: entry.start,
    })
    toast.info(t('entries.saved'))
    onClose()
  }

  return (
    <Modal title={t('entries.editTitle')} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <input
          className="input"
          placeholder={t('timer.placeholder')}
          aria-label={t('stats.description')}
          value={fields.description}
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
        />
        <div className="row wrap">
          <GroupPickers value={fields} onChange={(p) => setFields({ ...fields, ...p })} />
        </div>
        <TimeInputs
          value={times}
          onChange={(p) => {
            if (p.useDuration !== undefined) {
              writePref('manualTimeInput', p.useDuration ? 'duration' : 'end')
            }
            setTimes({ ...times, ...p })
          }}
          showErrors={showErrors}
          resolved={resolved}
        />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" disabled={save.isPending}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
