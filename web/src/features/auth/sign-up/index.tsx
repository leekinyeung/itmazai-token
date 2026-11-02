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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Separator } from '@/components/ui/separator'
import { useStatus } from '@/hooks/use-status'

import { AuthLayout } from '../auth-layout'
import { TermsFooter } from '../components/terms-footer'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { t } = useTranslation()
  const { status } = useStatus()

  return (
    <AuthLayout variant='split'>
      <div className='w-full space-y-8'>
        <div>
          <h1 className='auth-heading'>{t('Create an account')}</h1>
          <p className='auth-description'>
            {t('Start here. Connect to more AI possibilities.')}
          </p>
        </div>

        <SignUpForm />

        <div className='auth-switch'>
          <Separator className='min-w-0 flex-1' />
          <p>
            {t('Already have an account?')}{' '}
            <Link to='/sign-in' className='font-medium hover:underline'>
              {t('Sign in now')}
            </Link>
          </p>
          <Separator className='min-w-0 flex-1' />
        </div>

        <TermsFooter
          variant='sign-up'
          status={status}
          className='text-center'
        />
      </div>
    </AuthLayout>
  )
}
