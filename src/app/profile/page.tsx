'use client'

import { Heading, Text, Flex, Box, Card, TextField, Button, Separator, Table, IconButton } from "@radix-ui/themes"
import { Key as KeyIcon, Trash } from "@phosphor-icons/react/dist/ssr"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/AuthProvider"
import { DashboardLayout } from "@/components/DashboardLayout"
import { useToast } from "@/components/ToastProvider"
import { useUserProfile } from "@/hooks/useUserProfile"
import { supabase } from "@/lib/supabase"
import { sendCustomPasswordReset } from "@/lib/auth-config"
import { User } from "@phosphor-icons/react/dist/ssr/User"
import { Lock } from "@phosphor-icons/react/dist/ssr/Lock"
import { AvatarUpload } from "@/components/AvatarUpload"

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile, updateProfile, refetch } = useUserProfile()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
    }
    if (profile) {
      setName(profile.name || '')
      setAvatar(profile.avatar)
    }
  }, [user, profile])

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/profile/api-keys', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (res.ok) {
          const json = await res.json()
          setApiKeys(json.keys || [])
        }
      } catch {}
    }
    loadKeys()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast({
        type: 'error',
        title: 'Name is required',
        description: 'Please enter your full name to update your profile.'
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      })

      if (error) {
        showToast({
          type: 'error',
          title: 'Update failed',
          description: error.message
        })
      } else {
        showToast({
          type: 'success',
          title: 'Profile updated!',
          description: 'Your profile information has been saved successfully.'
        })
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Unexpected error',
        description: 'An unexpected error occurred while updating your profile.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      showToast({
        type: 'error',
        title: 'Missing fields',
        description: 'Please fill in all password fields.'
      })
      return
    }

    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Passwords do not match',
        description: 'Please make sure both password fields are identical.'
      })
      return
    }

    if (newPassword.length < 6) {
      showToast({
        type: 'error',
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.'
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        showToast({
          type: 'error',
          title: 'Password update failed',
          description: error.message
        })
      } else {
        showToast({
          type: 'success',
          title: 'Password updated!',
          description: 'Your password has been changed successfully.'
        })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Unexpected error',
        description: 'An unexpected error occurred while updating your password.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!email) {
      showToast({
        type: 'error',
        title: 'Email required',
        description: 'Please provide an email address to send the password reset link.'
      })
      return
    }

    setLoading(true)

    try {
      // Use custom password reset function with branded email template
      const { error } = await sendCustomPasswordReset(email)

      if (error) {
        showToast({
          type: 'error',
          title: 'Reset email failed',
          description: error.message
        })
      } else {
        showToast({
          type: 'success',
          title: 'Reset email sent!',
          description: 'Check your inbox for password reset instructions with Gloo Impact branding.'
        })
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Unexpected error',
        description: 'An unexpected error occurred while sending the reset email.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUploadStart = () => {
    setAvatarUploading(true)
  }

  const handleAvatarUploadComplete = async (avatarUrl: string) => {
    try {
      // Get the current user's token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      // Update avatar via API
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ avatarUrl })
      })

      if (!response.ok) {
        throw new Error('Failed to update avatar')
      }

      const result = await response.json()
      
      if (result.success) {
        setAvatar(avatarUrl)
        updateProfile({ avatar: avatarUrl })
        showToast({
          type: 'success',
          title: 'Avatar updated!',
          description: 'Your profile picture has been updated successfully.'
        })
      } else {
        throw new Error(result.error || 'Failed to update avatar')
      }

    } catch (error) {
      console.error('Avatar update error:', error)
      showToast({
        type: 'error',
        title: 'Avatar update failed',
        description: error instanceof Error ? error.message : 'Failed to update avatar'
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  if (!user) {
    return (
      <Box p="6">
        <Text>Please sign in to view your profile.</Text>
      </Box>
    )
  }

  return (
    <DashboardLayout 
      title="Profile Settings" 
      subtitle="Manage your account settings and preferences."
      maxWidth="600px"
    >

        {/* Profile Information */}
        <Card style={{ padding: '24px' }}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="3">
              <User size={20} color="var(--gray-12)" />
              <Heading size="4">Profile Information</Heading>
            </Flex>

            {/* Avatar Upload */}
            <Box style={{ textAlign: 'center', padding: '16px 0' }}>
              <AvatarUpload
                currentAvatar={avatar}
                userName={name || user.email?.split('@')[0] || 'User'}
                onUploadStart={handleAvatarUploadStart}
                onUploadComplete={handleAvatarUploadComplete}
                size="large"
              />
            </Box>

            <Separator size="4" />
            
            <form onSubmit={handleUpdateProfile}>
              <Flex direction="column" gap="4">
                <Box>
                  <Text size="2" weight="medium" style={{ marginBottom: '8px', display: 'block' }}>
                    Full Name
                  </Text>
                  <TextField.Root
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={loading}
                    style={{ width: '100%' }}
                  />
                </Box>

                <Box>
                  <Text size="2" weight="medium" style={{ marginBottom: '8px', display: 'block' }}>
                    Email Address
                  </Text>
                  <TextField.Root
                    value={email}
                    disabled={true}
                    style={{ width: '100%', opacity: 0.7 }}
                  />
                  <Text size="1" color="gray" style={{ marginTop: '4px', display: 'block' }}>
                    Email cannot be changed from this interface
                  </Text>
                </Box>

                <Button 
                  type="submit" 
                  disabled={loading || !name.trim()}
                  style={{ width: 'fit-content' }}
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </Flex>
            </form>
          </Flex>
        </Card>

        <Separator size="4" />

        {/* API Keys */}
        <Card style={{ padding: '24px' }}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="3">
              <KeyIcon size={20} color="var(--gray-12)" />
              <Heading size="4">API Keys</Heading>
            </Flex>

            {newPlainKey && (
              <Box style={{ backgroundColor: 'var(--yellow-2)', border: '1px solid var(--yellow-6)', padding: '12px', borderRadius: 6 }}>
                <Text size="2">
                  Copy your new API key now — you won’t be able to see it again:
                </Text>
                <Text size="2" weight="bold" style={{ display: 'block', fontFamily: 'monospace', marginTop: 8 }}>{newPlainKey}</Text>
              </Box>
            )}

            <Flex gap="2" align="end">
              <TextField.Root
                placeholder="Key name (e.g., n8n)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                onClick={async () => {
                  try {
                    setCreatingKey(true)
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session?.access_token) return
                    const res = await fetch('/api/profile/api-keys', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                      body: JSON.stringify({ name: newKeyName || 'API Key' })
                    })
                    if (res.ok) {
                      const json = await res.json()
                      setNewPlainKey(json.key.plain)
                      setNewKeyName('')
                      // refresh list
                      const list = await fetch('/api/profile/api-keys', { headers: { Authorization: `Bearer ${session.access_token}` } })
                      if (list.ok) setApiKeys((await list.json()).keys || [])
                      showToast({ type: 'success', title: 'API key created', description: 'Copy it now and store it securely.' })
                    } else {
                      showToast({ type: 'error', title: 'Create failed', description: (await res.json()).error || 'Could not create key' })
                    }
                  } finally { setCreatingKey(false) }
                }}
                disabled={creatingKey}
                style={{ cursor: 'pointer' }}
              >
                {creatingKey ? 'Creating...' : 'Create API Key'}
              </Button>
            </Flex>

            {apiKeys.length === 0 ? (
              <Text size="2" color="gray">No API keys yet.</Text>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Key</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Last Used</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {apiKeys.map((k: any) => (
                    <Table.Row key={k.id}>
                      <Table.Cell>{k.name}</Table.Cell>
                      <Table.Cell><code>{k.prefix}••••{k.lastFour}</code></Table.Cell>
                      <Table.Cell>{new Date(k.createdAt).toLocaleDateString()}</Table.Cell>
                      <Table.Cell>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '—'}</Table.Cell>
                      <Table.Cell>
                        <IconButton
                          variant="ghost"
                          color="red"
                          size="1"
                          onClick={async () => {
                            const { data: { session } } = await supabase.auth.getSession()
                            if (!session?.access_token) return
                            const res = await fetch(`/api/profile/api-keys?id=${k.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
                            if (res.ok) {
                              setApiKeys((prev) => prev.filter((x) => x.id !== k.id))
                              showToast({ type: 'success', title: 'Key revoked', description: 'The API key was revoked.' })
                            } else {
                              showToast({ type: 'error', title: 'Revoke failed', description: (await res.json()).error || 'Could not revoke key' })
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <Trash size={12} />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Flex>
        </Card>

        {/* Password Change */}
        <Card style={{ padding: '24px' }}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="3">
              <Lock size={20} color="var(--gray-12)" />
              <Heading size="4">Change Password</Heading>
            </Flex>
            
            <form onSubmit={handleChangePassword}>
              <Flex direction="column" gap="4">
                <Box>
                  <Text size="2" weight="medium" style={{ marginBottom: '8px', display: 'block' }}>
                    New Password
                  </Text>
                  <TextField.Root
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={loading}
                    style={{ width: '100%' }}
                  />
                </Box>

                <Box>
                  <Text size="2" weight="medium" style={{ marginBottom: '8px', display: 'block' }}>
                    Confirm New Password
                  </Text>
                  <TextField.Root
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={loading}
                    style={{ width: '100%' }}
                  />
                </Box>

                <Button 
                  type="submit" 
                  disabled={loading || !newPassword || !confirmPassword}
                  style={{ width: 'fit-content' }}
                >
                  {loading ? 'Updating...' : 'Change Password'}
                </Button>
              </Flex>
            </form>

            <Separator size="2" />

            <Box>
              <Text size="2" color="gray" style={{ marginBottom: '12px', display: 'block' }}>
                Or send a password reset email to make changes via email link:
              </Text>
              <Button 
                variant="outline" 
                onClick={handleSendPasswordReset}
                disabled={loading}
                style={{ width: 'fit-content' }}
              >
                {loading ? 'Sending...' : 'Send Password Reset Email'}
              </Button>
            </Box>
          </Flex>
        </Card>
    </DashboardLayout>
  )
}
