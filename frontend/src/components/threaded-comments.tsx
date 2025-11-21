'use client';

import { useState } from 'react';
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';

const GET_COMMENTS = gql`
  query GetComments($targetId: ID!) {
    getComments(targetId: $targetId) {
      id
      text
      parentCommentId
      createdAt
      updatedAt
      author {
        id
        username
      }
      replies {
        id
        text
        parentCommentId
        createdAt
        updatedAt
        author {
          id
          username
        }
      }
    }
  }
`;

const CREATE_COMMENT = gql`
  mutation CreateComment($input: CommentInput!) {
    createComment(input: $input) {
      id
      text
      parentCommentId
      createdAt
      updatedAt
      author {
        id
        username
      }
    }
  }
`;

const NEW_COMMENT_SUBSCRIPTION = gql`
  subscription OnNewComment {
    newComment {
      id
      text
      parentCommentId
      targetNodeId
      targetEdgeId
      createdAt
      updatedAt
      author {
        id
        username
      }
    }
  }
`;

interface Author {
  id: string;
  username: string;
}

interface Comment {
  id: string;
  text: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  replies?: Comment[];
}

interface ThreadedCommentsProps {
  targetId: string;
  currentUserId?: string;
}

export default function ThreadedComments({ targetId, currentUserId }: ThreadedCommentsProps) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const { data, loading, refetch } = useQuery(GET_COMMENTS, {
    variables: { targetId },
  });

  const [createComment, { loading: createLoading }] = useMutation(CREATE_COMMENT, {
    onCompleted: () => {
      setCommentText('');
      setReplyText({});
      setReplyingTo(null);
      refetch();
    },
  });

  // Subscribe to new comments
  useSubscription(NEW_COMMENT_SUBSCRIPTION, {
    onData: ({ data }) => {
      const newComment = data.data?.newComment;
      if (
        newComment &&
        (newComment.targetNodeId === targetId || newComment.targetEdgeId === targetId)
      ) {
        refetch();
      }
    },
  });

  const comments: Comment[] = data?.getComments || [];
  const topLevelComments = comments.filter(c => !c.parentCommentId);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    await createComment({
      variables: {
        input: {
          targetId,
          text: commentText,
        },
      },
    });
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    const text = replyText[parentCommentId];
    if (!text?.trim()) return;

    await createComment({
      variables: {
        input: {
          targetId,
          text,
          parentCommentId,
        },
      },
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const showReplyForm = replyingTo === comment.id;

    return (
      <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {comment.author.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">@{comment.author.username}</p>
                <p className="text-xs text-gray-500">{formatTime(comment.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 text-gray-800">
            {renderMentions(comment.text)}
          </div>

          {!isReply && (
            <div className="mt-3 flex items-center space-x-4">
              <button
                onClick={() => {
                  setReplyingTo(showReplyForm ? null : comment.id);
                  if (!showReplyForm && !replyText[comment.id]) {
                    setReplyText({ ...replyText, [comment.id]: `@${comment.author.username} ` });
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showReplyForm ? 'Cancel' : 'Reply'}
              </button>
              {comment.replies && comment.replies.length > 0 && (
                <span className="text-sm text-gray-500">
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
          )}

          {showReplyForm && (
            <div className="mt-4">
              <textarea
                value={replyText[comment.id] || ''}
                onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                placeholder={`Reply to @${comment.author.username}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="mt-2 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText({ ...replyText, [comment.id]: '' });
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={createLoading || !replyText[comment.id]?.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </div>
          )}
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Comments</h3>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment... Use @username to mention someone"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSubmitComment}
            disabled={createLoading || !commentText.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createLoading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Tip: Use @username to mention and notify other users
        </p>
      </div>

      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          topLevelComments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}
