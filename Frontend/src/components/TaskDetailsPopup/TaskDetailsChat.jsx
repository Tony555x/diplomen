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

    return (
        <div className={styles.column}>
            <h3>Messages</h3>

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
        </div>
    );
}

export default TaskDetailsChat;
