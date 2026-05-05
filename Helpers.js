function formatTime(date) { return new Date(date).toLocaleString(); }
function showNotification(message, type = 'success') {
    const n = document.getElementById('notification');
    n.textContent = message;
    n.className = `notification ${type === 'error' ? 'error' : ''}`;
    n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 3000);
}