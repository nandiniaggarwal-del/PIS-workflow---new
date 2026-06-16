import { BrowserRouter, Routes, Route }
from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import VerifyOTPScreen
from "./pages/VerifyOTPScreen";
import MakerScreen from "./pages/MakerScreen";
import HRBPScreen from "./pages/HrbpScreennew";
import HODScreen from "./pages/HODScreen";
import PayrollScreen from "./pages/PayrollScreen";
import AdminScreen from "./pages/AdminScreen";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<LoginScreen />} />
        <Route path="/verify-otp" element={<VerifyOTPScreen />} />
<Route path="/maker" element={<MakerScreen />} />
<Route path="/hrbp" element={<HRBPScreen />} />
<Route path="/hod" element={<HODScreen />} />
<Route path="/payroll" element={<PayrollScreen />} />
<Route path="/admin" element={<AdminScreen />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;