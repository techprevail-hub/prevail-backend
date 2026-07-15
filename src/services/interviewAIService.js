import Groq from "groq-sdk";

// --------------------------------------------------
// Initialize Groq AI
// --------------------------------------------------
const groq = new Groq({
  apiKey:
    process.env.INTERVIEW_GROQ_API_KEY,
});

// --------------------------------------------------
// Generate Single Interview Question
// (Keep this for current controller)
// --------------------------------------------------
export const generateInterviewQuestion =
  async (interviewType) => {
    try {
      if (!interviewType) {
        throw new Error(
          "Interview type is required."
        );
      }

      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `
You are a professional AI interviewer.

Generate ONLY ONE interview question.

Rules:
- Ask only one question
- Professional
- Beginner friendly
- No answers
`,
            },
            {
              role: "user",
              content: `Generate one ${interviewType} interview question.`,
            },
          ],
          model:
            "llama-3.1-8b-instant",
        });

      const question =
        completion.choices?.[0]
          ?.message?.content;

      if (!question) {
        throw new Error(
          "No interview question generated."
        );
      }

      return question;
    } catch (error) {
      console.error(
        "Generate Interview Question Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to generate interview question."
      );
    }
  };

// --------------------------------------------------
// Generate 10 Interview Questions
// (For new interview flow)
// --------------------------------------------------
export const generateInterviewQuestions =
  async (interviewType) => {
    try {
      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `
Generate exactly 10 unique interview questions.

Rules:
- One question per line
- No numbering
- No answers
- No explanations
`,
            },
            {
              role: "user",
              content: `Generate 10 ${interviewType} interview questions.`,
            },
          ],
          model:
            "llama-3.1-8b-instant",
        });

      const text =
        completion.choices?.[0]
          ?.message?.content;

      if (!text) {
        throw new Error(
          "Failed to generate interview questions."
        );
      }

      const questions = text
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 10);

      return questions;
    } catch (error) {
      console.error(
        "Generate Interview Questions Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to generate interview questions."
      );
    }
  };

// --------------------------------------------------
// Evaluate Single Answer
// --------------------------------------------------
export const evaluateInterviewAnswer =
  async (
    question,
    answer,
    interviewType
  ) => {
    try {
      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `
You are a professional AI interviewer.

Evaluate interview answers professionally.

Return:
1. Score out of 10
2. Feedback
3. Improvement suggestion
`,
            },
            {
              role: "user",
              content: `
Interview Type:
${interviewType}

Question:
${question}

Candidate Answer:
${answer}
`,
            },
          ],
          model:
            "llama-3.1-8b-instant",
        });

      const feedback =
        completion.choices?.[0]
          ?.message?.content;

      if (!feedback) {
        throw new Error(
          "No feedback generated."
        );
      }

      return feedback;
    } catch (error) {
      console.error(
        "Evaluate Interview Answer Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to evaluate interview answer."
      );
    }
  };

// --------------------------------------------------
// Generate Final Feedback
// --------------------------------------------------
export const generateFinalFeedback =
  async (
    interviewType,
    answers
  ) => {
    try {
      const completion =
        await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `
Evaluate the complete interview.

Return ONLY valid JSON:

{
  "score": 8,
  "feedback": "Overall feedback here"
}

Rules:
- score must be between 1 and 10
- feedback should be professional
- return JSON only
`,
            },
            {
              role: "user",
              content: `
Interview Type:
${interviewType}

Answers:
${JSON.stringify(
  answers,
  null,
  2
)}
`,
            },
          ],
          model:
            "llama-3.1-8b-instant",
        });

      const response =
        completion.choices?.[0]
          ?.message?.content;

      const parsed =
        JSON.parse(response);

      return parsed;
    } catch (error) {
      console.error(
        "Generate Final Feedback Error:",
        error
      );

      throw new Error(
        error.message ||
          "Failed to generate final feedback."
      );
    }
  };

