import { useParams } from 'react-router-dom';

export function ChallengePage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Challenge Arena</h1>
      <p className="text-gray-500">Challenge ID: {id}</p>
      <p className="text-gray-400 mt-4">Evidence submission, voting, and AI analysis coming in Phase 2.</p>
    </div>
  );
}
