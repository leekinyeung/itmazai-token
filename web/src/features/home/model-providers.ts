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
import AnthropicIcon from '@lobehub/icons/es/Anthropic/components/Mono'
import DeepSeekIcon from '@lobehub/icons/es/DeepSeek/components/Color'
import GeminiIcon from '@lobehub/icons/es/Gemini/components/Color'
import KimiIcon from '@lobehub/icons/es/Kimi/components/Mono'
import OpenAIIcon from '@lobehub/icons/es/OpenAI/components/Mono'
import QwenIcon from '@lobehub/icons/es/Qwen/components/Color'

export const HOME_PROVIDERS = [
  {
    name: 'OpenAI',
    search: 'OpenAI',
    description: 'Text · Multimodal · Tool calling',
    icon: OpenAIIcon,
    color: 'text-foreground',
    ribbonClass: '-hue-rotate-60',
  },
  {
    name: 'Anthropic',
    search: 'claude',
    description: 'Reasoning · Coding · Agents',
    icon: AnthropicIcon,
    color: 'text-[#b17d61]',
    ribbonClass: 'hue-rotate-[160deg] saturate-50',
  },
  {
    name: 'Gemini',
    search: 'gemini',
    description: 'Text · Image understanding · Multimodal',
    icon: GeminiIcon,
    color: 'text-primary',
    ribbonClass: 'hue-rotate-0',
  },
  {
    name: 'DeepSeek',
    search: 'deepseek',
    description: 'Text generation · Deep reasoning',
    icon: DeepSeekIcon,
    color: 'text-[#4d6bfe]',
    ribbonClass: 'hue-rotate-[15deg]',
  },
  {
    name: 'Qwen',
    search: 'qwen',
    description: 'Text · Reasoning · Tool calling',
    icon: QwenIcon,
    color: 'text-[#7764ed]',
    ribbonClass: 'hue-rotate-[45deg]',
  },
  {
    name: 'Kimi',
    search: 'kimi',
    description: 'Text · Reasoning · Tool calling',
    icon: KimiIcon,
    color: 'text-foreground',
    ribbonClass: 'hue-rotate-[200deg]',
  },
] as const
