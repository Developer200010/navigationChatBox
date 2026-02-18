const projects = [
  {
    title: "PulseCart Analytics",
    year: "2026",
    description:
      "A storefront analytics cockpit that predicts churn risk and suggests campaign actions in real time.",
    tech: ["Next.js", "PostgreSQL", "Redis", "Chart.js"],
    github: "https://github.com/",
    demo: "https://vercel.com/",
  },
  {
    title: "Atlas Talent Finder",
    year: "2025",
    description:
      "A candidate ranking pipeline that combines resume parsing, skill extraction, and interview feedback loops.",
    tech: ["TypeScript", "Node.js", "Prisma", "OpenAI"],
    github: "https://github.com/",
    demo: "https://vercel.com/",
  },
  {
    title: "Dockline Planner",
    year: "2024",
    description:
      "A collaboration board for distributed product teams with timeline views and decision logs.",
    tech: ["React", "Express", "MongoDB", "Socket.IO"],
    github: "https://github.com/",
    demo: "https://vercel.com/",
  },
];

const skills = [
  "TypeScript",
  "Next.js",
  "React",
  "Node.js",
  "Python",
  "PostgreSQL",
  "Docker",
  "CI/CD",
];

export function PortfolioContent() {
  return (
    <main className="portfolio-root" data-portfolio-root>
      <header className="site-header">
        <p className="eyebrow">Product Engineer Portfolio</p>
        <div className="title-row">
          <h1>Nia Verma</h1>
          <p className="role-pill">Building practical AI interfaces</p>
        </div>
        <p className="header-summary">
          AI-first product engineering with clean systems design, measurable
          outcomes, and smooth user workflows.
        </p>
        <nav className="site-nav" aria-label="Section navigation">
          <a href="#hero">Home</a>
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="#skills">Skills</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="prompt-hints">
          <p>Try in chat:</p>
          <ul>
            <li>&quot;Go to projects and highlight most recent.&quot;</li>
            <li>&quot;Fill contact form with my details.&quot;</li>
            <li>&quot;Open GitHub for PulseCart Analytics.&quot;</li>
          </ul>
        </div>
      </header>

      <section id="hero" className="section-card" data-section="hero home intro">
        <p className="section-kicker">Now available for freelance build sprints</p>
        <h2>Designing high-signal web products with AI-first workflows.</h2>
        <p>
          I focus on fast feedback loops: clear interfaces, observable systems,
          and automation that helps teams move without chaos.
        </p>
        <div className="hero-actions">
          <a href="#projects" className="button solid">
            Explore Projects
          </a>
          <a href="#contact" className="button outline">
            Contact Me
          </a>
        </div>
      </section>

      <section
        id="about"
        className="section-card"
        data-section="about bio background profile"
      >
        <h2>About</h2>
        <p>
          I am a full-stack developer with a product mindset and a bias toward
          measurable outcomes. Over the last four years, I have shipped internal
          tools and customer-facing dashboards for e-commerce and SaaS teams.
        </p>
        <p>
          My current focus is combining LLM-driven workflows with robust frontend
          systems so users can ask for outcomes, not just click through screens.
        </p>
      </section>

      <section
        id="projects"
        className="section-card"
        data-section="projects portfolio work case studies"
      >
        <div className="section-heading">
          <h2>Projects</h2>
          <p>Selected projects with production-style architecture and real data.</p>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <article
              key={project.title}
              id={`project-${index + 1}`}
              className="project-card"
              data-project-card
              data-project-title={project.title}
              data-project-order={index + 1}
            >
              <p className="project-meta">
                <span>{project.year}</span>
                {index === 0 ? <span className="recent-tag">Most Recent</span> : null}
              </p>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <ul className="chip-list">
                {project.tech.map((item) => (
                  <li key={`${project.title}-${item}`}>{item}</li>
                ))}
              </ul>
              <div className="project-links">
                <a
                  id={`project-${index + 1}-github`}
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open GitHub for ${project.title}`}
                >
                  GitHub
                </a>
                <a
                  id={`project-${index + 1}-demo`}
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open live demo for ${project.title}`}
                >
                  Live Demo
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="skills"
        className="section-card"
        data-section="skills stack technology expertise"
      >
        <h2>Skills</h2>
        <p>
          I work across frontend, backend, and deployment layers with a strong
          emphasis on maintainability.
        </p>
        <ul className="chip-list">
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </section>

      <section
        id="contact"
        className="section-card"
        data-section="contact hire reach email message"
      >
        <h2>Contact</h2>
        <p>
          Share your project scope and timeline. I usually reply within one
          business day.
        </p>
        <form className="contact-form" id="contact-form">
          <label htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            placeholder="Your name"
          />

          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            placeholder="you@example.com"
          />

          <label htmlFor="contact-subject">Subject</label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            placeholder="Project idea"
          />

          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            placeholder="Tell me what you are building"
          />

          <button type="button" aria-label="Send contact message">
            Send Message
          </button>
        </form>
      </section>
    </main>
  );
}
