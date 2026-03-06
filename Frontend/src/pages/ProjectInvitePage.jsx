import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./ProjectInvitePage.module.css";
import Navbar from "../components/Navbar";

function ProjectInvitePage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    usePageTitle("Project Invitation");


    const handleAccept = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetchWithAuth(
                `/api/projects/${projectId}/members/accept-invite`,
                { method: "POST" }
            );

            navigate(`/project/${projectId}`);
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
                    <h2>Project Invitation</h2>

                    <p className={styles.text}>
                        You have been invited to join this project.
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
                            Cancel
                        </button>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ProjectInvitePage;
