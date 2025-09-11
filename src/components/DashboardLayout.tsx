'use client'

import { Heading, Text, Flex, Box } from "@radix-ui/themes"
import { useAuth } from "@/components/AuthProvider"

interface DashboardLayoutProps {
  title: string
  subtitle?: string
  showWelcome?: boolean
  children: React.ReactNode
  maxWidth?: string
}

export function DashboardLayout({ 
  title, 
  subtitle, 
  showWelcome = false,
  children, 
  maxWidth = "1200px" 
}: DashboardLayoutProps) {
  const { user } = useAuth()

  return (
    <Box p="6" style={{ maxWidth }}>
      <Flex direction="column" gap="6">
        {/* Page Header */}
        <Box>
          <Heading size="7" style={{ marginBottom: "8px" }}>
            {title}
          </Heading>
          {(subtitle || showWelcome) && (
            <Text size="4" color="gray">
              {subtitle || (showWelcome ? `Welcome back, ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}.` : '')}
            </Text>
          )}
        </Box>

        {/* Page Content */}
        {children}
      </Flex>
    </Box>
  )
}
