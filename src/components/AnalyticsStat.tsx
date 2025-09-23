'use client'

import { Card, Flex, Box, Text, Tooltip, IconButton } from '@radix-ui/themes'
import { Question } from '@phosphor-icons/react/dist/ssr/Question'

interface AnalyticsStatProps {
  label: string
  value: string
  tooltip?: string
  rightAccessory?: React.ReactNode
}

export function AnalyticsStat({ label, value, tooltip, rightAccessory }: AnalyticsStatProps) {
  return (
    <Card>
      <Box style={{ padding: 16 }}>
        <Flex align="start" justify="between" style={{ marginBottom: 8 }}>
          <Text size="2" color="gray">{label}</Text>
          <Flex align="center" gap="2">
            {rightAccessory}
            {tooltip && (
              <Tooltip content={tooltip}>
                <IconButton variant="ghost" size="1">
                  <Question size={14} />
                </IconButton>
              </Tooltip>
            )}
          </Flex>
        </Flex>
        <Text size="7" weight="bold" style={{ lineHeight: 1, fontFamily: 'F37Jan' }}>{value}</Text>
      </Box>
    </Card>
  )
}


