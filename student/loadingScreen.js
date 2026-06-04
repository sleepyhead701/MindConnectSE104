export function showLoadingScreen() {
    if (document.getElementById('loading-screen')) return;

    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background:
            radial-gradient(circle at 18% 12%, rgba(242, 200, 221, 0.45), transparent 28%),
            radial-gradient(circle at 82% 8%, rgba(242, 154, 120, 0.22), transparent 26%),
            linear-gradient(180deg, rgba(255, 253, 247, 0.96) 0%, rgba(255, 240, 243, 0.96) 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif);
    `;
    loadingScreen.innerHTML = `
        <div class="mc-loading-card" role="status" aria-live="polite">
            <div class="mc-loading-mark" aria-hidden="true">
                <svg viewBox="0 0 72 72" fill="none">
                    <defs>
                        <linearGradient id="mc-loading-gradient" x1="12" y1="12" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#dc4779"></stop>
                            <stop offset="1" stop-color="#f3a169"></stop>
                        </linearGradient>
                    </defs>
                    <circle class="mc-loading-ring" cx="36" cy="36" r="28"></circle>
                    <path class="mc-loading-heart" d="M36 48s-14-8.5-14-18.2c0-5.2 3.7-9.3 8.5-9.3 2.9 0 5.1 1.4 6.5 3.4 1.4-2 3.6-3.4 6.5-3.4 4.8 0 8.5 4.1 8.5 9.3C52 39.5 36 48 36 48Z"></path>
                    <path class="mc-loading-spark" d="M22 50c7.5 5.2 20.8 5.2 28 0"></path>
                </svg>
            </div>
            <h2>Đang tải...</h2>
            <p>MindConnect đang chuẩn bị không gian của bạn</p>
            <div class="mc-loading-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        <style>
            .mc-loading-card {
                min-width: min(360px, calc(100vw - 48px));
                padding: 34px 38px 30px;
                border-radius: 24px;
                border: 1px solid rgba(100, 59, 77, 0.1);
                background: rgba(255, 255, 255, 0.78);
                box-shadow: 0 1px 2px rgba(57, 40, 51, 0.04), 0 28px 70px -34px rgba(212, 46, 112, 0.34);
                backdrop-filter: blur(18px) saturate(160%);
                -webkit-backdrop-filter: blur(18px) saturate(160%);
                text-align: center;
            }

            .mc-loading-mark {
                width: 78px;
                height: 78px;
                margin: 0 auto 18px;
                border-radius: 28px;
                display: grid;
                place-items: center;
                background: linear-gradient(135deg, rgba(220, 71, 121, 0.12), rgba(243, 161, 105, 0.16));
                box-shadow: inset 0 0 0 1px rgba(212, 46, 112, 0.12);
            }

            .mc-loading-mark svg {
                width: 64px;
                height: 64px;
            }

            .mc-loading-ring {
                stroke: url(#mc-loading-gradient);
                stroke-width: 4;
                stroke-linecap: round;
                stroke-dasharray: 125 52;
                transform-origin: center;
                animation: mc-loading-spin 1.35s linear infinite;
            }

            .mc-loading-heart {
                fill: none;
                stroke: #d42e70;
                stroke-width: 3;
                stroke-linejoin: round;
                transform-box: fill-box;
                transform-origin: center;
                animation: mc-loading-pulse 1.35s ease-in-out infinite;
            }

            .mc-loading-spark {
                stroke: #f29a78;
                stroke-width: 3;
                stroke-linecap: round;
                animation: mc-loading-glow 1.35s ease-in-out infinite;
            }

            .mc-loading-card h2 {
                margin: 0 0 8px;
                color: #d42e70;
                font-family: var(--font-heading, 'Fraunces', Georgia, serif);
                font-size: 28px;
                line-height: 1.1;
                letter-spacing: 0;
            }

            .mc-loading-card p {
                margin: 0;
                color: #745f69;
                font-size: 14px;
                font-weight: 600;
            }

            .mc-loading-dots {
                margin-top: 20px;
                display: flex;
                gap: 7px;
                justify-content: center;
            }

            .mc-loading-dots span {
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: linear-gradient(135deg, #dc4779, #f3a169);
                animation: mc-loading-bounce 1.25s infinite ease-in-out;
            }

            .mc-loading-dots span:nth-child(2) {
                animation-delay: 0.14s;
            }

            .mc-loading-dots span:nth-child(3) {
                animation-delay: 0.28s;
            }

            @keyframes mc-loading-spin {
                to { transform: rotate(360deg); }
            }

            @keyframes mc-loading-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.06); opacity: 0.82; }
            }

            @keyframes mc-loading-glow {
                0%, 100% { opacity: 0.55; }
                50% { opacity: 1; }
            }

            @keyframes mc-loading-bounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-7px); }
            }
        </style>
    `;
    document.body.appendChild(loadingScreen);
}

export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.transition = 'opacity 0.3s ease';
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.remove(), 300);
    }
}
