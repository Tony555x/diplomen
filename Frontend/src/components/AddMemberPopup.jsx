import React, { useState } from "react";
import { fetchWithAuth } from "../auth";
import "./AddMemberPopup.css";

function AddMemberPopup({ projectId, onClose, onMemberAdded }) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Please enter an email address.");
            return;
        }

        setLoading(true);

        try {
            const result = await fetchWithAuth(`/api/projects/${projectId}/members`, {
                method: "POST",
                body: { email: email.trim() }
            });

            if (result.success) {
                onMemberAdded();
            } else {
                setError(result.message || "Failed to add member.");
            }
        } catch (err) {
            console.error("Error adding member:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="popup-overlay" onClick={handleBackdropClick}>
            <div className="popup-container">
                <div className="popup-header">
                    <h2>Add Member</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="member-email">Email Address</label>
                        <input
                            id="member-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError("");
                            }}
                            placeholder="Enter member email"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="button-group">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !email.trim()}
                        >
                            {loading ? "Adding..." : "Add Member"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddMemberPopup;
