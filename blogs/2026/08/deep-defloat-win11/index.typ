#import "@local/ypst-template:0.1.0" as theme 

#import theme: template, sidenote, theorem
#show: template 

= Deep-Debloating Windows 11
Windows 11 has long been my primary operating system. After several recent updates, it has started to feel increasingly bloated: mysterious processes often consume large amounts of CPU and memory, and Windows itself can use nearly 15 GB of RAM while completely idle. I have a mild obsession with keeping things clean, so I could no longer put up with Microsoft's software bloat and began aggressively trimming down my system.

== TL;DR
- Remove unused system apps: #link("https://github.com/Raphire/Win11Debloat")[Raphire/Win11Debloat]
- Remove all AI features (third-party alternatives are always available): #link("https://github.com/zoicware/RemoveWindowsAI")[zoicware/RemoveWindowsAI]
- Remove Defender. In most cases, an antivirus app is unnecessary; the firewall and browser security extensions are enough. #link("https://github.com/ionuttbara/windows-defender-remover")[ionuttbara/windows-defender-remover]
- Remove Windows indexing and use Everything instead. This takes several steps; see below.
- Remove Edge and WebView2, and use Chrome instead.

== Remove, Remove, Remove
=== Remove Unneeded System Components
Some well-known tools:

- #link("https://github.com/Raphire/Win11Debloat")[Raphire/Win11Debloat]
- #link("https://github.com/ChrisTitusTech/winutil")[ChrisTitusTech/winutil]
- #link("https://geekuninstaller.com/download")[Geek]

Key things to do:

- Remove unwanted built-in apps.
- Turn off ads, recommendations, weather, location services, and similar features.
- Use Geek to remove unwanted software and clean up its registry entries.

=== Remove All AI Features
As a user in mainland China, I consider every AI feature other than those in Windows Photos a regression. Even when Microsoft disables these components in the UI, their services and background processes may still run:

- Recall: Its background process is named #strong[WorloadsSessionHost]. I initially mistook it for a system process; it used 2 GB of memory while doing nothing useful.
- AI Fabric Service: Its background service is named #strong[WSAIFabricSvc]. One day I found it using a surprising amount of CPU.
- Click to Do
- Copilot, AI Host: These do not run by default for users in mainland China, but they still take up disk space.

Tool: #link("https://github.com/zoicware/RemoveWindowsAI")[zoicware/RemoveWindowsAI]

=== Remove Windows Defender
I removed Windows Defender. In my view, there is no need to install another antivirus app: these tools frequently scan the disk and intercept system operations, which costs performance. I kept Windows Firewall and the browser's security filtering. Do not open suspicious files; look up their hashes in threat-intelligence databases. This can prevent most malware infections.

Tool: #link("https://github.com/ionuttbara/windows-defender-remover")[ionuttbara/windows-defender-remover]

=== Remove Start Menu Experience (Optional)
The Windows 11 Start menu uses about 0.5% CPU and 60 MB of memory. It is a UWP app, essentially a small web frontend built on WebView. I find it unhelpful and full of ads, so I recommend removing it. Put app shortcuts on the desktop or search for apps when you need them.

Tools:

- #link("https://github.com/amymor/1Click-StartMenu")[anymor/1Click-StartMenu] removes the Windows Start menu.
- Use #link("https://learn.microsoft.com/en-us/windows/powertoys/command-palette/overview")[PowerToys Command Palette] as an app launcher similar to macOS Spotlight.

The Start menu is a system-protected UWP app. The #link("https://github.com/amymor/1Click-StartMenu")[1Click-StartMenu] script works by changing the executable's owner to the Administrators group and replacing the original executable with an empty file. The Start Menu files are located roughly under `C:\Windows\SystemApps\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\`.

=== Remove Windows Search
Windows Search keeps improving, but I still find it difficult to use. It consumes a lot of memory and disk space to build its index, often uses a lot of CPU, and still provides a poor search experience. I mostly search by file name rather than file contents, so Everything is a perfect replacement for my use. Its only drawback is its dated-looking interface, though third-party themes are available.

Steps:

- Disable the Windows Search service.
- Remove the disk index: right-click the drive, open Properties, and clear “Allow files on this drive to have contents indexed.”
- Disable Web SearchHost: #link("https://github.com/shoober420/windows11-scripts/blob/main/DisableSearchHost.bat")[windows11-scripts/DisableSearchHost.bat]

#strong[The UI components above (Start, CrossDeviceResume, and Search) are system-level UWP apps. Disabling their services does not stop their background processes; their executable files must be handled directly. Microsoft restores them after Windows updates, so skip this if you do not want the maintenance hassle.]

- CrossDeviceResume
- StartMenuExperienceHost
- WindowsSearchHost

Windows 11 appears to provide registry settings to disable SearchHost and CrossDeviceResume:

