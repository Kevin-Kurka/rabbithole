'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  CAST_VOTE,
  REMOVE_VOTE,
  GET_USER_VOTE,
  GET_FORMAL_INQUIRY,
  type FormalInquiry,
} from '@/graphql/queries/formal-inquiries';
import { useSession } from 'next-auth/react';

interface VotingSectionProps {
  inquiry: FormalInquiry;
  onVoteChange?: () => void;
}

export function VotingSection({ inquiry, onVoteChange }: VotingSectionProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [userVoteType, setUserVoteType] = useState<'agree' | 'disagree' | null>(null);

  // Query user's current vote
  const { data: voteData } = useQuery(GET_USER_VOTE, {
    variables: { inquiryId: inquiry.id },
    skip: !session?.user,
  });

  useEffect(() => {
    if (voteData?.getUserVote) {
      setUserVoteType(voteData.getUserVote.vote_type);
    } else {
      setUserVoteType(null);
    }
  }, [voteData]);

  const [castVote, { loading: castingVote }] = useMutation(CAST_VOTE, {
    refetchQueries: [
      { query: GET_FORMAL_INQUIRY, variables: { inquiryId: inquiry.id } },
      { query: GET_USER_VOTE, variables: { inquiryId: inquiry.id } },
    ],
    onCompleted: (data) => {
      setUserVoteType(data.castVote.vote_type);
      toast({
        title: 'Vote Recorded',
        description: `You ${data.castVote.vote_type} with this inquiry.`,
      });
      onVoteChange?.();
    },
    onError: (error) => {
      toast({
        title: 'Error Recording Vote',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [removeVote, { loading: removingVote }] = useMutation(REMOVE_VOTE, {
    refetchQueries: [
      { query: GET_FORMAL_INQUIRY, variables: { inquiryId: inquiry.id } },
      { query: GET_USER_VOTE, variables: { inquiryId: inquiry.id } },
    ],
    onCompleted: () => {
      setUserVoteType(null);
      toast({
        title: 'Vote Removed',
        description: 'Your vote has been removed.',
      });
      onVoteChange?.();
    },
    onError: (error) => {
      toast({
        title: 'Error Removing Vote',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleVote = async (voteType: 'agree' | 'disagree') => {
    if (!session?.user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to vote on inquiries.',
        variant: 'destructive',
      });
      return;
    }

    // If clicking the same vote type, remove vote
    if (userVoteType === voteType) {
      await removeVote({ variables: { inquiryId: inquiry.id } });
      return;
    }

    // Otherwise cast/change vote
    await castVote({
      variables: {
        input: {
          inquiry_id: inquiry.id,
          vote_type: voteType.toUpperCase(),
        },
      },
    });
  };

  const loading = castingVote || removingVote;
  const agreeCount = inquiry.agree_count ?? 0;
  const disagreeCount = inquiry.disagree_count ?? 0;
  const totalVotes = inquiry.total_votes ?? 0;
  const agreePercentage = inquiry.agree_percentage ?? 0;
  const disagreePercentage = inquiry.disagree_percentage ?? 0;

  return (
    <div className="space-y-4">
      {/* Vote Buttons */}
      <div className="flex gap-3">
        <Button
          variant={userVoteType === 'agree' ? 'default' : 'outline'}
          className={`flex-1 ${
            userVoteType === 'agree'
              ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
              : ''
          }`}
          onClick={() => handleVote('agree')}
          disabled={loading}
        >
          <ThumbsUp className="w-4 h-4 mr-2" />
          Agree ({agreeCount})
        </Button>

        <Button
          variant={userVoteType === 'disagree' ? 'default' : 'outline'}
          className={`flex-1 ${
            userVoteType === 'disagree'
              ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
              : ''
          }`}
          onClick={() => handleVote('disagree')}
          disabled={loading}
        >
          <ThumbsDown className="w-4 h-4 mr-2" />
          Disagree ({disagreeCount})
        </Button>
      </div>

      {/* Vote Distribution */}
      {totalVotes > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{agreePercentage.toFixed(1)}% Agree</span>
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            <span>{disagreePercentage.toFixed(1)}% Disagree</span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${agreePercentage}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${disagreePercentage}%` }}
            />
          </div>
        </div>
      )}

      {totalVotes === 0 && (
        <p className="text-xs text-center text-muted-foreground">
          No votes yet. Be the first to vote!
        </p>
      )}

      {!session?.user && (
        <p className="text-xs text-center text-muted-foreground">
          Sign in to vote on this inquiry
        </p>
      )}
    </div>
  );
}
