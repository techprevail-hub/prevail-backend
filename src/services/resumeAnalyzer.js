```javascript
// Extract skills from resume text
function extractSkills(text) {
  const skillKeywords = [
    "JavaScript",
    "TypeScript",
    "Node.js",
    "Express.js",
    "MongoDB",
    "React",
    "Next.js",
    "Python",
    "Django",
    "AWS",
    "Docker",
    "Git",
    "Tailwind CSS",
    "SQL",
    "PostgreSQL",
    "Supabase",
    "JWT",
    "REST API",
  ];

  const lowerText = text.toLowerCase();

  return skillKeywords.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );
}

// Generate suggestions based on missing content
function generateSuggestions(text, skills) {
  const suggestions = [];
  const lowerText = text.toLowerCase();

  if (skills.length < 5) {
    suggestions.push("Add more technical skills to strengthen your resume.");
  }

  if (!lowerText.includes("project")) {
    suggestions.push("Include project details to showcase practical experience.");
  }

  if (!lowerText.includes("experience")) {
    suggestions.push("Add a dedicated work experience section.");
  }

  if (!lowerText.includes("education")) {
    suggestions.push("Add your educational background.");
  }

  if (!lowerText.includes("skill")) {
    suggestions.push("Add a clear technical skills section.");
  }

  return suggestions;
}

// Calculate resume score
function calculateScore(text, skills, suggestions) {
  let score = 50;

  // Skills contribute up to 25 points
  score += Math.min(skills.length * 5, 25);

  // Fewer suggestions means better score
  score += Math.max(0, 25 - suggestions.length * 5);

  return Math.min(score, 100);
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

// ES Module export
export { analyzeResume };
```
