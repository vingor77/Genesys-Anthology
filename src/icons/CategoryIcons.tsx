import { GiBroadsword, GiShield } from 'react-icons/gi'
import { FiTool, FiTag, FiZap, FiAlertTriangle } from 'react-icons/fi'

interface IconProps {
  color?: string
  size?: number
}

export function WeaponIcon({ color = 'currentColor', size = 18 }: IconProps) {
  return <GiBroadsword color={color} size={size} aria-hidden="true" />
}

export function ArmorIcon({ color = 'currentColor', size = 18 }: IconProps) {
  return <GiShield color={color} size={size} aria-hidden="true" />
}

export function GearIcon({ color = 'currentColor', size = 18 }: IconProps) {
  return <FiTool color={color} size={size} aria-hidden="true" />
}

export function PersonalIcon({ color = 'currentColor', size = 18 }: IconProps) {
  return <FiTag color={color} size={size} aria-hidden="true" />
}

export function BuffIcon({ color = 'currentColor', size = 18 }: IconProps) {
  return <FiZap color={color} size={size} aria-hidden="true" />
}

export function ConditionIcon({ color = 'currentColor', size = 18 }: IconProps) {
  return <FiAlertTriangle color={color} size={size} aria-hidden="true" />
}

export function categoryIcon(type: 'weapon' | 'armor' | 'gear' | 'personal', props?: IconProps) {
  if (type === 'weapon') return <WeaponIcon {...props} />
  if (type === 'armor') return <ArmorIcon {...props} />
  if (type === 'gear') return <GearIcon {...props} />
  return <PersonalIcon {...props} />
}

export const CATEGORY_COLOR: Record<'weapon' | 'armor' | 'gear' | 'personal', string> = {
  weapon: '#C97064',
  armor: '#6B8CAE',
  gear: '#4FB8A6',
  personal: '#9B8AA3',
}