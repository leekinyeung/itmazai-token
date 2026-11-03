/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
let revealScheduled = false

export function prepareClientRoot(root: HTMLElement): HTMLElement {
  let clientRoot = root.querySelector<HTMLElement>(
    ':scope > [data-client-root]'
  )
  if (!clientRoot) {
    clientRoot = document.createElement('div')
    clientRoot.dataset.clientRoot = 'true'
    root.append(clientRoot)
  }

  const serverFallback = root.querySelector<HTMLElement>(
    ':scope > [data-server-fallback]'
  )
  if (serverFallback) {
    root.dataset.clientPending = 'true'
    clientRoot.setAttribute('aria-hidden', 'true')
  }
  return clientRoot
}

export function revealClientApp(): void {
  if (revealScheduled) return
  const root = document.querySelector<HTMLElement>('#root')
  const clientRoot = root?.querySelector<HTMLElement>(
    ':scope > [data-client-root]'
  )
  if (!root || !clientRoot) return

  revealScheduled = true
  window.requestAnimationFrame(() => {
    root.querySelector<HTMLElement>(':scope > [data-server-fallback]')?.remove()
    clientRoot.removeAttribute('aria-hidden')
    delete root.dataset.clientPending
    revealScheduled = false
  })
}
