import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import styles from "./ProjectInvitePage.module.css";

function WorkspaceInvitePage() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAccept = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth(
                `/api/workspaces/${workspaceId}/accept-invite`,
                { method: "POST" }
            );
            if (res.success) {
                navigate(`/workspace/${workspaceId}/projects`);
            } else {
                setError(res.message || "Failed to accept invitation.");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.wrapper}>
                <div className={styles.card}>
                    <h2>Workspace Invitation</h2>
                    <p className={styles.text}>
                        You have been invited to join this workspace.
                    </p>
                    <div className={styles.actions}>
                        <button
                            className={styles.acceptBtn}
                            onClick={handleAccept}
                            disabled={loading}
                        >
                            {loading ? "Accepting..." : "Accept"}
                        </button>
                        <button
                            className={styles.cancelBtn}
                            onClick={() => navigate("/home")}
                        >
                            Decline
                        </button>
                    </div>
                    {error && <div className={styles.error}>{error}</div>}
                </div>
            </div>
        </>
    );
}

export default WorkspaceInvitePage;
