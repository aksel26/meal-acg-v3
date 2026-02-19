```html
<!DOCTYPE html>

<html class="light" lang="en">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title>Admin Bento Dashboard</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
      rel="stylesheet"
    />
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              primary: "#135bec",
              "primary-light": "#5c8df6",
              "accent-purple": "#a855f7",
              "background-light": "#f0f2f5",
              "background-dark": "#101622",
            },
            fontFamily: {
              display: ["Inter", "sans-serif"],
            },
            borderRadius: {
              DEFAULT: "0.375rem",
              md: "0.5rem",
              lg: "0.75rem",
              xl: "1rem",
              "2xl": "1.5rem",
              full: "9999px",
            },
            boxShadow: {
              glass: "0 4px 30px rgba(0, 0, 0, 0.1)",
            },
          },
        },
      };
    </script>
    <style>
      .glass-panel {
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.05),
          0 2px 4px -1px rgba(0, 0, 0, 0.03);
      }

      .glass-sidebar {
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.6);
      }

      /* Custom Scrollbar for sleek look */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    </style>
  </head>
  <body
    class="bg-background-light dark:bg-background-dark font-display text-slate-800 antialiased overflow-hidden"
  >
    <div class="flex h-screen w-full">
      <!-- Sidebar Navigation -->
      <aside
        class="glass-sidebar hidden w-20 flex-col items-center justify-between py-6 lg:flex lg:w-64 lg:items-stretch lg:px-6 z-20"
      >
        <div class="flex flex-col gap-8 w-full">
          <!-- Logo Area -->
          <div class="flex items-center justify-center lg:justify-start gap-3">
            <div
              class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-purple shadow-lg text-white"
            >
              <span class="material-symbols-outlined text-[24px]"
                >grid_view</span
              >
            </div>
            <h1
              class="hidden text-xl font-bold tracking-tight text-slate-900 lg:block"
            >
              BentoAdmin
            </h1>
          </div>
          <!-- Navigation Links -->
          <nav class="flex flex-col gap-2">
            <a
              class="group flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-3 text-primary transition-colors"
              href="#"
            >
              <span class="material-symbols-outlined text-[24px]"
                >dashboard</span
              >
              <span class="hidden font-medium lg:block">Overview</span>
            </a>
            <a
              class="group flex items-center gap-3 rounded-lg px-3 py-3 text-slate-500 hover:bg-white/50 hover:text-slate-900 transition-colors"
              href="#"
            >
              <span class="material-symbols-outlined text-[24px]"
                >bar_chart</span
              >
              <span class="hidden font-medium lg:block">Analytics</span>
            </a>
            <a
              class="group flex items-center gap-3 rounded-lg px-3 py-3 text-slate-500 hover:bg-white/50 hover:text-slate-900 transition-colors"
              href="#"
            >
              <span class="material-symbols-outlined text-[24px]"
                >folder_open</span
              >
              <span class="hidden font-medium lg:block">Projects</span>
            </a>
            <a
              class="group flex items-center gap-3 rounded-lg px-3 py-3 text-slate-500 hover:bg-white/50 hover:text-slate-900 transition-colors"
              href="#"
            >
              <span class="material-symbols-outlined text-[24px]">group</span>
              <span class="hidden font-medium lg:block">Users</span>
            </a>
            <a
              class="group flex items-center gap-3 rounded-lg px-3 py-3 text-slate-500 hover:bg-white/50 hover:text-slate-900 transition-colors"
              href="#"
            >
              <span class="material-symbols-outlined text-[24px]"
                >settings</span
              >
              <span class="hidden font-medium lg:block">Settings</span>
            </a>
          </nav>
        </div>
        <!-- User Profile Bottom -->
        <div class="flex flex-col gap-4 w-full">
          <div
            class="relative h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent"
          ></div>
          <a
            class="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/60"
            href="#"
          >
            <div
              class="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm bg-slate-200"
              data-alt="User profile picture showing a smiling professional man"
              style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAP4yUUpISiFDTx-HOCVLkYTxcvHkLalW1K0a-hxTE3-KnXWkGOXHlySSBsscQDrrgToKdxwi8uxViD_oe-eRhwslQG2fuiF_mof1zZOCKJCEOmq52vJcMPmcVXC0sV20Z5QVw8OxUVbWCr-aI5rhktBFvkG46pfqepTQt38Pj9vPrah1PZYni4J6yeMkmso1CPh1bxhHmYu60EM1AjVgqwvXaiJTmp-tsMJEXKs3X8m5ReeilogMa6DowiRM5GFgH05B9posDVW60'); background-size: cover;"
            ></div>
            <div class="hidden flex-col lg:flex">
              <p class="text-sm font-bold text-slate-900">Alex Morgan</p>
              <p class="text-xs text-slate-500">Admin</p>
            </div>
          </a>
        </div>
      </aside>
      <!-- Main Content Wrapper -->
      <main class="flex h-full flex-1 flex-col overflow-hidden relative">
        <!-- Background Elements for Glass Effect -->
        <div
          class="absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-accent-purple/10 blur-[100px] pointer-events-none z-0"
        ></div>
        <div
          class="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none z-0"
        ></div>
        <!-- Top Header -->
        <header class="flex w-full items-center justify-between px-6 py-4 z-10">
          <div class="flex items-center gap-4 lg:hidden">
            <button
              class="flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-white/50"
            >
              <span class="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div class="flex flex-1 items-center gap-6 md:px-4">
            <h2
              class="hidden text-2xl font-bold text-slate-800 md:block tracking-tight"
            >
              Dashboard Overview
            </h2>
            <!-- Search Bar -->
            <div class="relative hidden max-w-md flex-1 md:block">
              <span
                class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]"
                >search</span
              >
              <input
                class="h-10 w-full rounded-xl border-none bg-white/60 pl-10 pr-4 text-sm text-slate-700 shadow-sm ring-1 ring-white/60 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Search..."
                type="text"
              />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-slate-600 shadow-sm ring-1 ring-white transition-transform hover:scale-105 active:scale-95"
            >
              <span class="material-symbols-outlined text-[20px]"
                >notifications</span
              >
              <span
                class="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
              ></span>
            </button>
            <button
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-slate-600 shadow-sm ring-1 ring-white transition-transform hover:scale-105 active:scale-95"
            >
              <span class="material-symbols-outlined text-[20px]"
                >calendar_today</span
              >
            </button>
          </div>
        </header>
        <!-- Scrollable Dashboard Content -->
        <div
          class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10 scroll-smooth"
        >
          <!-- Bento Grid Container -->
          <div
            class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 auto-rows-min"
          >
            <!-- Revenue Chart Widget (Span 2) -->
            <div
              class="glass-panel col-span-1 md:col-span-2 rounded-2xl p-6 flex flex-col justify-between min-h-[320px] group hover:border-white/80 transition-all duration-300"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-500">
                    Total Revenue
                  </p>
                  <h3
                    class="mt-1 text-3xl font-bold text-slate-900 tracking-tight"
                  >
                    $124,500
                  </h3>
                </div>
                <div
                  class="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                >
                  <span class="material-symbols-outlined text-[16px]"
                    >trending_up</span
                  >
                  <span>+12.5%</span>
                </div>
              </div>
              <div class="mt-6 flex-1 w-full overflow-hidden">
                <!-- Custom SVG Chart reusing user data but styled -->
                <svg
                  class="h-full w-full overflow-visible"
                  preserveaspectratio="none"
                  viewbox="0 0 400 150"
                >
                  <defs>
                    <lineargradient
                      id="chartGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stop-color="#135bec"
                        stop-opacity="0.3"
                      ></stop>
                      <stop
                        offset="100%"
                        stop-color="#135bec"
                        stop-opacity="0"
                      ></stop>
                    </lineargradient>
                  </defs>
                  <path
                    d="M0,120 C40,120 40,50 80,50 C120,50 120,90 160,90 C200,90 200,30 240,30 C280,30 280,100 320,100 C360,100 360,10 400,10 V150 H0 Z"
                    fill="url(#chartGradient)"
                  ></path>
                  <path
                    d="M0,120 C40,120 40,50 80,50 C120,50 120,90 160,90 C200,90 200,30 240,30 C280,30 280,100 320,100 C360,100 360,10 400,10"
                    fill="none"
                    stroke="#135bec"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                  ></path>
                </svg>
              </div>
              <div
                class="flex justify-between text-xs text-slate-400 mt-2 font-medium"
              >
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span
                ><span>May</span><span>Jun</span>
              </div>
            </div>
            <!-- User Statistics Widget (Span 1) -->
            <div
              class="glass-panel col-span-1 rounded-2xl p-6 flex flex-col group hover:border-white/80 transition-all duration-300"
            >
              <div class="flex items-center justify-between mb-6">
                <p class="text-sm font-medium text-slate-500">User Growth</p>
                <button class="text-slate-400 hover:text-primary">
                  <span class="material-symbols-outlined text-[20px]"
                    >more_horiz</span
                  >
                </button>
              </div>
              <div
                class="flex items-end justify-between flex-1 gap-2 h-[180px]"
              >
                <!-- Bar Item -->
                <div
                  class="flex flex-col items-center gap-2 flex-1 h-full justify-end"
                >
                  <div
                    class="w-full bg-primary/20 rounded-t-md relative group/bar hover:bg-primary/30 transition-all h-[40%]"
                  >
                    <div
                      class="opacity-0 group-hover/bar:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded"
                    >
                      40%
                    </div>
                  </div>
                  <span class="text-xs font-semibold text-slate-400">M</span>
                </div>
                <div
                  class="flex flex-col items-center gap-2 flex-1 h-full justify-end"
                >
                  <div
                    class="w-full bg-primary/20 rounded-t-md relative group/bar hover:bg-primary/30 transition-all h-[60%]"
                  ></div>
                  <span class="text-xs font-semibold text-slate-400">T</span>
                </div>
                <div
                  class="flex flex-col items-center gap-2 flex-1 h-full justify-end"
                >
                  <div
                    class="w-full bg-accent-purple rounded-t-md relative shadow-lg shadow-accent-purple/30 h-[85%]"
                  ></div>
                  <span class="text-xs font-semibold text-slate-800">W</span>
                </div>
                <div
                  class="flex flex-col items-center gap-2 flex-1 h-full justify-end"
                >
                  <div
                    class="w-full bg-primary/20 rounded-t-md relative group/bar hover:bg-primary/30 transition-all h-[55%]"
                  ></div>
                  <span class="text-xs font-semibold text-slate-400">T</span>
                </div>
                <div
                  class="flex flex-col items-center gap-2 flex-1 h-full justify-end"
                >
                  <div
                    class="w-full bg-primary/20 rounded-t-md relative group/bar hover:bg-primary/30 transition-all h-[70%]"
                  ></div>
                  <span class="text-xs font-semibold text-slate-400">F</span>
                </div>
              </div>
            </div>
            <!-- Quick Actions Widget (Span 1) -->
            <div
              class="glass-panel col-span-1 rounded-2xl p-6 flex flex-col group hover:border-white/80 transition-all duration-300"
            >
              <p class="text-sm font-medium text-slate-500 mb-4">
                Quick Actions
              </p>
              <div class="grid grid-cols-2 gap-3 flex-1">
                <button
                  class="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/40 p-3 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-white/60"
                >
                  <div class="rounded-full bg-primary/10 p-2 text-primary">
                    <span class="material-symbols-outlined text-[24px]"
                      >add</span
                    >
                  </div>
                  <span class="text-xs font-semibold text-slate-600"
                    >Add User</span
                  >
                </button>
                <button
                  class="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/40 p-3 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-white/60"
                >
                  <div
                    class="rounded-full bg-accent-purple/10 p-2 text-accent-purple"
                  >
                    <span class="material-symbols-outlined text-[24px]"
                      >description</span
                    >
                  </div>
                  <span class="text-xs font-semibold text-slate-600"
                    >Report</span
                  >
                </button>
                <button
                  class="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/40 p-3 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-white/60"
                >
                  <div class="rounded-full bg-orange-100 p-2 text-orange-600">
                    <span class="material-symbols-outlined text-[24px]"
                      >upload_file</span
                    >
                  </div>
                  <span class="text-xs font-semibold text-slate-600"
                    >Export</span
                  >
                </button>
                <button
                  class="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/40 p-3 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-white/60"
                >
                  <div class="rounded-full bg-emerald-100 p-2 text-emerald-600">
                    <span class="material-symbols-outlined text-[24px]"
                      >mail</span
                    >
                  </div>
                  <span class="text-xs font-semibold text-slate-600"
                    >Invite</span
                  >
                </button>
              </div>
            </div>
            <!-- Active Projects Table (Span 3) -->
            <div
              class="glass-panel col-span-1 md:col-span-2 xl:col-span-3 rounded-2xl p-0 flex flex-col group hover:border-white/80 transition-all duration-300 overflow-hidden"
            >
              <div class="flex items-center justify-between p-6 pb-4">
                <h3 class="text-lg font-bold text-slate-900">
                  Active Projects
                </h3>
                <a
                  class="text-sm font-semibold text-primary hover:text-primary-light"
                  href="#"
                  >View All</a
                >
              </div>
              <div class="w-full overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr
                      class="border-b border-slate-200/60 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      <th class="px-6 py-4">Project Name</th>
                      <th class="px-6 py-4">Lead</th>
                      <th class="px-6 py-4">Status</th>
                      <th class="px-6 py-4 w-1/3">Progress</th>
                    </tr>
                  </thead>
                  <tbody
                    class="text-sm font-medium text-slate-700 divide-y divide-slate-100/50"
                  >
                    <tr class="group/row hover:bg-white/40 transition-colors">
                      <td class="px-6 py-4">Website Redesign</td>
                      <td class="px-6 py-4">
                        <div
                          class="h-8 w-8 rounded-full bg-slate-200 border border-white"
                          data-alt="Small avatar of project lead"
                          style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCTZOWjZs3iLvNNOz-poJAusQjSIpWpN3LdywfQHrhxGxvNPDw1hKqeMgeutti3OGmDM-YT-07_6lYwp_7BI0X8TqVy8v5jdmKqCn1gyTogFSvEcn1Mz8gJVsDE5RXCQ4vUGTbhUGHQOdMvEeCqkPvnjn5H8pz66YzHfRn2Bf_2IZMbmpdaneLfpxpjMNMbvroc5j5TuhhdJXhjeyv4fGGCnaBr5ayDjwvJ3E52SFRyBRjmJih__kSqpcF7d4YkJN87M3b0qudlzy0'); background-size: cover;"
                        ></div>
                      </td>
                      <td class="px-6 py-4">
                        <span
                          class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                          >In Progress</span
                        >
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div
                            class="h-2 w-full rounded-full bg-slate-200 overflow-hidden"
                          >
                            <div
                              class="h-full rounded-full bg-primary w-[65%]"
                            ></div>
                          </div>
                          <span class="text-xs font-bold text-slate-500"
                            >65%</span
                          >
                        </div>
                      </td>
                    </tr>
                    <tr class="group/row hover:bg-white/40 transition-colors">
                      <td class="px-6 py-4">Mobile App Sync</td>
                      <td class="px-6 py-4">
                        <div
                          class="h-8 w-8 rounded-full bg-slate-200 border border-white"
                          data-alt="Small avatar of project lead"
                          style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuB8zMl6f-pKiytrENnwkLlxKlOCxqy1sz7hYevRQPf8XIYobb2_3Oz1P0-NDTPzSwuODYoeW_jqolQxj7-U5q0fbjXxvRKPbNlVqMrRqo7i75lZzAauF-7nWsBBwoZx4EMK3DFcQgJ4CJ7Z12LJg_XlrN3uiZrGS7cAAPUdn9flkHGUpJc5ny38kNjOYSqfV95RmJzP53O0NvnrMU6YbZxs-UcsXrMkJfqT8z5YHr5_Ohd1kus0bS-0n5jbGLiNGFkyiPshHSOU77o'); background-size: cover;"
                        ></div>
                      </td>
                      <td class="px-6 py-4">
                        <span
                          class="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20"
                          >Review</span
                        >
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div
                            class="h-2 w-full rounded-full bg-slate-200 overflow-hidden"
                          >
                            <div
                              class="h-full rounded-full bg-accent-purple w-[90%]"
                            ></div>
                          </div>
                          <span class="text-xs font-bold text-slate-500"
                            >90%</span
                          >
                        </div>
                      </td>
                    </tr>
                    <tr class="group/row hover:bg-white/40 transition-colors">
                      <td class="px-6 py-4">Marketing Campaign</td>
                      <td class="px-6 py-4">
                        <div
                          class="h-8 w-8 rounded-full bg-slate-200 border border-white"
                          data-alt="Small avatar of project lead"
                          style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBsxKrmxnx_YweIooAEwgPc31H2MAy7GbqZE6W_ScQ-G_9n2jI_NZkq6IpR3wg8yOkKFG4mVB9W_9aOvB2x4lvvEIuF_6vV0J85X_0jP6rlEEI8v64lmDif2Ru1K156OB_qCR5KNAz26g1WQEAdcqB0AhCGAE-tzTlWE47Ya2bcVnCOMlzCg9mfqg24UoPkY8MgMi5j2SIHmtLg_JMQYg1q6dzulCpiOFO2PuNWSW1YNgsb8nD_dFCZAWo0BX0F7TDzwT0smFtVETE'); background-size: cover;"
                        ></div>
                      </td>
                      <td class="px-6 py-4">
                        <span
                          class="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
                          >Planning</span
                        >
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div
                            class="h-2 w-full rounded-full bg-slate-200 overflow-hidden"
                          >
                            <div
                              class="h-full rounded-full bg-yellow-500 w-[25%]"
                            ></div>
                          </div>
                          <span class="text-xs font-bold text-slate-500"
                            >25%</span
                          >
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <!-- Recent Notifications (Span 1) -->
            <div
              class="glass-panel col-span-1 rounded-2xl p-6 flex flex-col group hover:border-white/80 transition-all duration-300"
            >
              <div class="flex items-center justify-between mb-4">
                <p class="text-lg font-bold text-slate-900">Notifications</p>
                <span class="material-symbols-outlined text-slate-400"
                  >notifications_active</span
                >
              </div>
              <div
                class="flex flex-col gap-4 overflow-y-auto max-h-[250px] pr-2"
              >
                <div class="flex gap-3 items-start">
                  <div
                    class="h-8 w-8 min-w-[32px] rounded-full bg-blue-100 flex items-center justify-center text-primary mt-1"
                  >
                    <span class="material-symbols-outlined text-[16px]"
                      >person_add</span
                    >
                  </div>
                  <div class="flex flex-col">
                    <p class="text-sm font-medium text-slate-800">
                      New User Registered
                    </p>
                    <p class="text-xs text-slate-500 line-clamp-1">
                      Sarah Jensen joined the team.
                    </p>
                    <span class="text-[10px] text-slate-400 mt-1"
                      >5 min ago</span
                    >
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <div
                    class="h-8 w-8 min-w-[32px] rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mt-1"
                  >
                    <span class="material-symbols-outlined text-[16px]"
                      >dns</span
                    >
                  </div>
                  <div class="flex flex-col">
                    <p class="text-sm font-medium text-slate-800">
                      Server Alert
                    </p>
                    <p class="text-xs text-slate-500 line-clamp-1">
                      High CPU usage detected on Server A.
                    </p>
                    <span class="text-[10px] text-slate-400 mt-1"
                      >1 hr ago</span
                    >
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <div
                    class="h-8 w-8 min-w-[32px] rounded-full bg-purple-100 flex items-center justify-center text-accent-purple mt-1"
                  >
                    <span class="material-symbols-outlined text-[16px]"
                      >task_alt</span
                    >
                  </div>
                  <div class="flex flex-col">
                    <p class="text-sm font-medium text-slate-800">
                      Task Completed
                    </p>
                    <p class="text-xs text-slate-500 line-clamp-1">
                      Homepage review finished by Mark.
                    </p>
                    <span class="text-[10px] text-slate-400 mt-1"
                      >2 hrs ago</span
                    >
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <div
                    class="h-8 w-8 min-w-[32px] rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mt-1"
                  >
                    <span class="material-symbols-outlined text-[16px]"
                      >attach_money</span
                    >
                  </div>
                  <div class="flex flex-col">
                    <p class="text-sm font-medium text-slate-800">
                      Payment Received
                    </p>
                    <p class="text-xs text-slate-500 line-clamp-1">
                      Invoice #1024 paid by Client X.
                    </p>
                    <span class="text-[10px] text-slate-400 mt-1"
                      >5 hrs ago</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
          <footer class="mt-8 text-center text-xs text-slate-400 pb-4">
            © 2024 BentoAdmin Dashboard. Designed for Modern Teams.
          </footer>
        </div>
      </main>
    </div>
  </body>
</html>
```
