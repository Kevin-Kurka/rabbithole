import { gql } from '@apollo/client';

export const CREATE_FORMAL_INQUIRY = gql`
  mutation CreateFormalInquiry($input: CreateFormalInquiryInput!) {
    createFormalInquiry(input: $input)
  }
`;
