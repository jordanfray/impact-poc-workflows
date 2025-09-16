'use client'

import { Heading, Text, Flex, Box, Link } from "@radix-ui/themes"
import { useAuth } from "@/components/AuthProvider"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft"
import { useRouter } from "next/navigation"
// import { LAYOUT_MAX_WIDTH } from "@/lib/constants"
const LAYOUT_MAX_WIDTH = "1200px"

interface DashboardLayoutProps {
  title: string
  subtitle?: string | React.ReactNode
  showWelcome?: boolean
  action?: React.ReactNode
  breadcrumb?: {
    label: string
    href: string
  }
  children: React.ReactNode
  maxWidth?: string
}

export function DashboardLayout({ 
  title, 
  subtitle, 
  showWelcome = false,
  action,
  breadcrumb,
  children, 
  maxWidth = LAYOUT_MAX_WIDTH 
}: DashboardLayoutProps) {
  const { user } = useAuth()
  const router = useRouter()

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
        {/* Breadcrumb */}
        {breadcrumb && (
          <Box>
            <Link 
              onClick={() => router.push(breadcrumb.href)}
              style={{ 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--gray-11)',
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={16} />
              <Text size="3">{breadcrumb.label}</Text>
            </Link>
          </Box>
        )}

        {/* Page Header */}
        <Flex justify="between" align="start" gap="4">
          <Box style={{ flex: 1 }}>
            <Heading size="7" style={{ marginBottom: "8px" }}>
              {title}
            </Heading>
          {(subtitle || showWelcome) && (
            <Box>
              {typeof subtitle === 'string' ? (
                <Text size="4" color="gray">
                  {subtitle || (showWelcome ? `Welcome back, ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}.` : '')}
                </Text>
              ) : subtitle ? (
                subtitle
              ) : showWelcome ? (
                <Text size="4" color="gray">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}.
                </Text>
              ) : null}
            </Box>
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
