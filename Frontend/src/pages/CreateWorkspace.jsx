import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import styles from "../components/PopupStyles.module.css";

function CreateWorkspace() {
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Workspace name is required.");
            return;
        }

        setLoading(true);

        try {
            const result = await fetchWithAuth("/api/workspaces", {
                method: "POST",
                body: { name: name.trim() }
            });

            if (result.success) {
                // Redirect to home page
                navigate("/home");
            } else {
                setError(result.message || "Failed to create workspace.");
            }
        } catch (err) {
            console.error("Error creating workspace:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate("/home");
    };

    return (
        <>
            <Navbar />
            <div className={styles.backdrop} style={{ position: "fixed" }}>
                <div className={styles.popup} style={{ maxWidth: "500px" }}>
                    <h2>Create New Workspace</h2>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.field}>
                            <label>Workspace Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter workspace name"
                                disabled={loading}
                            />
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.actions}>
                            <div className={styles.rightActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.createButton}
                                    disabled={loading}
                                >
                                    {loading ? "Creating..." : "Create Workspace"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default CreateWorkspace;
