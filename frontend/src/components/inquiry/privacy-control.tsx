'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { theme } from '@/styles/theme';

const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      username
      email
    }
  }
`;

export type PrivacyLevel = 'private' | 'shared' | 'public';

interface User {
  id: string;
  username: string;
  email: string;
}

interface PrivacyControlProps {
  value: PrivacyLevel;
  onChange: (level: PrivacyLevel, sharedWith?: string[]) => void;
  sharedWith?: string[];
  disabled?: boolean;
}

export function PrivacyControl({ value, onChange, sharedWith = [], disabled = false }: PrivacyControlProps) {
  const [localSharedWith, setLocalSharedWith] = useState<string[]>(sharedWith);
  const [userSearch, setUserSearch] = useState('');
  const [showUserPicker, setShowUserPicker] = useState(false);

  const { data: searchResults } = useQuery(SEARCH_USERS, {
    variables: { query: userSearch },
    skip: !userSearch || userSearch.length < 2,
  });

  useEffect(() => {
    setLocalSharedWith(sharedWith);
  }, [sharedWith]);

  const handlePrivacyChange = (newLevel: PrivacyLevel) => {
    if (disabled) return;

    if (newLevel === 'shared' && value !== 'shared') {
      setShowUserPicker(true);
    } else {
      setShowUserPicker(false);
    }

    onChange(newLevel, newLevel === 'shared' ? localSharedWith : undefined);
  };

  const handleAddUser = (userId: string) => {
    if (disabled) return;

    const updated = [...localSharedWith, userId];
    setLocalSharedWith(updated);
    onChange(value, updated);
    setUserSearch('');
  };

  const handleRemoveUser = (userId: string) => {
    if (disabled) return;

    const updated = localSharedWith.filter(id => id !== userId);
    setLocalSharedWith(updated);
    onChange(value, updated);
  };

  const privacyOptions = [
    {
      level: 'private' as PrivacyLevel,
      icon: '🔒',
      title: 'Private',
      description: 'Only you can view and edit',
    },
    {
      level: 'shared' as PrivacyLevel,
      icon: '👥',
      title: 'Shared',
      description: 'Share with specific users',
    },
    {
      level: 'public' as PrivacyLevel,
      icon: '🌍',
      title: 'Public',
      description: 'Anyone can view',
    },
  ];

  return (
    <div style={{
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border.DEFAULT}`,
      borderRadius: theme.radius.DEFAULT,
      backgroundColor: theme.colors.background.primary,
    }}>
      <div style={{
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[4],
      }}>
        Privacy Settings
      </div>

      {/* Privacy level options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
      }}>
        {privacyOptions.map((option) => (
          <button
            key={option.level}
            onClick={() => handlePrivacyChange(option.level)}
            disabled={disabled}
            style={{
              padding: theme.spacing[4],
              border: `2px solid ${value === option.level ? theme.colors.primary[500] : theme.colors.border.DEFAULT}`,
              borderRadius: theme.radius.DEFAULT,
              backgroundColor: value === option.level ? theme.colors.primary[50] : theme.colors.background.primary,
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              transition: `all ${theme.transition.base}`,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <div style={{
              fontSize: theme.fontSize['2xl'],
              marginBottom: theme.spacing[2],
            }}>
              {option.icon}
            </div>
            <div style={{
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.semibold,
              color: value === option.level ? theme.colors.primary[700] : theme.colors.text.primary,
              marginBottom: theme.spacing[1],
            }}>
              {option.title}
            </div>
            <div style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.text.secondary,
            }}>
              {option.description}
            </div>
          </button>
        ))}
      </div>

      {/* User picker for shared mode */}
      {value === 'shared' && (
        <div style={{
          padding: theme.spacing[4],
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.radius.DEFAULT,
        }}>
          <div style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing[3],
          }}>
            Share with users
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: theme.spacing[4] }}>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by username or email..."
              disabled={disabled}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                fontSize: theme.fontSize.sm,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.primary,
              }}
            />

            {/* Search results dropdown */}
            {userSearch && searchResults?.searchUsers && searchResults.searchUsers.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: theme.spacing[1],
                backgroundColor: theme.colors.background.primary,
                border: `1px solid ${theme.colors.border.DEFAULT}`,
                borderRadius: theme.radius.DEFAULT,
                boxShadow: theme.shadow.lg,
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: theme.zIndex.dropdown,
              }}>
                {searchResults.searchUsers
                  .filter((user: User) => !localSharedWith.includes(user.id))
                  .map((user: User) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUser(user.id)}
                      disabled={disabled}
                      style={{
                        width: '100%',
                        padding: theme.spacing[3],
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: `background-color ${theme.transition.fast}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!disabled) {
                          e.currentTarget.style.backgroundColor = theme.colors.background.secondary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.colors.text.primary,
                      }}>
                        {user.username}
                      </div>
                      <div style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.tertiary,
                      }}>
                        {user.email}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Selected users */}
          {localSharedWith.length > 0 ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing[2],
            }}>
              {localSharedWith.map((userId) => (
                <div
                  key={userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                    backgroundColor: theme.colors.background.primary,
                    border: `1px solid ${theme.colors.border.DEFAULT}`,
                    borderRadius: theme.radius.full,
                    fontSize: theme.fontSize.sm,
                  }}
                >
                  <span style={{ color: theme.colors.text.primary }}>
                    {userId}
                  </span>
                  {!disabled && (
                    <button
                      onClick={() => handleRemoveUser(userId)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: theme.colors.text.tertiary,
                        cursor: 'pointer',
                        fontSize: theme.fontSize.sm,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        transition: `color ${theme.transition.fast}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = theme.colors.error.DEFAULT;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = theme.colors.text.tertiary;
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: theme.spacing[4],
              textAlign: 'center',
              fontSize: theme.fontSize.sm,
              color: theme.colors.text.tertiary,
            }}>
              No users selected. Search and add users to share with.
            </div>
          )}
        </div>
      )}

      {/* Info message */}
      <div style={{
        marginTop: theme.spacing[4],
        padding: theme.spacing[3],
        backgroundColor: theme.colors.info.bg,
        border: `1px solid ${theme.colors.info.border}`,
        borderRadius: theme.radius.DEFAULT,
        fontSize: theme.fontSize.xs,
        color: theme.colors.info.dark,
      }}>
        {value === 'private' && '🔒 Only you can view and edit this content'}
        {value === 'shared' && `👥 Shared with ${localSharedWith.length} ${localSharedWith.length === 1 ? 'user' : 'users'}`}
        {value === 'public' && '🌍 Anyone can view this content, but only you can edit'}
      </div>
    </div>
  );
}

