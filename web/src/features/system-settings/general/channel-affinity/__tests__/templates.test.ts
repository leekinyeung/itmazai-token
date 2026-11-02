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
import { expect, test } from 'vitest'

import { cloneTemplate, RULE_TEMPLATES } from '../constants'

test.each(Object.entries(RULE_TEMPLATES))(
  '%s templates retain their values and can be edited without changing the defaults',
  (_key, template) => {
    const copy = cloneTemplate(template)
    expect(copy).toEqual(template)
    copy.name = 'Edited rule'
    copy.model_regex.push('^custom-model$')
    copy.path_regex.push('/custom')
    copy.key_sources[0].path = 'custom.path'
    const operations = copy.param_override_template?.operations as {
      value: string[]
    }[]
    operations[0].value.push('X-Custom-Header')

    expect(template.name).not.toBe('Edited rule')
    expect(template.model_regex).not.toContain('^custom-model$')
    expect(template.path_regex).not.toContain('/custom')
    expect(template.key_sources[0].path).not.toBe('custom.path')
    expect(JSON.stringify(template.param_override_template)).not.toContain(
      'X-Custom-Header'
    )
    expect(cloneTemplate(template)).toEqual(template)
  }
)
