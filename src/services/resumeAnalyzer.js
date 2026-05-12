// Extract technical skills from resume text
function extractSkills(text) {
  const skillKeywords = [
    "JavaScript",
    "TypeScript",
    "Node.js",
    "Express.js",
    "MongoDB",
    "React",
    "Next.js",
    "Angular",
    "Python",
    "Django",
    "Flask",
    "Java",
    "Spring Boot",
    "AWS",
    "Azure",
    "Docker",
    "Kubernetes",
    "Git",
    "HTML",
    "CSS",
    "Tailwind CSS",
    "Bootstrap",
    "SQL",
    "MySQL",
    "PostgreSQL",
    "Supabase",
    "Firebase",
    "REST API",
    "GraphQL",
    "JWT",
  ];

  const lowerText = text.toLowerCase();

  return skillKeywords.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );
}

// Count keyword occurrences
function countOccurrences(text, keywords) {
  const lowerText = text.toLowerCase();
  let count = 0;

  keywords.forEach((keyword) => {
    const regex = new RegExp(keyword.toLowerCase(), "g");
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  });

  return count;
}

// Generate suggestions
function generateSuggestions(text, skills) {
  const suggestions = [];
  const lowerText = text.toLowerCase();

  if (skills.length < 5) {
    suggestions.push("Add more technical skills to strengthen your resume.");
  }

  if (
    !lowerText.includes("summary") &&
    !lowerText.includes("objective") &&
    !lowerText.includes("profile")
  ) {
    suggestions.push(
      "Add a professional summary or objective section."
    );
  }

  if (!lowerText.includes("project")) {
    suggestions.push(
      "Include project details to showcase practical experience."
    );
  }

  if (
    !lowerText.includes("experience") &&
    !lowerText.includes("internship")
  ) {
    suggestions.push(
      "Add work experience or internship details."
    );
  }

  if (!lowerText.includes("education")) {
    suggestions.push("Add your educational background.");
  }

  if (
    !lowerText.includes("certification") &&
    !lowerText.includes("certificate")
  ) {
    suggestions.push(
      "Consider adding relevant certifications."
    );
  }

  if (!/\b\d+(\.\d+)?%?\b/.test(text)) {
    suggestions.push(
      "Include quantified achievements with numbers or percentages."
    );
  }

  return suggestions;
}

// Calculate realistic score
function calculateScore(text, skills, suggestions) {
  let score = 0;
  const lowerText = text.toLowerCase();
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Contact Info (10)
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) score += 5;
  if (/(\+?\d[\d\s\-()]{8,}\d)/.test(text)) score += 5;

  // Skills (0–20)
  score += Math.min(skills.length * 2, 20);

  // Projects (0–15)
  const projectCount = countOccurrences(text, [
    "project",
    "developed",
    "built",
    "implemented",
  ]);
  score += Math.min(projectCount * 3, 15);

  // Experience (0–15)
  const experienceCount = countOccurrences(text, [
    "experience",
    "internship",
    "worked",
    "responsible",
  ]);
  score += Math.min(experienceCount * 3, 15);

  // Education (10)
  if (
    lowerText.includes("education") ||
    lowerText.includes("b.tech") ||
    lowerText.includes("bachelor") ||
    lowerText.includes("master")
  ) {
    score += 10;
  }

  // Certifications (0–5)
  const certificationCount = countOccurrences(text, [
    "certification",
    "certificate",
  ]);
  score += Math.min(certificationCount * 5, 5);

  // Quantified Achievements (0–10)
  const numberMatches = text.match(/\b\d+(\.\d+)?%?\b/g);
  const numberCount = numberMatches ? numberMatches.length : 0;
  score += Math.min(numberCount, 10);

  // Word Count Quality (0–10)
  if (wordCount > 600) {
    score += 10;
  } else if (wordCount > 400) {
    score += 8;
  } else if (wordCount > 250) {
    score += 5;
  } else if (wordCount > 100) {
    score += 2;
  }

  // Penalize for too many suggestions
  score -= suggestions.length * 2;

  // Clamp to 0–100
  return Math.max(0, Math.min(Math.round(score), 100));
}

// Main analysis function
function analyzeResume(text) {
  const skills = extractSkills(text);
  const suggestions = generateSuggestions(text, skills);
  const score = calculateScore(text, skills, suggestions);

  return {
    score,
    skills,
    suggestions,
  };
}

export { analyzeResume };