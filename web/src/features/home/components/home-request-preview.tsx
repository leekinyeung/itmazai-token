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
import { useTranslation } from 'react-i18next'

import { CodeBlock } from '@/components/ai-elements/code-block'
import { CopyButton } from '@/components/copy-button'

export function HomeRequestPreview(props: {
  apiBaseUrl: string
  modelName?: string
}) {
  const { t } = useTranslation()
  const payload = props.modelName
    ? `{
    "model": ${JSON.stringify(props.modelName)},
    "messages": [{"role":"user","content":"Hello!"}]
  }`
    : ''
  // Keep administrator-configured addresses and catalog names shell-safe.
  const endpoint =
    `${props.apiBaseUrl}/${props.modelName ? 'chat/completions' : 'models'}`.replaceAll(
      "'",
      "'\\''"
    )
  const command = `curl '${endpoint}' \\\n  --header "Authorization: Bearer $TAODOCK_API_KEY"${props.modelName ? ` \\\n  --header 'Content-Type: application/json' \\\n  --data '${payload.replaceAll("'", "'\\''")}'` : ''}`
  return (
    <div className='home-terminal'>
      <div className='home-terminal-bar'>
        <span className='home-terminal-dots' aria-hidden='true'>
          <i />
          <i />
          <i />
        </span>
        <span className='home-terminal-title'>API · cURL</span>
        <CopyButton
          value={command}
          aria-label={t('Copy cURL example')}
          size='sm'
        >
          {t('Copy')}
        </CopyButton>
      </div>
      <CodeBlock
        code={command}
        language='bash'
        enableCollapse={false}
        showLineNumbers={false}
        title={t('cURL example')}
        className='home-curl-code'
      />
      <div className='home-terminal-response'>
        <span>{t('Example only')}</span>
        <code>{props.modelName ? 'HTTP/1.1 200 OK' : 'GET /v1/models'}</code>
        <p>
          {t(
            'Replace the key variable before running. This page does not send API requests on your behalf.'
          )}
        </p>
      </div>
    </div>
  )
}
