import { renderResourcesLibrary } from './Resources.js';

export function navigateResourceMenu(routeKey) {
    const routes = {
        topics: { hash: 'resources', filter: null },
        videos: { hash: 'resources/videos', filter: 'Video' },
        books: { hash: 'resources/books', filter: 'Book' },
        blog: { hash: 'resources/blog', filter: 'Blog' },
        tools: { hash: 'resources/tools', filter: 'Công cụ' }
    };
    const target = routes[routeKey] || routes.topics;

    const nextHash = `#${target.hash}`;

    if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
    }

    if (target.filter) {
        renderResourcesLibrary(target.filter);
        return;
    }

    renderResourcesLibrary();
}