/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useMediaQuery } from '@/hooks/use-media-query'

type TypingState = {
  index: number
  count: number
  phase: 'hold' | 'delete' | 'gap' | 'type'
}

interface HomeAudienceProps {
  words: string[]
  prefix?: string
  suffix?: string
  paused: boolean
}

export function HomeAudience(props: HomeAudienceProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [state, setState] = useState<TypingState>(() => ({
    index: 0,
    count: [...(props.words[0] ?? '')].length,
    phase: 'hold',
  }))
  const target =
    props.words[state.index % Math.max(props.words.length, 1)] ?? ''
  const characters = [...target]
  const measureRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState<number>()

  useLayoutEffect(() => {
    const measure = measureRef.current
    if (!measure) return
    const update = () => {
      const next = measure.getBoundingClientRect().width
      if (next > 0) {
        setWidth((previous) => (previous === next ? previous : next))
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [target, reducedMotion])

  useEffect(() => {
    if (props.paused || reducedMotion || props.words.length < 2) return
    const delay = { hold: 2400, delete: 38, gap: 420, type: 75 }[state.phase]
    const timeout = window.setTimeout(
      () =>
        setState((previous) => {
          if (previous.phase === 'hold') return { ...previous, phase: 'delete' }
          if (previous.phase === 'delete') {
            const count = Math.max(0, previous.count - 1)
            return { ...previous, count, phase: count === 0 ? 'gap' : 'delete' }
          }
          if (previous.phase === 'gap') {
            return {
              index: (previous.index + 1) % props.words.length,
              count: 0,
              phase: 'type',
            }
          }
          const count = Math.min(characters.length, previous.count + 1)
          return {
            ...previous,
            count,
            phase: count === characters.length ? 'hold' : 'type',
          }
        }),
      delay
    )
    return () => window.clearTimeout(timeout)
  }, [
    props.paused,
    props.words,
    reducedMotion,
    state.phase,
    state.count,
    characters.length,
  ])

  if (reducedMotion || props.words.length < 2) {
    return (
      <span className='home-audience' aria-hidden='true'>
        {props.prefix}
        {props.words[0]}
        {props.suffix}
      </span>
    )
  }

  return (
    <span
      className='home-audience'
      aria-hidden='true'
      data-paused={props.paused}
    >
      {/* Reserve the tallest translated phrase so typing never shifts the CTA. */}
      {[...new Set(props.words)].map((word) => (
        <span key={word} className='home-audience-reserve'>
          {props.prefix}
          <span className='home-audience-word'>{word}</span>
          {props.suffix}
        </span>
      ))}
      <span className='home-audience-content'>
        {props.prefix}
        <span
          className='home-audience-word'
          style={width ? { width } : undefined}
        >
          <span ref={measureRef} className='home-audience-measure'>
            {target}
          </span>
          <span className='home-audience-live'>
            {characters.slice(0, state.count).join('')}
            <span
              className='home-audience-caret'
              data-holding={state.phase === 'hold'}
            />
          </span>
        </span>
        {props.suffix}
      </span>
    </span>
  )
}
