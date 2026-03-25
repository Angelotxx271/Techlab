import { useParams } from 'react-router-dom';
import ModuleViewComponent from '../components/Module/ModuleView';

export default function ModuleView() {
  const { pathId, moduleId } = useParams<{ pathId: string; moduleId: string }>();

  if (!pathId || !moduleId) {
    return (
      <div className="rounded-lg border border-lc-red/30 bg-lc-red/10 p-6 text-center" role="alert">
        <p className="text-lc-red">Invalid module URL — missing path or module ID.</p>
      </div>
    );
  }

  return <ModuleViewComponent pathId={pathId} moduleId={moduleId} />;
}
