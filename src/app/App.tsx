import { DashboardView } from '../features/dashboard/DashboardView';
import { ParticipantView } from '../features/participant/ParticipantView';
import { useRoute } from '../hooks/useRoute';

export function App() {
  const route = useRoute();
  if (route.kind === 'participant') {
    return <ParticipantView roomCode={route.roomCode} />;
  }
  return <DashboardView />;
}

export default App;
