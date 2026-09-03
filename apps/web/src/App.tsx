import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import CopilotLayout from './layouts/CopilotLayout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Opportunities from './pages/Opportunities';
import OpportunityDetail from './pages/OpportunityDetail';
import Campaigns from './pages/Campaigns';
import CampaignBuilder from './pages/CampaignBuilder';
import CampaignResults from './pages/CampaignResults';
import AgentActivity from './pages/AgentActivity';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<CopilotLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/opportunities/:id" element={<OpportunityDetail />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/builder" element={<CampaignBuilder />} />
          <Route path="/campaigns/:id/results" element={<CampaignResults />} />
          <Route path="/agents" element={<AgentActivity />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Route>
    </Routes>
  );
}
