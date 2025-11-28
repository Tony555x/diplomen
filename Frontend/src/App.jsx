import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import CreateWorkspace from "./pages/CreateWorkspace";
import WorkspacePage from "./pages/WorkspacePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/create-workspace" element={<CreateWorkspace />} />
        <Route path="/workspace/:workspaceId/*" element={<WorkspacePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
