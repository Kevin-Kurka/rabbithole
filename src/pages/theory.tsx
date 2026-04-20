import { useParams } from 'react-router-dom';

export function TheoryPage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Theory Builder</h1>
      <p className="text-gray-500">Theory ID: {id}</p>
      <p className="text-gray-400 mt-4">Connect-the-dots graph view coming in Phase 2.</p>
    </div>
  );
}
