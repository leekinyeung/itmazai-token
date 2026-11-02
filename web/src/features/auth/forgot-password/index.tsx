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
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Separator } from '@/components/ui/separator'

import { AuthLayout } from '../auth-layout'
import { ForgotPasswordForm } from './components/forgot-password-form'

export function ForgotPassword() {
  const { t } = useTranslation()
  return (
    <AuthLayout variant='split'>
      <div className='w-full space-y-8'>
        <div>
          <h1 className='auth-heading'>{t('Forgot password')}</h1>
          <p className='auth-description'>
            {t(
              'Enter your registered email and we will send you a link to reset your password.'
            )}
          </p>
        </div>

        <ForgotPasswordForm />

        <div className='auth-switch'>
          <Separator className='min-w-0 flex-1' />
          <p>
            <Link
              to='/sign-in'
              className='inline-flex items-center gap-2 font-medium hover:underline'
            >
              <ArrowLeft className='size-4' aria-hidden='true' />
              {t('Back to login')}
            </Link>
          </p>
          <Separator className='min-w-0 flex-1' />
        </div>
      </div>
    </AuthLayout>
  )
}
