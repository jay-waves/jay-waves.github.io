#import "@local/ypst-template:0.1.0" as theme 

#import theme: template, sidenote, theorem
#show: template

= Building a Better EPUB and PDF Reader
I have always struggled to find a PDF or EPUB reader that I actually enjoy using.

- Adobe Acrobat is feature-rich and has a modern interface, but it is neither free nor lightweight. I only read books and do not need most of its features.
- Stirling PDF is similar to Acrobat and relatively free, but it is not lightweight either.
- Sumatra PDF is fast and lightweight, but ugly.
- Readest looks good and is open source, but it is quickly becoming bloated with unnecessary features.

#strong[My workflow is already deeply integrated with the browser. I use its history and bookmarks all the time, so I would like to read PDFs and ebooks directly in the browser.]

== pdf.ts
A browser extension based on #link("https://github.com/embedpdf/embed-pdf-viewer")[embedPDF]. It intercepts `file://*.pdf` and `https://*.pdf` URLs and redirects them to the extension's viewer.

- Supports fast BMP rendering while reducing memory use, with performance and memory efficiency comparable to the Microsoft Edge PDF viewer.
- A clean, minimalist interface with few distractions, focused on reading while still supporting annotations and comments.

#align(center, image("./img1.webp", width: 100%))

#strong[More details and source code: #link("https://github.com/jay-waves/pdf.ts")[jay-waves/pdf.ts]]

== epub.ts
A Chrome extension based on #link("https://github.com/johnfactotum/foliate-js")[foliate-js]. It intercepts `file://*.epub` and `https://*.epub` URLs and redirects them to the extension's reader.

- Carefully adapts and styles a wide range of EPUB layouts, with customizable themes.
- A minimalist reading interface with few distractions, plus support for highlights, annotations, and translation.
- Does not rely on browser storage; highlights and other edits are written directly to the original file.

#align(center, image("./img2.webp", width: 100%))

#strong[More details and source code: #link("https://github.com/jay-waves/epub.ts")[jay-waves/epub.ts]]

== Comparing Other Readers
=== Chrome PDF Viewer
Google's design is consistent, but I do not find it attractive... The toolbar at the top is much too tall.

#align(center, image("./img3.webp", width: 100%))

=== Adobe Acrobat
It is powerful, but most of its PDF editing features seem unnecessary for everyday reading.

#align(center, image("./img4.webp", width: 100%))

=== SumatraPDF for EPUB
It has a Windows 7 look. It is lightweight and certainly has a geeky feel.

#align(center, image("./img5.webp", width: 100%))

=== Readest for EPUB
I think it looks quite good, but recent updates keep adding features that do not make sense to me. Also, the web version cannot intercept `file://` URLs directly, so you have to import files manually before reading them.

#align(center, image("./img6.webp", width: 100%))

== Supporting Multiple Platforms
Web apps run in a controlled browser sandbox, where the browser governs and checks their behavior. When turning a web app into a local Windows or Linux app, the hardest part is extending its access to the local system. Web apps have limited access to the filesystem, process control, and system integration such as file associations and startup tasks.

Take the browser File System Access API as an example. To read a file, the app must open a file picker and ask the user to select it and grant permission. To write to a file, Chromium-based browsers show a dialog asking the user to select the original file and grant permission; subsequent writes overwrite that file. Safari/WebKit and Firefox still do not support writable handles to local files, so they can only download a copy to a fixed download directory.

In other words, access is restricted, and browser APIs and capabilities also differ. Maintaining the app across browsers is difficult.

There are three common approaches:

+ Use a browser shell such as Electron or Tauri. The app bundles a browser environment (or WebView) and gains most system-level permissions.
+ Move operations to a remote service. User data is uploaded to a server or copied into the browser sandbox's local storage, rather than kept in the user's own directory.
+ Use a local agent. A privileged background process runs on the user's computer; the web app sends it requests through a localhost API, and the agent performs the operations.

Here are the design choices I made for each platform:

=== Chrome Extension
When a user opens a `*.pdf` or `*.epub` file, the browser opens its `file://` URI. The extension listens for this and redirects the file to its own viewer.

When the user edits a file and needs to save it, a dialog asks where to write it. Choosing the original file overwrites it in place.

=== Web App
When the user opens `jay-waves.cn/epub.ts`, a welcome screen appears. The user selects or drops a file to open it in the reader. Because this follows a direct user action, Chromium-based browsers allow the app to request both read and write access.

When the user edits a file and saves it, Safari or Firefox triggers a download, while Chrome writes the changes back to the original file.

=== Windows Desktop App
I wrote a small Go launcher for the desktop app. It can run as a background service, though it does not do so automatically. For example, `pdf.ts.exe` embeds all the web app's resources and registers itself as a PDF file handler.

When a PDF is opened, the web app's resources are temporarily extracted and opened in the browser. When the user later saves changes, the web app communicates over the local network with the listening `pdf.ts.exe`, which performs the file write on its behalf.
