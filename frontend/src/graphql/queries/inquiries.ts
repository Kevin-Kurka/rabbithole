/**
 * GraphQL Queries and Mutations for Inquiry System
 */

import { gql } from '@apollo/client';

export const GET_INQUIRIES = gql`
  query GetInquiries($limit: Int, $offset: Int) {
    inquiries(limit: $limit, offset: $offset) {
      id
      title
      description
      inquiryType
      tags
      status
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const GET_INQUIRY = gql`
  query GetInquiry($id: String!) {
    inquiry(id: $id) {
      id
      title
      description
      inquiryType
      tags
      status
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const GET_INQUIRY_POSITIONS = gql`
  query GetInquiryPositions($inquiryId: String!) {
    inquiryPositions(inquiryId: $inquiryId) {
      id
      stance
      argument
      evidenceIds
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_INQUIRY = gql`
  mutation CreateInquiry($input: CreateInquiryInput!) {
    createInquiry(input: $input) {
      id
      title
      description
      inquiryType
      tags
      status
      createdAt
    }
  }
`;

export const CREATE_POSITION = gql`
  mutation CreatePosition($input: CreatePositionInput!) {
    createPosition(input: $input) {
      id
      stance
      argument
      evidenceIds
      createdAt
    }
  }
`;

export const VOTE = gql`
  mutation Vote($input: VoteInput!) {
    vote(input: $input) {
      id
      voteType
      createdAt
    }
  }
`;

export const INQUIRY_CREATED_SUBSCRIPTION = gql`
  subscription InquiryCreated {
    inquiryCreated {
      id
      title
      description
      status
      createdAt
    }
  }
`;

export const POSITION_CREATED_SUBSCRIPTION = gql`
  subscription PositionCreated($inquiryId: String!) {
    positionCreated(inquiryId: $inquiryId) {
      id
      stance
      argument
      createdAt
    }
  }
`;
