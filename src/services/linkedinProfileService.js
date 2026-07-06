import axios from "axios";

/**
 * ==========================================================
 * Fetch LinkedIn Profile using Bright Data
 * ==========================================================
 */

export const fetchLinkedInProfile = async (profileUrl) => {
  try {
    //-------------------------------------------------------
    // Validate URL
    //-------------------------------------------------------

    if (!profileUrl || !profileUrl.trim()) {
      throw new Error("LinkedIn profile URL is required.");
    }

    //-------------------------------------------------------
    // Bright Data Credentials
    //-------------------------------------------------------

    const API_KEY = process.env.BRIGHTDATA_API_KEY;
    const DATASET_ID = process.env.BRIGHTDATA_DATASET_ID;

    if (!API_KEY) {
      throw new Error("BRIGHTDATA_API_KEY is missing.");
    }

    if (!DATASET_ID) {
      throw new Error("BRIGHTDATA_DATASET_ID is missing.");
    }

    //-------------------------------------------------------
    // STEP 1: Trigger Bright Data Scraper
    //-------------------------------------------------------

    console.log("========== Triggering Bright Data ==========");
    console.log("Dataset ID:", DATASET_ID);
    console.log("Profile URL:", profileUrl);

    const triggerResponse = await axios.post(
      `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}`,
      [
        {
          url: profileUrl,
        },
      ],
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Trigger Response:", triggerResponse.data);

    //-------------------------------------------------------
    // STEP 2: Get Snapshot ID
    //-------------------------------------------------------

    const snapshotId = triggerResponse.data.snapshot_id;

    if (!snapshotId) {
      throw new Error("Snapshot ID not received from Bright Data.");
    }

    console.log("Snapshot ID:", snapshotId);

    //-------------------------------------------------------
    // STEP 3: Poll for Snapshot with exponential backoff
    //-------------------------------------------------------

    let result = null;
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 attempts (about 90 seconds)
    const initialDelay = 3000; // Start with 3 seconds
    let delay = initialDelay;

    console.log("========== Polling for Snapshot ==========");

    while (!isReady && attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts} - Waiting ${delay}ms...`);

      // Wait before checking
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Get snapshot
      const snapshotResponse = await axios.get(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );

      result = snapshotResponse.data;

      console.log(`Attempt ${attempts} - Response:`, 
        Array.isArray(result) ? `Array with ${result.length} items` : typeof result
      );

      // Check if snapshot is ready
      if (Array.isArray(result) && result.length > 0) {
        // Data is ready
        isReady = true;
        console.log("✅ Snapshot ready with data!");
        break;
      } else if (result && typeof result === 'object') {
        // Check for status indicators
        const status = result.status || result.state;
        if (status === 'completed' || status === 'ready' || status === 'finished') {
          // Check if there's data in records
          if (result.records && Array.isArray(result.records) && result.records.length > 0) {
            result = result.records;
            isReady = true;
            console.log("✅ Snapshot ready with records!");
            break;
          } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            result = result.data;
            isReady = true;
            console.log("✅ Snapshot ready with data!");
            break;
          }
        } else if (status === 'running' || status === 'pending' || status === 'processing') {
          console.log(`⏳ Snapshot still ${status}...`);
        } else if (status === 'failed' || status === 'error') {
          throw new Error(`Snapshot processing failed with status: ${status}`);
        } else {
          // Unknown status, but maybe it's empty array which means still processing
          console.log(`⏳ Snapshot status: ${status || 'unknown'}...`);
        }
      } else if (Array.isArray(result) && result.length === 0) {
        console.log("⏳ Snapshot is empty, still processing...");
      }

      // Increase delay with exponential backoff (capped at 10 seconds)
      delay = Math.min(delay * 1.5, 10000);
    }

    //-------------------------------------------------------
    // STEP 4: Check if we got data
    //-------------------------------------------------------

    if (!isReady || !result || (Array.isArray(result) && result.length === 0)) {
      throw new Error(
        `Snapshot not ready after ${maxAttempts} attempts. Please try again later.`
      );
    }

    // Get the profile data
    let profile;
    if (Array.isArray(result)) {
      profile = result[0];
    } else if (result && typeof result === 'object') {
      // Handle different possible response structures
      if (result.records && Array.isArray(result.records)) {
        profile = result.records[0];
      } else if (result.data && Array.isArray(result.data)) {
        profile = result.data[0];
      } else {
        profile = result;
      }
    }

    if (!profile) {
      throw new Error("No LinkedIn profile data found in snapshot.");
    }

    console.log("========== Profile Data ==========");
    console.log("Name:", profile.name || profile.full_name || "N/A");
    console.log("Headline:", profile.headline || profile.position || "N/A");
    console.log("==================================");

    //-------------------------------------------------------
    // STEP 5: Build Profile Text
    //-------------------------------------------------------

    let profileText = "";

    // Basic Information
    profileText += `Name: ${profile.name || profile.full_name || ""}\n`;
    profileText += `Headline: ${profile.headline || profile.position || profile.title || ""}\n`;
    profileText += `Location: ${profile.location || profile.address || ""}\n`;
    profileText += `Current Company: ${profile.current_company || profile.current_company_name || ""}\n`;
    profileText += `Current Position: ${profile.current_position || profile.current_job_title || ""}\n`;
    profileText += `Followers: ${profile.followers || 0}\n`;
    profileText += `Connections: ${profile.connections || 0}\n\n`;

    // About
    profileText += "========== ABOUT ==========\n";
    profileText += `${profile.about || profile.summary || profile.description || "Not Available"}\n\n`;

    // Experience
    profileText += "========== EXPERIENCE ==========\n";

    const experience =
    profile.experience ||
    profile.experiences ||
    profile.work_experience ||
    profile.work ||
    [];

    if (Array.isArray(experience) && experience.length > 0) {
    experience.forEach((exp, index) => {
        profileText += `Experience ${index + 1}\n`;
        profileText += `Company : ${exp.company || exp.company_name || exp.organization || ""}\n`;
        profileText += `Position : ${exp.title || exp.position || exp.role || ""}\n`;
        profileText += `Location : ${exp.location || ""}\n`;
        profileText += `Duration : ${exp.start_date || exp.start || ""} - ${exp.end_date || exp.end || "Present"}\n`;
        profileText += `Description : ${exp.description || exp.summary || ""}\n\n`;
    });
    } else {
    profileText += "No experience available.\n\n";
    }

    // Education
    profileText += "========== EDUCATION ==========\n";

    const education =
    profile.education ||
    profile.educations ||
    profile.schools ||
    [];

    if (Array.isArray(education) && education.length > 0) {
    education.forEach((edu, index) => {
        profileText += `Education ${index + 1}\n`;
        profileText += `Institute : ${edu.school || edu.institution || edu.name || ""}\n`;
        profileText += `Degree : ${edu.degree || ""}\n`;
        profileText += `Field : ${edu.field_of_study || edu.field || edu.major || ""}\n`;
        profileText += `Duration : ${edu.start_date || ""} - ${edu.end_date || ""}\n\n`;
    });
    } else {
    profileText += "No education available.\n\n";
    }

    // Skills
    profileText += "========== SKILLS ==========\n";

    const skills =
    profile.skills ||
    profile.skill_set ||
    profile.skill_list ||
    [];

    if (Array.isArray(skills) && skills.length > 0) {
    profileText += skills.join(", ");
    } else {
    profileText += "No skills available.";
    }

    profileText += "\n\n";

    // Languages
    profileText += "========== LANGUAGES ==========\n";

    const languages =
    profile.languages ||
    profile.language_list ||
    [];

    if (Array.isArray(languages) && languages.length > 0) {
    languages.forEach((lang) => {
        if (typeof lang === "string") {
        profileText += `${lang}\n`;
        } else {
        profileText += `${lang.name || lang.language || ""}\n`;
        }
    });
    } else {
    profileText += "No languages available.\n";
    }

    profileText += "\n";

    // Certifications
    profileText += "========== CERTIFICATIONS ==========\n";

    const certifications =
    profile.certifications ||
    profile.certificates ||
    profile.licenses ||
    [];

    if (Array.isArray(certifications) && certifications.length > 0) {
    certifications.forEach((cert) => {
        profileText += `${cert.name || cert.title || cert.certificate || ""}\n`;
    });
    } else {
    profileText += "No certifications available.\n";
    }

    profileText += "\n";

    // Projects
    profileText += "========== PROJECTS ==========\n";

    const projects = profile.projects || [];

    if (Array.isArray(projects) && projects.length > 0) {
    projects.forEach((project) => {
        profileText += `${project.name || ""}\n`;
        profileText += `${project.description || ""}\n\n`;
    });
    } else {
    profileText += "No projects available.\n";
    }

    profileText += "\n";

    // Awards
    profileText += "========== AWARDS ==========\n";

    const awards =
    profile.awards ||
    profile.honors ||
    profile.honors_and_awards ||
    [];

    if (Array.isArray(awards) && awards.length > 0) {
    awards.forEach((award) => {
        profileText += `${award.name || award.title || ""}\n`;
    });
    } else {
    profileText += "No awards available.\n";
    }

    profileText += "\n";

    // Raw JSON
    profileText += "========== COMPLETE PROFILE JSON ==========\n";
    profileText += JSON.stringify(profile, null, 2);

    //-------------------------------------------------------
    // STEP 6: Return formatted profile
    //-------------------------------------------------------

    console.log("========== PROFILE TEXT ==========");
    console.log(profileText);
    console.log("==================================");
    return profileText.trim();
    
  } catch (error) {
    console.log("========== Bright Data Error ==========");
    console.log("Status:", error.response?.status);
    console.log("Data:", error.response?.data);
    console.log("Message:", error.message);
    console.log("=======================================");

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch LinkedIn profile."
    );
  }
};