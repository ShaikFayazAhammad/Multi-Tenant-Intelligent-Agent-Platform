import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Callback from "./pages/Callback";
import { ProtectedRoute } from "./auth/ProtectedRoute";

const ChatPage = lazy(() => import("./app/ChatPage").then((module) => ({ default: module.ChatPage })));
const TransportProvider = lazy(() => import("./transport/TransportContext").then((module) => ({ default: module.TransportProvider })));
const BargeInProvider = lazy(() => import("./voice/BargeInContext").then((module) => ({ default: module.BargeInProvider })));
const Signup = lazy(() => import("./pages/Signup").then((module) => ({ default: module.default })));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Hexa…</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <TransportProvider>
                  <BargeInProvider>
                    <ChatPage />
                  </BargeInProvider>
                </TransportProvider>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
