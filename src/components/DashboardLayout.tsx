'use client'

import { Heading, Text, Flex, Box } from "@radix-ui/themes"
import { useAuth } from "@/components/AuthProvider"
// import { LAYOUT_MAX_WIDTH } from "@/lib/constants"
const LAYOUT_MAX_WIDTH = "1200px"

interface DashboardLayoutProps {
  title: string
  subtitle?: string
  showWelcome?: boolean
  action?: React.ReactNode
  children: React.ReactNode
  maxWidth?: string
}

export function DashboardLayout({ 
  title, 
  subtitle, 
  showWelcome = false,
  action,
  children, 
  maxWidth = LAYOUT_MAX_WIDTH 
}: DashboardLayoutProps) {
  const { user } = useAuth()

  return (
    <Box 
      p="6" 
      style={{ 
        maxWidth, 
        margin: '0 auto',
        width: '100%'
      }}
    >
      <Flex direction="column" gap="6">
        {/* Page Header */}
        <Flex justify="between" align="start" gap="4">
          <Box style={{ flex: 1 }}>
            <Heading size="7" style={{ marginBottom: "8px" }}>
              {title}
            </Heading>
            {(subtitle || showWelcome) && (
              <Text size="4" color="gray">
                {subtitle || (showWelcome ? `Welcome back, ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}.` : '')}
              </Text>
            )}
          </Box>
          
          {/* Action Button Area */}
          {action && (
            <Box style={{ flexShrink: 0 }}>
              {action}
            </Box>
          )}
        </Flex>

        {/* Page Content */}
        {children}
      </Flex>
    </Box>
  )
}
