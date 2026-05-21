export function animateMainContentSwap() {
    const container = document.getElementById('student-main-content');
    if (!container) return;

    container.classList.remove('content-fade-in');
    void container.offsetWidth;
    container.classList.add('content-fade-in');

    if (!document.getElementById('student-tab-animations')) {
        const style = document.createElement('style');
        style.id = 'student-tab-animations';
        style.textContent = `
            .content-fade-in { animation: contentFadeIn 0.5s ease-out; }
            .nav-tab-bounce { animation: navTabBounce 0.5s ease-out; }
            @keyframes contentFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes navTabBounce {
                0% { transform: scale(1); }
                50% { transform: scale(1.12); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}