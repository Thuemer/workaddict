import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toasts'
import { MAX_ENTRY_MS, parseDuration } from '../../domain/time'
import { dateKey, endOfDay, format, fromDateKey, startOfMonth } from '../../domain/zoned'
import { useI18n } from '../../i18n'
import { useSessionData } from '../auth/AuthContext'
import { useAllEntries, useMembers } from '../data/hooks'
import { useErrorToast } from '../data/useErrorText'

const MINUTE = 60_000

/**
 * Moves the start and end of one member's entries in a date range by a fixed offset, e.g. to
 * repair entries typed on a browser that reported the wrong time zone. Team leaders only
 * (checked again by the storage layer).
 */
export function ShiftEntriesModal({ onClose }: { onClose: () => void }) {
  const { t, locale, time } = useI18n()
  const { adapter } = useSessionData()
  const qc = useQueryClient()
  const toast = useToast()
  const onError = useErrorToast()
  const entries = useAllEntries().data
  const members = useMembers().data

  const [login, setLogin] = useState('')
  const [from, setFrom] = useState(() => dateKey(startOfMonth(new Date())))
  const [to, setTo] = useState(() => dateKey(new Date()))
  const [direction, setDirection] = useState<-1 | 1>(-1)
  const [offset, setOffset] = useState('2:00')
  const offsetHintId = useId()

  const logins = useMemo(
    () =>
      [
        ...new Set([
          ...(members ?? []).map((m) => m.login),
          ...(entries ?? []).map((e) => e.login),
        ]),
      ].sort(),
    [members, entries],
  )

  // Whole days in the effective time zone (the app remounts when that zone changes).
  const range = useMemo(() => {
    const fromDay = fromDateKey(from)
    const toDay = fromDateKey(to)
    return fromDay && toDay && toDay >= fromDay ? { from: fromDay, to: endOfDay(toDay) } : null
  }, [from, to])
  const ms = parseDuration(offset)
  const offsetValid = ms !== null && ms > 0 && ms <= MAX_ENTRY_MS && ms % MINUTE === 0
  const delta = offsetValid ? direction * ms : 0

  const moving = useMemo(() => {
    if (!range || !login) return []
    const a = range.from.getTime()
    const b = range.to.getTime()
    return (entries ?? [])
      .filter((e) => {
        const s = new Date(e.start).getTime()
        return e.login === login && s >= a && s <= b
      })
      .sort((x, y) => x.start.localeCompare(y.start))
  }, [entries, login, range])

  const shift = useMutation({
    mutationFn: () => adapter.shiftEntries(login, range!, delta),
    onSuccess: (count) => {
      toast.info(t('shift.done', { count }))
      onClose()
    },
    onError,
    onSettled: () => qc.invalidateQueries(),
  })

  const ready = !!login && !!range && offsetValid && moving.length > 0
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ready) shift.mutate()
  }

  const example = moving[0]
  return (
    <Modal title={t('shift.title')} onClose={onClose} dismissible={!shift.isPending}>
      <form className="stack" onSubmit={submit}>
        <p className="muted small">{t('shift.intro')}</p>
        <label className="field">
          <span>{t('shift.member')}</span>
          <select className="select" value={login} onChange={(e) => setLogin(e.target.value)}>
            <option value="">{t('shift.choose')}</option>
            {logins.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <label className="field">
            <span>{t('shift.from')}</span>
            <input
              className="input"
              type="date"
              value={from}
              aria-invalid={!range}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('shift.to')}</span>
            <input
              className="input"
              type="date"
              value={to}
              aria-invalid={!range}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <div className="row">
            <label className="field">
              <span>{t('shift.offset')}</span>
              <select
                className="select"
                value={direction}
                onChange={(e) => setDirection(Number(e.target.value) as -1 | 1)}
              >
                <option value={-1}>{t('shift.earlier')}</option>
                <option value={1}>{t('shift.later')}</option>
              </select>
            </label>
            <label className="field">
              <span className="visually-hidden">{t('shift.offset')}</span>
              <input
                className="input"
                inputMode="numeric"
                value={offset}
                aria-invalid={!offsetValid}
                aria-describedby={offsetHintId}
                onChange={(e) => setOffset(e.target.value)}
              />
            </label>
          </div>
          <span id={offsetHintId} className="muted small">
            {offsetValid ? t('shift.offsetHint') : t('shift.invalidOffset')}
          </span>
        </div>
        {!range && <div className="banner banner-warning">{t('shift.invalidRange')}</div>}
        {login && range && offsetValid && (
          <div className={`banner ${example ? 'banner-info' : 'banner-warning'}`} role="status">
            {example
              ? t('shift.preview', {
                  count: moving.length,
                  date: format(example.start, 'P', { locale }),
                  before: time(example.start),
                  after: time(new Date(example.start).getTime() + delta),
                })
              : t('shift.nothing')}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={shift.isPending}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" disabled={!ready || shift.isPending}>
            {t('shift.confirm', { count: moving.length })}
          </button>
        </div>
      </form>
    </Modal>
  )
}
