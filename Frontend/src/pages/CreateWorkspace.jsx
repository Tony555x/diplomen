import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../auth";
import Navbar from "../components/Navbar";
import "./CreateWorkspace.css";

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
            <div className="create-workspace-page">
                <h2>Create New Workspace</h2>

                <form onSubmit={handleSubmit}>
                    <label>
                        Workspace Name
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter workspace name"
                            disabled={loading}
                        />
                    </label>

                    {error && <div className="error-message">{error}</div>}

                    <div className="button-group">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Workspace"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

export default CreateWorkspace;
