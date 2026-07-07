import {BrowserRouter, Route, Routes} from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import Clinic from './pages/Clinic';
import Consult from './pages/Consult';
import Booking from './pages/Booking';
import Lookup from './pages/Lookup';
import Contact from './pages/Contact';
import AdminApp from './pages/admin/AdminApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="phong-kham" element={<Clinic />} />
          <Route path="tu-van" element={<Consult />} />
          <Route path="dat-lich" element={<Booking />} />
          <Route path="tra-cuu" element={<Lookup />} />
          <Route path="lien-he" element={<Contact />} />
        </Route>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