```powershell
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search" /v DisableSearch /t REG_DWORD /d 1 /f

taskkill /F /IM SearchHost.exe

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\CrossDeviceResume\Configuration" /v IsResumeAllowed /t REG_DWORD /d 0 /f

taskkill /F /IM CrossDeviceResume.exe
```

=== Replace Bloated Apps
- Replace Adobe Acrobat DC with Stirling-PDF.
- Replace Visual Studio with VS Code.
- Replace WinRAR with 7-Zip.
- Remove OEM support apps and services. For example, replace Asus MyAsus with G-Helper.
- Replace media players with mpv or PotPlayer.
- Prefer standalone apps over apps that depend on the WebView2 Runtime. These apps often claim to be “lightweight” while quietly launching a heavyweight browser process in the background. If I wanted a web app, why not use the browser directly?

=== Remove Unneeded Development Environments
Many languages are primarily developed on systems other than Windows, so their Windows development environments can be bloated and may pollute the system environment. I recommend moving some language and library toolchains to WSL. They are better isolated, quick to set up and remove, and incur almost no performance loss.

- C/C++ with Visual Studio (VC Build Tools): remove the IDE, but keep the command-line toolchain (see below) and use it with vcpkg.
- C/C++ with LLVM: move it entirely to WSL. On Windows, LLVM also requires many MSVC dependencies.
- C/C++ with GNU: move it entirely to a native WSL environment; avoid compatibility environments such as MinGW.
- Zig, Rust, and TeX Live (LaTeX): move them entirely to WSL.
- JavaScript and Python: keep one Node.js and CPython installation on Windows for lightweight tasks. Move the rest of the project tooling to WSL. In my experience, the Linux filesystem is much faster than Windows NTFS when installing many dependencies.
- Go: its Windows toolchain is fairly native and lightweight, so it can stay on Windows.

== Change, Change, Change
=== Clean Up the Context Menu
First, switch the context menu from the Windows 11 style back to the Windows 10 style with #link("https://github.com/valinet/explorerpatcher")[ExplorerPatcher]. The Windows 11 context menu is painfully slow, so I strongly recommend getting rid of it.

The Windows 10 context menu has its own problem: unwanted software often adds entries until it becomes cluttered. I recommend managing it with #link("https://github.com/BluePointLilac/ContextMenuManager/tree/master")[ContextMenuManager].

For entries left behind by stubborn software that ContextMenuManager cannot remove, ask an AI assistant to help write a `.reg` file.

=== Shell Environment
On Windows, I recommend using #link("https://github.com/powershell/powershell")[PowerShell 7] with #link("https://github.com/microsoft/terminal")[Windows Terminal]. #strong[Using CMD will make you unhappy.]

I do not recommend GNU compatibility environments such as MSYS2. For common commands, use native Windows alternatives:

- #link("https://github.com/nscaife/file-windows")[file]
- #link("https://github.com/uutils/coreutils")[coreutils], which includes common GNU utilities.
- Rust rewrites of common tools, such as rg, bat, fd, and dust.

=== C++ Development Environment
For C++, I recommend only #link("https://visualstudio.microsoft.com/downloads/")[Build Tools for Visual Studio (MSVC)]. This is Visual Studio's build toolchain and the native C++ toolchain for Windows. Download the installer and select only the components you need; a full installation takes around 2.5 GB.

#align(center, image("./img1.png", width: 100%))

- Avoid Unix compatibility layers such as MSYS2, Cygwin, and MinGW; they make the environment bloated.
- Avoid languages with an LLVM-based backend, such as Rust, Zig, and Haskell, because their toolchains take up a lot of space. I strongly recommend using WSL for them.
- Use Microsoft's built-in ReFS virtual-disk feature to improve NTFS performance when reading small files. WSL is also fast partly because its VHDX filesystem bypasses the Windows filesystem.
- Use Ninja instead of the MSVC Visual Studio generator to avoid overly bulky generated project files.
- Finally, Git for Windows bundles a mingw64 environment. Consider switching to #link("https://gitforwindows.org/mingit.html")[MinGit].

MSVC also includes a shell environment with various development tools:

```powershell
pwsh.exe  -NoExit  -ExecutionPolicy ByPass -Command & 'C:/Program Files/Microsoft Visual Studio/18/Common7/Tools/Launch-VsDevShell.ps1' -Arch amd64 -HostArch amd64
```

=== Calling the Win32 API
To be continued...

- Vive Tools
- AutoHotkey v2

== Results
Machine: Asus VivoBook 14, 32 GB RAM, 1 TB storage, Intel 258V CPU.

Under a heavy workload—with several Chrome tabs, VS Code, a WSL virtual machine (nearly 3 GB), and Obsidian running—the system uses around 13 GB of RAM. Performance on battery is still smooth, which makes me very happy.

When the system is idle, total memory use is around 5 GB. After checking manually, I could not find any remaining system processes that were easy to remove. Overall, I reached my goal.

#image("./img2.png", width: 100%)
