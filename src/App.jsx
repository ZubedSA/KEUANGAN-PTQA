import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Keuangan from './pages/Keuangan';
import Santri from './pages/Santri';
import Tools from './pages/Tools';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />

          {/* Keuangan Route with Submenu Logic */}
          <Route path="keuangan" element={<Navigate to="/keuangan/pemasukan" replace />} />
          <Route path="keuangan/:tab" element={<Keuangan />} />

          {/* Santri Route with Submenu Logic */}
          <Route path="santri" element={<Navigate to="/santri/data" replace />} />
          <Route path="santri/:tab" element={<Santri />} />

          <Route path="tools" element={<Tools />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
