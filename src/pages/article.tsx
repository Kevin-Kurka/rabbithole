import { useParams } from 'react-router-dom';

export function ArticlePage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Article</h1>
      <p className="text-gray-500">Article ID: {id}</p>
      <p className="text-gray-400 mt-4">Full article reader with claim highlighting coming in Phase 2.</p>
    </div>
  );
}