// --------------------------------------------------
// Evaluate Individual Answer with Score
// --------------------------------------------------
export const evaluateIndividualAnswer = async (question, answer, interviewType) => {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional AI interviewer. Evaluate the answer and return a score out of 10 and brief feedback. Format: Score: X/10 - Feedback here`,
        },
        {
          role: "user",
          content: `Interview Type: ${interviewType}\nQuestion: ${question}\nAnswer: ${answer}`,
        },
      ],
      model: "llama-3.1-8b-instant",
    });

    const response = completion.choices?.[0]?.message?.content || "";
    
    const scoreMatch = response.match(/Score:\s*(\d+(?:\.\d+)?)\/10/i);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;
    const feedback = response.replace(/Score:\s*\d+(?:\.\d+)?\/10\s*-?\s*/i, "").trim();
    
    return { score, feedback: feedback || "Your answer has been recorded." };
  } catch (error) {
    console.error("Evaluate Individual Answer Error:", error);
    return { score: 5, feedback: "Answer recorded. Detailed feedback will be available soon." };
  }
};

// ============================================================
// NEW: Generate Professional Interview with Stages
// For Video Interview / Professional Interview Flow
// ============================================================
export const generateProfessionalInterview = async (
  interviewType,
  subType,
  duration = 30,
  company = "",
  jobTitle = "",
  jobDescription = "",
  techStack = "",
  difficulty = "Junior",
  candidateExperience = "Fresher"
) => {
  try {
    if (!interviewType) {
      throw new Error("Interview type is required.");
    }

    // Build the prompt with all available information
    let promptContent = `
You are a senior software engineering interviewer at ${company || "a leading tech company"}.

Create a structured professional interview with multiple stages.

Interview Type: ${interviewType}
Role: ${jobTitle || interviewType}
Technology Stack: ${techStack || subType || "General"}
Difficulty Level: ${difficulty}
Duration: ${duration} Minutes
Candidate Experience: ${candidateExperience}
`;

    // Add company and job details
    promptContent += `
Company Name: ${company || "Not specified"}
Job Title: ${jobTitle || interviewType}
Technology Stack: ${techStack || subType || "General"}
`;

    if (jobDescription) {
      promptContent += `
Job Description:
${jobDescription}
`;
    }

    promptContent += `
Create these 6 sections:
1. Introduction - 2-3 questions about the candidate's background and motivation
2. Resume Discussion - 2-3 questions about their experience, projects, and achievements
3. Technical Round - 5-8 questions specific to the role and technology stack
4. Coding Concepts - 2-3 questions about algorithms, data structures, or system design
5. Behavioral Round - 3-4 questions about soft skills, teamwork, and problem-solving
6. Closing - 1-2 questions about company/role interest and final thoughts

Generate questions appropriate for the duration and difficulty level.
Total questions should be between 15-25 depending on duration.

Tailor questions specifically to:
- The company culture and values
- The role requirements
- The technology stack mentioned
- The difficulty level (${difficulty})
- The candidate's experience level (${candidateExperience})

Difficulty level guidance:
- Fresher: Basic concepts, fundamentals, and learning ability
- Junior: Core skills, practical experience, and problem-solving
- Mid: Advanced concepts, system design, and team collaboration
- Senior: Architecture, mentoring, and strategic thinking
- Lead: Leadership, vision, and cross-team coordination

Return ONLY valid JSON with this exact structure:
{
  "duration": ${duration},
  "totalQuestions": 0,
  "stages": [
    {
      "name": "Introduction",
      "questions": ["question 1", "question 2"]
    },
    {
      "name": "Resume Discussion",
      "questions": ["question 1", "question 2"]
    },
    {
      "name": "Technical Round",
      "questions": ["question 1", "question 2", "question 3"]
    },
    {
      "name": "Coding Concepts",
      "questions": ["question 1", "question 2"]
    },
    {
      "name": "Behavioral Round",
      "questions": ["question 1", "question 2", "question 3"]
    },
    {
      "name": "Closing",
      "questions": ["question 1", "question 2"]
    }
  ]
}

Rules:
- All questions must be professional and relevant to the role
- Technical questions should be appropriate for ${techStack || subType || "the role"}
- Questions should match the ${difficulty} difficulty level
- Questions should be appropriate for a ${candidateExperience} level candidate
- No answers, no explanations
- Return JSON only, no additional text
- Calculate totalQuestions as sum of all question arrays
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a senior technical interviewer. Generate structured interview questions. Return ONLY valid JSON.`,
        },
        {
          role: "user",
          content: promptContent,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
    });

    const response = completion.choices?.[0]?.message?.content;

    if (!response) {
      throw new Error("No response from AI.");
    }

    // Parse the JSON response
    let parsedData;

    try {
      console.log("========== RAW GROQ RESPONSE ==========");
      console.log(response);
      console.log("=======================================");

      let cleanResponse = response.trim();

      // Remove markdown fences
      cleanResponse = cleanResponse.replace(/```json/gi, "");
      cleanResponse = cleanResponse.replace(/```/g, "");

      // Extract only the JSON object
      const start = cleanResponse.indexOf("{");
      const end = cleanResponse.lastIndexOf("}");

      if (start === -1 || end === -1) {
        throw new Error("No JSON object found.");
      }

      cleanResponse = cleanResponse.substring(start, end + 1);

      parsedData = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("RAW RESPONSE:");
      console.error(response);
      throw new Error("Failed to parse AI response as JSON.");
    }

    // Validate the response structure
    if (!parsedData.stages || !Array.isArray(parsedData.stages) || parsedData.stages.length === 0) {
      throw new Error("Invalid response structure: missing stages array.");
    }

    // Ensure totalQuestions is calculated correctly
    const totalQuestions = parsedData.stages.reduce(
      (sum, stage) => sum + (stage.questions?.length || 0),
      0
    );
    parsedData.totalQuestions = totalQuestions;

    // Ensure duration is set
    parsedData.duration = parsedData.duration || duration;

    // ==========================================
    // Add metadata to the parsed data
    // ==========================================
    parsedData.company = company || null;
    parsedData.jobTitle = jobTitle || null;
    parsedData.techStack = techStack || null;
    parsedData.difficulty = difficulty || null;
    parsedData.candidateExperience = candidateExperience || null;

    return parsedData;
  } catch (error) {
    console.error("Generate Professional Interview Error:", error);
    throw new Error(
      error.message || "Failed to generate professional interview questions."
    );
  }
};