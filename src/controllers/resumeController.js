import fs from "fs";

export const uploadResume = async (req, res) => {
  let filePath = null;

  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required.",
      });
    }

    filePath = req.file.path;

    // Temporary mock analysis result
    const result = {
      score: 92,
      skills: [
        "JavaScript",
        "TypeScript",
        "Node.js",
        "Express.js",
        "MongoDB",
        "React",
        "Next.js",
      ],
      suggestions: [
        "Add more quantified achievements.",
        "Include a professional summary section.",
      ],
    };

    return res.status(200).json({
      success: true,
      message: "Resume analyzed successfully.",
      data: {
        fileName: req.file.originalname,
        ...result,
      },
    });
  } catch (error) {
    console.error("Resume upload error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  } finally {
    // Delete uploaded file after processing
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};