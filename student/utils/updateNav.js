export function updateNav(idx) {
    // 0:Home, 1:Diary, 2:Resources, 3:Stats, 4:Chat
    document.querySelectorAll('.nav-icon').forEach((el, i) => {
        const navIndex = Number(el.dataset.navIndex ?? i);
        el.classList.toggle('active', navIndex === idx);
        el.classList.remove('nav-tab-bounce');
        if (navIndex === idx) {
            void el.offsetWidth;
            el.classList.add('nav-tab-bounce');
        }
    });
}