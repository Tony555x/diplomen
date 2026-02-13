import { useState, useEffect } from "react";
import styles from "./TaskDetailsChat.module.css";
import { fetchWithAuth } from "../../auth";

function TaskDetailsChat({
    projectId,
    taskId,
    messages,
    newMessage,
    setNewMessage,
    reloadMessages,
    messagesEndRef
}) {
    const [activeTab, setActiveTab] = useState("messages");
    const formatTime = dateString => {
        const date = new Date(dateString);
        const diffMins = Math.floor((Date.now() - date) / 60000);
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        await fetchWithAuth(
            `/api/projects/${projectId}/tasks/${taskId}/messages`,
            { method: "POST", body: JSON.stringify({ content: newMessage }) }
        );

        setNewMessage("");
        reloadMessages();
    };

    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (activeTab === "history") {
            loadHistory();
        }
    }, [activeTab, projectId, taskId]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await fetchWithAuth(`/api/projects/${projectId}/tasks/${taskId}/history`);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div className={styles.column}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "messages" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("messages")}
                >
                    Messages
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "history" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("history")}
                >
                    History
                </button>
            </div>

            {activeTab === "messages" ? (
                <>
                    <div className={styles.messages}>
                        {messages.map(m => (
                            <div key={m.id} className={styles.message}>
                                <div className={styles.header}>
                                    <span className={styles.author}>{m.userName}</span>
                                    <span className={styles.time}>{formatTime(m.createdAt)}</span>
                                </div>
                                <div className={styles.content}>{m.content}</div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.inputRow}>
                        <textarea
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                        />
                        <button onClick={handleSend} disabled={!newMessage.trim()}>
                            Send
                        </button>
                    </div>
                </>
            ) : (
                <div className={styles.messages}>
                    {loadingHistory ? (
                        <div style={{ padding: "1rem", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                            Loading history...
                        </div>
                    ) : history.length === 0 ? (
                        <div style={{ padding: "1rem", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                            No history yet.
                        </div>
                    ) : (
                        history.map(h => (
                            <div key={h.id} className={styles.message} style={{ opacity: 0.8 }}>
                                <div className={styles.header}>
                                    <span className={styles.author}>{h.userName}</span>
                                    <span className={styles.time}>{formatTime(h.createdAt)}</span>
                                </div>
                                <div className={styles.content}>
                                    <span style={{ color: "var(--accent-color)" }}>
                                        {h.actionType}
                                    </span>
                                    {h.details && <span style={{ marginLeft: "4px" }}>{h.details}</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default TaskDetailsChat;
