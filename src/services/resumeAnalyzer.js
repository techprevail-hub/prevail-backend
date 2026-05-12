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
    "Vue.js",
    "Python",
    "Django",
    "Flask",
    "FastAPI",
    "Java",
    "Spring Boot",
    "C++",
    "C#",
    ".NET",
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Git",
    "GitHub",
    "Tailwind CSS",
    "Bootstrap",
    "HTML",
    "CSS",
    "SQL",
    "MySQL",
    "PostgreSQL",
    "Supabase",
    "Firebase",
    "JWT",
    "REST API",
    "GraphQL",
    "Redis",
  ];

  const lowerText = text.toLowerCase();

  return skillKeywords.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );
}

// Generate suggestions based on missing sections
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
      "Add a professional summary or objective at the top of your resume."
    );
  }

  if (!lowerText.includes("project")) {
    suggestions.push("Include project details to showcase practical experience.");
  }

  if (
    !lowerText.includes("experience") &&
    !lowerText.includes("internship") &&
    !lowerText.includes("employment")
  ) {
    suggestions.push("Add a dedicated work experience or internship section.");
  }

  if (!lowerText.includes("education")) {
    suggestions.push("Add your educational background.");
  }

  if (!lowerText.includes("skill")) {
    suggestions.push("Add a clear technical skills section.");
  }

  if (
    !lowerText.includes("certification") &&
    !lowerText.includes("certificate")
  ) {
    suggestions.push(
      "Consider adding relevant certifications to strengthen your profile."
    );
  }

  // Check for quantified achievements (numbers, percentages, etc.)
  const hasNumbers = /\b\d+(\.\d+)?%?\b/.test(text);
  if (!hasNumbers) {
    suggestions.push(
      "Include quantified achievements (e.g., percentages, numbers, impact metrics)."
    );
  }

  return suggestions;
}

// Calculate realistic resume score
function calculateScore(text, skills) {
  const lowerText = text.toLowerCase();
  let score = 0;

  // 1. Contact Information (10 points)
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasPhone = /(\+?\d[\d\s\-()]{8,}\d)/.test(text);

  if (hasEmail) score += 5;
  if (hasPhone) score += 5;

  // 2. Professional Summary / Objective (10 points)
  if (
    lowerText.includes("summary") ||
    lowerText.includes("objective") ||
    lowerText.includes("profile")
  ) {
    score += 10;
  }

  // 3. Technical Skills (20 points)
  score += Math.min(skills.length * 2, 20);

  // 4. Projects (15 points)
  if (lowerText.includes("project")) {
    score += 15;
  }

  // 5. Work Experience / Internship (15 points)
  if (
    lowerText.includes("experience") ||
    lowerText.includes("internship") ||
    lowerText.includes("employment")
  ) {
    score += 15;
  }

  // 6. Education (10 points)
  if (lowerText.includes("education")) {
    score += 10;
  }

  // 7. Certifications (5 points)
  if (
    lowerText.includes("certification") ||
    lowerText.includes("certificate")
  ) {
    score += 5;
  }

  // 8. Quantified Achievements (10 points)
  const hasNumbers = /\b\d+(\.\d+)?%?\b/.test(text);
  if (hasNumbers) {
    score += 10;
  }

  // 9. Content Length Bonus (up to 5 points)
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount > 500) {
    score += 5;
  } else if (wordCount > 300) {
    score += 3;
  } else if (wordCount > 150) {
    score += 1;
  }

  // Ensure score remains between 0 and 100
  return Math.max(0, Math.min(Math.round(score), 100));
}

// Main analysis function
function analyzeResume(text) {
  const skills = extractSkills(text);
  const suggestions = generateSuggestions(text, skills);
  const score = calculateScore(text, skills);

  return {
    score,
    skills,
    suggestions,
  };
}

// ES Module export
export { analyzeResume };