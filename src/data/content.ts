export type Experience = {
  year: string
  title: string
  text: string
}

export type TimelineEntry = {
  period: string
  title: string
  text: string
  category: 'Internship' | 'Education'
}

export type IntroContent = {
  name: string
  role: string
  note: string
}

export type BentoCardType =
  | 'about'
  | 'skills'
  | 'publication'
  | 'education'
  | 'contact'

export type BentoCard = {
  type: BentoCardType
  title: string
  lines: string[]
}

export type ContactItem = {
  label: string
  value: string
  href?: string
  icon?: 'wechat' | 'github' | 'email' | 'blog'
}

export type GitHubProfile = {
  username: string
  profileUrl: string
  label: string
}

export const intro: IntroContent = {
  name: 'Yu, Jia-Wei',
  role: 'Robotics Software Engineer',
  note: '',
}

export const timelineEntries: TimelineEntry[] = [
  {
    period: '2021.09 - 2025.06',
    title: 'B.S. in Information Security · Beihang University',
    text: 'School of Cyber Science and Technology. GPA 3.76/4.00, average score 90.',
    category: 'Education',
  },
  {
    period: '2025.09 - 2026.08',
    title: 'M.S. in Information Security· Beihang University · Dropped out',
    text: 'School of Cyber Science and Technology. Focused on systems security research.',
    category: 'Education',
  },
  {
    period: '2026.09 - Present',
    title: 'M.S. in Computer Science · The University of Hong Kong',
    text: 'School of Computing and Data Science. Focused on robotics research.',
    category: 'Education',
  },
//   {
//     period: '06/2024 - 09/2024',
//     title: 'Internship · Penetration Testing Engineer · DBAPPSecurity',
//     text: 'Joined the 2025 Ministry of Public Security HW blue-team defense exercise and handled on-site gateway deployment and debugging.',
//     category: 'experience',
//   },
  {
    period: '06/2023 - 10/2025',
    title: 'Robotics Researcher · BASS Lab',
    text: 'Designed vulnerability discovery methods for Nav2 and ROS2 autonomous driving libraries using C++17, Python, LLVM, and Docker.',
    category: 'Internship',
  },
  {
    period: '04/2025 - 01/2026',
    title: 'C++ Engineer · Institute 502',
    text: 'Led defect analysis tooling for SPARC-based spacecraft embedded software with C++23, QEMU, Capstone, and CMake.',
    category: 'Internship',
  },
  {
    period: '03/2026 - Present',
    title: 'Robotics Engineer · PNDbotics',
    text: 'Developing robot teleoperation software.',
    category: 'Internship',
  },
]

export const bentoCards: BentoCard[] = [
  {
    type: 'skills',
    title: 'Skills',
    lines: [
      'CET6 522 / IELTS 6.5(6)',
      'C++20 and Python; also comfortable with C, Go, Shell, and TypeScript',
      'Strong Linux development and deployment experience',
      'Hands-on work with ROS2 and teleoperation systems',
    ],
  },
  // {
  //   type: 'publication',
  //   title: 'Publication',
  //   lines: [
  //     'ROCF: A fuzzing framework for ROS2',
  //     'TIFS 2025 (CCF-A)',
  //     'DOI: 10.1109/TIFS.2025.3592562',
  //     'Fourth author, second student author',
  //   ],
  // },
  {
    type: 'contact',
    title: 'Contact',
    lines: [
      'Email: jay.waves@outlook.com',
      'WeChat: jay-waves',
      'GitHub: github.com/jay-waves',
      'Blog: github.com/jay-waves/til',
    //   'CV: oss.jay-waves.cn/cv250304.pdf',
    ],
  },
]

export const contactItems: ContactItem[] = [
  {
    label: 'Email',
    value: 'jay.waves@outlook.com',
    href: 'mailto:jay.waves@outlook.com',
    icon: 'email',
  },
  {
    label: 'WeChat',
    value: 'jay-waves',
    href: 'weixin://dl/chat?jay-waves',
    icon: 'wechat',
  },
  {
    label: 'GitHub',
    value: 'github.com/jay-waves',
    href: 'https://github.com/jay-waves',
    icon: 'github',
  },
  {
    label: 'Blog',
    value: 'github.com/jay-waves/til',
    href: 'https://github.com/jay-waves/til',
    icon: 'blog',
  },
]

export const githubProfile: GitHubProfile = {
  username: 'jay-waves',
  profileUrl: 'https://github.com/jay-waves',
  label: '',
}
