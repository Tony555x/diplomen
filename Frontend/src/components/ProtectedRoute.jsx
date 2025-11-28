import React from "react";
import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../auth";

/**
 * ProtectedRoute component that wraps protected pages.
 * Redirects to login if user is not authenticated.
 */
function ProtectedRoute({ children }) {
    if (!isLoggedIn()) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
