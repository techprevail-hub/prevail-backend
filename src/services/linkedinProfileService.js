import axios from "axios";

/**
 * ==========================================================
 * Fetch LinkedIn Profile using Proxycurl
 * ==========================================================
 */

export const fetchLinkedInProfileFromUrl = async (profileUrl) => {
  try {
    //-------------------------------------------------------
    // Validate URL
    //-------------------------------------------------------

    if (!profileUrl || !profileUrl.trim()) {
      throw new Error("LinkedIn profile URL is required.");
    }

    //-------------------------------------------------------
    // Call Proxycurl API
    //-------------------------------------------------------

    const { data } = await axios.get(
      "https://nubela.co/proxycurl/api/v2/linkedin",
      {
        params: {
          url: profileUrl,
        },
        headers: {
          Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}`,
        },
      }
    );

    //-------------------------------------------------------
    // Build Profile Text
    //-------------------------------------------------------

    let profileText = "";

    profileText += `Name: ${data.full_name || ""}\n\n`;

    profileText += `Headline: ${data.headline || ""}\n\n`;

    profileText += `Occupation: ${data.occupation || ""}\n\n`;

    profileText += `Location: ${data.city || ""}, ${data.state || ""}, ${data.country_full_name || ""}\n\n`;

    profileText += `About:\n${data.summary || ""}\n\n`;

    //-------------------------------------------------------
    // Experience
    //-------------------------------------------------------

    profileText += "Experience:\n";

    if (Array.isArray(data.experiences)) {
      data.experiences.forEach((exp) => {
        profileText += `
Company: ${exp.company || ""}

Position: ${exp.title || ""}

Duration:
${exp.starts_at?.month || ""}/${exp.starts_at?.year || ""}
-
${exp.ends_at?.month || ""}/${exp.ends_at?.year || "Present"}

Description:
${exp.description || ""}

`;
      });
    }

    //-------------------------------------------------------
    // Education
    //-------------------------------------------------------

    profileText += "\nEducation:\n";

    if (Array.isArray(data.education)) {
      data.education.forEach((edu) => {
        profileText += `
School: ${edu.school || ""}

Degree: ${edu.degree_name || ""}

Field:
${edu.field_of_study || ""}

`;
      });
    }

    //-------------------------------------------------------
    // Skills
    //-------------------------------------------------------

    profileText += "\nSkills:\n";

    if (Array.isArray(data.skills)) {
      profileText += data.skills.join(", ");
    }

    //-------------------------------------------------------
    // Languages
    //-------------------------------------------------------

    profileText += "\n\nLanguages:\n";

    if (Array.isArray(data.languages)) {
      profileText += data.languages.join(", ");
    }

    //-------------------------------------------------------
    // Certifications
    //-------------------------------------------------------

    profileText += "\n\nCertifications:\n";

    if (Array.isArray(data.certifications)) {
      data.certifications.forEach((cert) => {
        profileText += `${cert.name || ""}\n`;
      });
    }

    //-------------------------------------------------------
    // Return formatted profile
    //-------------------------------------------------------

    return profileText.trim();

  } catch (error) {

    console.log("========== Proxycurl Error ==========");

    console.log(error.response?.status);

    console.log(error.response?.data);

    console.log(error.message);

    console.log("====================================");

    throw new Error(
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch LinkedIn profile."
    );
}
};