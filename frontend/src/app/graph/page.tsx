"use client";

import React from 'react';
import ReactFlow from 'reactflow';
import { gql, useQuery } from '@apollo/client';
import { useSession, signIn } from 'next-auth/react';

import 'reactflow/dist/style.css';

const HELLO_QUERY = gql`
  query HelloQuery {
    hello
  }
`;

const ME_QUERY = gql`
  query MeQuery {
    me {
      id
      username
    }
  }
`;

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Hello' } },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'World' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function GraphPage() {
  const { data: session, status } = useSession();
  const { data: helloData, loading: helloLoading, error: helloError } = useQuery(HELLO_QUERY);
  const { data: meData, loading: meLoading, error: meError } = useQuery(ME_QUERY);

  if (status === "loading" || helloLoading || meLoading) return <p>Loading...</p>;

  if (status === "unauthenticated") {
    return (
      <div>
        <p>Access Denied</p>
        <button onClick={() => signIn()}>Sign in</button>
      </div>
    );
  }

  if (helloError) return <p>Error: {helloError.message}</p>;
  if (meError) return <p>Error: {meError.message}</p>;

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={initialNodes} edges={initialEdges} />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 4 }}>
        <p>GraphQL Data: {helloData.hello}</p>
        <p>User: {meData.me.username}</p>
        <p>Session User: {session?.user?.name}</p>
      </div>
    </div>
  );
}