import { ReactNode } from 'react'
import { Flex, Box, Text } from "@radix-ui/themes"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        width: '100%',
        padding: '40px 20px',
        backgroundColor: 'var(--gray-2)',
        border: '1px solid var(--gray-6)',
        borderRadius: '12px',
        textAlign: 'center'
      }}
    >
      <Box style={{ marginBottom: '16px', opacity: 0.7 }}>
        {icon}
      </Box>
      <Text size="4" weight="medium" style={{ marginBottom: '8px' }}>
        {title}
      </Text>
      <Text size="3" color="gray">
        {description}
      </Text>
    </Flex>
  )
}
