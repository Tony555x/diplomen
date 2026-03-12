import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import ProjectPage from "./pages/ProjectPage";
import HomePage from "./pages/HomePage";
import CreateWorkspace from "./pages/CreateWorkspace";
import WorkspacePage from "./pages/WorkspacePage";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectInvitePage from "./pages/ProjectInvitePage";
import UserSettingsPage from "./pages/UserSettingsPage";
import AllNotificationsPage from "./pages/AllNotificationsPage";
import WorkspaceInvitePage from "./pages/WorkspaceInvitePage";
import UserActivityPage from "./pages/UserActivityPage";
import NotFoundPage from "./pages/NotFoundPage";
import SearchPage from "./pages/SearchPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/project/:projectId/*"
          element={
            <ProtectedRoute>
              <ProjectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-workspace"
          element={
            <ProtectedRoute>
              <CreateWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/*"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications/project-invite/:projectId"
          element={
            <ProtectedRoute>
              <ProjectInvitePage />
            </ProtectedRoute>}
        />
        <Route
          path="/user/settings"
          element={
            <ProtectedRoute>
              <UserSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <AllNotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace-invite/:workspaceId"
          element={
            <ProtectedRoute>
              <WorkspaceInvitePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/members/:userId/activity"
          element={
            <ProtectedRoute>
              <UserActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