// Compact version for inline use
interface CompactPrivacyControlProps {
  value: PrivacyLevel;
  onChange: (level: PrivacyLevel) => void;
  disabled?: boolean;
}

export function CompactPrivacyControl({ value, onChange, disabled = false }: CompactPrivacyControlProps) {
  const icons = {
    private: '🔒',
    shared: '👥',
    public: '🌍',
  };

  const labels = {
    private: 'Private',
    shared: 'Shared',
    public: 'Public',
  };

  return (
    <div style={{
      display: 'inline-flex',
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.radius.full,
      padding: theme.spacing[1],
    }}>
      {(['private', 'shared', 'public'] as PrivacyLevel[]).map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          disabled={disabled}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            border: 'none',
            borderRadius: theme.radius.full,
            backgroundColor: value === level ? theme.colors.background.primary : 'transparent',
            color: value === level ? theme.colors.text.primary : theme.colors.text.secondary,
            fontSize: theme.fontSize.sm,
            fontWeight: value === level ? theme.fontWeight.medium : theme.fontWeight.normal,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: `all ${theme.transition.fast}`,
            opacity: disabled ? 0.6 : 1,
            boxShadow: value === level ? theme.shadow.sm : 'none',
          }}
        >
          <span style={{ marginRight: theme.spacing[2] }}>{icons[level]}</span>
          {labels[level]}
        </button>
      ))}
    </div>
  );
}
