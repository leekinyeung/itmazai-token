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
import { SystemInfoSection } from '../general/system-info-section'
import {
  parseHeaderNavModules,
  parseSidebarModulesAdmin,
  serializeHeaderNavModules,
  serializeSidebarModulesAdmin,
} from '../maintenance/config'
import { HeaderNavigationSection } from '../maintenance/header-navigation-section'
import { NoticeSection } from '../maintenance/notice-section'
import { SidebarModulesSection } from '../maintenance/sidebar-modules-section'
import type { SiteSettings } from '../types'
import { createSectionRegistry } from '../utils/section-registry'
import { SITE_DEFAULT_SECTION, type SiteSectionId } from './route-constants'

const SITE_SECTIONS = [
  {
    id: 'system-info',
    titleKey: 'System Information',
    build: (settings: SiteSettings) => (
      <SystemInfoSection
        defaultValues={{
          SystemName: settings.SystemName,
          Logo: settings.Logo,
          Footer: settings.Footer,
          About: settings.About,
          HomePageContent: settings.HomePageContent,
          ServerAddress: settings.ServerAddress,
          TaskPublicAddress: settings.TaskPublicAddress,
          general_setting: {
            docs_link: settings['general_setting.docs_link'],
          },
          legal: {
            user_agreement: settings['legal.user_agreement'],
            privacy_policy: settings['legal.privacy_policy'],
          },
          contact: {
            email: settings['contact.email'],
            facebook: settings['contact.facebook'],
            youtube: settings['contact.youtube'],
            instagram: settings['contact.instagram'],
            telegram: settings['contact.telegram'],
            x: settings['contact.x'],
          },
        }}
      />
    ),
  },
  {
    id: 'notice',
    titleKey: 'System Notice',
    build: (settings: SiteSettings) => (
      <NoticeSection defaultValue={settings.Notice ?? ''} />
    ),
  },
  {
    id: 'header-navigation',
    titleKey: 'Header navigation',
    build: (settings: SiteSettings) => {
      const headerNavConfig = parseHeaderNavModules(settings.HeaderNavModules)
      const headerNavSerialized = serializeHeaderNavModules(headerNavConfig)
      return (
        <HeaderNavigationSection
          config={headerNavConfig}
          initialSerialized={headerNavSerialized}
        />
      )
    },
  },
  {
    id: 'sidebar-modules',
    titleKey: 'Sidebar modules',
    build: (settings: SiteSettings) => {
      const sidebarConfig = parseSidebarModulesAdmin(
        settings.SidebarModulesAdmin
      )
      const sidebarSerialized = serializeSidebarModulesAdmin(sidebarConfig)
      return (
        <SidebarModulesSection
          config={sidebarConfig}
          initialSerialized={sidebarSerialized}
        />
      )
    },
  },
] as const

const siteRegistry = createSectionRegistry<SiteSectionId, SiteSettings>({
  sections: SITE_SECTIONS,
  defaultSection: SITE_DEFAULT_SECTION,
  basePath: '/system-settings/site',
  urlStyle: 'path',
})

export { SITE_DEFAULT_SECTION, SITE_SECTION_IDS } from './route-constants'
export type { SiteSectionId } from './route-constants'
export const getSiteSectionNavItems = siteRegistry.getSectionNavItems
export const getSiteSectionContent = siteRegistry.getSectionContent
export const getSiteSectionMeta = siteRegistry.getSectionMeta
