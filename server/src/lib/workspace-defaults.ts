import prisma from "../db";

export async function seedWorkspaceDefaults(workspaceId: string) {
  const defaultSops = [
    {
      title: "On-Page Optimization",
      category: "Delivery",
      tools: "Surfer, GSC, Screaming Frog",
      steps: [
        "Validate target keyword & search intent",
        "Keyword in title, meta, H1, first 100 words",
        "Title tag ≤ 60 characters",
        "Meta description ≤ 160 characters",
        "Heading structure H1–H6 correct",
        "Image alt texts optimized",
        "3–5 internal links added",
        "Schema markup added/validated",
        "Page speed & mobile check",
        "Request indexing in GSC"
      ]
    },
    {
      title: "Technical SEO Audit",
      category: "Delivery",
      tools: "Screaming Frog, GSC, Ahrefs",
      steps: [
        "Full crawl (Screaming Frog)",
        "Index coverage & canonical review",
        "Core Web Vitals check",
        "Robots.txt & XML sitemap validation",
        "Broken links / redirect chains",
        "Schema validation",
        "Mobile usability check",
        "Prioritized fix list delivered"
      ]
    },
    {
      title: "Monthly Reporting",
      category: "Process",
      tools: "GSC, GA4, Looker Studio",
      steps: [
        "Data pull on 1st working day",
        "Rankings + traffic + conversions vs last month",
        "Completed work summary",
        "Wins, losses, and why",
        "Next month plan (3–5 priorities)",
        "PM review before sending",
        "Send by the 5th"
      ]
    },
    {
      title: "Client Onboarding",
      category: "Process",
      tools: "GSC, GA4, Ahrefs",
      steps: [
        "Send access checklist (GSC, GA4, CMS)",
        "Kickoff call: goals, KPIs, history",
        "Document SOW, retainer hours, report dates",
        "Baseline audit + keyword landscape",
        "Share 90-day roadmap within 10 business days"
      ]
    },
    {
      title: "Content Production",
      category: "Delivery",
      tools: "Ahrefs, Surfer, Google Docs",
      steps: [
        "Brief from keyword cluster",
        "Strategist approves brief before writing",
        "Writer drafts in template doc",
        "SEO QA against on-page checklist",
        "Publish + index request"
      ]
    },
    {
      title: "Link Building Outreach",
      category: "Delivery",
      tools: "Ahrefs, Hunter, Pitchbox",
      steps: [
        "Prospect: relevance first, DR 30+ preferred",
        "Verify traffic is real",
        "Personalize first line of every email",
        "Max 2 follow-ups, 3–4 days apart",
        "Log every acquired link: URL, DR, anchor"
      ]
    }
  ];

  for (const sop of defaultSops) {
    await prisma.sOP.create({
      data: {
        title: sop.title,
        category: sop.category,
        tools: sop.tools,
        workspaceId,
        steps: {
          create: sop.steps.map((text, position) => ({ text, position }))
        }
      }
    });
  }

  const defaultKb = [
    {
      title: "Traffic drop triage playbook",
      category: "Technical",
      keywords: "traffic,drop,rankings,decline,lost",
      content: "We are sorry to see the drop — here is what we do first: 1) check Search Console coverage and manual actions, 2) compare before/after crawls to catch noindex or redirect issues, 3) review recent Google updates. We run this triage within one business day and send findings."
    },
    {
      title: "404 / crawl error handling",
      category: "Technical",
      keywords: "404,error,crawl,search console,index,broken,redirect",
      content: "404 spikes usually come from changed URLs without redirects. We map the broken URLs, add 301 redirects to the closest match, and request a re-crawl. Most errors clear from the report within 1–2 weeks after fixing."
    },
    {
      title: "Billing & refund policy",
      category: "Billing",
      keywords: "refund,invoice,charged,billing,credit,payment,extra hours",
      content: "Our policy: hours beyond the retainer are only billed with prior written approval. If extra hours were billed without approval, we credit them on the next invoice or refund on request within 5 business days."
    },
    {
      title: "Reporting schedule",
      category: "Process",
      keywords: "report,monthly report,dashboard,numbers,metrics",
      content: "Monthly reports are delivered by the 5th working day and cover rankings, traffic, conversions, completed work and next month priorities."
    },
    {
      title: "Site speed / Core Web Vitals",
      category: "Technical",
      keywords: "speed,slow,core web vitals,theme,performance,vitals",
      content: "Theme or plugin changes are the most common cause of CWV regressions. We profile the templates, defer non-critical scripts, compress media and re-test. Expect a fix plan within 2 business days."
    },
    {
      title: "Services & pricing overview",
      category: "Sales",
      keywords: "services,pricing,offer,local seo,retainer,cost,quote",
      content: "Yes — we cover technical SEO, content, link building and local SEO. Retainers start at 20 hours/month; we will send a tailored proposal after a short discovery call."
    }
  ];

  for (const article of defaultKb) {
    await prisma.knowledgeBase.create({
      data: {
        title: article.title,
        category: article.category,
        keywords: article.keywords,
        content: article.content,
        workspaceId
      }
    });
  }
}
