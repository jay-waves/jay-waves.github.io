async function start(core) {
    try {
        const response = await fetch('./index.md');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const markdown = await response.text();
        await core.render(markdown);
        const title = core.contentElement.querySelector('h1')?.textContent?.trim();
        if (title) document.title = `${title} · Jay Waves`;
    } catch (error) {
        core.showContent();
        core.contentElement.innerHTML =
            `<h1>文章加载失败</h1><p>${escapeHtml(error.message)}</p>`;
    }
}

function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
}

if (window.markdownPreviewCore) {
    start(window.markdownPreviewCore);
} else {
    window.addEventListener(
        'markdown-preview-ready',
        event => start(event.detail),
        { once: true },
    );
}
